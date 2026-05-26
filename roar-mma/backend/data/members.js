// Members data access layer
const { getDatabase } = require('../db/connection');

function getAllMembers(filters = {}) {
  const db = getDatabase();

  let query = 'SELECT * FROM members WHERE 1=1';
  const params = [];

  // Apply filters
  if (filters.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters.location) {
    query += ' AND location = ?';
    params.push(filters.location);
  }

  if (filters.query) {
    query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    const searchTerm = `%${filters.query}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  // Pagination
  const limit = parseInt(filters.limit) || 50;
  const offset = parseInt(filters.offset) || 0;

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const members = db.prepare(query).all(...params);

  // Get total count for pagination
  let countQuery = 'SELECT COUNT(*) as total FROM members WHERE 1=1';
  const countParams = [];

  if (filters.status) {
    countQuery += ' AND status = ?';
    countParams.push(filters.status);
  }

  if (filters.location) {
    countQuery += ' AND location = ?';
    countParams.push(filters.location);
  }

  if (filters.query) {
    countQuery += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    const searchTerm = `%${filters.query}%`;
    countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const { total } = db.prepare(countQuery).get(...countParams);

  return { members, total, limit, offset };
}

function getMemberById(id) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM members WHERE id = ?').get(id);
}

function getMemberByEmail(email) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM members WHERE email = ?').get(email);
}

function createMember(memberData) {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO members (
      first_name, last_name, email, phone, date_of_birth,
      location, status, plan, joined_date, trial_end_date,
      emergency_contact_name, emergency_contact_phone,
      medical_conditions, injuries, goals, experience_level,
      lightspeed_customer_id, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    memberData.first_name,
    memberData.last_name,
    memberData.email,
    memberData.phone,
    memberData.date_of_birth || null,
    memberData.location,
    memberData.status || 'trial',
    memberData.plan || null,
    memberData.joined_date,
    memberData.trial_end_date || null,
    memberData.emergency_contact_name || null,
    memberData.emergency_contact_phone || null,
    memberData.medical_conditions || null,
    memberData.injuries || null,
    memberData.goals || null,
    memberData.experience_level || 'beginner',
    memberData.lightspeed_customer_id || null,
    memberData.notes || null
  );

  return getMemberById(result.lastInsertRowid);
}

function updateMember(id, updates) {
  const db = getDatabase();

  const allowedFields = [
    'first_name', 'last_name', 'email', 'phone', 'date_of_birth',
    'location', 'status', 'plan', 'trial_end_date',
    'pause_start', 'pause_end', 'cancellation_date',
    'emergency_contact_name', 'emergency_contact_phone',
    'medical_conditions', 'injuries', 'goals', 'experience_level',
    'lightspeed_customer_id', 'notes'
  ];

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

  // Add updated_at
  fields.push('updated_at = datetime("now")');
  values.push(id);

  const query = `UPDATE members SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...values);

  return getMemberById(id);
}

function deleteMember(id) {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM members WHERE id = ?').run(id);
  return result.changes > 0;
}

function getMemberStats() {
  const db = getDatabase();

  const stats = {
    total: db.prepare('SELECT COUNT(*) as count FROM members').get().count,
    active: db.prepare('SELECT COUNT(*) as count FROM members WHERE status = ?').get('active').count,
    trial: db.prepare('SELECT COUNT(*) as count FROM members WHERE status = ?').get('trial').count,
    paused: db.prepare('SELECT COUNT(*) as count FROM members WHERE status = ?').get('paused').count,
    cancelled: db.prepare('SELECT COUNT(*) as count FROM members WHERE status = ?').get('cancelled').count,
    rockingham: db.prepare('SELECT COUNT(*) as count FROM members WHERE location = ?').get('rockingham').count,
    bibra_lake: db.prepare('SELECT COUNT(*) as count FROM members WHERE location = ?').get('bibra_lake').count
  };

  return stats;
}

function getMemberAttendance(memberId, limit = 20) {
  const db = getDatabase();

  const attendance = db.prepare(`
    SELECT
      b.id,
      b.status,
      b.attended_at,
      ci.date,
      ci.start_time,
      c.name as class_name,
      c.class_type,
      c.location
    FROM bookings b
    JOIN class_instances ci ON b.class_instance_id = ci.id
    JOIN classes c ON ci.class_id = c.id
    WHERE b.member_id = ?
    ORDER BY ci.date DESC, ci.start_time DESC
    LIMIT ?
  `).all(memberId, limit);

  return attendance;
}

function getMemberTransactions(memberId, limit = 20) {
  const db = getDatabase();

  const transactions = db.prepare(`
    SELECT *
    FROM transactions
    WHERE member_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(memberId, limit);

  return transactions;
}

module.exports = {
  getAllMembers,
  getMemberById,
  getMemberByEmail,
  createMember,
  updateMember,
  deleteMember,
  getMemberStats,
  getMemberAttendance,
  getMemberTransactions
};
