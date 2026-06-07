const { getDatabase } = require('../db/connection');

const db = () => getDatabase();

const waiverTemplates = {
  getAll() {
    return db().prepare('SELECT * FROM waiver_templates ORDER BY name').all();
  },

  getById(id) {
    return db().prepare('SELECT * FROM waiver_templates WHERE id = ?').get(id);
  },

  create(data) {
    const stmt = db().prepare('INSERT INTO waiver_templates (name, body_text) VALUES (?, ?)');
    const result = stmt.run(data.name, data.body_text);
    return db().prepare('SELECT * FROM waiver_templates WHERE id = ?').get(result.lastInsertRowid);
  },

  update(id, data) {
    const existing = db().prepare('SELECT * FROM waiver_templates WHERE id = ?').get(id);
    if (!existing) return null;
    const name = data.name ?? existing.name;
    const bodyText = data.body_text ?? existing.body_text;
    const active = data.active !== undefined ? (data.active ? 1 : 0) : existing.active;
    const stmt = db().prepare("UPDATE waiver_templates SET name = ?, body_text = ?, active = ?, version = version + 1, updated_at = datetime('now') WHERE id = ?");
    stmt.run(name, bodyText, active, id);
    return db().prepare('SELECT * FROM waiver_templates WHERE id = ?').get(id);
  },

  remove(id) {
    const result = db().prepare('DELETE FROM waiver_templates WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

const memberWaivers = {
  getByMember(memberId) {
    return db().prepare(`
      SELECT mw.*, wt.name as template_name
      FROM member_waivers mw
      JOIN waiver_templates wt ON wt.id = mw.template_id
      WHERE mw.member_id = ?
      ORDER BY mw.signed_at DESC
    `).all(memberId);
  },

  getById(id) {
    return db().prepare(`
      SELECT mw.*, wt.name as template_name
      FROM member_waivers mw
      JOIN waiver_templates wt ON wt.id = mw.template_id
      WHERE mw.id = ?
    `).get(id);
  },

  sign(data) {
    const stmt = db().prepare('INSERT INTO member_waivers (member_id, template_id, signature_data, ip_address) VALUES (?, ?, ?, ?)');
    const result = stmt.run(data.member_id, data.template_id, data.signature_data, data.ip_address || null);
    return db().prepare('SELECT * FROM member_waivers WHERE id = ?').get(result.lastInsertRowid);
  },

  hasSigned(memberId, templateId) {
    const row = db().prepare('SELECT id FROM member_waivers WHERE member_id = ? AND template_id = ? ORDER BY signed_at DESC LIMIT 1').get(memberId, templateId);
    return !!row;
  },
};

const pendingParentSignatures = {
  create({ member_id, template_id, parent_email, token, expires_at }) {
    const stmt = db().prepare(
      'INSERT INTO pending_parent_signatures (member_id, template_id, parent_email, token, expires_at) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(member_id, template_id, parent_email, token, expires_at);
    return db().prepare('SELECT * FROM pending_parent_signatures WHERE id = ?').get(result.lastInsertRowid);
  },

  getByToken(token) {
    return db().prepare(`
      SELECT pps.*, wt.name as template_name, wt.body_text,
             m.first_name, m.last_name, m.date_of_birth
      FROM pending_parent_signatures pps
      JOIN waiver_templates wt ON wt.id = pps.template_id
      JOIN members m ON m.id = pps.member_id
      WHERE pps.token = ? AND pps.status = 'pending'
    `).get(token);
  },

  sign(id, signature_data, parent_name, parent_relation) {
    db().prepare(`
      UPDATE pending_parent_signatures
      SET signature_data = ?, parent_name = ?, parent_relation = ?,
          status = 'signed', signed_at = datetime('now')
      WHERE id = ?
    `).run(signature_data, parent_name, parent_relation, id);
    return db().prepare('SELECT * FROM pending_parent_signatures WHERE id = ?').get(id);
  },

  getPendingByMember(memberId) {
    return db().prepare(`
      SELECT pps.*, wt.name as template_name
      FROM pending_parent_signatures pps
      JOIN waiver_templates wt ON wt.id = pps.template_id
      WHERE pps.member_id = ? AND pps.status = 'pending'
      ORDER BY pps.created_at DESC
    `).all(memberId);
  },

  getStats() {
    const pending = db().prepare("SELECT COUNT(*) as count FROM pending_parent_signatures WHERE status = 'pending'").get().count;
    const signed = db().prepare("SELECT COUNT(*) as count FROM pending_parent_signatures WHERE status = 'signed'").get().count;
    return { pending, signed };
  },
};

const waiverAnalytics = {
  getStats() {
    const total_signed = db().prepare('SELECT COUNT(*) as count FROM member_waivers').get().count;
    const signed_this_month = db().prepare(`
      SELECT COUNT(*) as count FROM member_waivers
      WHERE signed_at >= date('now', 'start of month')
    `).get().count;
    const pending_parent = db().prepare("SELECT COUNT(*) as count FROM pending_parent_signatures WHERE status = 'pending'").get().count;
    const templates = db().prepare(`
      SELECT wt.id, wt.name, wt.active, COUNT(mw.id) as signed_count
      FROM waiver_templates wt
      LEFT JOIN member_waivers mw ON mw.template_id = wt.id
      GROUP BY wt.id
      ORDER BY signed_count DESC
    `).all();
    return { total_signed, signed_this_month, pending_parent, templates };
  },
};

const memberDocuments = {
  getByMember(memberId) {
    return db().prepare('SELECT * FROM member_documents WHERE member_id = ? ORDER BY uploaded_at DESC').all(memberId);
  },

  getById(id) {
    return db().prepare('SELECT * FROM member_documents WHERE id = ?').get(id);
  },

  create(data) {
    const stmt = db().prepare('INSERT INTO member_documents (member_id, doc_type, file_name, file_path, notes) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(data.member_id, data.doc_type, data.file_name, data.file_path, data.notes || null);
    return db().prepare('SELECT * FROM member_documents WHERE id = ?').get(result.lastInsertRowid);
  },

  remove(id) {
    const result = db().prepare('DELETE FROM member_documents WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

module.exports = { waiverTemplates, memberWaivers, memberDocuments, pendingParentSignatures, waiverAnalytics };
