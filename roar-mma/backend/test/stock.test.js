const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_PATH = ':memory:';

delete require.cache[require.resolve('../db/connection')];

const { getDatabase, closeDatabase } = require('../db/connection');
const stock = require('../data/stock');

before(() => {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      contact_person TEXT, email TEXT, phone TEXT, address TEXT,
      notes TEXT, active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      description TEXT, category TEXT NOT NULL, sku TEXT, barcode TEXT,
      cost_price REAL NOT NULL, sell_price REAL NOT NULL,
      stock_quantity INTEGER DEFAULT 0, min_stock_level INTEGER DEFAULT 5,
      max_stock_level INTEGER, size TEXT, color TEXT, brand TEXT,
      supplier_id INTEGER, image_url TEXT, active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );
    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER,
      adjustment_type TEXT NOT NULL, quantity INTEGER NOT NULL,
      reason TEXT, adjusted_by INTEGER,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS product_sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER,
      quantity INTEGER NOT NULL, unit_price REAL NOT NULL,
      total_amount REAL NOT NULL, member_id INTEGER,
      sold_by INTEGER, payment_method TEXT DEFAULT 'cash',
      transaction_id INTEGER, notes TEXT,
      sale_date DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
    CREATE TABLE IF NOT EXISTS stock_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER,
      alert_type TEXT, current_quantity INTEGER, min_quantity INTEGER,
      status TEXT DEFAULT 'active', created_at DATETIME DEFAULT (datetime('now')),
      resolved_at TEXT, resolved_by INTEGER
    );
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER,
      movement_type TEXT, quantity_change INTEGER,
      quantity_before INTEGER, quantity_after INTEGER,
      reference_type TEXT, reference_id INTEGER, created_by INTEGER,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, role TEXT
    );
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT, last_name TEXT
    );
    INSERT INTO staff (id, name, role) VALUES (1, 'Staff One', 'sales');
    INSERT INTO members (id, first_name, last_name) VALUES (1, 'Member', 'One');
  `);
});

beforeEach(() => {
  const db = getDatabase();
  db.exec(`DELETE FROM stock_movements`);
  db.exec(`DELETE FROM product_sales`);
  db.exec(`DELETE FROM stock_adjustments`);
  db.exec(`DELETE FROM stock_alerts`);
  db.exec(`DELETE FROM products`);
  db.exec(`DELETE FROM suppliers`);
});

after(() => closeDatabase());

describe('Stock Data Layer', () => {
  describe('Suppliers', () => {
    it('createSupplier and getAllSuppliers', () => {
      const s = stock.createSupplier({ name: 'Vendor Co', email: 'v@vendor.com' });
      assert.ok(s.id);
      const all = stock.getAllSuppliers();
      assert.equal(all.length, 1);
      assert.equal(all[0].name, 'Vendor Co');
    });
  });

  describe('Products', () => {
    it('createProduct inserts and returns', () => {
      const p = stock.createProduct({ name: 'Rash Guard', category: 'apparel', cost_price: 20, sell_price: 50 });
      assert.ok(p.id);
      assert.equal(p.name, 'Rash Guard');
      assert.equal(p.stock_quantity, 0);
    });

    it('getProduct returns by id', () => {
      const p = stock.createProduct({ name: 'Shorts', category: 'apparel', cost_price: 15, sell_price: 35 });
      const found = stock.getProduct(p.id);
      assert.equal(found.name, 'Shorts');
    });

    it('getAllProducts returns all with filters', () => {
      stock.createProduct({ name: 'Gloves', category: 'gear', cost_price: 30, sell_price: 80 });
      stock.createProduct({ name: 'Gi', category: 'apparel', cost_price: 50, sell_price: 120 });
      assert.equal(stock.getAllProducts({}).length, 2);
      assert.equal(stock.getAllProducts({ category: 'gear' }).length, 1);
    });

    it('getAllProducts filters low_stock', () => {
      stock.createProduct({ name: 'Gloves', category: 'gear', cost_price: 30, sell_price: 80, stock_quantity: 1, min_stock_level: 5 });
      stock.createProduct({ name: 'Gi', category: 'apparel', cost_price: 50, sell_price: 120, stock_quantity: 10 });
      const r = stock.getAllProducts({ low_stock: true });
      assert.equal(r.length, 1);
    });

    it('getAllProducts filters active=false', () => {
      let p = stock.createProduct({ name: 'Gloves', category: 'gear', cost_price: 30, sell_price: 80 });
      stock.updateProduct(p.id, { active: 0 });
      stock.createProduct({ name: 'Gi', category: 'apparel', cost_price: 50, sell_price: 120 });
      const r = stock.getAllProducts({ active: false });
      assert.equal(r.length, 1);
      assert.equal(r[0].name, 'Gloves');
    });

    it('updateProduct modifies fields', () => {
      const p = stock.createProduct({ name: 'Gloves', category: 'gear', cost_price: 30, sell_price: 80 });
      const u = stock.updateProduct(p.id, { name: 'Boxing Gloves', sell_price: 90 });
      assert.equal(u.name, 'Boxing Gloves');
      assert.equal(u.sell_price, 90);
    });

    it('updateProduct throws on empty fields', () => {
      const p = stock.createProduct({ name: 'Test', category: 'x', cost_price: 10, sell_price: 20 });
      assert.throws(() => stock.updateProduct(p.id, {}), /No valid fields to update/);
    });
  });

  describe('Stock Adjustments', () => {
    it('createStockAdjustment adds stock and logs movement', () => {
      const p = stock.createProduct({ name: 'Gloves', category: 'gear', cost_price: 30, sell_price: 80, stock_quantity: 10 });
      stock.createStockAdjustment({ product_id: p.id, adjustment_type: 'add', quantity: 5, reason: 'New shipment', adjusted_by: 1 });
      const updated = stock.getProduct(p.id);
      assert.equal(updated.stock_quantity, 15);
    });

    it('createStockAdjustment deducts stock for remove', () => {
      const p = stock.createProduct({ name: 'Gloves', category: 'gear', cost_price: 30, sell_price: 80, stock_quantity: 10 });
      stock.createStockAdjustment({ product_id: p.id, adjustment_type: 'remove', quantity: 3, reason: 'Damaged', adjusted_by: 1 });
      const updated = stock.getProduct(p.id);
      assert.equal(updated.stock_quantity, 7);
    });

    it('createStockAdjustment throws for missing product', () => {
      assert.throws(() =>
        stock.createStockAdjustment({ product_id: 999, adjustment_type: 'add', quantity: 1, adjusted_by: 1 }),
        /Product not found/
      );
    });

    it('createStockAdjustment deducts stock for damage', () => {
      const p = stock.createProduct({ name: 'Gloves', category: 'gear', cost_price: 30, sell_price: 80, stock_quantity: 10 });
      stock.createStockAdjustment({ product_id: p.id, adjustment_type: 'damage', quantity: 4, reason: 'Torn', adjusted_by: 1 });
      const updated = stock.getProduct(p.id);
      assert.equal(updated.stock_quantity, 6);
    });

    it('createStockAdjustment deducts stock for theft', () => {
      const p = stock.createProduct({ name: 'Gloves', category: 'gear', cost_price: 30, sell_price: 80, stock_quantity: 10 });
      stock.createStockAdjustment({ product_id: p.id, adjustment_type: 'theft', quantity: 3, reason: 'Missing', adjusted_by: 1 });
      const updated = stock.getProduct(p.id);
      assert.equal(updated.stock_quantity, 7);
    });
  });

  describe('Product Sales', () => {
    it('createProductSale deducts stock and logs', () => {
      const p = stock.createProduct({ name: 'Gloves', category: 'gear', cost_price: 30, sell_price: 80, stock_quantity: 10 });
      const sale = stock.createProductSale({ product_id: p.id, quantity: 2, unit_price: 80, sold_by: 1 });
      assert.ok(sale.id);
      assert.equal(sale.total_amount, 160);
      const updated = stock.getProduct(p.id);
      assert.equal(updated.stock_quantity, 8);
    });

    it('createProductSale throws for insufficient stock', () => {
      const p = stock.createProduct({ name: 'Gloves', category: 'gear', cost_price: 30, sell_price: 80, stock_quantity: 1 });
      assert.throws(() =>
        stock.createProductSale({ product_id: p.id, quantity: 5, unit_price: 80, sold_by: 1 }),
        /Insufficient stock/
      );
    });

    it('getSales returns sales with filters', () => {
      const p = stock.createProduct({ name: 'Gloves', category: 'gear', cost_price: 30, sell_price: 80, stock_quantity: 10 });
      stock.createProductSale({ product_id: p.id, quantity: 1, unit_price: 80, sold_by: 1 });
      const sales = stock.getSales({ product_id: p.id });
      assert.equal(sales.length, 1);
      assert.equal(sales[0].product_name, 'Gloves');
    });

    it('getSales filters by date range', () => {
      const p = stock.createProduct({ name: 'Gloves', category: 'gear', cost_price: 30, sell_price: 80, stock_quantity: 100 });
      const db = getDatabase();
      db.prepare("INSERT INTO product_sales (product_id, quantity, unit_price, total_amount, sold_by, sale_date) VALUES (?, 1, 80, 80, 1, '2026-01-15')").run(p.id);
      db.prepare("INSERT INTO product_sales (product_id, quantity, unit_price, total_amount, sold_by, sale_date) VALUES (?, 1, 80, 80, 1, '2026-06-15')").run(p.id);
      const sales = stock.getSales({ date_from: '2026-06-01', date_to: '2026-06-30' });
      assert.equal(sales.length, 1);
    });
  });

  describe('Stock Alerts', () => {
    it('getActiveStockAlerts returns unresolved alerts', () => {
      const p = stock.createProduct({ name: 'Gloves', category: 'gear', cost_price: 30, sell_price: 80, stock_quantity: 1, min_stock_level: 5 });
      stock.createStockAdjustment({ product_id: p.id, adjustment_type: 'add', quantity: 0, reason: 'Trigger alert', adjusted_by: 1 });
      const alerts = stock.getActiveStockAlerts();
      assert.ok(alerts.length > 0);
    });

    it('resolveStockAlert updates alert status', () => {
      const p = stock.createProduct({ name: 'Gloves', category: 'gear', cost_price: 30, sell_price: 80, stock_quantity: 0, min_stock_level: 5 });
      stock.createStockAdjustment({ product_id: p.id, adjustment_type: 'add', quantity: 0, reason: 'Trigger', adjusted_by: 1 });
      const alerts = stock.getActiveStockAlerts();
      if (alerts.length > 0) {
        stock.resolveStockAlert(alerts[0].id, 1);
        const remaining = stock.getActiveStockAlerts();
        assert.equal(remaining.filter(a => a.id === alerts[0].id).length, 0);
      }
    });

    it('restock resolves active alert', () => {
      const p = stock.createProduct({ name: 'Gloves', category: 'gear', cost_price: 30, sell_price: 80, stock_quantity: 0, min_stock_level: 5 });
      stock.createStockAdjustment({ product_id: p.id, adjustment_type: 'add', quantity: 0, reason: 'Trigger', adjusted_by: 1 });
      const alerts = stock.getActiveStockAlerts();
      assert.equal(alerts.length, 1);
      stock.createStockAdjustment({ product_id: p.id, adjustment_type: 'add', quantity: 10, reason: 'Restock', adjusted_by: 1 });
      const remaining = stock.getActiveStockAlerts();
      assert.equal(remaining.length, 0);
    });

    it('restock resolves low stock alert when recovering above threshold', () => {
      const p = stock.createProduct({ name: 'Gloves', category: 'gear', cost_price: 30, sell_price: 80, stock_quantity: 1, min_stock_level: 5 });
      stock.createStockAdjustment({ product_id: p.id, adjustment_type: 'add', quantity: 0, reason: 'Trigger', adjusted_by: 1 });
      let alerts = stock.getActiveStockAlerts();
      assert.equal(alerts.length, 1);
      assert.equal(alerts[0].alert_type, 'low_stock');
      stock.createStockAdjustment({ product_id: p.id, adjustment_type: 'add', quantity: 10, reason: 'Restock', adjusted_by: 1 });
      alerts = stock.getActiveStockAlerts();
      assert.equal(alerts.length, 0);
    });

    it('checkLowStockAlert does nothing when stock fine and no existing alert', () => {
      const p = stock.createProduct({ name: 'Gloves', category: 'gear', cost_price: 30, sell_price: 80, stock_quantity: 100, min_stock_level: 5 });
      assert.equal(stock.getActiveStockAlerts().length, 0);
      stock.createStockAdjustment({ product_id: p.id, adjustment_type: 'add', quantity: 5, reason: 'Restock', adjusted_by: 1 });
      assert.equal(stock.getActiveStockAlerts().length, 0);
    });
  });

  describe('Stock Movements', () => {
    it('getStockMovements returns audit trail', () => {
      const p = stock.createProduct({ name: 'Gloves', category: 'gear', cost_price: 30, sell_price: 80, stock_quantity: 10 });
      stock.createStockAdjustment({ product_id: p.id, adjustment_type: 'add', quantity: 5, adjusted_by: 1 });
      const moves = stock.getStockMovements(p.id);
      assert.ok(moves.length > 0);
      assert.equal(moves[0].movement_type, 'adjustment');
    });
  });

  describe('Stock Analytics', () => {
    it('getStockAnalytics returns stats', () => {
      const p = stock.createProduct({ name: 'Gloves', category: 'gear', cost_price: 30, sell_price: 80, stock_quantity: 10 });
      stock.createProductSale({ product_id: p.id, quantity: 2, unit_price: 80, sold_by: 1 });
      const stats = stock.getStockAnalytics('2026-01-01', '2026-12-31');
      assert.ok(stats.total_sales_revenue > 0);
      assert.equal(stats.total_units_sold, 2);
      assert.ok(stats.top_products.length > 0);
    });

    it('getStockAnalytics works with default dates', () => {
      const p = stock.createProduct({ name: 'Gloves', category: 'gear', cost_price: 30, sell_price: 80, stock_quantity: 10 });
      stock.createProductSale({ product_id: p.id, quantity: 1, unit_price: 80, sold_by: 1 });
      const stats = stock.getStockAnalytics();
      assert.ok(stats.total_sales_revenue > 0);
    });
  });
});
