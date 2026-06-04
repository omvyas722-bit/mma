// Classes data access layer
const { getDatabase } = require('../db/connection');

function getAllClasses(filters = {}) {
  const db = getDatabase();

  let query = 'SELECT c.id, c.name, c.description, c.location, c.day_of_week, c.start_time, c.end_time, c.max_capacity as capacity, c.class_type, c.instructor_id as coach_id, c.active, c.min_belt, c.fighter_only, c.created_at, c.updated_at, s.name as coach_name FROM classes c LEFT JOIN staff s ON c.instructor_id = s.id WHERE 1=1';
  const params = [];

  if (filters.location) {
    query += ' AND c.location = ?';
    params.push(filters.location);
  }

  if (filters.class_type) {
    query += ' AND c.class_type = ?';
    params.push(filters.class_type);
  }

  if (filters.active !== undefined) {
    query += ' AND c.active = ?';
    params.push(filters.active ? 1 : 0);
  }

  query += ' ORDER BY c.day_of_week, c.start_time';

  return db.prepare(query).all(...params);
}

function getClassById(id) {
  const db = getDatabase();
  return db.prepare(`
    SELECT c.id, c.name, c.description, c.location, c.day_of_week, c.start_time, c.end_time, c.max_capacity as capacity, c.class_type, c.instructor_id as coach_id, c.active, c.min_belt, c.fighter_only, c.created_at, c.updated_at, s.name as coach_name
    FROM classes c
    LEFT JOIN staff s ON c.instructor_id = s.id
    WHERE c.id = ?
  `).get(id);
}

function createClass(classData) {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO classes (
      name, description, location, day_of_week, start_time,
      end_time, max_capacity, class_type, instructor_id, active,
      min_belt, fighter_only
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    classData.name,
    classData.description || null,
    classData.location,
    classData.day_of_week,
    classData.start_time,
    classData.end_time || null,
    classData.max_capacity || classData.capacity || 20,
    classData.class_type,
    classData.instructor_id || classData.coach_id || null,
    classData.active !== undefined ? classData.active : 1,
    classData.min_belt || null,
    classData.fighter_only || 0
  );

  return getClassById(result.lastInsertRowid);
}

function updateClass(id, updates) {
  const db = getDatabase();

  const allowedFields = [
    'name', 'description', 'location', 'day_of_week', 'start_time',
    'end_time', 'max_capacity', 'class_type', 'instructor_id', 'active',
    'min_belt', 'fighter_only'
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

  const query = `UPDATE classes SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...values);

  return getClassById(id);
}

function deleteClass(id) {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM classes WHERE id = ?').run(id);
  return result.changes > 0;
}

// Class instances
function getClassInstances(filters = {}) {
  const db = getDatabase();

  let query = `
    SELECT
      ci.id, ci.class_id, ci.date, ci.start_time, ci.coach_id, ci.capacity, ci.status, ci.class_notes, ci.created_at, ci.updated_at,
      c.name as class_name,
      c.class_type,
      c.location,
      c.min_belt, c.fighter_only,
      s.name as coach_name,
      (SELECT COUNT(*) FROM bookings WHERE class_instance_id = ci.id AND status = 'booked') as booked_count
    FROM class_instances ci
    JOIN classes c ON ci.class_id = c.id
    LEFT JOIN staff s ON ci.coach_id = s.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.date) {
    query += ' AND ci.date = ?';
    params.push(filters.date);
  }

  if (filters.week_start && filters.week_end) {
    query += ' AND ci.date BETWEEN ? AND ?';
    params.push(filters.week_start, filters.week_end);
  }

  if (filters.location) {
    query += ' AND c.location = ?';
    params.push(filters.location);
  }

  if (filters.status) {
    query += ' AND ci.status = ?';
    params.push(filters.status);
  }

  if (filters.active !== undefined) {
    query += ' AND c.active = ?';
    params.push(filters.active ? 1 : 0);
  }

  query += ' ORDER BY ci.date, ci.start_time';

  return db.prepare(query).all(...params);
}

function getClassInstanceById(id) {
  const db = getDatabase();
  return db.prepare(`
    SELECT
      ci.id, ci.class_id, ci.date, ci.start_time, ci.coach_id, ci.capacity, ci.status, ci.cancellation_reason, ci.class_notes, ci.created_at, ci.updated_at,
      c.name as class_name,
      c.class_type,
      c.location,
      c.capacity as default_capacity,
      c.min_belt, c.fighter_only,
      s.name as coach_name,
      (SELECT COUNT(*) FROM bookings WHERE class_instance_id = ci.id AND status = 'booked') as booked_count
    FROM class_instances ci
    JOIN classes c ON ci.class_id = c.id
    LEFT JOIN staff s ON ci.coach_id = s.id
    WHERE ci.id = ?
  `).get(id);
}

function createClassInstance(instanceData) {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO class_instances (
      class_id, date, start_time, coach_id, capacity, status, class_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    instanceData.class_id,
    instanceData.date,
    instanceData.start_time,
    instanceData.coach_id || null,
    instanceData.capacity,
    instanceData.status || 'scheduled',
    instanceData.class_notes || null
  );

  return getClassInstanceById(result.lastInsertRowid);
}

function updateClassInstance(id, updates) {
  const db = getDatabase();

  const allowedFields = [
    'date', 'start_time', 'coach_id', 'capacity', 'status', 'cancellation_reason', 'class_notes'
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

  const query = `UPDATE class_instances SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...values);

  return getClassInstanceById(id);
}

function generateClassInstances(classId, startDate, endDate) {
  const db = getDatabase();
  const classInfo = getClassById(classId);

  if (!classInfo) {
    throw new Error('Class not found');
  }

  const currentDate = new Date(startDate);
  const end = new Date(endDate);
  const instanceDates = [];

  while (currentDate <= end) {
    if (currentDate.getDay() === classInfo.day_of_week) {
      instanceDates.push(currentDate.toISOString().split('T')[0]);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (instanceDates.length === 0) return [];

  const placeholders = instanceDates.map(() => '?').join(',');
  const existingRows = db.prepare(
    `SELECT date FROM class_instances WHERE class_id = ? AND date IN (${placeholders})`
  ).all(classId, ...instanceDates);

  const existingSet = new Set(existingRows.map(r => r.date));
  const toCreate = instanceDates.filter(d => !existingSet.has(d));

  if (toCreate.length === 0) return [];

  const insertStmt = db.prepare(`
    INSERT INTO class_instances (class_id, date, start_time, coach_id, capacity, status)
    VALUES (?, ?, ?, ?, ?, 'scheduled')
  `);

  const txn = db.transaction(() => {
    return toCreate.map(date => {
      const result = insertStmt.run(classId, date, classInfo.start_time, classInfo.coach_id, classInfo.capacity);
      return getClassInstanceById(result.lastInsertRowid);
    });
  });

  return txn();
}

function getClassRoster(classInstanceId) {
  const db = getDatabase();

  return db.prepare(`
    SELECT
      b.id as booking_id,
      b.status as booking_status,
      b.attended_at,
      b.waitlist,
      b.waitlist_position,
      m.id as member_id,
      m.first_name,
      m.last_name,
      m.email,
      m.phone,
      m.status as member_status
    FROM bookings b
    JOIN members m ON b.member_id = m.id
    WHERE b.class_instance_id = ?
    ORDER BY b.waitlist, b.booked_at
  `).all(classInstanceId);
}

module.exports = {
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  getClassInstances,
  getClassInstanceById,
  createClassInstance,
  updateClassInstance,
  generateClassInstances,
  getClassRoster
};
