// PT sessions data access layer
const { getDatabase } = require('../db/connection');

function getAllSessions(filters = {}) {
  const db = getDatabase();

  let query = `
    SELECT
      pts.*,
      m.first_name || ' ' || m.last_name as member_name,
      m.email as member_email,
      m.phone as member_phone,
      s.name as coach_name,
      mpp.sessions_remaining as package_sessions_remaining
    FROM pt_sessions pts
    JOIN members m ON pts.member_id = m.id
    JOIN staff s ON pts.coach_id = s.id
    LEFT JOIN member_pt_packages mpp ON pts.member_package_id = mpp.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.member_id) {
    query += ' AND pts.member_id = ?';
    params.push(filters.member_id);
  }

  if (filters.coach_id) {
    query += ' AND pts.coach_id = ?';
    params.push(filters.coach_id);
  }

  if (filters.status) {
    query += ' AND pts.status = ?';
    params.push(filters.status);
  }

  if (filters.date_from) {
    query += ' AND pts.scheduled_date >= ?';
    params.push(filters.date_from);
  }

  if (filters.date_to) {
    query += ' AND pts.scheduled_date <= ?';
    params.push(filters.date_to);
  }

  query += ' ORDER BY pts.scheduled_date DESC, pts.scheduled_time DESC';

  return db.prepare(query).all(...params);
}

function getSessionById(id) {
  const db = getDatabase();
  return db.prepare(`
    SELECT
      pts.*,
      m.first_name || ' ' || m.last_name as member_name,
      m.email as member_email,
      m.phone as member_phone,
      s.name as coach_name,
      mpp.sessions_remaining as package_sessions_remaining
    FROM pt_sessions pts
    JOIN members m ON pts.member_id = m.id
    JOIN staff s ON pts.coach_id = s.id
    LEFT JOIN member_pt_packages mpp ON pts.member_package_id = mpp.id
    WHERE pts.id = ?
  `).get(id);
}

function createSession(sessionData) {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO pt_sessions (
      member_id, coach_id, member_package_id, scheduled_date, scheduled_time,
      duration_minutes, status, session_type, amount, commission_rate, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    sessionData.member_id,
    sessionData.coach_id,
    sessionData.member_package_id || null,
    sessionData.scheduled_date,
    sessionData.scheduled_time,
    sessionData.duration_minutes || 60,
    sessionData.status || 'scheduled',
    sessionData.session_type || 'pt',
    sessionData.amount || null,
    sessionData.commission_rate || null,
    sessionData.notes || null
  );

  return getSessionById(result.lastInsertRowid);
}

function updateSession(id, updates) {
  const db = getDatabase();

  const allowedFields = [
    'scheduled_date', 'scheduled_time', 'duration_minutes', 'status',
    'amount', 'commission_rate', 'commission_amount', 'commission_paid',
    'notes', 'cancelled_reason', 'cancelled_at', 'completed_at'
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

  fields.push('updated_at = datetime(\'now\')');
  values.push(id);

  const query = `UPDATE pt_sessions SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...values);

  return getSessionById(id);
}

function completeSession(id) {
  const db = getDatabase();
  const session = getSessionById(id);

  if (!session) {
    throw new Error('Session not found');
  }

  // Calculate commission
  let commissionAmount = 0;
  if (session.amount && session.commission_rate) {
    commissionAmount = (session.amount * session.commission_rate) / 100;
  }

  // Update session
  const updated = updateSession(id, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    commission_amount: commissionAmount
  });

  // Decrement package sessions if using package
  if (session.member_package_id) {
    db.prepare(`
      UPDATE member_pt_packages
      SET sessions_used = sessions_used + 1,
          sessions_remaining = sessions_remaining - 1,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(session.member_package_id);

    // Check if package exhausted
    const pkg = db.prepare('SELECT * FROM member_pt_packages WHERE id = ?').get(session.member_package_id);
    if (pkg.sessions_remaining <= 0) {
      db.prepare(`
        UPDATE member_pt_packages
        SET status = 'exhausted',
            updated_at = datetime('now')
        WHERE id = ?
      `).run(session.member_package_id);
    }
  }

  return updated;
}

function cancelSession(id, reason) {
  return updateSession(id, {
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    cancelled_reason: reason
  });
}

function getCoachStats(coachId, dateFrom = null, dateTo = null) {
  const db = getDatabase();

  let query = `
    SELECT
      COUNT(*) as total_sessions,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_sessions,
      COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_show_sessions,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN amount END), 0) as total_revenue,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN commission_amount END), 0) as total_commission,
      COALESCE(AVG(CASE WHEN status = 'completed' THEN amount END), 0) as avg_session_value
    FROM pt_sessions
    WHERE coach_id = ?
  `;
  const params = [coachId];

  if (dateFrom) {
    query += ' AND scheduled_date >= ?';
    params.push(dateFrom);
  }

  if (dateTo) {
    query += ' AND scheduled_date <= ?';
    params.push(dateTo);
  }

  return db.prepare(query).get(...params);
}

module.exports = {
  getAllSessions,
  getSessionById,
  createSession,
  updateSession,
  completeSession,
  cancelSession,
  getCoachStats
};
