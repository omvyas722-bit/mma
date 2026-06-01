const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_PATH = ':memory:';

delete require.cache[require.resolve('../db/connection')];

const { getDatabase, closeDatabase } = require('../db/connection');
const staff = require('../data/staff');

before(() => {
  const db = getDatabase();
  db.exec(`
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
    INSERT INTO staff (id, name, email, password_hash, role, active) VALUES (1, 'Admin User', 'admin@test.com', '$2b$10$hash', 'owner', 1);
    INSERT INTO staff (id, name, email, password_hash, role, active) VALUES (2, 'Coach Bob', 'bob@test.com', '$2b$10$hash', 'coach', 1);
  `);
});

after(() => {
  closeDatabase();
});

describe('Staff Data Layer', () => {
  it('getAllStaff returns all active staff', () => {
    const all = staff.getAllStaff({});
    assert.equal(all.length, 2);
    assert.equal(all[0].name, 'Admin User');
  });

  it('getAllStaff filters by role', () => {
    const result = staff.getAllStaff({ role: 'coach' });
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Coach Bob');
  });

  it('getAllStaff filters by active', () => {
    const result = staff.getAllStaff({ active: true });
    assert.equal(result.length, 2);
  });

  it('getAllStaff filters inactive', () => {
    const result = staff.getAllStaff({ active: false });
    assert.equal(result.length, 0);
  });

  it('getStaffById returns correct staff', () => {
    const s = staff.getStaffById(1);
    assert.ok(s);
    assert.equal(s.name, 'Admin User');
    assert.equal(s.role, 'owner');
  });

  it('getStaffById returns undefined for missing', () => {
    const s = staff.getStaffById(999);
    assert.equal(s, undefined);
  });

  it('getStaffByEmail finds by email', () => {
    const s = staff.getStaffByEmail('bob@test.com');
    assert.ok(s);
    assert.equal(s.name, 'Coach Bob');
  });

  it('getStaffByEmail returns undefined for missing', () => {
    const s = staff.getStaffByEmail('nobody@test.com');
    assert.equal(s, undefined);
  });

  it('createStaff inserts and returns staff', () => {
    const s = staff.createStaff({
      name: 'New Staff', email: 'new@test.com',
      password_hash: '$2b$10$hash', role: 'front_desk', phone: '0400000000', active: 1
    });
    assert.ok(s.id);
    assert.equal(s.name, 'New Staff');
    assert.equal(s.role, 'front_desk');
    assert.equal(s.phone, '0400000000');
  });

  it('createStaff throws on non-bcrypt hash', () => {
    assert.throws(() => {
      staff.createStaff({
        name: 'Bad Hash', email: 'bad@test.com',
        password_hash: 'plaintext', role: 'staff'
      });
    }, /bcrypt/);
  });

  it('updateStaff modifies fields', () => {
    const updated = staff.updateStaff(1, { phone: '0499999999', role: 'gm' });
    assert.equal(updated.phone, '0499999999');
    assert.equal(updated.role, 'gm');
  });

  it('updateStaff throws on no valid fields', () => {
    assert.throws(() => {
      staff.updateStaff(1, {});
    }, /No valid fields to update/);
  });

  it('updateStaffPassword changes password', () => {
    const s = staff.updateStaffPassword(1, '$2b$10$newhash');
    assert.ok(s);
  });

  it('deleteStaff soft-deletes by setting active=0', () => {
    const result = staff.deleteStaff(3);
    assert.equal(result, true);
    const s = staff.getStaffById(3);
    assert.equal(s.active, 0);
  });

  it('deleteStaff returns false if already inactive', () => {
    const result = staff.deleteStaff(3);
    assert.equal(result, false);
  });

  it('getStaffStats returns counts by role', () => {
    const stats = staff.getStaffStats();
    assert.equal(typeof stats.total, 'number');
    assert.ok(stats.total >= 2);
    assert.ok(Array.isArray(stats.by_role));
  });

  it('createStaff defaults active to 1 when omitted', () => {
    const s = staff.createStaff({
      name: 'No Active', email: 'noactive@test.com',
      password_hash: '$2b$10$hash', role: 'coach', phone: '0400000001'
    });
    assert.ok(s.id);
    assert.equal(s.active, 1);
  });
});
