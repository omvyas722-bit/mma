const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_PATH = ':memory:';

delete require.cache[require.resolve('../db/connection')];

const { getDatabase, closeDatabase } = require('../db/connection');
const bookings = require('../data/bookings');

before(() => {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT UNIQUE, phone TEXT, status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, class_type TEXT NOT NULL, location TEXT, active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS class_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL, date DATE NOT NULL, start_time TIME NOT NULL, capacity INTEGER DEFAULT 20,
      status TEXT DEFAULT 'scheduled',
      created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL, class_instance_id INTEGER NOT NULL, status TEXT DEFAULT 'booked',
      waitlist INTEGER DEFAULT 0, waitlist_position INTEGER,
      booked_at DATETIME DEFAULT (datetime('now')), attended_at DATETIME, cancelled_at DATETIME,
      created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME DEFAULT (datetime('now'))
    );
    INSERT INTO members (id, first_name, last_name, email) VALUES (1, 'John', 'Doe', 'john@test.com');
    INSERT INTO members (id, first_name, last_name, email) VALUES (2, 'Jane', 'Smith', 'jane@test.com');
    INSERT INTO classes (id, name, class_type, location) VALUES (1, 'Morning BJJ', 'bjj', 'rockingham');
    INSERT INTO class_instances (id, class_id, date, start_time, capacity) VALUES (1, 1, '2099-06-01', '06:00', 20);
    INSERT INTO class_instances (id, class_id, date, start_time, capacity) VALUES (2, 1, '2099-06-02', '06:00', 1);
    INSERT INTO class_instances (id, class_id, date, start_time, capacity) VALUES (10, 1, '2099-06-10', '06:00', 20);
  `);
});

after(() => {
  closeDatabase();
});

beforeEach(() => {
  const db = getDatabase();
  db.exec(`DELETE FROM bookings`);
});

describe('createBooking', () => {
  it('inserts and returns a booking', () => {
    const b = bookings.createBooking({ member_id: 1, class_instance_id: 1 });
    assert.ok(b.id);
    assert.equal(b.member_id, 1);
    assert.equal(b.status, 'booked');
    assert.equal(b.waitlist, 0);
  });

  it('throws when member already has active booking for instance', () => {
    bookings.createBooking({ member_id: 1, class_instance_id: 1 });
    assert.throws(() => {
      bookings.createBooking({ member_id: 1, class_instance_id: 1 });
    }, /already has an active booking/);
  });

  it('throws when class instance not found', () => {
    assert.throws(() => {
      bookings.createBooking({ member_id: 1, class_instance_id: 999 });
    }, /Class instance not found/);
  });

  it('adds to waitlist when class is full', () => {
    const b1 = bookings.createBooking({ member_id: 2, class_instance_id: 2 });
    assert.equal(b1.waitlist, 0);
    const b2 = bookings.createBooking({ member_id: 1, class_instance_id: 2 });
    assert.equal(b2.waitlist, 1);
  });
});

describe('getBookingById', () => {
  it('returns the correct booking', () => {
    const b = bookings.createBooking({ member_id: 1, class_instance_id: 1 });
    const found = bookings.getBookingById(b.id);
    assert.ok(found);
    assert.equal(found.class_name, 'Morning BJJ');
    assert.equal(found.first_name, 'John');
  });

  it('returns undefined for non-existent id', () => {
    assert.equal(bookings.getBookingById(999), undefined);
  });
});

describe('getAllBookings', () => {
  it('returns all bookings', () => {
    bookings.createBooking({ member_id: 1, class_instance_id: 1 });
    bookings.createBooking({ member_id: 2, class_instance_id: 2 });
    const r = bookings.getAllBookings({});
    assert.equal(r.length, 2);
  });

  it('filters by member_id', () => {
    bookings.createBooking({ member_id: 1, class_instance_id: 1 });
    const r = bookings.getAllBookings({ member_id: 1 });
    assert.equal(r.length, 1);
  });

  it('filters by status', () => {
    bookings.createBooking({ member_id: 1, class_instance_id: 1 });
    const r = bookings.getAllBookings({ status: 'booked' });
    assert.equal(r.length, 1);
  });

  it('filters by class_instance_id', () => {
    bookings.createBooking({ member_id: 1, class_instance_id: 1 });
    bookings.createBooking({ member_id: 2, class_instance_id: 2 });
    const r = bookings.getAllBookings({ class_instance_id: 1 });
    assert.equal(r.length, 1);
    assert.equal(r[0].class_instance_id, 1);
  });

  it('filters by date', () => {
    bookings.createBooking({ member_id: 1, class_instance_id: 1 });
    bookings.createBooking({ member_id: 2, class_instance_id: 2 });
    const r = bookings.getAllBookings({ date: '2099-06-01' });
    assert.equal(r.length, 1);
    assert.equal(r[0].date, '2099-06-01');
  });
});

describe('updateBooking', () => {
  it('modifies fields', () => {
    const b = bookings.createBooking({ member_id: 1, class_instance_id: 1 });
    const updated = bookings.updateBooking(b.id, { status: 'attended' });
    assert.equal(updated.status, 'attended');
  });

  it('throws on no valid fields', () => {
    const b = bookings.createBooking({ member_id: 1, class_instance_id: 1 });
    assert.throws(() => {
      bookings.updateBooking(b.id, {});
    }, /No valid fields to update/);
  });
});

describe('cancelBooking', () => {
  it('cancels and promotes waitlist', () => {
    const b = bookings.createBooking({ member_id: 1, class_instance_id: 2 });
    assert.equal(b.waitlist, 0);
    const w = bookings.createBooking({ member_id: 2, class_instance_id: 2 });
    assert.equal(w.waitlist, 1);
    const result = bookings.cancelBooking(b.id);
    assert.ok(result.promoted);
    assert.equal(result.promoted.member_id, 2);
    assert.equal(result.promoted.waitlist, 0);
  });

  it('throws for already cancelled booking', () => {
    const b = bookings.createBooking({ member_id: 1, class_instance_id: 10 });
    bookings.cancelBooking(b.id);
    assert.throws(() => {
      bookings.cancelBooking(b.id);
    }, /already cancelled/);
  });

  it('throws for non-existent booking', () => {
    assert.throws(() => {
      bookings.cancelBooking(999);
    }, /Booking not found/);
  });

  it('without waitlist returns cancelled only', () => {
    const b = bookings.createBooking({ member_id: 1, class_instance_id: 10 });
    const result = bookings.cancelBooking(b.id);
    assert.equal(result.promoted, undefined);
  });
});

describe('markAttendance', () => {
  it('marks as attended', () => {
    const b = bookings.createBooking({ member_id: 1, class_instance_id: 10 });
    const result = bookings.markAttendance(b.id, true);
    assert.equal(result.status, 'attended');
    assert.ok(result.attended_at);
  });

  it('marks as no_show', () => {
    const b = bookings.createBooking({ member_id: 1, class_instance_id: 10 });
    const result = bookings.markAttendance(b.id, false);
    assert.equal(result.status, 'no_show');
    assert.equal(result.attended_at, null);
  });

  it('throws for non-existent booking', () => {
    assert.throws(() => {
      bookings.markAttendance(999, true);
    }, /Booking not found/);
  });

  it('throws for cancelled booking', () => {
    const b = bookings.createBooking({ member_id: 1, class_instance_id: 10 });
    bookings.cancelBooking(b.id);
    assert.throws(() => {
      bookings.markAttendance(b.id, true);
    }, /Cannot mark attendance for cancelled booking/);
  });
});

describe('getUpcomingBookings', () => {
  it('returns upcoming bookings for a valid member', () => {
    bookings.createBooking({ member_id: 1, class_instance_id: 1 });
    const r = bookings.getUpcomingBookings(1);
    assert.equal(r.length, 1);
    assert.equal(r[0].member_id, 1);
    assert.equal(r[0].class_name, 'Morning BJJ');
  });

  it('returns empty for member with no upcoming bookings', () => {
    const r = bookings.getUpcomingBookings(999);
    assert.equal(r.length, 0);
  });
});

describe('getBookingStats', () => {
  it('returns stats with data', () => {
    bookings.createBooking({ member_id: 1, class_instance_id: 1 });
    bookings.createBooking({ member_id: 2, class_instance_id: 1 });
    const stats = bookings.getBookingStats();
    assert.ok(typeof stats.today === 'number');
    assert.ok(typeof stats.upcoming === 'number');
    assert.ok(typeof stats.waitlist === 'number');
    assert.equal(stats.upcoming, 2);
    assert.equal(stats.waitlist, 0);
  });

  it('returns stats with waitlisted bookings', () => {
    bookings.createBooking({ member_id: 1, class_instance_id: 2 });
    bookings.createBooking({ member_id: 2, class_instance_id: 2 });
    const stats = bookings.getBookingStats();
    assert.equal(stats.upcoming, 2);
    assert.equal(stats.waitlist, 1);
  });
});
