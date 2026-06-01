const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_PATH = ':memory:';

delete require.cache[require.resolve('../db/connection')];

const { getDatabase, closeDatabase } = require('../db/connection');
const pts = require('../data/ptSessions');

before(() => {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT, last_name TEXT,
      email TEXT, phone TEXT
    );
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, role TEXT
    );
    CREATE TABLE IF NOT EXISTS member_pt_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, package_id INTEGER,
      sessions_used INTEGER DEFAULT 0, sessions_remaining INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active', created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS pt_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER NOT NULL,
      coach_id INTEGER NOT NULL, member_package_id INTEGER,
      scheduled_date TEXT NOT NULL, scheduled_time TEXT,
      duration_minutes INTEGER DEFAULT 60, status TEXT DEFAULT 'scheduled',
      session_type TEXT DEFAULT 'pt', amount REAL,
      commission_rate REAL, commission_amount REAL,
      commission_paid INTEGER DEFAULT 0, notes TEXT,
      cancelled_reason TEXT, cancelled_at TEXT,
      completed_at TEXT, completed_by INTEGER,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES members(id),
      FOREIGN KEY (coach_id) REFERENCES staff(id),
      FOREIGN KEY (member_package_id) REFERENCES member_pt_packages(id)
    )
  `);
  db.exec(`
    INSERT INTO members (id, first_name, last_name, email, phone) VALUES
      (1, 'John', 'Doe', 'john@test.com', '555-0100');
    INSERT INTO staff (id, name, role) VALUES
      (1, 'Coach Bob', 'coach');
    INSERT INTO member_pt_packages (id, member_id, sessions_used, sessions_remaining, status) VALUES
      (1, 1, 0, 10, 'active');
  `);
});

beforeEach(() => {
  const db = getDatabase();
  db.exec(`DELETE FROM pt_sessions`);
});

after(() => closeDatabase());

describe('PT Sessions Data Layer', () => {
  it('createSession creates and returns', () => {
    const s = pts.createSession({
      member_id: 1, coach_id: 1, scheduled_date: '2026-06-01',
      scheduled_time: '10:00', session_type: 'pt'
    });
    assert.ok(s.id);
    assert.equal(s.member_id, 1);
    assert.equal(s.coach_id, 1);
    assert.equal(s.status, 'scheduled');
    assert.equal(s.duration_minutes, 60);
  });

  it('createSession with all fields', () => {
    const s = pts.createSession({
      member_id: 1, coach_id: 1, member_package_id: 1,
      scheduled_date: '2026-06-01', scheduled_time: '11:00',
      duration_minutes: 90, status: 'confirmed', session_type: 'private',
      amount: 80, commission_rate: 50, notes: 'Focus on kicks'
    });
    assert.equal(s.duration_minutes, 90);
    assert.equal(s.amount, 80);
    assert.equal(s.notes, 'Focus on kicks');
  });

  it('getSessionById returns session', () => {
    const s = pts.createSession({
      member_id: 1, coach_id: 1, scheduled_date: '2026-06-01', scheduled_time: '10:00'
    });
    const found = pts.getSessionById(s.id);
    assert.ok(found);
    assert.ok(found.member_name);
    assert.ok(found.coach_name);
  });

  it('getSessionById returns undefined for missing', () => {
    assert.equal(pts.getSessionById(999), undefined);
  });

  it('getAllSessions returns all', () => {
    pts.createSession({ member_id: 1, coach_id: 1, scheduled_date: '2026-06-01', scheduled_time: '10:00' });
    pts.createSession({ member_id: 1, coach_id: 1, scheduled_date: '2026-06-02', scheduled_time: '11:00' });
    assert.equal(pts.getAllSessions({}).length, 2);
  });

  it('getAllSessions filters by member_id', () => {
    pts.createSession({ member_id: 1, coach_id: 1, scheduled_date: '2026-06-01', scheduled_time: '10:00' });
    const r = pts.getAllSessions({ member_id: 1 });
    assert.equal(r.length, 1);
  });

  it('getAllSessions filters by coach_id', () => {
    pts.createSession({ member_id: 1, coach_id: 1, scheduled_date: '2026-06-01', scheduled_time: '10:00' });
    const r = pts.getAllSessions({ coach_id: 1 });
    assert.equal(r.length, 1);
  });

  it('getAllSessions filters by status', () => {
    pts.createSession({ member_id: 1, coach_id: 1, scheduled_date: '2026-06-01', scheduled_time: '10:00', status: 'completed' });
    pts.createSession({ member_id: 1, coach_id: 1, scheduled_date: '2026-06-02', scheduled_time: '11:00', status: 'cancelled' });
    assert.equal(pts.getAllSessions({ status: 'completed' }).length, 1);
    assert.equal(pts.getAllSessions({ status: 'cancelled' }).length, 1);
  });

  it('getAllSessions filters by date range', () => {
    pts.createSession({ member_id: 1, coach_id: 1, scheduled_date: '2026-06-01', scheduled_time: '10:00' });
    pts.createSession({ member_id: 1, coach_id: 1, scheduled_date: '2026-07-01', scheduled_time: '11:00' });
    const r = pts.getAllSessions({ date_from: '2026-06-01', date_to: '2026-06-30' });
    assert.equal(r.length, 1);
  });

  it('updateSession modifies fields', () => {
    const s = pts.createSession({
      member_id: 1, coach_id: 1, scheduled_date: '2026-06-01', scheduled_time: '10:00'
    });
    const u = pts.updateSession(s.id, { status: 'completed', notes: 'Good session' });
    assert.equal(u.status, 'completed');
    assert.equal(u.notes, 'Good session');
  });

  it('updateSession throws on empty fields', () => {
    const s = pts.createSession({
      member_id: 1, coach_id: 1, scheduled_date: '2026-06-01', scheduled_time: '10:00'
    });
    assert.throws(() => pts.updateSession(s.id, {}), /No valid fields to update/);
  });

  it('completeSession sets completed and calculates commission', () => {
    const s = pts.createSession({
      member_id: 1, coach_id: 1, scheduled_date: '2026-06-01', scheduled_time: '10:00',
      amount: 100, commission_rate: 40
    });
    const c = pts.completeSession(s.id, 1);
    assert.equal(c.status, 'completed');
    assert.equal(c.completed_by, 1);
    assert.equal(c.commission_amount, 40);
  });

  it('completeSession throws on missing session', () => {
    assert.throws(() => pts.completeSession(999, 1), /Session not found/);
  });

  it('completeSession decrements package when used', () => {
    const s = pts.createSession({
      member_id: 1, coach_id: 1, member_package_id: 1,
      scheduled_date: '2026-06-01', scheduled_time: '10:00'
    });
    pts.completeSession(s.id, 1);
    const db = getDatabase();
    const pkg = db.prepare('SELECT * FROM member_pt_packages WHERE id = 1').get();
    assert.equal(pkg.sessions_used, 1);
    assert.equal(pkg.sessions_remaining, 9);
  });

  it('cancelSession sets cancelled status', () => {
    const s = pts.createSession({
      member_id: 1, coach_id: 1, scheduled_date: '2026-06-01', scheduled_time: '10:00'
    });
    const c = pts.cancelSession(s.id, 'Member sick');
    assert.equal(c.status, 'cancelled');
    assert.equal(c.cancelled_reason, 'Member sick');
  });

  it('getCoachStats returns aggregated stats', () => {
    pts.createSession({ member_id: 1, coach_id: 1, scheduled_date: '2026-06-01', scheduled_time: '10:00', status: 'completed', amount: 50, commission_amount: 10 });
    pts.createSession({ member_id: 1, coach_id: 1, scheduled_date: '2026-06-02', scheduled_time: '11:00', status: 'completed', amount: 60, commission_amount: 12 });
    const stats = pts.getCoachStats(1);
    assert.equal(stats.total_sessions, 2);
    assert.equal(stats.completed_sessions, 2);
    assert.equal(stats.total_revenue, 110);
  });

  it('completeSession exhausts package when sessions_remaining reaches 0', () => {
    const db = getDatabase();
    db.prepare("INSERT INTO member_pt_packages (id, member_id, sessions_used, sessions_remaining, status) VALUES (2, 1, 0, 1, 'active')").run();
    const s = pts.createSession({
      member_id: 1, coach_id: 1, member_package_id: 2,
      scheduled_date: '2026-06-01', scheduled_time: '10:00',
      amount: 50, commission_rate: 40
    });
    pts.completeSession(s.id, 1);
    const pkg = db.prepare('SELECT * FROM member_pt_packages WHERE id = 2').get();
    assert.equal(pkg.sessions_used, 1);
    assert.equal(pkg.sessions_remaining, 0);
    assert.equal(pkg.status, 'exhausted');
  });

  it('getCoachStats filters by date_from', () => {
    pts.createSession({ member_id: 1, coach_id: 1, scheduled_date: '2026-05-01', scheduled_time: '10:00', status: 'completed', amount: 50, commission_amount: 10 });
    pts.createSession({ member_id: 1, coach_id: 1, scheduled_date: '2026-06-01', scheduled_time: '10:00', status: 'completed', amount: 60, commission_amount: 12 });
    const stats = pts.getCoachStats(1, '2026-06-01');
    assert.equal(stats.total_sessions, 1);
    assert.equal(stats.completed_sessions, 1);
    assert.equal(stats.total_revenue, 60);
  });

  it('getCoachStats filters by date_to', () => {
    pts.createSession({ member_id: 1, coach_id: 1, scheduled_date: '2026-05-01', scheduled_time: '10:00', status: 'completed', amount: 50, commission_amount: 10 });
    pts.createSession({ member_id: 1, coach_id: 1, scheduled_date: '2026-06-01', scheduled_time: '10:00', status: 'completed', amount: 60, commission_amount: 12 });
    const stats = pts.getCoachStats(1, null, '2026-05-31');
    assert.equal(stats.total_sessions, 1);
    assert.equal(stats.completed_sessions, 1);
    assert.equal(stats.total_revenue, 50);
  });
});
