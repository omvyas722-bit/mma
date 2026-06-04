const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_PATH = ':memory:';

delete require.cache[require.resolve('../db/connection')];

const { getDatabase, closeDatabase } = require('../db/connection');
const members = require('../data/members');

before(() => {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      date_of_birth DATE,
      location TEXT,
      status TEXT DEFAULT 'active',
      plan TEXT,
      joined_date DATE DEFAULT (date('now')),
      trial_end_date DATE,
      pause_start DATE,
      pause_end DATE,
      cancellation_date DATE,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      medical_conditions TEXT,
      injuries TEXT,
      goals TEXT,
      experience_level TEXT,
      lightspeed_customer_id TEXT,
      notes TEXT,
      health_score INTEGER DEFAULT 0,
      health_score_updated_at DATETIME,
      health_score_factors TEXT,
      is_fighter INTEGER DEFAULT 0,
      membership_type TEXT DEFAULT 'adult',
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS class_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME
    );
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      class_type TEXT NOT NULL,
      instructor_id INTEGER,
      day_of_week INTEGER,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      max_capacity INTEGER DEFAULT 20,
      location TEXT,
      active INTEGER DEFAULT 1 CHECK(active IN (0,1)),
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      class_instance_id INTEGER,
      status TEXT DEFAULT 'confirmed',
      attended_at DATETIME,
      booking_date DATE NOT NULL,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      currency TEXT DEFAULT 'AUD',
      status TEXT DEFAULT 'pending',
      payment_method TEXT,
      lightspeed_transaction_id TEXT,
      processed_at DATETIME,
      failure_reason TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );
  `);
});

after(() => {
  closeDatabase();
});

describe('Members Data Layer', () => {
  const testMember = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@test.com',
    phone: '0400000000',
    location: 'rockingham',
    status: 'active',
    joined_date: '2024-01-15',
    experience_level: 'intermediate'
  };

  it('createMember inserts and returns a member', () => {
    const member = members.createMember(testMember);
    assert.ok(member.id);
    assert.equal(member.first_name, 'John');
    assert.equal(member.last_name, 'Doe');
    assert.equal(member.email, 'john@test.com');
    assert.equal(member.location, 'rockingham');
    assert.equal(member.status, 'active');
  });

  it('getMemberById returns the correct member', () => {
    const member = members.getMemberById(1);
    assert.ok(member);
    assert.equal(member.email, 'john@test.com');
  });

  it('getMemberByEmail finds by email', () => {
    const member = members.getMemberByEmail('john@test.com');
    assert.ok(member);
    assert.equal(member.first_name, 'John');
  });

  it('getAllMembers returns all members with pagination', () => {
    members.createMember({
      first_name: 'Jane', last_name: 'Smith', email: 'jane@test.com',
      phone: '0400000001', location: 'bibra_lake', joined_date: '2024-02-01'
    });
    const result = members.getAllMembers({});
    assert.equal(result.members.length, 2);
    assert.equal(result.total, 2);
    assert.ok(result.limit);
    assert.ok(result.offset >= 0);
  });

  it('getAllMembers filters by status', () => {
    const result = members.getAllMembers({ status: 'active' });
    assert.ok(result.members.length >= 1);
    assert.equal(result.members[0].status, 'active');
  });

  it('getAllMembers filters by location', () => {
    const result = members.getAllMembers({ location: 'bibra_lake' });
    assert.equal(result.members.length, 1);
    assert.equal(result.members[0].last_name, 'Smith');
  });

  it('getAllMembers searches by query', () => {
    const result = members.getAllMembers({ query: 'john' });
    assert.equal(result.members.length, 1);
  });

  it('getAllMembers respects pagination', () => {
    const result = members.getAllMembers({ limit: 1, offset: 0 });
    assert.equal(result.members.length, 1);
  });

  it('updateMember modifies fields', () => {
    const updated = members.updateMember(1, { phone: '0499999999', plan: 'premium' });
    assert.equal(updated.phone, '0499999999');
    assert.equal(updated.plan, 'premium');
  });

  it('updateMember throws on no valid fields', () => {
    assert.throws(() => {
      members.updateMember(1, {});
    }, /No valid fields to update/);
  });

  it('deleteMember sets status to cancelled', () => {
    const result = members.deleteMember(2);
    assert.equal(result, true);
    const cancelled = members.getMemberById(2);
    assert.equal(cancelled.status, 'cancelled');
  });

  it('getMemberStats returns correct counts', () => {
    const stats = members.getMemberStats();
    assert.ok(stats.total >= 2);
    assert.equal(typeof stats.active, 'number');
    assert.equal(typeof stats.trial, 'number');
    assert.equal(typeof stats.cancelled, 'number');
    assert.equal(typeof stats.rockingham, 'number');
    assert.equal(typeof stats.bibra_lake, 'number');
  });

  it('getMemberAttendance returns attendance for member', () => {
    const db = getDatabase();
    db.prepare(`INSERT INTO classes (id, name, class_type, start_time, end_time) VALUES (1, 'BJJ', 'bjj', '09:00', '10:00')`).run();
    db.prepare(`INSERT INTO class_instances (id, class_id, date, start_time) VALUES (1, 1, '2024-06-01', '09:00')`).run();
    db.prepare(`INSERT INTO bookings (member_id, class_id, class_instance_id, status, attended_at, booking_date) VALUES (1, 1, 1, 'attended', '2024-06-01T09:00:00', '2024-06-01')`).run();
    const attendance = members.getMemberAttendance(1);
    assert.equal(attendance.length, 1);
    assert.equal(attendance[0].class_name, 'BJJ');
  });

  it('getMemberTransactions returns transactions for member', () => {
    const db = getDatabase();
    db.prepare(`INSERT INTO transactions (member_id, type, amount, status, payment_method) VALUES (1, 'membership', 99.99, 'completed', 'card')`).run();
    const txns = members.getMemberTransactions(1);
    assert.equal(txns.length, 1);
    assert.equal(txns[0].amount, 99.99);
  });
});
