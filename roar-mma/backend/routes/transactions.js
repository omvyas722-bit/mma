// Billing/Transactions routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const transactionsData = require('../data/transactions');

const router = express.Router();

// Get all transactions (with filters)
router.get('/', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const filters = {
      member_id: req.query.member_id,
      status: req.query.status,
      type: req.query.type,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      limit: req.query.limit,
      offset: req.query.offset
    };

    const result = transactionsData.getAllTransactions(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get revenue statistics
router.get('/stats', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const stats = transactionsData.getRevenueStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching revenue stats:', error);
    res.status(500).json({ error: 'Failed to fetch revenue stats' });
  }
});

// Get failed payments
router.get('/failed', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const failedPayments = transactionsData.getFailedPayments();
    res.json(failedPayments);
  } catch (error) {
    console.error('Error fetching failed payments:', error);
    res.status(500).json({ error: 'Failed to fetch failed payments' });
  }
});

// Get single transaction by ID
router.get('/:id', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const transaction = transactionsData.getTransactionById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Create manual transaction
router.post('/', authenticateToken, requirePermission('transactions:create'), (req, res) => {
  try {
    const { member_id, amount, type, payment_method, description } = req.body;

    if (!member_id || amount === undefined || !type) {
      return res.status(400).json({ error: 'member_id, amount, and type required' });
    }

    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    const validTypes = ['membership', 'hold_fee', 'pt_pack', 'product', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    }

    const validPaymentMethods = ['card', 'cash', 'bank_transfer', 'other'];
    if (payment_method && !validPaymentMethods.includes(payment_method)) {
      return res.status(400).json({ error: `payment_method must be one of: ${validPaymentMethods.join(', ')}` });
    }

    const transaction = transactionsData.createTransaction({
      member_id,
      amount,
      type,
      status: 'completed',
      payment_method: payment_method || 'cash',
      description,
      processed_at: new Date().toISOString()
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Update transaction status
router.put('/:id', authenticateToken, requirePermission('transactions:update'), (req, res) => {
  try {
    const transaction = transactionsData.getTransactionById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const allowedFields = ['status', 'payment_method', 'description'];
    const updates = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (allowedFields.includes(key)) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    if (updates.status && !['completed', 'failed', 'pending', 'refunded'].includes(updates.status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const updatedTransaction = transactionsData.updateTransaction(req.params.id, updates);

    res.json(updatedTransaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// Refund transaction
router.post('/:id/refund', authenticateToken, requirePermission('transactions:refund'), (req, res) => {
  try {
    const transaction = transactionsData.getTransactionById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status === 'refunded') {
      return res.status(400).json({ error: 'Transaction already refunded' });
    }

    if (transaction.status !== 'completed') {
      return res.status(400).json({ error: 'Only completed transactions can be refunded' });
    }

    const updatedTransaction = transactionsData.updateTransaction(req.params.id, {
      status: 'refunded'
    });

    res.json(updatedTransaction);
  } catch (error) {
    console.error('Error refunding transaction:', error);
    res.status(500).json({ error: 'Failed to refund transaction' });
  }
});

module.exports = router;
