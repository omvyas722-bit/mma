// Staff tasks data access layer
const { getDatabase } = require('../db/connection');

function getAllTasks(filters = {}) {
  const db = getDatabase();

  let query = `
    SELECT
      st.id, st.lead_id, st.member_id, st.assigned_to, st.task_type, st.priority, st.title, st.description, st.due_date, st.status, st.completed_at, st.completed_by, st.notes, st.created_at, st.updated_at,
      l.first_name || ' ' || l.last_name as lead_name,
      l.phone as lead_phone,
      l.stage as lead_stage,
      m.first_name || ' ' || m.last_name as member_name,
      s.name as assigned_to_name
    FROM staff_tasks st
    LEFT JOIN leads l ON st.lead_id = l.id
    LEFT JOIN members m ON st.member_id = m.id
    LEFT JOIN staff s ON st.assigned_to = s.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.assigned_to) {
    query += ' AND st.assigned_to = ?';
    params.push(filters.assigned_to);
  }

  if (filters.status) {
    query += ' AND st.status = ?';
    params.push(filters.status);
  }

  if (filters.priority) {
    query += ' AND st.priority = ?';
    params.push(filters.priority);
  }

  if (filters.task_type) {
    query += ' AND st.task_type = ?';
    params.push(filters.task_type);
  }

  query += ' ORDER BY st.priority DESC, st.due_date ASC, st.created_at DESC';

  return db.prepare(query).all(...params);
}

function getTaskById(id) {
  const db = getDatabase();
  return db.prepare(`
    SELECT
      st.id, st.lead_id, st.member_id, st.assigned_to, st.task_type, st.priority, st.title, st.description, st.due_date, st.status, st.completed_at, st.completed_by, st.notes, st.created_at, st.updated_at,
      l.first_name || ' ' || l.last_name as lead_name,
      l.phone as lead_phone,
      l.email as lead_email,
      l.stage as lead_stage,
      m.first_name || ' ' || m.last_name as member_name,
      s.name as assigned_to_name
    FROM staff_tasks st
    LEFT JOIN leads l ON st.lead_id = l.id
    LEFT JOIN members m ON st.member_id = m.id
    LEFT JOIN staff s ON st.assigned_to = s.id
    WHERE st.id = ?
  `).get(id);
}

function createTask(taskData) {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO staff_tasks (
      lead_id, member_id, assigned_to, task_type, priority,
      title, description, due_date, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    taskData.lead_id || null,
    taskData.member_id || null,
    taskData.assigned_to || null,
    taskData.task_type,
    taskData.priority || 'medium',
    taskData.title,
    taskData.description || null,
    taskData.due_date || null,
    taskData.status || 'pending'
  );

  return getTaskById(result.lastInsertRowid);
}

function updateTask(id, updates) {
  const db = getDatabase();

  const allowedFields = [
    'assigned_to', 'priority', 'title', 'description',
    'due_date', 'status', 'completed_at', 'completed_by', 'notes'
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

  const query = `UPDATE staff_tasks SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...values);

  return getTaskById(id);
}

function completeTask(id, staffId, notes = null) {
  return updateTask(id, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    completed_by: staffId,
    notes: notes
  });
}

function deleteTask(id) {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM staff_tasks WHERE id = ?').run(id);
  return result.changes > 0;
}

function getTaskStats(staffId = null) {
  const db = getDatabase();

  let query = `
    SELECT
      status,
      priority,
      COUNT(*) as count
    FROM staff_tasks
    WHERE 1=1
  `;
  const params = [];

  if (staffId) {
    query += ' AND assigned_to = ?';
    params.push(staffId);
  }

  query += ' GROUP BY status, priority';

  const stats = db.prepare(query).all(...params);

  return {
    by_status: stats.reduce((acc, row) => {
      if (!acc[row.status]) acc[row.status] = 0;
      acc[row.status] += row.count;
      return acc;
    }, {}),
    by_priority: stats.reduce((acc, row) => {
      if (!acc[row.priority]) acc[row.priority] = 0;
      acc[row.priority] += row.count;
      return acc;
    }, {})
  };
}

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  getTaskStats
};
