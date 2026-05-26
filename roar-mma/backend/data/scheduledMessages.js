// Scheduled messages data access layer
const { getDatabase } = require('../db/connection');

function getAllScheduledMessages(filters = {}) {
  const db = getDatabase();

  let query = `
    SELECT
      sm.*,
      l.first_name || ' ' || l.last_name as lead_name,
      m.first_name || ' ' || m.last_name as member_name,
      mt.name as template_name
    FROM scheduled_messages sm
    LEFT JOIN leads l ON sm.lead_id = l.id
    LEFT JOIN members m ON sm.member_id = m.id
    LEFT JOIN message_templates mt ON sm.template_id = mt.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.status) {
    query += ' AND sm.status = ?';
    params.push(filters.status);
  }

  if (filters.message_type) {
    query += ' AND sm.message_type = ?';
    params.push(filters.message_type);
  }

  if (filters.lead_id) {
    query += ' AND sm.lead_id = ?';
    params.push(filters.lead_id);
  }

  if (filters.member_id) {
    query += ' AND sm.member_id = ?';
    params.push(filters.member_id);
  }

  query += ' ORDER BY sm.scheduled_for ASC';

  return db.prepare(query).all(...params);
}

function getScheduledMessageById(id) {
  const db = getDatabase();
  return db.prepare(`
    SELECT
      sm.*,
      l.first_name || ' ' || l.last_name as lead_name,
      m.first_name || ' ' || m.last_name as member_name,
      mt.name as template_name
    FROM scheduled_messages sm
    LEFT JOIN leads l ON sm.lead_id = l.id
    LEFT JOIN members m ON sm.member_id = m.id
    LEFT JOIN message_templates mt ON sm.template_id = mt.id
    WHERE sm.id = ?
  `).get(id);
}

function createScheduledMessage(messageData) {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO scheduled_messages (
      lead_id, member_id, message_type, template_id, scheduled_for,
      recipient_phone, recipient_email, subject, body, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    messageData.lead_id || null,
    messageData.member_id || null,
    messageData.message_type,
    messageData.template_id || null,
    messageData.scheduled_for,
    messageData.recipient_phone || null,
    messageData.recipient_email || null,
    messageData.subject || null,
    messageData.body,
    messageData.status || 'pending'
  );

  return getScheduledMessageById(result.lastInsertRowid);
}

function updateScheduledMessage(id, updates) {
  const db = getDatabase();

  const allowedFields = [
    'status', 'sent_at', 'response_received', 'response_text', 'error_message'
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

  const query = `UPDATE scheduled_messages SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...values);

  return getScheduledMessageById(id);
}

function markMessageSent(id, sentAt = null) {
  return updateScheduledMessage(id, {
    status: 'sent',
    sent_at: sentAt || new Date().toISOString()
  });
}

function markMessageFailed(id, errorMessage) {
  return updateScheduledMessage(id, {
    status: 'failed',
    error_message: errorMessage
  });
}

function cancelScheduledMessage(id) {
  return updateScheduledMessage(id, {
    status: 'cancelled'
  });
}

function getPendingMessages(beforeTime = null) {
  const db = getDatabase();

  const time = beforeTime || new Date().toISOString();

  return db.prepare(`
    SELECT
      sm.*,
      l.first_name as lead_first_name,
      l.last_name as lead_last_name,
      l.email as lead_email,
      l.phone as lead_phone,
      m.first_name as member_first_name,
      m.last_name as member_last_name,
      m.email as member_email,
      m.phone as member_phone
    FROM scheduled_messages sm
    LEFT JOIN leads l ON sm.lead_id = l.id
    LEFT JOIN members m ON sm.member_id = m.id
    WHERE sm.status = 'pending'
      AND sm.scheduled_for <= ?
    ORDER BY sm.scheduled_for ASC
  `).all(time);
}

function deleteScheduledMessage(id) {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM scheduled_messages WHERE id = ?').run(id);
  return result.changes > 0;
}

module.exports = {
  getAllScheduledMessages,
  getScheduledMessageById,
  createScheduledMessage,
  updateScheduledMessage,
  markMessageSent,
  markMessageFailed,
  cancelScheduledMessage,
  getPendingMessages,
  deleteScheduledMessage
};
