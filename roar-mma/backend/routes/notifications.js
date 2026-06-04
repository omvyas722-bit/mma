const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getDatabase } = require('../db/connection');

const router = express.Router();

const VALID_TYPES = ['payment_failed', 'ai_approval', 'new_lead', 'class_cancelled', 'trial_overdue', 'system'];
const VALID_SCOPES = ['all', 'unread'];

function buildSystemNotifications(db) {
  const notifs = [];

  const aiApprovalCount = db.prepare(
    `SELECT COUNT(*) as count FROM event_queue WHERE status = 'pending' AND assigned_agent IS NOT NULL`
  ).get().count;
  if (aiApprovalCount > 0) {
    notifs.push({
      id: 'ai-approval',
      type: 'ai_approval',
      title: `${aiApprovalCount} AI action${aiApprovalCount > 1 ? 's' : ''} need review`,
      message: 'Pending human approval',
      link: '/ai-dashboard',
      created_at: new Date().toISOString(),
      read: false,
    });
  }

  const failedPayments = db.prepare(
    `SELECT COUNT(*) as count FROM transactions WHERE status = 'failed' AND DATE(created_at) >= date('now', '-7 days')`
  ).get().count;
  if (failedPayments > 0) {
    notifs.push({
      id: 'failed-payments',
      type: 'payment_failed',
      title: `${failedPayments} failed payment${failedPayments > 1 ? 's' : ''}`,
      message: 'Requires attention',
      link: '/billing?status=failed',
      created_at: new Date().toISOString(),
      read: false,
    });
  }

  const newLeads = db.prepare(
    `SELECT COUNT(*) as count FROM leads WHERE stage = 'new' AND DATE(created_at) = date('now')`
  ).get().count;
  if (newLeads > 0) {
    notifs.push({
      id: 'new-leads',
      type: 'new_lead',
      title: `${newLeads} new lead${newLeads > 1 ? 's' : ''} today`,
      message: 'Assign and follow up',
      link: '/leads',
      created_at: new Date().toISOString(),
      read: false,
    });
  }

  const cancelledClasses = db.prepare(
    `SELECT COUNT(*) as count FROM class_instances WHERE status = 'cancelled' AND date = date('now')`
  ).get().count;
  if (cancelledClasses > 0) {
    notifs.push({
      id: 'cancelled-classes',
      type: 'class_cancelled',
      title: `${cancelledClasses} class${cancelledClasses > 1 ? 'es' : ''} cancelled today`,
      message: 'Notify affected members',
      link: '/classes',
      created_at: new Date().toISOString(),
      read: false,
    });
  }

  const overdueTrials = db.prepare(
    `SELECT COUNT(*) as count FROM members WHERE status = 'trial' AND trial_end_date < date('now')`
  ).get().count;
  if (overdueTrials > 0) {
    notifs.push({
      id: 'overdue-trials',
      type: 'trial_overdue',
      title: `${overdueTrials} trial${overdueTrials > 1 ? 's' : ''} overdue`,
      message: 'Follow up with trial members',
      link: '/members?status=trial',
      created_at: new Date().toISOString(),
      read: false,
    });
  }

  return notifs;
}

router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDatabase();
    const scope = VALID_SCOPES.includes(req.query.scope) ? req.query.scope : 'all';
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const systemNotifs = buildSystemNotifications(db);
    const dismissedIds = new Set();

    try {
      const dismissed = db.prepare(
        `SELECT notification_id FROM dismissed_notifications WHERE user_id = ?`
      ).all(req.user.id);
      dismissed.forEach(d => dismissedIds.add(d.notification_id));
    } catch {}

    const readByIds = new Set();
    try {
      const readNotifs = db.prepare(
        `SELECT notification_id FROM read_notifications WHERE user_id = ?`
      ).all(req.user.id);
      readNotifs.forEach(n => readByIds.add(n.notification_id));
    } catch {}

    let filtered = systemNotifs.filter(n => !dismissedIds.has(n.id));
    filtered = filtered.map(n => ({ ...n, read: readByIds.has(n.id) }));
    if (scope === 'unread') filtered = filtered.filter(n => !n.read);

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    res.json({ notifications: paginated, total, unread: filtered.filter(n => !n.read).length, limit, offset });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.post('/dismiss', authenticateToken, (req, res) => {
  try {
    const { id } = req.body;
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Invalid notification id' });

    const db = getDatabase();
    try {
      db.prepare(
        `CREATE TABLE IF NOT EXISTS dismissed_notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          notification_id TEXT NOT NULL,
          dismissed_at DATETIME DEFAULT (datetime('now')),
          UNIQUE(user_id, notification_id)
        )`
      ).run();
    } catch {}

    db.prepare(
      `INSERT OR IGNORE INTO dismissed_notifications (user_id, notification_id) VALUES (?, ?)`
    ).run(req.user.id, id);

    res.json({ success: true });
  } catch (err) {
    console.error('Error dismissing notification:', err);
    res.status(500).json({ error: 'Failed to dismiss notification' });
  }
});

router.post('/mark-read', authenticateToken, (req, res) => {
  try {
    const { id } = req.body;
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Invalid notification id' });

    const db = getDatabase();
    try {
      db.prepare(
        `CREATE TABLE IF NOT EXISTS read_notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          notification_id TEXT NOT NULL,
          read_at DATETIME DEFAULT (datetime('now')),
          UNIQUE(user_id, notification_id)
        )`
      ).run();
    } catch {}

    db.prepare(
      `INSERT OR IGNORE INTO read_notifications (user_id, notification_id) VALUES (?, ?)`
    ).run(req.user.id, id);

    res.json({ success: true });
  } catch (err) {
    console.error('Error marking notification read:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

module.exports = router;
