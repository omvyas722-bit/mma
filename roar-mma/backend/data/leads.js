// Leads data access layer
const { getDatabase } = require('../db/connection');

function getAllLeads(filters = {}) {
  const db = getDatabase();

  const selectColumns = `
      l.id, l.first_name, l.last_name, l.email, l.phone, l.source, l.referrer_member_id, l.stage, l.interest_level, l.location, l.interests, l.assigned_to, l.converted_member_id, l.lost_reason, l.notes, l.trial_date, l.trial_notes, l.trial_experience_rating, l.trial_interest_level, l.trial_class_type, l.trial_coach_id, l.follow_up_status, l.next_follow_up_date, l.last_contact_date, l.follow_up_count, l.score, l.score_updated_at, l.score_factors, l.utm_source, l.utm_medium, l.utm_campaign, l.created_at, l.updated_at,
      s.name as assigned_to_name,
      m.first_name || ' ' || m.last_name as referrer_name
  `;

  const fromClause = `
    FROM leads l
    LEFT JOIN staff s ON l.assigned_to = s.id
    LEFT JOIN members m ON l.referrer_member_id = m.id
    WHERE 1=1
  `;

  const conditions = [];
  const params = [];

  if (filters.stage) {
    conditions.push('l.stage = ?');
    params.push(filters.stage);
  }

  if (filters.location) {
    conditions.push('l.location = ?');
    params.push(filters.location);
  }

  if (filters.source) {
    conditions.push('l.source = ?');
    params.push(filters.source);
  }

  if (filters.assigned_to) {
    conditions.push('l.assigned_to = ?');
    params.push(filters.assigned_to);
  }

  if (filters.query) {
    conditions.push('(l.first_name LIKE ? OR l.last_name LIKE ? OR l.email LIKE ? OR l.phone LIKE ?)');
    const searchTerm = `%${filters.query}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const whereClause = conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '';
  const countQuery = `SELECT COUNT(*) as total ${fromClause}${whereClause}`;
  const total = db.prepare(countQuery).get(...params).total;

  const query = `SELECT ${selectColumns} ${fromClause}${whereClause} ORDER BY l.created_at DESC`;

  const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 50, 1), 500);
  const offset = Math.max(parseInt(filters.offset, 10) || 0, 0);
  const paginatedQuery = `${query} LIMIT ? OFFSET ?`;
  const paginatedParams = [...params, limit, offset];

  const leads = db.prepare(paginatedQuery).all(...paginatedParams);

  return { leads, total, limit, offset };
}

function getLeadById(id) {
  const db = getDatabase();
  return db.prepare(`
    SELECT
      l.id, l.first_name, l.last_name, l.email, l.phone, l.source, l.referrer_member_id, l.stage, l.interest_level, l.location, l.interests, l.assigned_to, l.converted_member_id, l.lost_reason, l.notes, l.trial_date, l.trial_notes, l.trial_experience_rating, l.trial_interest_level, l.trial_class_type, l.trial_coach_id, l.follow_up_status, l.next_follow_up_date, l.last_contact_date, l.follow_up_count, l.score, l.score_updated_at, l.score_factors, l.utm_source, l.utm_medium, l.utm_campaign, l.created_at, l.updated_at,
      s.name as assigned_to_name,
      m.first_name || ' ' || m.last_name as referrer_name
    FROM leads l
    LEFT JOIN staff s ON l.assigned_to = s.id
    LEFT JOIN members m ON l.referrer_member_id = m.id
    WHERE l.id = ?
  `).get(id);
}

function createLead(leadData) {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO leads (
      first_name, last_name, email, phone, source,
      referrer_member_id, stage, location, interests, notes, assigned_to,
      utm_source, utm_medium, utm_campaign
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    leadData.first_name,
    leadData.last_name,
    leadData.email || null,
    leadData.phone,
    leadData.source || 'other',
    leadData.referrer_member_id || null,
    leadData.stage || 'new',
    leadData.location || null,
    leadData.interests || null,
    leadData.notes || null,
    leadData.assigned_to || null,
    leadData.utm_source || null,
    leadData.utm_medium || null,
    leadData.utm_campaign || null
  );

  return getLeadById(result.lastInsertRowid);
}

function updateLead(id, updates) {
  const db = getDatabase();

  const allowedFields = [
    'first_name', 'last_name', 'email', 'phone', 'source',
    'referrer_member_id', 'stage', 'location', 'interests',
    'notes', 'assigned_to', 'converted_member_id', 'lost_reason',
    'trial_date', 'trial_notes', 'trial_experience_rating', 'trial_interest_level',
    'trial_class_type', 'trial_coach_id', 'follow_up_status', 'next_follow_up_date',
    'last_contact_date', 'follow_up_count',
    'utm_source', 'utm_medium', 'utm_campaign',
    'score', 'score_updated_at', 'score_factors'
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

  fields.push("updated_at = datetime('now')");
  values.push(id);

  const query = `UPDATE leads SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...values);

  return getLeadById(id);
}

function deleteLead(id) {
  const db = getDatabase();
  const result = db.prepare(`
    UPDATE leads SET stage = 'lost', lost_reason = 'Deleted by staff', updated_at = datetime('now') WHERE id = ?
  `).run(id);
  return result.changes > 0;
}

function getLeadInteractions(leadId) {
  const db = getDatabase();

  return db.prepare(`
    SELECT
      li.id, li.lead_id, li.staff_id, li.interaction_type, li.notes, li.created_at,
      s.name as staff_name
    FROM lead_interactions li
    JOIN staff s ON li.staff_id = s.id
    WHERE li.lead_id = ?
    ORDER BY li.created_at DESC
  `).all(leadId);
}

function addLeadInteraction(interactionData) {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO lead_interactions (
      lead_id, staff_id, interaction_type, notes
    ) VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(
    interactionData.lead_id,
    interactionData.staff_id,
    interactionData.interaction_type,
    interactionData.notes || null
  );

  return db.prepare(`
    SELECT
      li.id, li.lead_id, li.staff_id, li.interaction_type, li.notes, li.created_at,
      s.name as staff_name
    FROM lead_interactions li
    JOIN staff s ON li.staff_id = s.id
    WHERE li.id = ?
  `).get(result.lastInsertRowid);
}

function getLeadStats() {
  const db = getDatabase();

  return {
    new: db.prepare("SELECT COUNT(*) as count FROM leads WHERE stage = 'new'").get().count,
    contacted: db.prepare("SELECT COUNT(*) as count FROM leads WHERE stage = 'contacted'").get().count,
    trial_booked: db.prepare("SELECT COUNT(*) as count FROM leads WHERE stage = 'trial_booked'").get().count,
    trial_completed: db.prepare("SELECT COUNT(*) as count FROM leads WHERE stage = 'trial_completed'").get().count,
    converted: db.prepare("SELECT COUNT(*) as count FROM leads WHERE stage = 'converted'").get().count,
    lost: db.prepare("SELECT COUNT(*) as count FROM leads WHERE stage = 'lost'").get().count,
    total: db.prepare("SELECT COUNT(*) as count FROM leads").get().count
  };
}

function getLeadsBySource() {
  const db = getDatabase();

  return db.prepare(`
    SELECT
      source,
      COUNT(*) as count
    FROM leads
    GROUP BY source
    ORDER BY count DESC
  `).all();
}

function getConversionRate() {
  const db = getDatabase();

  const total = db.prepare("SELECT COUNT(*) as count FROM leads WHERE stage != 'new'").get().count;
  const converted = db.prepare("SELECT COUNT(*) as count FROM leads WHERE stage = 'converted'").get().count;

  return total > 0 ? ((converted / total) * 100).toFixed(1) : 0;
}

function getWinBackLeads() {
  const db = getDatabase();
  return db.prepare(`
    SELECT l.id, l.first_name, l.last_name, l.email, l.phone, l.source, l.lost_reason, l.last_contact_date, l.created_at,
      s.name as assigned_to_name
    FROM leads l
    LEFT JOIN staff s ON l.assigned_to = s.id
    WHERE l.stage = 'lost'
      AND (l.last_contact_date IS NULL OR l.last_contact_date < datetime('now', '-14 days'))
    ORDER BY l.last_contact_date ASC NULLS FIRST
    LIMIT 20
  `).all();
}

module.exports = {
  getAllLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  getLeadInteractions,
  addLeadInteraction,
  getLeadStats,
  getLeadsBySource,
  getConversionRate,
  getWinBackLeads
};
