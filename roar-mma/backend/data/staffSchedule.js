const { getDatabase } = require('../db/connection');

function getShifts(staffId) {
  const db = getDatabase();
  if (staffId) return db.prepare('SELECT * FROM staff_shifts WHERE staff_id = ? AND active = 1 ORDER BY day_of_week, start_time').all(staffId);
  return db.prepare('SELECT ss.*, s.first_name, s.last_name, s.role as staff_role FROM staff_shifts ss JOIN staff s ON ss.staff_id = s.id WHERE ss.active = 1 ORDER BY ss.day_of_week, ss.start_time').all();
}

function getShift(id) {
  return getDatabase().prepare('SELECT * FROM staff_shifts WHERE id = ?').get(id);
}

function createShift({ staff_id, day_of_week, start_time, end_time, location, role, notes }) {
  const db = getDatabase();
  const r = db.prepare(`INSERT INTO staff_shifts (staff_id, day_of_week, start_time, end_time, location, role, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(staff_id, day_of_week, start_time, end_time, location || null, role || null, notes || null);
  return getShift(r.lastInsertRowid);
}

function updateShift(id, fields) {
  const db = getDatabase();
  const allowed = ['day_of_week', 'start_time', 'end_time', 'location', 'role', 'notes', 'active'];
  const sets = []; const params = [];
  for (const k of allowed) { if (fields[k] !== undefined) { sets.push(`${k} = ?`); params.push(fields[k]); } }
  if (sets.length === 0) return getShift(id);
  sets.push("updated_at = datetime('now')"); params.push(id);
  db.prepare(`UPDATE staff_shifts SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return getShift(id);
}

function deleteShift(id) {
  return getDatabase().prepare('DELETE FROM staff_shifts WHERE id = ?').run(id);
}

function getTimeOff(staffId) {
  const db = getDatabase();
  if (staffId) return db.prepare('SELECT * FROM staff_time_off WHERE staff_id = ? ORDER BY date_from').all(staffId);
  return db.prepare('SELECT sto.*, s.first_name, s.last_name FROM staff_time_off sto JOIN staff s ON sto.staff_id = s.id ORDER BY sto.date_from').all();
}

function createTimeOff({ staff_id, date_from, date_to, reason, type }) {
  const db = getDatabase();
  const r = db.prepare('INSERT INTO staff_time_off (staff_id, date_from, date_to, reason, type) VALUES (?, ?, ?, ?, ?)')
    .run(staff_id, date_from, date_to, reason || null, type || 'vacation');
  return db.prepare('SELECT * FROM staff_time_off WHERE id = ?').get(r.lastInsertRowid);
}

function approveTimeOff(id, approvedBy) {
  const db = getDatabase();
  db.prepare('UPDATE staff_time_off SET approved = 1, approved_by = ? WHERE id = ?').run(approvedBy, id);
  return db.prepare('SELECT * FROM staff_time_off WHERE id = ?').get(id);
}

function deleteTimeOff(id) {
  return getDatabase().prepare('DELETE FROM staff_time_off WHERE id = ?').run(id);
}

function getWeeklySchedule() {
  const db = getDatabase();
  const shifts = db.prepare(`SELECT ss.*, s.first_name, s.last_name, s.role as staff_role FROM staff_shifts ss JOIN staff s ON ss.staff_id = s.id WHERE ss.active = 1 ORDER BY ss.day_of_week, ss.start_time`).all();
  const timeOff = db.prepare("SELECT sto.*, s.first_name, s.last_name FROM staff_time_off sto JOIN staff s ON sto.staff_id = s.id WHERE sto.approved = 1 AND sto.date_to >= date('now', '-7 days') ORDER BY sto.date_from").all();
  return { shifts, timeOff };
}

module.exports = { getShifts, getShift, createShift, updateShift, deleteShift, getTimeOff, createTimeOff, approveTimeOff, deleteTimeOff, getWeeklySchedule };
