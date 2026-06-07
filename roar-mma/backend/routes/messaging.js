// Messaging management routes
const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const messagingProviders = require('../services/messagingProviders');
const scheduledMessagesData = require('../data/scheduledMessages');
const { getDatabase } = require('../db/connection');

const router = express.Router();

// Ensure uploads/comms directory exists
const commsDir = path.join(__dirname, '..', 'uploads', 'comms');
if (!fs.existsSync(commsDir)) fs.mkdirSync(commsDir, { recursive: true });

const attStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, commsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + path.extname(file.originalname))
});
const fileUpload = multer({
  storage: attStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  }
});

const unsubscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many unsubscribe requests' }
});

// Send a message (email or SMS)
router.post('/send', authenticateToken, requirePermission('communications:write'), fileUpload.array('files', 5), async (req, res) => {
  try {
    const { to, subject, body, html, channel } = req.body;
    if (!to || !body) return res.status(400).json({ error: 'to and body are required' });

    const files = req.files || [];
    const totalSize = files.reduce((s, f) => s + f.size, 0);
    if (totalSize > 10 * 1024 * 1024) return res.status(400).json({ error: 'Total file size exceeds 10MB' });

    const attachments = files.map(f => ({
      filename: f.filename, originalName: f.originalname,
      mimeType: f.mimetype, size: f.size, path: f.path
    }));

    if (channel === 'sms' || (!subject && !html)) {
      console.log(`[SMS] To: ${to} Body: ${body}`);
      return res.json({ success: true, channel: 'sms', attachments });
    }
    const result = await messagingProviders.sendEmail(to, subject || 'ROAR MMA', html || body);
    console.log(`[EMAIL] To: ${to} Subject: ${subject}`, html ? '(HTML)' : '(plain text)');
    res.json({ success: true, channel: 'email', result, attachments });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get messaging stats
router.get('/stats', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;

    const stats = messagingProviders.getMessagingStats(dateFrom, dateTo);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching messaging stats:', error);
    res.status(500).json({ error: 'Failed to fetch messaging stats' });
  }
});

// Get delivery status for a scheduled message (with per-recipient detail + summary)
router.get('/deliveries/:scheduledMessageId', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const db = getDatabase();

    const deliveries = db.prepare(`
      SELECT md.*,
             m.first_name || ' ' || m.last_name as member_name,
             l.first_name || ' ' || l.last_name as lead_name
      FROM message_deliveries md
      LEFT JOIN scheduled_messages sm ON md.scheduled_message_id = sm.id
      LEFT JOIN members m ON sm.member_id = m.id
      LEFT JOIN leads l ON sm.lead_id = l.id
      WHERE md.scheduled_message_id = ?
      ORDER BY md.created_at DESC
    `).all(req.params.scheduledMessageId);

    const total = deliveries.length;
    const statusCounts = deliveries.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {});
    const deliveredCount = (statusCounts.delivered || 0) + (statusCounts.sent || 0);
    const successRate = total > 0 ? Math.round((deliveredCount / total) * 100) : 0;

    res.json({ deliveries, summary: { total, deliveredCount, failedCount: statusCounts.failed || 0, successRate, statusCounts } });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

// Retry a failed delivery
router.post('/deliveries/:deliveryId/retry', authenticateToken, requirePermission('communications:write'), async (req, res) => {
  try {
    const db = getDatabase();
    const delivery = db.prepare(`SELECT * FROM message_deliveries WHERE id = ?`).get(req.params.deliveryId);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    if (delivery.status !== 'failed' && delivery.status !== 'bounced') return res.status(400).json({ error: 'Can only retry failed deliveries' });

    db.prepare(`UPDATE message_deliveries SET status = 'sending', status_detail = NULL, failed_at = NULL, updated_at = datetime('now') WHERE id = ?`).run(delivery.id);

    if (delivery.channel === 'sms') {
      const scheduledMsg = db.prepare(`SELECT body FROM scheduled_messages WHERE id = ?`).get(delivery.scheduled_message_id);
      const result = await messagingProviders.sendSMS(delivery.recipient, scheduledMsg?.body || 'Retry message', delivery.scheduled_message_id);
      if (result.success) res.json({ success: true });
      else res.status(500).json({ error: result.error || result.reason });
    } else {
      const scheduledMsg = db.prepare(`SELECT subject, body FROM scheduled_messages WHERE id = ?`).get(delivery.scheduled_message_id);
      const result = await messagingProviders.sendEmail(delivery.recipient, scheduledMsg?.subject || 'ROAR MMA', scheduledMsg?.body || 'Retry message', delivery.scheduled_message_id);
      if (result.success) res.json({ success: true });
      else res.status(500).json({ error: result.error || result.reason });
    }
  } catch (error) {
    console.error('Error retrying delivery:', error);
    res.status(500).json({ error: 'Failed to retry delivery' });
  }
});

// Get recent deliveries
router.get('/deliveries', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const db = getDatabase();
    const limit = parseInt(req.query.limit, 10) || 100;
    const status = req.query.status;

    let query = 'SELECT * FROM message_deliveries';
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const deliveries = db.prepare(query).all(...params);
    res.json(deliveries);
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

// Get failed deliveries
router.get('/deliveries/failed/recent', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const db = getDatabase();

    const failed = db.prepare(`
      SELECT * FROM message_deliveries
      WHERE status IN ('failed', 'bounced')
      ORDER BY created_at DESC
      LIMIT 50
    `).all();

    res.json(failed);
  } catch (error) {
    console.error('Error fetching failed deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch failed deliveries' });
  }
});

// ---- 2-Way SMS Conversations ----

// List conversations grouped by phone number
router.get('/conversations', authenticateToken, requirePermission('communications:read'), (req, res) => {
  try {
    const db = getDatabase();

    const conversations = db.prepare(`
      SELECT
        sm.recipient_phone as phone,
        MAX(sm.created_at) as last_message_at,
        (SELECT body FROM scheduled_messages WHERE recipient_phone = sm.recipient_phone AND message_type = 'sms' ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT response_text FROM scheduled_messages WHERE recipient_phone = sm.recipient_phone AND response_received = 1 ORDER BY created_at DESC LIMIT 1) as last_reply,
        SUM(CASE WHEN sm.response_received = 1 AND sm.status = 'sent' THEN 1 ELSE 0 END) as unread_count,
        sm.member_id,
        sm.lead_id,
        m.first_name || ' ' || m.last_name as member_name,
        l.first_name || ' ' || l.last_name as lead_name,
        COALESCE(m.phone, l.phone) as contact_phone
      FROM scheduled_messages sm
      LEFT JOIN members m ON sm.member_id = m.id
      LEFT JOIN leads l ON sm.lead_id = l.id
      WHERE sm.recipient_phone IS NOT NULL
        AND sm.message_type = 'sms'
      GROUP BY sm.recipient_phone
      ORDER BY last_message_at DESC
    `).all();

    res.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get messages for a single conversation
router.get('/conversations/:phone', authenticateToken, requirePermission('communications:read'), (req, res) => {
  try {
    const db = getDatabase();

    const messages = db.prepare(`
      SELECT sm.*,
             m.first_name || ' ' || m.last_name as member_name,
             l.first_name || ' ' || l.last_name as lead_name
      FROM scheduled_messages sm
      LEFT JOIN members m ON sm.member_id = m.id
      LEFT JOIN leads l ON sm.lead_id = l.id
      WHERE sm.recipient_phone = ?
        AND sm.message_type = 'sms'
      ORDER BY sm.created_at ASC
    `).all(req.params.phone);

    // Mark responses as read
    db.prepare(`UPDATE scheduled_messages SET response_received = 0 WHERE recipient_phone = ? AND response_received = 1 AND message_type = 'sms'`).run(req.params.phone);

    res.json({ messages, phone: req.params.phone });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Reply to a conversation
router.post('/conversations/:phone/reply', authenticateToken, requirePermission('communications:write'), async (req, res) => {
  try {
    const { body } = req.body;
    if (!body || !body.trim()) return res.status(400).json({ error: 'Message body is required' });

    const db = getDatabase();
    const lastMsg = db.prepare(`
      SELECT member_id, lead_id FROM scheduled_messages
      WHERE recipient_phone = ? ORDER BY created_at DESC LIMIT 1
    `).get(req.params.phone);

    const msg = scheduledMessagesData.createScheduledMessage({
      recipient_phone: req.params.phone,
      body,
      message_type: 'sms',
      scheduled_for: new Date().toISOString(),
      member_id: lastMsg?.member_id || null,
      lead_id: lastMsg?.lead_id || null
    });

    const result = await messagingProviders.sendSMS(req.params.phone, body, msg.id);
    if (result.success) {
      scheduledMessagesData.markMessageSent(msg.id);
    } else {
      scheduledMessagesData.markMessageFailed(msg.id, result.error || result.reason);
    }

    res.json({ success: true, sent: result.success, message: { ...msg, member_name: lastMsg?.member_name, lead_name: lastMsg?.lead_name } });
  } catch (error) {
    console.error('Error sending reply:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// Get unsubscribe list
router.get('/unsubscribes', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const db = getDatabase();

    const unsubscribes = db.prepare(`
      SELECT u.*,
             m.first_name || ' ' || m.last_name as member_name,
             l.first_name || ' ' || l.last_name as lead_name
      FROM unsubscribes u
      LEFT JOIN members m ON u.member_id = m.id
      LEFT JOIN leads l ON u.lead_id = l.id
      ORDER BY u.unsubscribed_at DESC
    `).all();

    res.json(unsubscribes);
  } catch (error) {
    console.error('Error fetching unsubscribes:', error);
    res.status(500).json({ error: 'Failed to fetch unsubscribes' });
  }
});

// Add to unsubscribe list
router.post('/unsubscribes', authenticateToken, requirePermission('members:write'), (req, res) => {
  try {
    const result = messagingProviders.addUnsubscribe(
      req.body.contact_value,
      req.body.contact_type,
      req.body.channel || 'all',
      req.body.reason || null,
      req.body.member_id || null,
      req.body.lead_id || null
    );

    res.json(result);
  } catch (error) {
    console.error('Error adding unsubscribe:', error);
    res.status(500).json({ error: 'Failed to add unsubscribe' });
  }
});

// Public unsubscribe endpoint (no auth required)
router.get('/unsubscribe/:contactValue', unsubscribeLimiter, (req, res) => {
  try {
    const contactValue = decodeURIComponent(req.params.contactValue);
    const channel = req.query.channel || 'all';

    // Determine contact type
    const contactType = contactValue.includes('@') ? 'email' : 'phone';

    // Validate email or phone format
    if (contactType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (contactType === 'phone' && !/^\+?[\d\s\-().]{7,20}$/.test(contactValue)) {
      return res.status(400).json({ error: 'Invalid phone format' });
    }

    const safeChannel = String(channel).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    const channelDisplay = safeChannel === 'all' ? 'any messages' : safeChannel + ' messages';

    messagingProviders.addUnsubscribe(
      contactValue,
      contactType,
      channel,
      'User requested via link'
    );

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Unsubscribed - ROAR MMA</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
          h1 { color: #d32f2f; }
          p { color: #666; line-height: 1.6; }
        </style>
      </head>
      <body>
        <h1>You've been unsubscribed</h1>
        <p>You will no longer receive ${channelDisplay} from ROAR MMA.</p>
        <p>If this was a mistake, please contact us at info@roarmma.com.au</p>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error processing unsubscribe:', error);
    res.status(500).json({ error: 'Error processing unsubscribe request' });
  }
});

// Get message costs
router.get('/costs', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const db = getDatabase();
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;

    let query = 'SELECT * FROM message_costs';
    const params = [];

    if (dateFrom && dateTo) {
      query += ' WHERE date BETWEEN ? AND ?';
      params.push(dateFrom, dateTo);
    }

    query += ' ORDER BY date DESC';

    const costs = db.prepare(query).all(...params);
    res.json(costs);
  } catch (error) {
    console.error('Error fetching costs:', error);
    res.status(500).json({ error: 'Failed to fetch costs' });
  }
});

// Get provider settings
router.get('/providers/settings', authenticateToken, requirePermission('settings:read'), (req, res) => {
  try {
    const db = getDatabase();

    const settings = db.prepare(`
      SELECT provider, setting_key, setting_value, encrypted
      FROM messaging_provider_settings
      ORDER BY provider, setting_key
    `).all();

    // Mask encrypted values
    settings.forEach(s => {
      if (s.encrypted && s.setting_value && s.setting_value !== 'YOUR_TWILIO_AUTH_TOKEN' && s.setting_value !== 'YOUR_BREVO_API_KEY') {
        s.setting_value = '***HIDDEN***';
      }
    });

    res.json(settings);
  } catch (error) {
    console.error('Error fetching provider settings:', error);
    res.status(500).json({ error: 'Failed to fetch provider settings' });
  }
});

// Update provider setting
router.put('/providers/settings/:provider/:key', authenticateToken, requirePermission('settings:write'), (req, res) => {
  try {
    const db = getDatabase();

    db.prepare(`
      UPDATE messaging_provider_settings
      SET setting_value = ?,
          updated_at = datetime('now')
      WHERE provider = ? AND setting_key = ?
    `).run(req.body.value, req.params.provider, req.params.key);

    // Reload settings in provider
    messagingProviders.loadSettings();

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating provider setting:', error);
    res.status(500).json({ error: 'Failed to update provider setting' });
  }
});

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^\+?[\d\s\-().]{7,20}$/.test(phone);
}

// Test SMS sending
router.post('/test/sms', authenticateToken, requirePermission('settings:write'), async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({ error: 'Valid phone number is required' });
    }

    const result = await messagingProviders.sendSMS(
      phone,
      req.body.message || 'Test message from ROAR MMA'
    );

    res.json(result);
  } catch (error) {
    console.error('Error sending test SMS:', error);
    res.status(500).json({ error: 'Failed to send test SMS' });
  }
});

// Test email sending
router.post('/test/email', authenticateToken, requirePermission('settings:write'), async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    const result = await messagingProviders.sendEmail(
      email,
      req.body.subject || 'Test Email from ROAR MMA',
      req.body.body || 'This is a test email.'
    );

    res.json(result);
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

module.exports = router;
