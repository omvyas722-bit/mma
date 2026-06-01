const { getDatabase } = require('../db/connection');

function getQueue(filters = {}) {
  const db = getDatabase();
  let query = 'SELECT * FROM approval_queue WHERE 1=1'; const params = [];
  if (filters.status) { query += ' AND status = ?'; params.push(filters.status); }
  if (filters.agent_name) { query += ' AND agent_name = ?'; params.push(filters.agent_name); }
  query += ' ORDER BY created_at DESC';
  return db.prepare(query).all(...params);
}

function getQueueItem(id) {
  return getDatabase().prepare('SELECT * FROM approval_queue WHERE id = ?').get(id);
}

function enqueue({ agent_name, action_type, entity_type, entity_id, payload, reason, requested_by }) {
  const db = getDatabase();
  const result = db.prepare(`INSERT INTO approval_queue (agent_name, action_type, entity_type, entity_id, payload, reason, requested_by) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(agent_name, action_type, entity_type || null, entity_id || null, JSON.stringify(payload), reason || null, requested_by || null);
  return getQueueItem(result.lastInsertRowid);
}

function approve(id, reviewed_by) {
  const db = getDatabase();
  db.prepare("UPDATE approval_queue SET status = 'approved', reviewed_by = ?, reviewed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(reviewed_by, id);
  return getQueueItem(id);
}

function reject(id, reviewed_by) {
  const db = getDatabase();
  db.prepare("UPDATE approval_queue SET status = 'rejected', reviewed_by = ?, reviewed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(reviewed_by, id);
  return getQueueItem(id);
}

function getPendingCount() {
  return getDatabase().prepare("SELECT COUNT(*) as count FROM approval_queue WHERE status = 'pending'").get().count;
}

module.exports = { getQueue, getQueueItem, enqueue, approve, reject, getPendingCount };
