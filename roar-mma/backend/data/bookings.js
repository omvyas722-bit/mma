// Bookings data access layer
const { getDatabase } = require('../db/connection');

function getAllBookings(filters = {}) {
  const db = getDatabase();

  let query = `
    SELECT
      b.id, b.member_id, b.class_instance_id, b.status, b.waitlist, b.waitlist_position, b.booked_at, b.attended_at, b.cancelled_at, b.created_at, b.updated_at,
      m.first_name,
      m.last_name,
      m.email,
      ci.date,
      ci.start_time,
      c.name as class_name,
      c.class_type,
      c.location
    FROM bookings b
    JOIN members m ON b.member_id = m.id
    JOIN class_instances ci ON b.class_instance_id = ci.id
    JOIN classes c ON ci.class_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.member_id) {
    query += ' AND b.member_id = ?';
    params.push(filters.member_id);
  }

  if (filters.class_instance_id) {
    query += ' AND b.class_instance_id = ?';
    params.push(filters.class_instance_id);
  }

  if (filters.status) {
    query += ' AND b.status = ?';
    params.push(filters.status);
  }

  if (filters.date) {
    query += ' AND ci.date = ?';
    params.push(filters.date);
  }

  query += ' ORDER BY ci.date DESC, ci.start_time DESC';

  return db.prepare(query).all(...params);
}

function getBookingById(id) {
  const db = getDatabase();
  return db.prepare(`
    SELECT
      b.id, b.member_id, b.class_instance_id, b.status, b.waitlist, b.waitlist_position, b.booked_at, b.attended_at, b.cancelled_at, b.created_at, b.updated_at,
      m.first_name,
      m.last_name,
      m.email,
      m.phone,
      m.status as member_status,
      ci.date,
      ci.start_time,
      ci.capacity,
      c.name as class_name,
      c.class_type,
      c.location
    FROM bookings b
    JOIN members m ON b.member_id = m.id
    JOIN class_instances ci ON b.class_instance_id = ci.id
    JOIN classes c ON ci.class_id = c.id
    WHERE b.id = ?
  `).get(id);
}

function createBooking(bookingData) {
  const db = getDatabase();

  // Check if member already has a booking for this class
  const existingBooking = db.prepare(`
    SELECT id FROM bookings
    WHERE member_id = ? AND class_instance_id = ? AND status != 'cancelled'
  `).get(bookingData.member_id, bookingData.class_instance_id);

  if (existingBooking) {
    throw new Error('Member already has an active booking for this class');
  }

  // Get class instance details
  const instance = db.prepare(`
    SELECT ci.capacity,
      (SELECT COUNT(*) FROM bookings WHERE class_instance_id = ci.id AND status = 'booked' AND waitlist = 0) as booked_count
    FROM class_instances ci
    WHERE ci.id = ?
  `).get(bookingData.class_instance_id);

  if (!instance) {
    throw new Error('Class instance not found');
  }

  // Check if class is full
  const isFull = instance.booked_count >= instance.capacity;

  let waitlist = 0;
  let waitlistPosition = null;

  if (isFull) {
    // Add to waitlist
    waitlist = 1;
    const maxPosition = db.prepare(`
      SELECT MAX(waitlist_position) as max_pos
      FROM bookings
      WHERE class_instance_id = ? AND waitlist = 1
    `).get(bookingData.class_instance_id);

    waitlistPosition = (maxPosition.max_pos || 0) + 1;
  }

  const stmt = db.prepare(`
    INSERT INTO bookings (
      member_id, class_instance_id, status, waitlist, waitlist_position
    ) VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    bookingData.member_id,
    bookingData.class_instance_id,
    'booked',
    waitlist,
    waitlistPosition
  );

  return getBookingById(result.lastInsertRowid);
}

function updateBooking(id, updates) {
  const db = getDatabase();

  const allowedFields = ['status', 'attended_at', 'cancelled_at', 'waitlist', 'waitlist_position'];

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

  const query = `UPDATE bookings SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...values);

  return getBookingById(id);
}

function cancelBooking(id) {
  const db = getDatabase();

  const booking = getBookingById(id);

  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.status === 'cancelled') {
    throw new Error('Booking already cancelled');
  }

  // Cancel the booking
  const updatedBooking = updateBooking(id, {
    status: 'cancelled',
    cancelled_at: new Date().toISOString()
  });

  // If this was not a waitlist booking, promote someone from waitlist
  if (booking.waitlist === 0) {
    const nextWaitlist = db.prepare(`
      SELECT id FROM bookings
      WHERE class_instance_id = ? AND waitlist = 1
      ORDER BY waitlist_position
      LIMIT 1
    `).get(booking.class_instance_id);

    if (nextWaitlist) {
      updateBooking(nextWaitlist.id, {
        waitlist: 0,
        waitlist_position: null
      });

      // Return info about promoted booking
      return {
        cancelled: updatedBooking,
        promoted: getBookingById(nextWaitlist.id)
      };
    }
  }

  return { cancelled: updatedBooking };
}

function markAttendance(id, attended = true) {
  const db = getDatabase();

  const booking = getBookingById(id);

  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.status === 'cancelled') {
    throw new Error('Cannot mark attendance for cancelled booking');
  }

  const updates = {
    status: attended ? 'attended' : 'no_show'
  };

  if (attended) {
    updates.attended_at = new Date().toISOString();
  }

  return updateBooking(id, updates);
}

function getUpcomingBookings(memberId, limit = 10) {
  const db = getDatabase();

  return db.prepare(`
    SELECT
      b.id, b.member_id, b.class_instance_id, b.status, b.waitlist, b.waitlist_position, b.booked_at, b.attended_at, b.cancelled_at, b.created_at, b.updated_at,
      ci.date,
      ci.start_time,
      c.name as class_name,
      c.class_type,
      c.location
    FROM bookings b
    JOIN class_instances ci ON b.class_instance_id = ci.id
    JOIN classes c ON ci.class_id = c.id
    WHERE b.member_id = ?
      AND b.status = 'booked'
      AND ci.date >= date('now')
    ORDER BY ci.date, ci.start_time
    LIMIT ?
  `).all(memberId, limit);
}

function getBookingStats() {
  const db = getDatabase();

  const today = new Date().toISOString().split('T')[0];

  return {
    today: db.prepare(`
      SELECT COUNT(*) as count
      FROM bookings b
      JOIN class_instances ci ON b.class_instance_id = ci.id
      WHERE ci.date = ? AND b.status = 'booked'
    `).get(today).count,

    upcoming: db.prepare(`
      SELECT COUNT(*) as count
      FROM bookings b
      JOIN class_instances ci ON b.class_instance_id = ci.id
      WHERE ci.date > ? AND b.status = 'booked'
    `).get(today).count,

    waitlist: db.prepare(`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE waitlist = 1 AND status = 'booked'
    `).get().count
  };
}

module.exports = {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  cancelBooking,
  markAttendance,
  getUpcomingBookings,
  getBookingStats
};
