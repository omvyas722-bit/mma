// Stock management data layer
const { getDatabase } = require('../db/connection');

// Products CRUD
function getAllProducts(filters = {}) {
  const db = getDatabase();

  let query = 'SELECT p.*, s.name as supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id';
  const conditions = [];
  const params = [];

  if (filters.category) {
    conditions.push('p.category = ?');
    params.push(filters.category);
  }

  if (filters.active !== undefined) {
    conditions.push('p.active = ?');
    params.push(filters.active);
  }

  if (filters.low_stock) {
    conditions.push('p.stock_quantity <= p.min_stock_level');
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY p.name';

  return db.prepare(query).all(...params);
}

function getProduct(id) {
  const db = getDatabase();
  return db.prepare('SELECT p.*, s.name as supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = ?').get(id);
}

function createProduct(data) {
  const db = getDatabase();

  const result = db.prepare(`
    INSERT INTO products (
      name, description, category, sku, barcode, cost_price, sell_price,
      stock_quantity, min_stock_level, max_stock_level, size, color, brand,
      supplier_id, image_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.name,
    data.description || null,
    data.category,
    data.sku || null,
    data.barcode || null,
    data.cost_price,
    data.sell_price,
    data.stock_quantity || 0,
    data.min_stock_level || 5,
    data.max_stock_level || null,
    data.size || null,
    data.color || null,
    data.brand || null,
    data.supplier_id || null,
    data.image_url || null
  );

  return getProduct(result.lastInsertRowid);
}

function updateProduct(id, data) {
  const db = getDatabase();

  const updates = [];
  const values = [];

  const fields = ['name', 'description', 'category', 'sku', 'barcode', 'cost_price', 'sell_price',
                  'min_stock_level', 'max_stock_level', 'size', 'color', 'brand', 'supplier_id',
                  'image_url', 'active'];

  fields.forEach(field => {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(data[field]);
    }
  });

  if (updates.length === 0) return getProduct(id);

  updates.push('updated_at = datetime(\'now\')');
  values.push(id);

  db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return getProduct(id);
}

// Stock adjustments
function createStockAdjustment(data) {
  const db = getDatabase();

  const product = getProduct(data.product_id);
  if (!product) throw new Error('Product not found');

  const quantityBefore = product.stock_quantity;
  let quantityChange = data.quantity;

  if (data.adjustment_type === 'remove' || data.adjustment_type === 'damage' || data.adjustment_type === 'theft') {
    quantityChange = -Math.abs(quantityChange);
  }

  const quantityAfter = quantityBefore + quantityChange;

  // Create adjustment record
  const result = db.prepare(`
    INSERT INTO stock_adjustments (product_id, adjustment_type, quantity, reason, adjusted_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(data.product_id, data.adjustment_type, data.quantity, data.reason || null, data.adjusted_by);

  // Update product stock
  db.prepare('UPDATE products SET stock_quantity = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(quantityAfter, data.product_id);

  // Log stock movement
  logStockMovement(data.product_id, 'adjustment', quantityChange, quantityBefore, quantityAfter,
                   'stock_adjustment', result.lastInsertRowid, data.adjusted_by);

  // Check for low stock alert
  checkLowStockAlert(data.product_id);

  return db.prepare('SELECT * FROM stock_adjustments WHERE id = ?').get(result.lastInsertRowid);
}

// Product sales
function createProductSale(data) {
  const db = getDatabase();

  const product = getProduct(data.product_id);
  if (!product) throw new Error('Product not found');

  if (product.stock_quantity < data.quantity) {
    throw new Error('Insufficient stock');
  }

  const totalAmount = data.unit_price * data.quantity;
  const quantityBefore = product.stock_quantity;
  const quantityAfter = quantityBefore - data.quantity;

  // Create sale record
  const result = db.prepare(`
    INSERT INTO product_sales (
      product_id, quantity, unit_price, total_amount, member_id,
      sold_by, payment_method, transaction_id, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.product_id,
    data.quantity,
    data.unit_price,
    totalAmount,
    data.member_id || null,
    data.sold_by,
    data.payment_method || 'cash',
    data.transaction_id || null,
    data.notes || null
  );

  // Update product stock
  db.prepare('UPDATE products SET stock_quantity = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(quantityAfter, data.product_id);

  // Log stock movement
  logStockMovement(data.product_id, 'sale', -data.quantity, quantityBefore, quantityAfter,
                   'product_sale', result.lastInsertRowid, data.sold_by);

  // Check for low stock alert
  checkLowStockAlert(data.product_id);

  return db.prepare('SELECT * FROM product_sales WHERE id = ?').get(result.lastInsertRowid);
}

function getSales(filters = {}) {
  const db = getDatabase();

  let query = `
    SELECT ps.*, p.name as product_name, p.sku,
           m.first_name || ' ' || m.last_name as member_name,
           s.name as sold_by_name
    FROM product_sales ps
    JOIN products p ON ps.product_id = p.id
    LEFT JOIN members m ON ps.member_id = m.id
    JOIN staff s ON ps.sold_by = s.id
  `;

  const conditions = [];
  const params = [];

  if (filters.date_from) {
    conditions.push('DATE(ps.sale_date) >= ?');
    params.push(filters.date_from);
  }

  if (filters.date_to) {
    conditions.push('DATE(ps.sale_date) <= ?');
    params.push(filters.date_to);
  }

  if (filters.product_id) {
    conditions.push('ps.product_id = ?');
    params.push(filters.product_id);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY ps.sale_date DESC';

  return db.prepare(query).all(...params);
}

// Low stock alerts
function checkLowStockAlert(productId) {
  const db = getDatabase();

  const product = getProduct(productId);
  if (!product) return;

  // Check if alert already exists
  const existingAlert = db.prepare(`
    SELECT * FROM stock_alerts
    WHERE product_id = ? AND status = 'active'
  `).get(productId);

  if (product.stock_quantity <= 0 && !existingAlert) {
    // Out of stock
    db.prepare(`
      INSERT INTO stock_alerts (product_id, alert_type, current_quantity, min_quantity)
      VALUES (?, 'out_of_stock', ?, ?)
    `).run(productId, product.stock_quantity, product.min_stock_level);
  } else if (product.stock_quantity <= product.min_stock_level && product.stock_quantity > 0 && !existingAlert) {
    // Low stock
    db.prepare(`
      INSERT INTO stock_alerts (product_id, alert_type, current_quantity, min_quantity)
      VALUES (?, 'low_stock', ?, ?)
    `).run(productId, product.stock_quantity, product.min_stock_level);
  } else if (product.stock_quantity > product.min_stock_level && existingAlert) {
    // Resolve alert
    db.prepare(`
      UPDATE stock_alerts
      SET status = 'resolved', resolved_at = datetime('now')
      WHERE id = ?
    `).run(existingAlert.id);
  }
}

function getActiveStockAlerts() {
  const db = getDatabase();

  return db.prepare(`
    SELECT sa.*, p.name as product_name, p.sku, p.category
    FROM stock_alerts sa
    JOIN products p ON sa.product_id = p.id
    WHERE sa.status = 'active'
    ORDER BY sa.alert_type DESC, sa.created_at ASC
  `).all();
}

function resolveStockAlert(alertId, staffId) {
  const db = getDatabase();

  db.prepare(`
    UPDATE stock_alerts
    SET status = 'resolved', resolved_at = datetime('now'), resolved_by = ?
    WHERE id = ?
  `).run(staffId, alertId);
}

// Stock movements (audit trail)
function logStockMovement(productId, movementType, quantityChange, quantityBefore, quantityAfter, referenceType = null, referenceId = null, createdBy = null) {
  const db = getDatabase();

  db.prepare(`
    INSERT INTO stock_movements (
      product_id, movement_type, quantity_change, quantity_before, quantity_after,
      reference_type, reference_id, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(productId, movementType, quantityChange, quantityBefore, quantityAfter, referenceType, referenceId, createdBy);
}

function getStockMovements(productId) {
  const db = getDatabase();

  return db.prepare(`
    SELECT sm.*, s.name as created_by_name
    FROM stock_movements sm
    LEFT JOIN staff s ON sm.created_by = s.id
    WHERE sm.product_id = ?
    ORDER BY sm.created_at DESC
  `).all(productId);
}

// Suppliers
function getAllSuppliers() {
  const db = getDatabase();
  return db.prepare('SELECT * FROM suppliers WHERE active = 1 ORDER BY name').all();
}

function createSupplier(data) {
  const db = getDatabase();

  const result = db.prepare(`
    INSERT INTO suppliers (name, contact_person, email, phone, address, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    data.name,
    data.contact_person || null,
    data.email || null,
    data.phone || null,
    data.address || null,
    data.notes || null
  );

  return db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid);
}

// Stock analytics
function getStockAnalytics(dateFrom = null, dateTo = null) {
  const db = getDatabase();

  if (!dateFrom) {
    const now = new Date();
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  }
  if (!dateTo) {
    dateTo = new Date().toISOString().split('T')[0];
  }

  const stats = {};

  // Total sales revenue
  stats.total_sales_revenue = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total
    FROM product_sales
    WHERE DATE(sale_date) BETWEEN ? AND ?
  `).get(dateFrom, dateTo).total;

  // Total units sold
  stats.total_units_sold = db.prepare(`
    SELECT COALESCE(SUM(quantity), 0) as total
    FROM product_sales
    WHERE DATE(sale_date) BETWEEN ? AND ?
  `).get(dateFrom, dateTo).total;

  // Top selling products
  stats.top_products = db.prepare(`
    SELECT p.name, p.sku, SUM(ps.quantity) as units_sold, SUM(ps.total_amount) as revenue
    FROM product_sales ps
    JOIN products p ON ps.product_id = p.id
    WHERE DATE(ps.sale_date) BETWEEN ? AND ?
    GROUP BY ps.product_id
    ORDER BY revenue DESC
    LIMIT 5
  `).all(dateFrom, dateTo);

  // Low stock count
  stats.low_stock_count = db.prepare(`
    SELECT COUNT(*) as count
    FROM products
    WHERE stock_quantity <= min_stock_level AND active = 1
  `).get().count;

  // Out of stock count
  stats.out_of_stock_count = db.prepare(`
    SELECT COUNT(*) as count
    FROM products
    WHERE stock_quantity = 0 AND active = 1
  `).get().count;

  // Total inventory value (at cost)
  stats.inventory_value_cost = db.prepare(`
    SELECT COALESCE(SUM(stock_quantity * cost_price), 0) as total
    FROM products
    WHERE active = 1
  `).get().total;

  // Total inventory value (at sell price)
  stats.inventory_value_sell = db.prepare(`
    SELECT COALESCE(SUM(stock_quantity * sell_price), 0) as total
    FROM products
    WHERE active = 1
  `).get().total;

  return stats;
}

module.exports = {
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  createStockAdjustment,
  createProductSale,
  getSales,
  getActiveStockAlerts,
  resolveStockAlert,
  getStockMovements,
  getAllSuppliers,
  createSupplier,
  getStockAnalytics
};
