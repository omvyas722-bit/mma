const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_PATH = ':memory:';

delete require.cache[require.resolve('../db/connection')];

const { getDatabase, closeDatabase } = require('../db/connection');
const reports = require('../data/reports');

before(() => {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT, last_name TEXT,
      status TEXT, location TEXT, plan TEXT,
      joined_date TEXT, trial_end_date TEXT, updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, type TEXT,
      amount REAL, status TEXT, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, class_type TEXT, location TEXT
    );
    CREATE TABLE IF NOT EXISTS class_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER, date TEXT,
      FOREIGN KEY (class_id) REFERENCES classes(id)
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER,
      class_instance_id INTEGER, status TEXT,
      FOREIGN KEY (class_instance_id) REFERENCES class_instances(id),
      FOREIGN KEY (member_id) REFERENCES members(id)
    );
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT, last_name TEXT,
      source TEXT, stage TEXT, created_at TEXT, updated_at TEXT
    )
  `);
  db.exec(`
    INSERT INTO members (status, location, plan, joined_date, trial_end_date, updated_at) VALUES
      ('active', 'Main St', 'premium', '2026-05-01', '2026-04-01', '2026-05-01'),
      ('active', 'Main St', 'basic', '2026-05-05', '2026-04-10', '2026-05-05'),
      ('trial', 'Oak Ave', NULL, NULL, NULL, '2026-05-01'),
      ('cancelled', 'Main St', NULL, NULL, NULL, '2026-05-01');
    INSERT INTO transactions (member_id, type, amount, status, created_at) VALUES
      (1, 'membership', 100, 'completed', '2026-05-01'),
      (1, 'pt_session', 60, 'completed', '2026-05-02'),
      (2, 'membership', 80, 'completed', '2026-05-05'),
      (2, 'membership', 80, 'failed', '2026-05-06');
    INSERT INTO classes (id, class_type, location) VALUES
      (1, 'Muay Thai', 'Main St'),
      (2, 'BJJ', 'Main St');
    INSERT INTO class_instances (id, class_id, date) VALUES
      (1, 1, '2026-05-10'),
      (2, 2, '2026-05-11'),
      (3, 1, '2026-05-12');
    INSERT INTO bookings (member_id, class_instance_id, status) VALUES
      (1, 1, 'attended'),
      (1, 2, 'attended'),
      (2, 1, 'attended'),
      (2, 3, 'no_show');
    INSERT INTO leads (source, stage, created_at, updated_at) VALUES
      ('website', 'converted', '2026-05-01', '2026-05-15'),
      ('facebook', 'new', '2026-05-02', '2026-05-02'),
      ('website', 'lost', '2026-05-03', '2026-05-10'),
      ('referral', 'contacted', '2026-05-04', '2026-05-05');
  `);
});

after(() => closeDatabase());

describe('Reports', () => {
  it('getMembershipReport returns summary', () => {
    const r = reports.getMembershipReport({ date_from: '2026-05-01', date_to: '2026-05-31' });
    assert.ok(r.summary);
    assert.equal(r.summary.total_members, 4);
    assert.equal(r.summary.active, 2);
  });

  it('getMembershipReport returns by_location', () => {
    const r = reports.getMembershipReport();
    assert.ok(r.by_location.length > 0);
  });

  it('getMembershipReport returns by_plan', () => {
    const r = reports.getMembershipReport();
    assert.ok(r.by_plan.length > 0);
  });

  it('getMembershipReport returns new_members', () => {
    const r = reports.getMembershipReport({ date_from: '2026-05-01', date_to: '2026-05-31' });
    assert.ok(r.new_members.length >= 2);
  });

  it('getRevenueReport returns summary with totals', () => {
    const r = reports.getRevenueReport({ date_from: '2026-05-01', date_to: '2026-05-31' });
    assert.ok(r.summary.total_revenue > 0);
    assert.equal(r.summary.total_transactions, 3);
    assert.ok(r.summary.failed_payments.count >= 1);
    assert.ok(r.summary.avg_transaction > 0);
  });

  it('getRevenueReport returns by_type', () => {
    const r = reports.getRevenueReport({ date_from: '2026-05-01', date_to: '2026-05-31' });
    assert.ok(r.by_type.length > 0);
  });

  it('getRevenueReport returns by_date', () => {
    const r = reports.getRevenueReport({ date_from: '2026-05-01', date_to: '2026-05-31' });
    assert.ok(r.by_date.length > 0);
  });

  it('getRevenueReport returns top_members', () => {
    const r = reports.getRevenueReport({ date_from: '2026-05-01', date_to: '2026-05-31' });
    assert.ok(r.top_members.length > 0);
    assert.ok(r.top_members[0].total_spent > 0);
  });

  it('getAttendanceReport returns summary', () => {
    const r = reports.getAttendanceReport({ date_from: '2026-05-01', date_to: '2026-05-31' });
    assert.equal(r.summary.total_bookings, 4);
    assert.equal(r.summary.attended, 3);
    assert.equal(r.summary.no_shows, 1);
  });

  it('getAttendanceReport returns by_class_type', () => {
    const r = reports.getAttendanceReport({ date_from: '2026-05-01', date_to: '2026-05-31' });
    assert.ok(r.by_class_type.length > 0);
  });

  it('getAttendanceReport returns by_location', () => {
    const r = reports.getAttendanceReport({ date_from: '2026-05-01', date_to: '2026-05-31' });
    assert.ok(r.by_location.length > 0);
  });

  it('getAttendanceReport returns top_attendees', () => {
    const r = reports.getAttendanceReport({ date_from: '2026-05-01', date_to: '2026-05-31' });
    assert.ok(r.top_attendees.length > 0);
  });

  it('getLeadsReport returns summary', () => {
    const r = reports.getLeadsReport({ date_from: '2026-05-01', date_to: '2026-05-31' });
    assert.equal(r.summary.total_leads, 4);
    assert.equal(r.summary.converted, 1);
    assert.ok(r.summary.conversion_rate > 0);
  });

  it('getLeadsReport returns by_source', () => {
    const r = reports.getLeadsReport({ date_from: '2026-05-01', date_to: '2026-05-31' });
    assert.ok(r.by_source.length > 0);
  });

  it('getLeadsReport returns by_stage', () => {
    const r = reports.getLeadsReport();
    assert.ok(r.by_stage.length > 0);
  });

  it('getLeadsReport returns conversion_funnel', () => {
    const r = reports.getLeadsReport({ date_from: '2026-05-01', date_to: '2026-05-31' });
    assert.ok(r.conversion_funnel.new >= 1);
  });
});

describe('Reports with default dates', () => {
  it('getRevenueReport uses default dates when not provided', () => {
    const r = reports.getRevenueReport({});
    assert.ok(r.summary.total_revenue > 0);
    assert.equal(r.summary.total_transactions, 3);
  });

  it('getAttendanceReport uses default dates when not provided', () => {
    const r = reports.getAttendanceReport({});
    assert.equal(r.summary.total_bookings, 4);
    assert.equal(r.summary.attended, 3);
  });
});

describe('getLeadsReport with empty leads', () => {
  beforeEach(() => {
    const db = getDatabase();
    db.exec('DELETE FROM leads');
  });

  it('returns 0 conversion_rate when leads table is empty', () => {
    const r = reports.getLeadsReport({});
    assert.equal(r.summary.total_leads, 0);
    assert.equal(r.summary.conversion_rate, 0);
  });
});
