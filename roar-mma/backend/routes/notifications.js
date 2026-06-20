const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getDatabase } = require('../db/connection');
const notificationService = require('../services/notificationService');

const router = express.Router();

const VALID_TYPES = ['payment_failed', 'ai_approval', 'new_lead', 'class_cancelled', 'trial_overdue', 'system', 'member_created', 'booking_reminder', 'stock_alert', 'grading_result'];
const VALID_SCOPES = ['all', 'unread'];

function buildSystemNotifications(db) {
  const notifs = [];

  const aiApprovalCount = db.prepare(
    `SELECT COUNT(*) as count FROM event_queue WHERE status = 'pending' AND assigned_agent IS NOT NULL`
  ).get().count;
  if (aiApprovalCount > 0) {
    notifs.push({
      id: 'sys-ai-approval',
      type: 'ai_approval',
      title: `${aiApprovalCount} AI action${aiApprovalCount > 1 ? 's' : ''} need review`,
      message: 'Pending human approval',
      link: '/ai-dashboard',
      created_at: new Date().toISOString(),
    });
  }

  const failedPayments = db.prepare(
    `SELECT COUNT(*) as count FROM transactions WHERE status = 'failed' AND DATE(created_at) >= date('now', '-7 days')`
  ).get().count;
  if (failedPayments > 0) {
    notifs.push({
      id: 'sys-failed-payments',
      type: 'payment_failed',
      title: `${failedPayments} failed payment${failedPayments > 1 ? 's' : ''}`,
      message: 'Requires attention',
      link: '/billing?status=failed',
      created_at: new Date().toISOString(),
    });
  }

  const newLeads = db.prepare(
    `SELECT COUNT(*) as count FROM leads WHERE stage = 'new' AND DATE(created_at) = date('now')`
  ).get().count;
  if (newLeads > 0) {
    notifs.push({
      id: 'sys-new-leads',
      type: 'new_lead',
      title: `${newLeads} new lead${newLeads > 1 ? 's' : ''} today`,
      message: 'Assign and follow up',
      link: '/leads',
      created_at: new Date().toISOString(),
    });
  }

  const cancelledClasses = db.prepare(
    `SELECT COUNT(*) as count FROM class_instances WHERE status = 'cancelled' AND date = date('now')`
  ).get().count;
  if (cancelledClasses > 0) {
    notifs.push({
      id: 'sys-cancelled-classes',
      type: 'class_cancelled',
      title: `${cancelledClasses} class${cancelledClasses > 1 ? 'es' : ''} cancelled today`,
      message: 'Notify affected members',
      link: '/classes',
      created_at: new Date().toISOString(),
    });
  }

  const overdueTrials = db.prepare(
    `SELECT COUNT(*) as count FROM members WHERE status = 'trial' AND trial_end_date < date('now')`
  ).get().count;
  if (overdueTrials > 0) {
    notifs.push({
      id: 'sys-overdue-trials',
      type: 'trial_overdue',
      title: `${overdueTrials} trial${overdueTrials > 1 ? 's' : ''} overdue`,
      message: 'Follow up with trial members',
      link: '/members?status=trial',
      created_at: new Date().toISOString(),
    });
  }

  return notifs.map(n => ({ ...n, read: false }));
}

router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDatabase();
    const scope = VALID_SCOPES.includes(req.query.scope) ? req.query.scope : 'all';
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    // Get persisted notifications for this user
    const persisted = db.prepare(`
      SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
    `).all(req.user.id, limit);

    const persistedMapped = persisted.map(n => ({
      id: String(n.id), type: n.type, title: n.title, message: n.message,
      link: n.link, created_at: n.created_at, read: n.status === 'read'
    }));

    // Get system-generated notifications
    const systemNotifs = buildSystemNotifications(db);

    // Merge: persisted first, then system (deduped by id prefix)
    const systemIds = new Set(systemNotifs.map(n => n.id));
    const merged = [...persistedMapped.filter(n => !systemIds.has('sys-' + n.id)), ...systemNotifs];

    // Filter dismissed
    const dismissedIds = new Set();
    try {
      db.prepare("SELECT notification_id FROM dismissed_notifications WHERE user_id = ?").all(req.user.id)
        .forEach(d => dismissedIds.add(d.notification_id));
    } catch {}

    let filtered = merged.filter(n => !dismissedIds.has(n.id));
    if (scope === 'unread') filtered = filtered.filter(n => !n.read);

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);
    const unread = filtered.filter(n => !n.read).length;

    res.json({ notifications: paginated, total, unread, limit, offset });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.post('/dismiss', authenticateToken, (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Invalid notification id' });

    // If numeric, use notification service. Otherwise use legacy dismissed_notifications table.
    if (/^\d+$/.test(id)) {
      notificationService.dismiss(parseInt(id, 10), req.user.id);
    } else {
      const db = getDatabase();
      db.prepare("INSERT OR IGNORE INTO dismissed_notifications (user_id, notification_id) VALUES (?, ?)")
        .run(req.user.id, id);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error dismissing notification:', err);
    res.status(500).json({ error: 'Failed to dismiss notification' });
  }
});

router.post('/mark-read', authenticateToken, (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Invalid notification id' });

    if (/^\d+$/.test(id)) {
      notificationService.markRead(parseInt(id, 10), req.user.id);
    } else {
      const db = getDatabase();
      db.prepare("INSERT OR IGNORE INTO read_notifications (user_id, notification_id) VALUES (?, ?)")
        .run(req.user.id, id);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking notification read:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Notification preferences
router.get('/preferences', authenticateToken, (req, res) => {
  try {
    const db = getDatabase();
    let prefs = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(req.user.id);
    if (!prefs) {
      db.prepare('INSERT INTO notification_preferences (user_id) VALUES (?)').run(req.user.id);
      prefs = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(req.user.id);
    }
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/preferences', authenticateToken, (req, res) => {
  try {
    const db = getDatabase();
    const allowed = ['email_notifications', 'sms_notifications', 'payment_alerts', 'lead_alerts', 'class_alerts', 'system_alerts', 'marketing'];
    const updates = [];
    const vals = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) { updates.push(`${key} = ?`); vals.push(req.body[key] ? 1 : 0); }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    vals.push(req.user.id);
    db.prepare(`UPDATE notification_preferences SET ${updates.join(', ')}, updated_at = datetime('now') WHERE user_id = ?`).run(...vals);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
