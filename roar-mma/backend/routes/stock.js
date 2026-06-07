// Stock management routes
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const stockData = require('../data/stock');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'products');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `product_${req.params.id}_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) cb(null, true);
    else cb(new Error('Only image files (jpg, jpeg, png, gif, webp) are allowed'));
  },
});

// Products
router.get('/products', authenticateToken, requirePermission('stock:read'), (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      active: req.query.active !== undefined ? parseInt(req.query.active, 10) : undefined,
      low_stock: req.query.low_stock === 'true'
    };

    const products = stockData.getAllProducts(filters);
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/products/:id', authenticateToken, requirePermission('stock:read'), (req, res) => {
  try {
    const product = stockData.getProduct(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

router.post('/products', authenticateToken, requirePermission('stock:write'), (req, res) => {
  try {
    const allowedFields = ['name', 'description', 'category', 'sku', 'barcode', 'cost_price', 'sell_price', 'stock_quantity', 'min_stock_level', 'max_stock_level', 'size', 'color', 'brand', 'supplier_id', 'active', 'image_url'];
    const productData = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) productData[f] = req.body[f]; });
    const product = stockData.createProduct(productData);
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.put('/products/:id', authenticateToken, requirePermission('stock:write'), (req, res) => {
  try {
    const allowedFields = ['name', 'description', 'category', 'sku', 'barcode', 'cost_price', 'sell_price', 'stock_quantity', 'min_stock_level', 'max_stock_level', 'size', 'color', 'brand', 'supplier_id', 'active', 'image_url'];
    const updateData = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });

    const product = stockData.updateProduct(req.params.id, updateData);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Product photo upload
router.put('/products/:id/photo', authenticateToken, requirePermission('stock:write'), (req, res) => {
  upload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No photo file provided' });
    try {
      const url = `/uploads/products/${req.file.filename}`;
      const updated = stockData.updateProduct(req.params.id, { image_url: url });
      if (!updated) return res.status(404).json({ error: 'Product not found' });
      res.json({ image_url: url, product: updated });
    } catch (error) {
      console.error('Error uploading product photo:', error);
      res.status(500).json({ error: 'Failed to upload photo' });
    }
  });
});

// Product-specific stock adjustment
router.post('/products/:id/adjust', authenticateToken, requirePermission('stock:write'), (req, res) => {
  try {
    const { quantity_change, reason, notes } = req.body;
    const adjustment = stockData.createStockAdjustment({ product_id: parseInt(req.params.id), quantity_change: parseInt(quantity_change, 10) || 0, reason: reason || 'adjustment', notes: notes || null, adjusted_by: req.user.id });
    if (global.wsBroadcast) global.wsBroadcast({ type: 'stock_adjustment', data: adjustment });
    res.status(201).json(adjustment);
  } catch (error) { console.error('Error adjusting stock:', error); res.status(500).json({ error: 'Failed to adjust stock' }); }
});

// Stock adjustments
router.post('/adjustments', authenticateToken, requirePermission('stock:write'), (req, res) => {
  try {
    const allowedAdjustmentFields = ['product_id', 'quantity_change', 'reason', 'reference_type', 'reference_id'];
    const adjustmentData = { adjusted_by: req.user.id };
    allowedAdjustmentFields.forEach(f => { if (req.body[f] !== undefined) adjustmentData[f] = req.body[f]; });
    const adjustment = stockData.createStockAdjustment(adjustmentData);

    if (global.wsBroadcast) {
      global.wsBroadcast({
        type: 'stock_adjustment',
        data: adjustment
      });
    }

    res.status(201).json(adjustment);
  } catch (error) {
    console.error('Error creating stock adjustment:', error);
    res.status(500).json({ error: 'Failed to create stock adjustment' });
  }
});

// Product sales
router.post('/sales', authenticateToken, requirePermission('stock:write'), (req, res) => {
  try {
    const allowedSaleFields = ['product_id', 'quantity', 'unit_price', 'total_price', 'member_id', 'payment_method', 'notes'];
    const saleData = { sold_by: req.user.id };
    allowedSaleFields.forEach(f => { if (req.body[f] !== undefined) saleData[f] = req.body[f]; });
    const sale = stockData.createProductSale(saleData);

    if (global.wsBroadcast) {
      global.wsBroadcast({
        type: 'product_sale',
        data: sale
      });
    }

    res.status(201).json(sale);
  } catch (error) {
    console.error('Error creating product sale:', error);
    res.status(500).json({ error: 'Failed to create product sale' });
  }
});

// POS bulk sale with receipt
router.post('/pos-sale', authenticateToken, requirePermission('stock:write'), (req, res) => {
  try {
    const { items, tendered, payment_method = 'cash', member_id } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items array required' });
    const db = require('../db/connection').getDatabase();
    const receiptItems = [];
    let total = 0;
    for (const item of items) {
      const sale = stockData.createProductSale({
        product_id: item.product_id, quantity: item.quantity, unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity, payment_method, member_id: member_id || null, sold_by: req.user.id,
      });
      const product = db.prepare('SELECT name FROM products WHERE id = ?').get(item.product_id);
      total += item.unit_price * item.quantity;
      receiptItems.push({ ...sale, product_name: product?.name || 'Unknown' });
    }
    const discountPct = parseFloat(req.body.discount) || 0;
    const discountAmt = total * discountPct / 100;
    const finalTotal = total - discountAmt;
    const change = Math.max(0, (parseFloat(tendered) || finalTotal) - finalTotal);
    // Store as transaction record
    const transactionId = `POS-${Date.now()}`;
    db.prepare(`INSERT INTO transactions (member_id, amount, type, status, payment_method, description, processed_at, created_at)
      VALUES (?, ?, 'product', 'completed', ?, ?, datetime('now'), datetime('now'))`)
      .run(member_id || null, finalTotal, payment_method, `POS sale - ${items.length} items`);
    res.json({ sale_id: transactionId, items: receiptItems, subtotal: total, discount: discountPct > 0 ? { pct: discountPct, amount: discountAmt } : null, total: finalTotal, tendered: parseFloat(tendered) || finalTotal, change, sold_by: req.user.first_name || req.user.id, sold_at: new Date().toISOString() });
  } catch (error) {
    console.error('Error processing POS sale:', error);
    res.status(500).json({ error: 'Failed to process sale' });
  }
});

router.get('/sales', authenticateToken, requirePermission('stock:read'), (req, res) => {
  try {
    const filters = {
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      product_id: req.query.product_id
    };

    const sales = stockData.getSales(filters);
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// Stock alerts
router.get('/alerts', authenticateToken, requirePermission('stock:read'), (req, res) => {
  try {
    const alerts = stockData.getActiveStockAlerts();
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching stock alerts:', error);
    res.status(500).json({ error: 'Failed to fetch stock alerts' });
  }
});

router.post('/alerts/:id/resolve', authenticateToken, requirePermission('stock:write'), (req, res) => {
  try {
    stockData.resolveStockAlert(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error resolving stock alert:', error);
    res.status(500).json({ error: 'Failed to resolve stock alert' });
  }
});

// Stock movements (audit trail)
router.get('/movements/:productId', authenticateToken, requirePermission('stock:read'), (req, res) => {
  try {
    const movements = stockData.getStockMovements(req.params.productId);
    res.json(movements);
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
});

// Product deletion
router.delete('/products/:id', authenticateToken, requirePermission('stock:write'), (req, res) => {
  try {
    const ok = stockData.deleteProduct(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Suppliers
router.get('/suppliers', authenticateToken, requirePermission('stock:read'), (req, res) => {
  try {
    const suppliers = stockData.getAllSuppliers();
    res.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

router.post('/suppliers', authenticateToken, requirePermission('stock:write'), (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Supplier name is required' });
    }

    const allowedFields = ['name', 'contact_person', 'email', 'phone', 'address', 'notes'];
    const supplierData = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) supplierData[f] = req.body[f]; });

    const supplier = stockData.createSupplier(supplierData);
    res.status(201).json(supplier);
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

router.get('/suppliers/:id', authenticateToken, requirePermission('stock:read'), (req, res) => {
  try {
    const supplier = stockData.getSupplier(req.params.id);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    res.json(supplier);
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ error: 'Failed to fetch supplier' });
  }
});

router.put('/suppliers/:id', authenticateToken, requirePermission('stock:write'), (req, res) => {
  try {
    const allowedFields = ['name', 'contact_person', 'email', 'phone', 'address', 'notes'];
    const updateData = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });

    const supplier = stockData.updateSupplier(req.params.id, updateData);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    res.json(supplier);
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

router.delete('/suppliers/:id', authenticateToken, requirePermission('stock:write'), (req, res) => {
  try {
    const ok = stockData.deleteSupplier(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Supplier not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

// Stock analytics
router.get('/analytics', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;

    const analytics = stockData.getStockAnalytics(dateFrom, dateTo);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching stock analytics:', error);
    res.status(500).json({ error: 'Failed to fetch stock analytics' });
  }
});

module.exports = router;
