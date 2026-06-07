// Members data access layer
const { getDatabase } = require('../db/connection');

function getAllMembers(filters = {}) {
  const db = getDatabase();

  let query = 'SELECT id, first_name, last_name, email, phone, date_of_birth, location, status, plan, joined_date, trial_end_date, pause_start, pause_end, cancellation_date, emergency_contact_name, emergency_contact_phone, experience_level, lightspeed_customer_id, notes, health_score, health_score_updated_at, is_fighter, membership_type, parent_id, referred_by, gender, address, suburb, postcode, created_at, updated_at FROM members WHERE 1=1';
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

  if (filters.parent_id) {
    query += ' AND parent_id = ?';
    params.push(filters.parent_id);
  }

  // Pagination
  const limit = parseInt(filters.limit, 10) || 50;
  const offset = parseInt(filters.offset, 10) || 0;

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

  if (filters.parent_id) {
    countQuery += ' AND parent_id = ?';
    countParams.push(filters.parent_id);
  }

  const { total } = db.prepare(countQuery).get(...countParams);

  return { members, total, limit, offset };
}

function getMemberById(id) {
  const db = getDatabase();
  return db.prepare('SELECT id, first_name, last_name, email, phone, date_of_birth, location, status, plan, joined_date, trial_end_date, pause_start, pause_end, cancellation_date, emergency_contact_name, emergency_contact_phone, medical_conditions, injuries, goals, experience_level, lightspeed_customer_id, notes, health_score, health_score_updated_at, health_score_factors, is_fighter, membership_type, parent_id, referred_by, gender, address, suburb, postcode, created_at, updated_at FROM members WHERE id = ?').get(id);
}

function getMemberByEmail(email) {
  const db = getDatabase();
  return db.prepare('SELECT id, first_name, last_name, email, phone, date_of_birth, location, status, plan, joined_date, trial_end_date, pause_start, pause_end, cancellation_date, emergency_contact_name, emergency_contact_phone, medical_conditions, injuries, goals, experience_level, lightspeed_customer_id, notes, health_score, health_score_updated_at, is_fighter, membership_type, parent_id, referred_by, gender, address, suburb, postcode, created_at, updated_at FROM members WHERE email = ?').get(email);
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
    'lightspeed_customer_id', 'notes', 'parent_id',
    'is_fighter', 'membership_type', 'gender', 'address', 'suburb', 'postcode',
    'cancellation_reason', 'winback_eligible', 'archived_at'
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
  fields.push("updated_at = datetime('now')");
  values.push(id);

  const query = `UPDATE members SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...values);

  return getMemberById(id);
}

function deleteMember(id) {
  const db = getDatabase();
  const result = db.prepare(`
    UPDATE members SET status = 'cancelled', cancellation_date = date('now'), notes = COALESCE(NULLIF(notes, ''), '') || ' [Archived ' || date('now') || ']', updated_at = datetime('now') WHERE id = ?
  `).run(id);
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
    SELECT id, member_id, amount, currency, type, status, payment_method, lightspeed_transaction_id, description, processed_at, failure_reason, created_at, updated_at
    FROM transactions
    WHERE member_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(memberId, limit);

  return transactions;
}

function getMemberDisciplines(memberId) {
  const db = getDatabase();
  const disciplines = db.prepare(`
    SELECT mbp.discipline, mbp.current_stripes, mbp.belt_awarded_date,
           mbp.next_grading_eligible_date, mbp.classes_attended_since_belt,
           bl.id as belt_id, bl.name as belt_name, bl.color_code, bl.rank_order
    FROM member_belt_progress mbp
    JOIN belt_levels bl ON mbp.current_belt_id = bl.id
    WHERE mbp.member_id = ? AND mbp.is_current = 1
    ORDER BY bl.rank_order
  `).all(memberId);
  return disciplines;
}

function assignDisciplineBelt(memberId, discipline, beltLevelId, staffId) {
  const db = getDatabase();
  const belt = db.prepare('SELECT * FROM belt_levels WHERE id = ?').get(beltLevelId);
  if (!belt) throw new Error('Belt level not found');

  const eligibleDate = new Date();
  eligibleDate.setMonth(eligibleDate.getMonth() + belt.min_time_months);

  const existing = db.prepare(`
    SELECT * FROM member_belt_progress
    WHERE member_id = ? AND discipline = ? AND is_current = 1
  `).get(memberId, discipline);

  if (existing) {
    db.prepare(`
      UPDATE member_belt_progress SET is_current = 0, updated_at = datetime('now')
      WHERE id = ?
    `).run(existing.id);
  }

  const result = db.prepare(`
    INSERT INTO member_belt_progress (member_id, discipline, current_belt_id, current_stripes, belt_awarded_date, next_grading_eligible_date, classes_attended_since_belt)
    VALUES (?, ?, ?, 0, date('now'), ?, 0)
  `).run(memberId, discipline, beltLevelId, eligibleDate.toISOString().split('T')[0]);

  db.prepare(`
    INSERT INTO grading_history (member_id, from_belt_id, to_belt_id, stripes_awarded, graded_by, grading_date, notes)
    VALUES (?, ?, ?, 0, ?, date('now'), ?)
  `).run(
    memberId,
    existing ? existing.current_belt_id : null,
    beltLevelId,
    staffId,
    `Assigned ${belt.name} (${discipline})`
  );

  return getMemberDisciplines(memberId);
}

function getMemberNotes(memberId) {
  const db = getDatabase();
  return db.prepare(`
    SELECT mn.*, s.name as author_name
    FROM member_notes mn
    LEFT JOIN staff s ON mn.author_id = s.id
    WHERE mn.member_id = ?
    ORDER BY mn.created_at DESC
  `).all(memberId);
}

function addMemberNote(memberId, authorId, noteType, content) {
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO member_notes (member_id, author_id, note_type, content)
    VALUES (?, ?, ?, ?)
  `).run(memberId, authorId, noteType, content);
  return db.prepare(`
    SELECT mn.*, s.name as author_name
    FROM member_notes mn
    LEFT JOIN staff s ON mn.author_id = s.id
    WHERE mn.id = ?
  `).get(result.lastInsertRowid);
}

function getMemberEnrolledClasses(memberId) {
  const db = getDatabase();
  const monday = new Date();
  monday.setDate(monday.getDate() - monday.getDay() + 1);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  const startOfWeek = monday.toISOString().split('T')[0];
  const endOfWeek = sunday.toISOString().split('T')[0];

  return db.prepare(`
    SELECT b.id, b.status as booking_status, b.attended_at, b.waitlist,
           c.id as class_id, c.name as class_name, c.class_type, c.location,
           ci.date, ci.start_time, ci.end_time,
           s.name as instructor_name
    FROM bookings b
    JOIN class_instances ci ON b.class_instance_id = ci.id
    JOIN classes c ON ci.class_id = c.id
    LEFT JOIN staff s ON c.instructor_id = s.id
    WHERE b.member_id = ? AND ci.date >= ? AND ci.date <= ?
      AND b.status IN ('confirmed', 'attended', 'no_show')
    ORDER BY ci.date, ci.start_time
  `).all(memberId, startOfWeek, endOfWeek);
}

function changeMemberPlan(memberId, newPlan, effectiveDate) {
  const db = getDatabase();
  const member = getMemberById(memberId);
  if (!member) throw new Error('Member not found');
  if (member.status === 'cancelled') throw new Error('Cannot change plan for cancelled member');

  const oldPlan = member.plan;
  db.prepare(`
    UPDATE members SET plan = ?, updated_at = datetime('now') WHERE id = ?
  `).run(newPlan, memberId);

  addMemberNote(memberId, null, 'general', `Plan changed: ${oldPlan || 'none'} → ${newPlan} (effective ${effectiveDate})`);

  return getMemberById(memberId);
}

function getMemberPtSessions(memberId) {
  const db = getDatabase();
  return db.prepare(`
    SELECT ps.*, s.name as coach_name, mp.sessions_total, mp.sessions_remaining, mp.status as package_status
    FROM pt_sessions ps
    JOIN staff s ON ps.coach_id = s.id
    LEFT JOIN member_pt_packages mp ON ps.member_package_id = mp.id
    WHERE ps.member_id = ?
    ORDER BY ps.scheduled_date DESC
  `).all(memberId);
}

function getMemberCompetitions(memberId) {
  const db = getDatabase();
  return db.prepare(`
    SELECT * FROM fighter_competitions
    WHERE member_id = ?
    ORDER BY event_date DESC
  `).all(memberId);
}

function addMemberCompetition(memberId, data) {
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO fighter_competitions (member_id, event_name, event_date, opponent_name, weight_class, discipline, result, method, round, time, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    memberId, data.event_name, data.event_date, data.opponent_name || null,
    data.weight_class || null, data.discipline, data.result,
    data.method || null, data.round || null, data.time || null, data.notes || null
  );

  db.prepare('UPDATE members SET is_fighter = 1 WHERE id = ?').run(memberId);

  return db.prepare('SELECT * FROM fighter_competitions WHERE id = ?').get(result.lastInsertRowid);
}

function getMemberReferrals(memberId) {
  const db = getDatabase();
  return db.prepare(`
    SELECT rv.*, m.first_name || ' ' || m.last_name as referred_name
    FROM referral_vouchers rv
    JOIN members m ON rv.referred_member_id = m.id
    WHERE rv.referrer_member_id = ?
    ORDER BY rv.issued_at DESC
  `).all(memberId);
}

function addMemberReferral(referrerId, referredMemberId, voucherValue) {
  const db = getDatabase();
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 3);

  const result = db.prepare(`
    INSERT INTO referral_vouchers (referrer_member_id, referred_member_id, voucher_value, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(referrerId, referredMemberId, voucherValue || null, expiresAt.toISOString());

  return db.prepare('SELECT * FROM referral_vouchers WHERE id = ?').get(result.lastInsertRowid);
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
  getMemberTransactions,
  getMemberDisciplines,
  assignDisciplineBelt,
  getMemberNotes,
  addMemberNote,
  getMemberEnrolledClasses,
  changeMemberPlan,
  getMemberPtSessions,
  getMemberCompetitions,
  addMemberCompetition,
  getMemberReferrals,
  addMemberReferral
};
