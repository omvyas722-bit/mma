// Stock management routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const stockData = require('../data/stock');

const router = express.Router();

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
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
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
