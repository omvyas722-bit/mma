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
    const result = await lightspeedSync.syncAll(daysBack);
    res.json(result);
  } catch (error) {
    console.error('Lightspeed sync error:', error);
    res.status(500).json({ error: 'Sync failed: ' + error.message });
  }
});

// === Stripe webhook ===
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(400).json({ error: 'Stripe webhook not configured' });

    let stripe = null;
    try { stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); } catch {}
    if (!stripe) return res.status(400).json({ error: 'Stripe not initialized' });

    let event;
    try { event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret); }
    catch (err) { return res.status(400).json({ error: 'Webhook signature verification failed' }); }

    const db = getDatabase();
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        const memberId = pi.metadata?.member_id;
        if (memberId && !db.prepare('SELECT id FROM transactions WHERE stripe_payment_intent_id = ?').get(pi.id)) {
          transactionsData.createTransaction({
            member_id: parseInt(memberId),
            amount: (pi.amount || 0) / 100,
            currency: pi.currency?.toUpperCase() || 'AUD',
            type: pi.metadata?.type || 'membership',
            status: 'completed',
            payment_method: 'card',
            stripe_payment_intent_id: pi.id,
            stripe_payment_method: pi.payment_method_types?.[0] || 'card',
            description: pi.metadata?.description || pi.description || 'Stripe payment',
            processed_at: new Date(pi.created * 1000).toISOString()
          });
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        const memberId = pi.metadata?.member_id;
        if (memberId) {
          transactionsData.createTransaction({
            member_id: parseInt(memberId),
            amount: (pi.amount || 0) / 100,
            currency: pi.currency?.toUpperCase() || 'AUD',
            type: pi.metadata?.type || 'membership',
            status: 'failed',
            payment_method: 'card',
            stripe_payment_intent_id: pi.id,
            description: pi.metadata?.description || 'Stripe payment failed',
            failure_reason: pi.last_payment_error?.message || 'Unknown',
            processed_at: new Date().toISOString()
          });
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const member = db.prepare('SELECT id FROM members WHERE stripe_customer_id = ?').get(sub.customer);
        if (member) {
          const existing = db.prepare('SELECT id FROM subscriptions WHERE stripe_subscription_id = ?').get(sub.id);
          const data = {
            member_id: member.id,
            plan_name: sub.items?.data?.[0]?.price?.nickname || sub.items?.data?.[0]?.plan?.product?.name || 'Membership',
            amount: (sub.items?.data?.[0]?.price?.unit_amount || 0) / 100,
            status: sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'active' : sub.status === 'canceled' ? 'cancelled' : sub.status,
            stripe_subscription_id: sub.id,
            stripe_price_id: sub.items?.data?.[0]?.price?.id,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          };
          if (sub.status === 'canceled') data.cancelled_at = new Date().toISOString();
          if (existing) {
            db.prepare(`UPDATE subscriptions SET plan_name=?, amount=?, status=?, stripe_price_id=?, current_period_start=?, current_period_end=?, cancelled_at=COALESCE(?,cancelled_at), updated_at=datetime('now') WHERE stripe_subscription_id=?`).run(
              data.plan_name, data.amount, data.status, data.stripe_price_id, data.current_period_start, data.current_period_end, data.cancelled_at || null, sub.id);
          } else {
            transactionsData.createSubscription(data);
          }
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        db.prepare("UPDATE subscriptions SET status='cancelled', cancelled_at=datetime('now'), updated_at=datetime('now') WHERE stripe_subscription_id=?").run(sub.id);
        break;
      }
    }

    if (global.wsBroadcast) global.wsBroadcast({ type: event.type.replace('.', ':'), data: event.data.object });
    res.json({ received: true });
  } catch (error) {
    console.error('[STRIPE WEBHOOK] Error:', error.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Get webhook status info
router.get('/status', require('../middleware/auth').authenticateToken, require('../middleware/auth').requirePermission('settings:read'), (req, res) => {
  try {
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const db = getDatabase();
    const lastLightspeed = db.prepare("SELECT created_at FROM audit_logs WHERE entity_type = 'webhook' AND details LIKE '%lightspeed%' ORDER BY created_at DESC LIMIT 1").get();
    const lastStripe = db.prepare("SELECT created_at FROM audit_logs WHERE entity_type = 'webhook' AND details LIKE '%stripe%' ORDER BY created_at DESC LIMIT 1").get();
    res.json({
      lightspeed: {
        url: `${baseUrl}/api/webhooks/lightspeed`,
        enabled: !!process.env.LIGHTSPEED_WEBHOOK_SECRET,
        last_delivery: lastLightspeed?.created_at || null
      },
      stripe: {
        url: `${baseUrl}/api/webhooks/stripe`,
        enabled: !!process.env.STRIPE_WEBHOOK_SECRET,
        last_delivery: lastStripe?.created_at || null
      }
    });
  } catch (error) {
    console.error('[WEBHOOKS] Status error:', error);
    res.status(500).json({ error: 'Failed to get webhook status' });
  }
});

module.exports = router;
module.exports.determineTransactionType = determineTransactionType;
module.exports.verifyWebhookSignature = verifyWebhookSignature;
