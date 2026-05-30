// Messaging providers - Twilio SMS + Brevo Email
const { getDatabase } = require('../db/connection');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
let twilioClient = null;
let twilioClientSid = null;
function getTwilioClient(accountSid, authToken) {
  if (!twilioClient || twilioClientSid !== accountSid) {
    twilioClient = twilio(accountSid, authToken);
    twilioClientSid = accountSid;
  }
  return twilioClient;
}

class MessagingProviders {
  constructor() {
    this.settings = {};
    this._loaded = false;
  }

  // Load provider settings from database
  loadSettings() {
    this.settings = {};
    const db = getDatabase();
    const rows = db.prepare('SELECT provider, setting_key, setting_value FROM messaging_provider_settings').all();

    rows.forEach(row => {
      if (!this.settings[row.provider]) {
        this.settings[row.provider] = {};
      }
      this.settings[row.provider][row.setting_key] = row.setting_value;
    });
    this._loaded = true;
  }

  // Force reload settings from database (e.g., after settings update)
  reloadSettings() {
    this._loaded = false;
    this.loadSettings();
  }

  // Check if contact is unsubscribed
  isUnsubscribed(contactValue, channel) {
    const db = getDatabase();

    const unsubscribe = db.prepare(`
      SELECT * FROM unsubscribes
      WHERE contact_value = ?
        AND (channel = ? OR channel = 'all')
    `).get(contactValue, channel);

    return !!unsubscribe;
  }

  // Check rate limit
  checkRateLimit(contactValue, channel) {
    if (!contactValue) return { allowed: false, remaining: 0, reason: 'No contact value' };
    const db = getDatabase();
    const now = new Date();
    const utcStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const windowStart = utcStart.toISOString();
    const windowEnd = new Date(utcStart.getTime() + 86400000).toISOString();

    // Get or create rate limit record
    let rateLimit = db.prepare(`
      SELECT * FROM rate_limits
      WHERE contact_value = ?
        AND channel = ?
        AND window_start = ?
    `).get(contactValue, channel, windowStart);

    const maxPerDay = channel === 'sms'
      ? (parseInt(process.env.SMS_RATE_LIMIT_PER_DAY, 10) || 5)
      : (parseInt(process.env.EMAIL_RATE_LIMIT_PER_DAY, 10) || 10);

    if (!rateLimit) {
      // Create new rate limit record (use INSERT OR IGNORE to handle race conditions)
      db.prepare(`
        INSERT OR IGNORE INTO rate_limits (contact_value, channel, messages_sent, window_start, window_end)
        VALUES (?, ?, 0, ?, ?)
      `).run(contactValue, channel, windowStart, windowEnd);

      // Re-fetch after insert to handle concurrent inserts
      rateLimit = db.prepare(`
        SELECT * FROM rate_limits
        WHERE contact_value = ?
          AND channel = ?
          AND window_start = ?
      `).get(contactValue, channel, windowStart);
    }

    if (rateLimit.messages_sent >= maxPerDay) {
      return { allowed: false, remaining: 0, reason: 'Rate limit exceeded' };
    }

    // Increment counter atomically
    const updateResult = db.prepare(`
      UPDATE rate_limits
      SET messages_sent = messages_sent + 1
      WHERE id = ? AND messages_sent < ?
    `).run(rateLimit.id, maxPerDay);

    if (updateResult.changes === 0) {
      return { allowed: false, remaining: 0, reason: 'Rate limit exceeded' };
    }

    return { allowed: true, remaining: maxPerDay - rateLimit.messages_sent - 1 };
  }

  // Create delivery record
  createDelivery(scheduledMessageId, channel, recipient, provider) {
    const db = getDatabase();

    const result = db.prepare(`
      INSERT INTO message_deliveries (
        scheduled_message_id, channel, recipient, provider, status, sent_at
      ) VALUES (?, ?, ?, ?, 'sending', datetime('now'))
    `).run(scheduledMessageId, channel, recipient, provider);

    return result.lastInsertRowid;
  }

  // Update delivery status
  updateDeliveryStatus(deliveryId, status, statusDetail = null, externalId = null, cost = null) {
    const db = getDatabase();

    const updates = ['status = ?', 'updated_at = datetime(\'now\')'];
    const values = [status];

    if (statusDetail) {
      updates.push('status_detail = ?');
      values.push(statusDetail);
    }

    if (externalId) {
      updates.push('external_id = ?');
      values.push(externalId);
    }

    if (cost !== null) {
      updates.push('cost = ?');
      values.push(cost);
    }

    if (status === 'sent') {
      updates.push('sent_at = datetime(\'now\')');
    } else if (status === 'delivered') {
      updates.push('delivered_at = datetime(\'now\')');
    } else if (status === 'failed' || status === 'bounced') {
      updates.push('failed_at = datetime(\'now\')');
    }

    values.push(deliveryId);

    db.prepare(`
      UPDATE message_deliveries
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);
  }

  // Track message cost
  trackCost(channel, cost) {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];

    const existing = db.prepare('SELECT * FROM message_costs WHERE date = ?').get(today);

    if (existing) {
      if (channel === 'sms') {
        db.prepare(`
          UPDATE message_costs
          SET sms_sent = sms_sent + 1,
              sms_cost = sms_cost + ?,
              total_cost = total_cost + ?
          WHERE date = ?
        `).run(cost, cost, today);
      } else {
        db.prepare(`
          UPDATE message_costs
          SET email_sent = email_sent + 1,
              email_cost = email_cost + ?,
              total_cost = total_cost + ?
          WHERE date = ?
        `).run(cost, cost, today);
      }
    } else {
      const smsCount = channel === 'sms' ? 1 : 0;
      const smsCost = channel === 'sms' ? cost : 0;
      const emailCount = channel === 'email' ? 1 : 0;
      const emailCost = channel === 'email' ? cost : 0;

      db.prepare(`
        INSERT INTO message_costs (date, sms_sent, sms_cost, email_sent, email_cost, total_cost)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(today, smsCount, smsCost, emailCount, emailCost, cost);
    }
  }

  // Send SMS via Twilio
  async sendSMS(phone, message, scheduledMessageId = null) {
    if (!phone) return { success: false, reason: 'No phone number' };
    if (!this.settings.twilio || this.settings.twilio.enabled !== 'true') {
      console.log('[SMS - DISABLED] To:', phone, 'Message:', message);
      return { success: false, reason: 'Twilio not enabled' };
    }

    // Check unsubscribe
    if (this.isUnsubscribed(phone, 'sms')) {
      console.log('[SMS - UNSUBSCRIBED]', phone);
      return { success: false, reason: 'Unsubscribed' };
    }

    // Check rate limit
    const rateLimit = this.checkRateLimit(phone, 'sms');
    if (!rateLimit.allowed) {
      console.log('[SMS - RATE LIMITED]', phone);
      return { success: false, reason: rateLimit.reason };
    }

    const deliveryId = scheduledMessageId ? this.createDelivery(scheduledMessageId, 'sms', phone, 'twilio') : null;

    try {
      const client = getTwilioClient(this.settings.twilio.account_sid, this.settings.twilio.auth_token);
      const result = await client.messages.create({
        body: message,
        from: this.settings.twilio?.from_number,
        to: phone
      }, { timeout: 15000 });

      const segments = result.numSegments ? parseInt(result.numSegments, 10) : Math.ceil(message.length / 160);
      const cost = segments * 0.08;

      if (deliveryId) {
        this.updateDeliveryStatus(deliveryId, 'sent', 'Sent via Twilio', result.sid, cost);
        this.trackCost('sms', cost);
      }

      return { success: true, cost, segments, sid: result.sid };
    } catch (error) {
      console.error('[SMS - ERROR]', error);

      if (deliveryId) {
        this.updateDeliveryStatus(deliveryId, 'failed', error.message);
      }

      return { success: false, error: error.message };
    }
  }

  // Send Email via Brevo
  async sendEmail(email, subject, body, scheduledMessageId = null) {
    if (!this.settings.brevo || this.settings.brevo.enabled !== 'true') {
      console.log('[EMAIL - DISABLED] To:', email, 'Subject:', subject);
      return { success: false, reason: 'Brevo not enabled' };
    }

    // Check unsubscribe
    if (this.isUnsubscribed(email, 'email')) {
      console.log('[EMAIL - UNSUBSCRIBED]', email);
      return { success: false, reason: 'Unsubscribed' };
    }

    // Check rate limit
    const rateLimit = this.checkRateLimit(email, 'email');
    if (!rateLimit.allowed) {
      console.log('[EMAIL - RATE LIMITED]', email);
      return { success: false, reason: rateLimit.reason };
    }

    const deliveryId = scheduledMessageId ? this.createDelivery(scheduledMessageId, 'email', email, 'brevo') : null;

    try {
      const smtpTransport = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: parseInt(process.env.SMTP_PORT, 10) === 465,
      auth: {
        user: process.env.SMTP_USER || this.settings.brevo?.smtp_user || this.settings.brevo?.from_email,
        pass: process.env.SMTP_PASS || this.settings.brevo?.smtp_password || this.settings.brevo?.api_key
      }
      });

      const fromEmail = this.settings.brevo?.from_email || process.env.SMTP_FROM || 'notifications@roarmma.com.au';
      const fromName = this.settings.brevo?.from_name || 'ROAR MMA';

      const info = await smtpTransport.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: email,
        subject: subject,
        html: body
      }, { timeout: 15000 });

      // Brevo free tier: simulate $0 cost (tracked as email sent)
      const cost = 0;

      if (deliveryId) {
        this.updateDeliveryStatus(deliveryId, 'sent', 'Sent via SMTP', info.messageId, cost);
        this.trackCost('email', cost);
      }

      return { success: true, cost, messageId: info.messageId };
    } catch (error) {
      console.error('[EMAIL - ERROR]', error);

      if (deliveryId) {
        this.updateDeliveryStatus(deliveryId, 'failed', error.message);
      }

      return { success: false, error: error.message };
    }
  }

  // Add to unsubscribe list
  addUnsubscribe(contactValue, contactType, channel = 'all', reason = null, memberId = null, leadId = null) {
    const db = getDatabase();

    try {
      db.prepare(`
        INSERT INTO unsubscribes (contact_type, contact_value, channel, reason, member_id, lead_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(contactType, contactValue, channel, reason, memberId, leadId);

      return { success: true };
    } catch (error) {
      // Already unsubscribed
      return { success: true, already_unsubscribed: true };
    }
  }

  // Get messaging stats
  getMessagingStats(dateFrom = null, dateTo = null) {
    const db = getDatabase();

    if (!dateFrom) {
      const now = new Date();
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }
    if (!dateTo) {
      dateTo = new Date().toISOString().split('T')[0];
    }

    const costs = db.prepare(`
      SELECT
        SUM(sms_sent) as total_sms,
        SUM(sms_cost) as total_sms_cost,
        SUM(email_sent) as total_email,
        SUM(email_cost) as total_email_cost,
        SUM(total_cost) as total_cost
      FROM message_costs
      WHERE date BETWEEN ? AND ?
    `).get(dateFrom, dateTo) || { total_sms: 0, total_email: 0, total_cost: 0, total_sms_cost: 0, total_email_cost: 0 };

    const deliveries = db.prepare(`
      SELECT
        status,
        COUNT(*) as count
      FROM message_deliveries
      WHERE DATE(sent_at) BETWEEN ? AND ?
      GROUP BY status
    `).all(dateFrom, dateTo);

    return {
      sms_sent: costs.total_sms || 0,
      sms_cost: costs.total_sms_cost || 0,
      email_sent: costs.total_email || 0,
      email_cost: costs.total_email_cost || 0,
      total_cost: costs.total_cost || 0,
      deliveries_by_status: deliveries
    };
  }
}

// Singleton instance
const messagingProviders = new MessagingProviders();

module.exports = messagingProviders;
