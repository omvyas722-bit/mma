const { getDatabase } = require('../db/connection');

function getConsents(memberId) {
  return getDatabase().prepare('SELECT * FROM member_consents WHERE member_id = ?').all(memberId);
}

function setConsent(memberId, consentType, granted, ipAddress) {
  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM member_consents WHERE member_id = ? AND consent_type = ?').get(memberId, consentType);
  if (existing) {
    db.prepare(granted
      ? "UPDATE member_consents SET granted = 1, granted_at = datetime('now'), revoked_at = NULL, ip_address = ? WHERE id = ?"
      : "UPDATE member_consents SET granted = 0, revoked_at = datetime('now'), ip_address = ? WHERE id = ?"
    ).run(ipAddress || null, existing.id);
  } else {
    db.prepare(`INSERT INTO member_consents (member_id, consent_type, granted, granted_at, ip_address) VALUES (?, ?, ?, datetime('now'), ?)`)
      .run(memberId, consentType, granted ? 1 : 0, ipAddress || null);
  }
  return getConsents(memberId);
}

function getRetentionPolicies() {
  return getDatabase().prepare('SELECT * FROM data_retention_policy ORDER BY data_category').all();
}

function updateRetentionPolicy(id, fields) {
  const db = getDatabase();
  if (fields.retention_days !== undefined) db.prepare('UPDATE data_retention_policy SET retention_days = ?, updated_at = datetime(\'now\') WHERE id = ?').run(fields.retention_days, id);
  if (fields.auto_delete !== undefined) db.prepare('UPDATE data_retention_policy SET auto_delete = ?, updated_at = datetime(\'now\') WHERE id = ?').run(fields.auto_delete ? 1 : 0, id);
  return getRetentionPolicies();
}

function requestExport(memberId, exportType, format, requestedBy) {
  const db = getDatabase();
  const r = db.prepare('INSERT INTO data_export_log (member_id, export_type, format, requested_by) VALUES (?, ?, ?, ?)').run(memberId || null, exportType || 'full', format || 'json', requestedBy);
  return db.prepare('SELECT * FROM data_export_log WHERE id = ?').get(r.lastInsertRowid);
}

function getExports() {
  return getDatabase().prepare('SELECT del.*, s.first_name, s.last_name FROM data_export_log del JOIN staff s ON del.requested_by = s.id ORDER BY del.created_at DESC').all();
}

function getMemberData(memberId) {
  const db = getDatabase();
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
  const plans = db.prepare("SELECT * FROM member_plans WHERE member_id = ?").all(memberId);
  const transactions = db.prepare("SELECT * FROM transactions WHERE member_id = ?").all(memberId);
  const bookings = db.prepare("SELECT b.*, ci.date, c.name as class_name FROM bookings b JOIN class_instances ci ON b.class_instance_id = ci.id JOIN classes c ON ci.class_id = c.id WHERE b.member_id = ?").all(memberId);
  const consents = db.prepare("SELECT * FROM member_consents WHERE member_id = ?").all(memberId);
  const waivers = db.prepare("SELECT mw.*, wt.name as template_name FROM member_waivers mw JOIN waiver_templates wt ON mw.template_id = wt.id WHERE mw.member_id = ?").all(memberId);
  return { member, plans, transactions, bookings, consents, waivers };
}

module.exports = { getConsents, setConsent, getRetentionPolicies, updateRetentionPolicy, requestExport, getExports, getMemberData };
