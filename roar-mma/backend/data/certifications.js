const { getDatabase } = require('../db/connection');

function getCertificationsByStaff(staffId) {
  return getDatabase().prepare('SELECT * FROM staff_certifications WHERE staff_id = ? ORDER BY expiry_date ASC').all(staffId);
}

function getCertificationById(id) {
  return getDatabase().prepare('SELECT * FROM staff_certifications WHERE id = ?').get(id);
}

function createCertification({ staff_id, cert_name, issuing_body, cert_number, issued_date, expiry_date, notes }) {
  const db = getDatabase();
  const result = db.prepare(`INSERT INTO staff_certifications (staff_id, cert_name, issuing_body, cert_number, issued_date, expiry_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(staff_id, cert_name, issuing_body || null, cert_number || null, issued_date || null, expiry_date || null, notes || null);
  return getCertificationById(result.lastInsertRowid);
}

function updateCertification(id, fields) {
  const db = getDatabase();
  const allowed = ['cert_name', 'issuing_body', 'cert_number', 'issued_date', 'expiry_date', 'cert_file_path', 'verified', 'notes'];
  const sets = []; const params = [];
  for (const k of allowed) { if (fields[k] !== undefined) { sets.push(`${k} = ?`); params.push(fields[k]); } }
  if (sets.length === 0) return getCertificationById(id);
  sets.push("updated_at = datetime('now')"); params.push(id);
  db.prepare(`UPDATE staff_certifications SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return getCertificationById(id);
}

function deleteCertification(id) {
  return getDatabase().prepare('DELETE FROM staff_certifications WHERE id = ?').run(id);
}

function getExpiringCertifications(days = 30) {
  return getDatabase().prepare(`
    SELECT sc.*, s.first_name, s.last_name, s.email
    FROM staff_certifications sc JOIN staff s ON sc.staff_id = s.id
    WHERE sc.expiry_date BETWEEN date('now') AND date('now', '+' || ? || ' days')
    ORDER BY sc.expiry_date
  `).all(days);
}

module.exports = { getCertificationsByStaff, getCertificationById, createCertification, updateCertification, deleteCertification, getExpiringCertifications };
