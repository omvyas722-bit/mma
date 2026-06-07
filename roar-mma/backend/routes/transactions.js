// Billing/Transactions routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');
const transactionsData = require('../data/transactions');
const messagingProviders = require('../services/messagingProviders');

const router = express.Router();
let stripe = null;
function getStripe() {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (secretKey) stripe = require('stripe')(secretKey);
  }
  return stripe;
}

// Get all transactions (with filters)
router.get('/', authenticateToken, requirePermission('reports:read'), auditLog('view_list', 'transaction'), (req, res) => {
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
router.post('/', authenticateToken, requirePermission('transactions:create'), auditLog('create', 'transaction'), (req, res) => {
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

    if (updates.status && !['completed', 'failed', 'pending', 'refunded', 'write_off'].includes(updates.status)) {
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

// === Write-offs ===
router.post('/:id/write-off', authenticateToken, requirePermission('transactions:update'), (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Write-off reason required' });
    const tx = transactionsData.getTransactionById(req.params.id);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    if (tx.status === 'write_off') return res.status(400).json({ error: 'Already written off' });
    const updated = transactionsData.writeOffTransaction(req.params.id, reason, req.user.id);
    res.json(updated);
  } catch (error) {
    console.error('Error writing off transaction:', error);
    res.status(500).json({ error: 'Failed to write off transaction' });
  }
});

router.get('/write-offs', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    res.json(transactionsData.getWriteOffs({ date_from: req.query.date_from, date_to: req.query.date_to }));
  } catch (error) {
    console.error('Error fetching write-offs:', error);
    res.status(500).json({ error: 'Failed to fetch write-offs' });
  }
});

// Retry failed transaction (Lightspeed payment retry)
router.post('/:id/retry', authenticateToken, requirePermission('transactions:update'), (req, res) => {
  try {
    const tx = transactionsData.getTransactionById(req.params.id);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    if (tx.status !== 'failed') return res.status(400).json({ error: 'Only failed transactions can be retried' });
    const updated = transactionsData.updateTransaction(req.params.id, { status: 'pending', failure_reason: null });
    console.log(`[RETRY] Transaction ${req.params.id} reset to pending for retry`);
    res.json(updated);
  } catch (error) {
    console.error('Error retrying transaction:', error);
    res.status(500).json({ error: 'Failed to retry transaction' });
  }
});

// Email receipt for transaction
router.post('/:id/email-receipt', authenticateToken, requirePermission('transactions:read'), async (req, res) => {
  try {
    const tx = transactionsData.getTransactionById(req.params.id);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    if (!tx.member_email) return res.status(400).json({ error: 'Member has no email address' });
    const htmlBody = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333}.header{background:#d32f2f;color:#fff;padding:20px;text-align:center;border-radius:8px 8px 0 0}h1{margin:0;font-size:24px}.receipt{background:#f9f9f9;padding:20px;border:1px solid #ddd;border-top:0;border-radius:0 0 8px 8px}.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee}.label{color:#666;font-size:13px}.value{font-weight:600;font-size:13px}.total{font-size:18px;font-weight:700;color:#d32f2f;text-align:right;padding-top:12px}.footer{text-align:center;color:#999;font-size:11px;margin-top:20px}</style></head><body><div class="header"><h1>ROAR MMA</h1><p style="margin:4px 0 0;opacity:0.9">Payment Receipt</p></div><div class="receipt"><div class="row"><span class="label">Transaction</span><span class="value">#${tx.id || ''}</span></div><div class="row"><span class="label">Date</span><span class="value">${tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-AU') : ''}</span></div><div class="row"><span class="label">Amount Paid</span><span class="value">$${(tx.amount || 0).toFixed(2)}</span></div><div class="row" style="border-bottom:none"><span class="label">Status</span><span class="value">${tx.status || ''}</span></div><div class="total">Total: $${(tx.amount || 0).toFixed(2)}</div></div><div class="footer"><p>Thank you for choosing ROAR MMA</p></div></body></html>`;
    const result = await messagingProviders.sendEmail(tx.member_email, `Your ROAR MMA Receipt`, htmlBody);
    if (!result.success) return res.status(400).json({ error: result.reason || 'Failed to send email' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error emailing receipt:', error);
    res.status(500).json({ error: 'Failed to email receipt' });
  }
});

// === Stripe ===
router.post('/stripe/intent', authenticateToken, requirePermission('transactions:create'), async (req, res) => {
  try {
    const s = getStripe();
    if (!s) return res.status(400).json({ error: 'Stripe not configured (missing STRIPE_SECRET_KEY)' });
    const { amount, member_id, description } = req.body;
    if (!amount || !member_id) return res.status(400).json({ error: 'amount and member_id required' });
    const paymentIntent = await s.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'aud',
      metadata: { member_id: String(member_id), description: description || '' }
    });
    res.json({ client_secret: paymentIntent.client_secret, intent_id: paymentIntent.id });
  } catch (error) {
    console.error('Error creating Stripe intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

router.post('/stripe/confirm', authenticateToken, requirePermission('transactions:create'), async (req, res) => {
  try {
    const s = getStripe();
    if (!s) return res.status(400).json({ error: 'Stripe not configured' });
    const { intent_id, member_id, amount, type, description, payment_method } = req.body;
    if (!intent_id || !member_id || !amount || !type) return res.status(400).json({ error: 'intent_id, member_id, amount, type required' });
    const paymentIntent = await s.paymentIntents.retrieve(intent_id);
    if (paymentIntent.status !== 'succeeded') return res.status(400).json({ error: 'Payment has not succeeded' });
    const tx = transactionsData.createTransaction({
      member_id, amount, type, status: 'completed',
      payment_method: payment_method || 'card',
      stripe_payment_intent_id: intent_id,
      stripe_payment_method: paymentIntent.payment_method_types?.[0] || 'card',
      description, processed_at: new Date().toISOString()
    });
    res.json(tx);
  } catch (error) {
    console.error('Error confirming Stripe payment:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// === MRR History ===
router.get('/mrr-history', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    res.json(transactionsData.getMrrHistory(parseInt(req.query.months) || 12));
  } catch (error) {
    console.error('Error fetching MRR history:', error);
    res.status(500).json({ error: 'Failed to fetch MRR history' });
  }
});

// === Subscriptions ===
router.get('/subscriptions', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    res.json(transactionsData.getSubscriptions({ status: req.query.status, member_id: req.query.member_id }));
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

router.post('/subscriptions', authenticateToken, requirePermission('transactions:create'), (req, res) => {
  try {
    const { member_id, plan_name, amount, status, stripe_subscription_id, stripe_price_id, current_period_start, current_period_end } = req.body;
    if (!member_id || !plan_name || amount === undefined) return res.status(400).json({ error: 'member_id, plan_name, amount required' });
    const sub = transactionsData.createSubscription({ member_id, plan_name, amount, status, stripe_subscription_id, stripe_price_id, current_period_start, current_period_end });
    res.status(201).json(sub);
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

module.exports = router;
