const { getDatabase } = require('../db/connection');

function getMakeupsByMember(memberId) {
  return getDatabase().prepare('SELECT * FROM makeup_classes WHERE member_id = ? ORDER BY created_at DESC').all(memberId);
}

function getMakeupById(id) {
  return getDatabase().prepare('SELECT * FROM makeup_classes WHERE id = ?').get(id);
}

function grantMakeup({ member_id, original_date, original_class_id, granted_by, expires_in_days = 30, notes }) {
  const db = getDatabase();
  const expiresAt = db.prepare("SELECT datetime('now', '+' || ? || ' days') as dt").get(expires_in_days).dt;
  const result = db.prepare(`INSERT INTO makeup_classes (member_id, original_date, original_class_id, granted_by, expires_at, notes) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(member_id, original_date, original_class_id || null, granted_by || null, expiresAt, notes || null);
  return getMakeupById(result.lastInsertRowid);
}

function useMakeup(id, classInstanceId) {
  const db = getDatabase();
  db.prepare('UPDATE makeup_classes SET used_at = datetime(\'now\'), used_for_class_id = ? WHERE id = ?').run(classInstanceId || null, id);
  return getMakeupById(id);
}

function getAvailableMakeups(memberId) {
  return getDatabase().prepare("SELECT * FROM makeup_classes WHERE member_id = ? AND used_at IS NULL AND expires_at >= datetime('now') ORDER BY expires_at ASC").all(memberId);
}

function getAllActive() {
  return getDatabase().prepare(`
    SELECT mc.*, m.first_name, m.last_name, m.phone, m.email
    FROM makeup_classes mc JOIN members m ON mc.member_id = m.id
    WHERE mc.used_at IS NULL AND mc.expires_at >= datetime('now')
    ORDER BY mc.expires_at ASC
  `).all();
}

function deleteMakeup(id) {
  return getDatabase().prepare('DELETE FROM makeup_classes WHERE id = ?').run(id);
}

module.exports = { getMakeupsByMember, getMakeupById, grantMakeup, useMakeup, getAvailableMakeups, getAllActive, deleteMakeup };
