const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_PATH = ':memory:';

delete require.cache[require.resolve('../db/connection')];

const { getDatabase, closeDatabase } = require('../db/connection');
const sp = require('../data/staffPerformance');

before(() => {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, role TEXT, active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT, last_name TEXT,
      stage TEXT, trial_date TEXT, assigned_to INTEGER,
      created_at TEXT, updated_at TEXT, last_contact_date TEXT
    );
    CREATE TABLE IF NOT EXISTS pt_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, coach_id INTEGER, amount REAL,
      status TEXT, created_at TEXT, scheduled_date TEXT
    );
    CREATE TABLE IF NOT EXISTS staff_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, completed_by INTEGER,
      status TEXT, completed_at TEXT, task_type TEXT, title TEXT
    );
    CREATE TABLE IF NOT EXISTS class_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER, coach_id INTEGER,
      date TEXT, start_time TEXT, capacity INTEGER DEFAULT 20, status TEXT DEFAULT 'scheduled'
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER,
      class_instance_id INTEGER, status TEXT
    );
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, class_type TEXT, location TEXT
    );
  `);
  db.exec(`
    INSERT INTO staff (id, name, role, active) VALUES (1, 'Coach Bob', 'coach', 1), (2, 'Coach Sam', 'coach', 1);
    INSERT INTO leads (assigned_to, stage, trial_date, created_at, updated_at, last_contact_date) VALUES
      (1, 'converted', '2026-05-10', '2026-05-01', '2026-05-10', '2026-05-01T10:00:00Z'),
      (1, 'converted', '2026-05-12', '2026-05-02', '2026-05-12', '2026-05-02T11:00:00Z'),
      (1, 'trial_booked', '2026-05-15', '2026-05-03', '2026-05-15', '2026-05-03T12:00:00Z'),
      (2, 'trial_completed', '2026-05-14', '2026-05-01', '2026-05-14', '2026-05-01T13:00:00Z'),
      (2, 'lost', '2026-05-08', '2026-05-01', '2026-05-08', '2026-05-01T14:00:00Z');
    INSERT INTO pt_sessions (coach_id, amount, status, created_at, scheduled_date) VALUES
      (1, 50, 'completed', '2026-05-01', '2026-05-01'),
      (1, 60, 'completed', '2026-05-05', '2026-05-05'),
      (2, 45, 'scheduled', '2026-05-02', '2026-05-10'),
      (2, 50, 'cancelled', '2026-05-03', '2026-05-08');
    INSERT INTO staff_tasks (completed_by, status, completed_at, task_type, title) VALUES
      (1, 'completed', '2026-05-02', 'call', 'Follow up'),
      (1, 'completed', '2026-05-03', 'email', 'Send info'),
      (2, 'completed', '2026-05-02', 'call', 'Check in');
  `);
});

after(() => closeDatabase());

describe('Staff Performance', () => {
  it('getStaffPerformanceMetrics returns metrics for staff member', () => {
    const m = sp.getStaffPerformanceMetrics(1, '2026-05-01', '2026-05-31');
    assert.equal(m.signups, 2);
    assert.equal(m.trials_booked, 3);
    assert.equal(m.pt_sessions_sold, 2);
    assert.equal(m.pt_revenue, 110);
    assert.equal(m.tasks_completed, 2);
    assert.ok(m.avg_response_time_hours > 0);
  });

  it('getStaffPerformanceMetrics returns zeros for no activity', () => {
    const m = sp.getStaffPerformanceMetrics(99, '2026-05-01', '2026-05-31');
    assert.equal(m.signups, 0);
    assert.equal(m.trials_booked, 0);
    assert.equal(m.pt_sessions_sold, 0);
    assert.equal(m.pt_revenue, 0);
  });

  it('getAllStaffPerformance returns all active staff', () => {
    const all = sp.getAllStaffPerformance('2026-05-01', '2026-05-31');
    assert.equal(all.length, 2);
    assert.ok(all[0].staff_name);
    assert.ok(all[0].metrics);
  });

  it('getLeaderboard sorts by signups', () => {
    const lb = sp.getLeaderboard('signups', '2026-05-01', '2026-05-31');
    assert.equal(lb.length, 2);
    assert.equal(lb[0].rank, 1);
    assert.equal(lb[0].staff_id, 1);
  });

  it('getLeaderboard sorts by pt_revenue', () => {
    const lb = sp.getLeaderboard('pt_revenue', '2026-05-01', '2026-05-31');
    assert.equal(lb[0].staff_id, 1);
  });

  it('getStaffAchievements returns appropriate badges', () => {
    const a = sp.getStaffAchievements(1, '2026-05-01', '2026-05-31');
    assert.ok(Array.isArray(a));
    assert.ok(a.some(ach => ach.title === 'Conversion Expert'));
  });

  it('getStaffPerformanceMetrics works without dates', () => {
    const m = sp.getStaffPerformanceMetrics(1);
    assert.ok(typeof m.signups === 'number');
    assert.ok(typeof m.trials_booked === 'number');
  });

  it('getStaffAchievements returns all badges for high performer', () => {
    const db = getDatabase();
    db.prepare("INSERT INTO staff (id, name, role, active) VALUES (99, 'Star Staff', 'coach', 1)").run();
    for (let i = 0; i < 10; i++) {
      db.prepare("INSERT INTO leads (assigned_to, stage, trial_date, created_at, updated_at, last_contact_date) VALUES (99, 'converted', '2026-05-10', '2026-05-01T09:00:00Z', '2026-05-10', '2026-05-01T09:01:00Z')").run();
    }
    for (let i = 0; i < 20; i++) {
      db.prepare("INSERT INTO pt_sessions (coach_id, amount, status, created_at, scheduled_date) VALUES (99, 50, 'completed', '2026-05-01', '2026-05-01')").run();
    }
    for (let i = 0; i < 50; i++) {
      db.prepare("INSERT INTO staff_tasks (completed_by, status, completed_at, task_type, title) VALUES (99, 'completed', '2026-05-02', 'call', 'Task')").run();
    }
    const a = sp.getStaffAchievements(99, '2026-05-01', '2026-05-31');
    assert.ok(a.some(ach => ach.title === 'Signup Champion'));
    assert.ok(a.some(ach => ach.title === 'Top Closer'));
    assert.ok(a.some(ach => ach.title === 'PT Sales Master'));
    assert.ok(a.some(ach => ach.title === 'Task Master'));
    assert.ok(a.some(ach => ach.title === 'Speed Demon'));
  });
});
