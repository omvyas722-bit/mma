const { getDatabase } = require('../db/connection');
const messagingProviders = require('./messagingProviders');

class NotificationService {
  async send(userId, type, title, message, link = null, channel = 'in_app') {
    const db = getDatabase();
    const result = db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, link, channel, status)
      VALUES (?, ?, ?, ?, ?, ?, 'unread')
    `).run(userId, type, title, message, link, channel);
    const notifId = result.lastInsertRowid;

    if (global.wsBroadcast) {
      global.wsBroadcast({
        type: 'notification',
        data: { id: notifId, user_id: userId, type, title, message, link, channel, status: 'unread', created_at: new Date().toISOString() }
      });
    }

    if (channel === 'email' || channel === 'both') {
      await this._sendEmail(userId, title, message, link);
    }
    if (channel === 'sms' || channel === 'both') {
      await this._sendSms(userId, message);
    }
    return notifId;
  }

  async broadcast(type, title, message, link = null, channel = 'in_app') {
    const db = getDatabase();
    const staff = db.prepare('SELECT id, email, phone FROM staff').all();
    const ids = [];
    for (const s of staff) {
      const result = db.prepare(`
        INSERT INTO notifications (user_id, type, title, message, link, channel, status)
        VALUES (?, ?, ?, ?, ?, ?, 'unread')
      `).run(s.id, type, title, message, link, channel);
      ids.push(result.lastInsertRowid);
    }

    if (global.wsBroadcast) {
      global.wsBroadcast({ type: 'notification_broadcast', data: { type, title, message, link } });
    }

    if (channel === 'email' || channel === 'both') {
      for (const s of staff) {
        if (s.email) await this._sendEmail(s.id, title, message, link);
      }
    }
    return ids;
  }

  async _sendEmail(userId, subject, body, link) {
    const db = getDatabase();
    const prefs = db.prepare('SELECT email_notifications FROM notification_preferences WHERE user_id = ?').get(userId);
    if (prefs && !prefs.email_notifications) return;
    const user = db.prepare('SELECT email FROM staff WHERE id = ?').get(userId);
    if (!user || !user.email) return;
    if (!messagingProviders._loaded) messagingProviders.loadSettings();
    const html = `<div style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px;"><h2>${subject}</h2><p>${body}</p>${link ? `<p><a href="${link}" style="background:#dc2626;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">View</a></p>` : ''}</div>`;
    await messagingProviders.sendEmail(user.email, subject, html).catch(() => {});
  }

  async _sendSms(userId, message) {
    const db = getDatabase();
    const prefs = db.prepare('SELECT sms_notifications FROM notification_preferences WHERE user_id = ?').get(userId);
    if (prefs && !prefs.sms_notifications) return;
    const user = db.prepare('SELECT phone FROM staff WHERE id = ?').get(userId);
    if (!user || !user.phone) return;
    if (!messagingProviders._loaded) messagingProviders.loadSettings();
    await messagingProviders.sendSMS(user.phone, message).catch(() => {});
  }

  markRead(notificationId, userId) {
    const db = getDatabase();
    db.prepare("UPDATE notifications SET status = 'read', read_at = datetime('now') WHERE id = ? AND user_id = ?").run(notificationId, userId);
  }

  dismiss(notificationId, userId) {
    const db = getDatabase();
    db.prepare("UPDATE notifications SET status = 'dismissed' WHERE id = ? AND user_id = ?").run(notificationId, userId);
  }

  getUnreadCount(userId) {
    const db = getDatabase();
    return db.prepare("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND status = 'unread'").get(userId).count;
  }
}

module.exports = new NotificationService();
