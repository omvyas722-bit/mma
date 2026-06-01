// Lightspeed webhook handler
const express = require('express');
const crypto = require('crypto');
const { getDatabase } = require('../db/connection');
const transactionsData = require('../data/transactions');
const membersData = require('../data/members');

const router = express.Router();

const WEBHOOK_SECRET = process.env.LIGHTSPEED_WEBHOOK_SECRET;
if (!WEBHOOK_SECRET) {
  console.error('[WEBHOOKS] LIGHTSPEED_WEBHOOK_SECRET environment variable is not set. Webhook verification will reject all requests.');
}

// Verify webhook signature
function verifyWebhookSignature(payload, signature) {
  if (!WEBHOOK_SECRET) return false;
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = hmac.update(payload).digest('hex');
  if (typeof signature !== 'string' || typeof digest !== 'string' ||
      signature.length !== digest.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// Lightspeed webhook endpoint
router.post('/lightspeed', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-lightspeed-signature'];
    const payload = req.body.toString();

    // Verify signature
    if (!signature || !verifyWebhookSignature(payload, signature)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(payload);
    console.log('Lightspeed webhook received:', event.type);

    // Check for duplicate webhook (idempotency)
    const db = getDatabase();
    const existingTransaction = db.prepare(
      'SELECT id FROM transactions WHERE lightspeed_transaction_id = ?'
    ).get(event.data.id);

    if (existingTransaction) {
      console.log('Duplicate webhook, ignoring');
      return res.json({ received: true, duplicate: true });
    }

    // Handle different event types
    switch (event.type) {
      case 'payment.completed':
        await handlePaymentSucceeded(event.data);
        break;

      case 'payment.failed':
        await handlePaymentFailed(event.data);
        break;

      case 'subscription.created':
        await handleSubscriptionCreated(event.data);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event.data);
        break;

      default:
        console.log('Unknown webhook event type:', event.type);
    }

    // Broadcast event via WebSocket
    if (global.wsBroadcast) {
      global.wsBroadcast({
        type: event.type.replace('.', ':'),
        data: event.data
      });
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handlePaymentSucceeded(data) {
  console.log('Processing successful payment:', data.id);

  const member = findMember(data);

  if (!member) {
    console.error('Member not found for payment:', data.customer_email);
    return;
  }

  // Create transaction record
  const transaction = transactionsData.createTransaction({
    member_id: member.id,
    amount: (data.amount || 0) / 100, // Convert cents to dollars
    currency: data.currency,
    type: determineTransactionType(data.description),
    status: 'completed',
    payment_method: data.payment_method,
    lightspeed_transaction_id: data.id,
    description: data.description,
    processed_at: new Date(data.created * 1000).toISOString()
  });

  console.log('Transaction created:', transaction.id);

  // If member is on trial and this is their first payment, convert to active
  if (member.status === 'trial') {
    membersData.updateMember(member.id, {
      status: 'active',
      lightspeed_customer_id: data.customer_id
    });
    console.log('Member converted from trial to active:', member.id);
  }
}

async function handlePaymentFailed(data) {
  console.log('Processing failed payment:', data.id);

  const member = findMember(data);

  if (!member) {
    console.error('Member not found for failed payment:', data.customer_email);
    return;
  }

  // Create failed transaction record
  const transaction = transactionsData.createTransaction({
    member_id: member.id,
    amount: (data.amount || 0) / 100,
    currency: data.currency,
    type: determineTransactionType(data.description),
    status: 'failed',
    payment_method: data.payment_method,
    lightspeed_transaction_id: data.id,
    description: data.description,
    failure_reason: data.failure_reason || 'Unknown',
    processed_at: new Date(data.created * 1000).toISOString()
  });

  console.log('Failed transaction recorded:', transaction.id);

  // Queue AI agent action for MIDAS to handle payment failure
  const db = getDatabase();
  db.prepare(`
    INSERT INTO event_queue (event_type, entity_type, entity_id, payload, assigned_agent, requires_approval)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'payment_failed',
    'transaction',
    transaction.id,
    JSON.stringify({ member_id: member.id, amount: (data.amount || 0) / 100, reason: data.failure_reason }),
    'MIDAS',
    1 // Requires human approval before taking action
  );

  console.log('Payment failure queued for MIDAS agent');
}

function findMember(data) {
  const db = getDatabase();
  return membersData.getMemberByEmail(data.customer_email) ||
         db.prepare('SELECT * FROM members WHERE lightspeed_customer_id = ?').get(data.customer_id);
}

async function handleSubscriptionCreated(data) {
  console.log('Processing subscription created:', data.id);

  const member = findMember(data);

  if (member) {
    membersData.updateMember(member.id, {
      lightspeed_customer_id: data.customer_id,
      status: 'active'
    });
    console.log('Member subscription activated:', member.id);
  }
}

async function handleSubscriptionCancelled(data) {
  console.log('Processing subscription cancelled:', data.id);

  const member = findMember(data);

  if (member) {
    membersData.updateMember(member.id, {
      status: 'cancelled',
      cancellation_date: new Date().toISOString().split('T')[0]
    });
    console.log('Member subscription cancelled:', member.id);
  }
}

function determineTransactionType(description) {
  if (!description) return 'other';

  const desc = description.toLowerCase();

  if (desc.includes('membership') || desc.includes('subscription')) {
    return 'membership';
  } else if (desc.includes('hold') || desc.includes('pause')) {
    return 'hold_fee';
  } else if (desc.includes('pt') || desc.includes('personal training')) {
    return 'pt_pack';
  } else if (desc.includes('product') || desc.includes('gear')) {
    return 'product';
  }

  return 'other';
}

// Lightspeed manual sync trigger
router.post('/lightspeed/sync', require('../middleware/auth').authenticateToken, require('../middleware/auth').requirePermission('reports:read'), async (req, res) => {
  try {
    const { daysBack = 30 } = req.body;
    const lightspeedSync = require('../services/lightspeedSync');
    const result = await lightspeedSync.syncAll();
    res.json(result);
  } catch (error) {
    console.error('Lightspeed sync error:', error);
    res.status(500).json({ error: 'Sync failed: ' + error.message });
  }
});

module.exports = router;
