// Staff data access layer
const { getDatabase } = require('../db/connection');

function getAllStaff(filters = {}) {
  const db = getDatabase();

  let query = 'SELECT id, name, email, role, phone, active, created_at FROM staff WHERE 1=1';
  const params = [];

  if (filters.role) {
    query += ' AND role = ?';
    params.push(filters.role);
  }

  if (filters.active !== undefined) {
    query += ' AND active = ?';
    params.push(filters.active ? 1 : 0);
  }

  query += ' ORDER BY name';

  return db.prepare(query).all(...params);
}

function getStaffById(id) {
  const db = getDatabase();
  return db.prepare('SELECT id, name, email, role, phone, active, created_at FROM staff WHERE id = ?').get(id);
}

function getStaffByEmail(email) {
  const db = getDatabase();
  return db.prepare('SELECT id, name, email, role, phone, active, created_at FROM staff WHERE email = ?').get(email);
}

function createStaff(staffData) {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO staff (name, email, password_hash, role, phone, active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  if (!/^\$2[aby]\$/.test(staffData.password_hash)) {
    throw new Error('Password must be hashed with bcrypt');
  }

  const result = stmt.run(
    staffData.name,
    staffData.email,
    staffData.password_hash,
    staffData.role,
    staffData.phone || null,
    staffData.active !== undefined ? staffData.active : 1
  );

  return getStaffById(result.lastInsertRowid);
}

function updateStaff(id, updates) {
  const db = getDatabase();

  const allowedFields = ['name', 'email', 'role', 'phone', 'active'];

  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) {
    throw new Error('No valid fields to update');
  }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  const query = `UPDATE staff SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...values);

  return getStaffById(id);
}

function updateStaffPassword(id, passwordHash) {
  const db = getDatabase();

  db.prepare("UPDATE staff SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
    .run(passwordHash, id);

  return getStaffById(id);
}

function deleteStaff(id) {
  const db = getDatabase();

  // Soft delete by setting active = 0
  const result = db.prepare("UPDATE staff SET active = 0, updated_at = datetime('now') WHERE id = ? AND active = 1").run(id);

  return result.changes > 0;
}

function getStaffStats() {
  const db = getDatabase();

  return {
    total: db.prepare('SELECT COUNT(*) as count FROM staff WHERE active = 1').get().count,
    by_role: db.prepare(`
      SELECT role, COUNT(*) as count
      FROM staff
      WHERE active = 1
      GROUP BY role
    `).all()
  };
}

module.exports = {
  getAllStaff,
  getStaffById,
  getStaffByEmail,
  createStaff,
  updateStaff,
  updateStaffPassword,
  deleteStaff,
  getStaffStats
};
