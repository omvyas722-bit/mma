// Messaging management routes
const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const messagingProviders = require('../services/messagingProviders');
const { getDatabase } = require('../db/connection');

const router = express.Router();

const unsubscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many unsubscribe requests' }
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

// Get delivery status for a scheduled message
router.get('/deliveries/:scheduledMessageId', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const db = getDatabase();

    const deliveries = db.prepare(`
      SELECT * FROM message_deliveries
      WHERE scheduled_message_id = ?
      ORDER BY created_at DESC
    `).all(req.params.scheduledMessageId);

    res.json(deliveries);
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

// Get recent deliveries
router.get('/deliveries', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const db = getDatabase();
    const limit = parseInt(req.query.limit) || 100;
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
