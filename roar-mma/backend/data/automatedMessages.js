const { getDatabase } = require('../db/connection');

function getAll() {
  return getDatabase().prepare('SELECT * FROM automated_messages ORDER BY trigger_event, title').all();
}

function getByTrigger(triggerEvent) {
  return getDatabase().prepare('SELECT * FROM automated_messages WHERE trigger_event = ? AND enabled = 1').all(triggerEvent);
}

function getById(id) {
  return getDatabase().prepare('SELECT * FROM automated_messages WHERE id = ?').get(id);
}

function create({ trigger_event, template_id, title, body, channel, audience_filter, enabled }) {
  const db = getDatabase();
  const r = db.prepare(`INSERT INTO automated_messages (trigger_event, template_id, title, body, channel, audience_filter, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(trigger_event, template_id || null, title, body, channel || 'both', audience_filter || '{}', enabled !== undefined ? (enabled ? 1 : 0) : 1);
  return getById(r.lastInsertRowid);
}

function update(id, fields) {
  const db = getDatabase();
  const allowed = ['trigger_event', 'template_id', 'title', 'body', 'channel', 'audience_filter', 'enabled', 'last_sent_at'];
  const sets = []; const params = [];
  for (const k of allowed) { if (fields[k] !== undefined) { sets.push(`${k} = ?`); params.push(fields[k]); } }
  if (sets.length === 0) return getById(id);
  sets.push("updated_at = datetime('now')"); params.push(id);
  db.prepare(`UPDATE automated_messages SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return getById(id);
}

function remove(id) {
  return getDatabase().prepare('DELETE FROM automated_messages WHERE id = ?').run(id);
}

module.exports = { getAll, getByTrigger, getById, create, update, remove };
