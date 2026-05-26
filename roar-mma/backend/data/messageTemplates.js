// Message templates data access layer
const { getDatabase } = require('../db/connection');

function getAllTemplates(filters = {}) {
  const db = getDatabase();

  let query = 'SELECT * FROM message_templates WHERE 1=1';
  const params = [];

  if (filters.type) {
    query += ' AND type = ?';
    params.push(filters.type);
  }

  if (filters.trigger_event) {
    query += ' AND trigger_event = ?';
    params.push(filters.trigger_event);
  }

  if (filters.active !== undefined) {
    query += ' AND active = ?';
    params.push(filters.active ? 1 : 0);
  }

  query += ' ORDER BY trigger_event, type';

  return db.prepare(query).all(...params);
}

function getTemplateById(id) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM message_templates WHERE id = ?').get(id);
}

function createTemplate(templateData) {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO message_templates (
      name, type, trigger_event, subject, body, active
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    templateData.name,
    templateData.type,
    templateData.trigger_event,
    templateData.subject || null,
    templateData.body,
    templateData.active !== undefined ? templateData.active : 1
  );

  return getTemplateById(result.lastInsertRowid);
}

function updateTemplate(id, updates) {
  const db = getDatabase();

  const allowedFields = ['name', 'type', 'trigger_event', 'subject', 'body', 'active'];
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

  const query = `UPDATE message_templates SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...values);

  return getTemplateById(id);
}

function deleteTemplate(id) {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM message_templates WHERE id = ?').run(id);
  return result.changes > 0;
}

module.exports = {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate
};
