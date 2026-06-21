const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_PATH = ':memory:';

delete require.cache[require.resolve('../db/connection')];

const { getDatabase, closeDatabase } = require('../db/connection');
const members = require('../data/members');
const classes = require('../data/classes');
const bookings = require('../data/bookings');

before(() => {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT UNIQUE, phone TEXT, date_of_birth DATE,
      status TEXT DEFAULT 'active', plan TEXT, joined_date DATE DEFAULT (date('now')), trial_end_date DATE,
      pause_start DATE, pause_end DATE, cancellation_date DATE,
      emergency_contact_name TEXT, emergency_contact_phone TEXT, medical_conditions TEXT,
      injuries TEXT, goals TEXT, experience_level TEXT, lightspeed_customer_id TEXT,
      notes TEXT, health_score INTEGER DEFAULT 0, health_score_updated_at DATETIME,
      health_score_factors TEXT, is_fighter INTEGER DEFAULT 0,
      membership_type TEXT DEFAULT 'adult', parent_id INTEGER, referred_by TEXT,
      gender TEXT, address TEXT, suburb TEXT, postcode TEXT, location TEXT,
      created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      role TEXT NOT NULL, phone TEXT, active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, description TEXT, class_type TEXT NOT NULL,
      instructor_id INTEGER, day_of_week INTEGER,
      start_time TIME NOT NULL, end_time TIME, max_capacity INTEGER DEFAULT 20,
      location TEXT, active INTEGER DEFAULT 1, min_belt TEXT, fighter_only INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS class_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL, date DATE NOT NULL, start_time TIME NOT NULL,
      coach_id INTEGER, capacity INTEGER DEFAULT 20, status TEXT DEFAULT 'scheduled',
      cancellation_reason TEXT, class_notes TEXT,
      created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL, class_instance_id INTEGER NOT NULL, status TEXT DEFAULT 'booked',
      waitlist INTEGER DEFAULT 0, waitlist_position INTEGER,
      booked_at DATETIME DEFAULT (datetime('now')), attended_at DATETIME, cancelled_at DATETIME,
      created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS belt_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, color TEXT, color_code TEXT, sort_order INTEGER DEFAULT 0
    );
    INSERT INTO staff (id, name, email, password_hash, role) VALUES (1, 'Coach A', 'coach@test.com', 'hash', 'coach');
    INSERT INTO belt_levels (name, color, color_code) VALUES ('white', '#FFFFFF', '#FFFFFF');
  `);
});

after(() => {
  closeDatabase();
});

describe('Integration: Member → Booking → Attendance', () => {
  it('creates a member, books a class, and marks attendance', () => {
    const member = members.createMember({
      first_name: 'Jane',
      last_name: 'Fighter',
      email: 'jane.fighter@test.com',
      phone: '0400000000',
      location: 'rockingham',
      status: 'active',
      joined_date: '2024-01-15'
    });
    assert.ok(member.id);

    const cls = classes.createClass({
      name: 'Morning BJJ', class_type: 'bjj', location: 'rockingham',
      day_of_week: 1, start_time: '06:00', duration_minutes: 60,
      capacity: 20, coach_id: 1, active: 1
    });
    assert.ok(cls.id);

    const instance = classes.createClassInstance({
      class_id: cls.id,
      date: '2099-07-01',
      start_time: '06:00',
      capacity: 20
    });
    assert.ok(instance.id);

    const booking = bookings.createBooking({ member_id: member.id, class_instance_id: instance.id });
    assert.ok(booking.id);
    assert.equal(booking.member_id, member.id);
    assert.equal(booking.status, 'booked');
    assert.equal(booking.waitlist, 0);

    const attended = bookings.markAttendance(booking.id, true);
    assert.equal(attended.status, 'attended');
    assert.ok(attended.attended_at);

    const verified = bookings.getBookingById(booking.id);
    assert.equal(verified.status, 'attended');
    assert.ok(verified.attended_at);
  });

  it('rejects attendance for a cancelled booking', () => {
    const member = members.createMember({
      first_name: 'Leave',
      last_name: 'User',
      email: 'leave@test.com',
      status: 'active'
    });
    const cls = classes.createClass({
      name: 'Evening Muay Thai', class_type: 'muay_thai', location: 'bibra_lake',
      day_of_week: 2, start_time: '18:00', duration_minutes: 60,
      capacity: 25, active: 1
    });
    const instance = classes.createClassInstance({
      class_id: cls.id, date: '2099-07-02', start_time: '18:00', capacity: 25
    });
    const booking = bookings.createBooking({ member_id: member.id, class_instance_id: instance.id });

    bookings.cancelBooking(booking.id);
    assert.throws(() => {
      bookings.markAttendance(booking.id, true);
    }, /Cannot mark attendance for cancelled booking/);
  });

  it('tracks no-show when marked not attended', () => {
    const member = members.createMember({
      first_name: 'Skip',
      last_name: 'User',
      email: 'skip@test.com',
      status: 'active'
    });
    const cls = classes.createClass({
      name: 'Noon Boxing', class_type: 'boxing', location: 'rockingham',
      day_of_week: 3, start_time: '12:00', duration_minutes: 60,
      capacity: 15, active: 1
    });
    const instance = classes.createClassInstance({
      class_id: cls.id, date: '2099-07-03', start_time: '12:00', capacity: 15
    });
    const booking = bookings.createBooking({ member_id: member.id, class_instance_id: instance.id });

    const noshow = bookings.markAttendance(booking.id, false);
    assert.equal(noshow.status, 'no_show');
    assert.equal(noshow.attended_at, null);

    const verified = bookings.getBookingById(booking.id);
    assert.equal(verified.status, 'no_show');
  });
});
