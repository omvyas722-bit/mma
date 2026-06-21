const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');

process.env.DATABASE_PATH = ':memory:';
process.env.JWT_SECRET = 'test-jwt-secret';

delete require.cache[require.resolve('../db/connection')];

const { getDatabase, closeDatabase } = require('../db/connection');
const dashboardRouter = require('../routes/dashboard');
const { authenticateToken } = require('../middleware/auth');

let app;
let token;

before(() => {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      status TEXT DEFAULT 'active',
      joined_date DATE DEFAULT (date('now')),
      updated_at DATETIME DEFAULT (datetime('now')),
      trial_end_date DATE,
      referred_by TEXT,
      location TEXT,
      cancellation_date DATE,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      class_type TEXT NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME,
      max_capacity INTEGER DEFAULT 20,
      location TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS class_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      date DATE NOT NULL,
      start_time TIME NOT NULL,
      status TEXT DEFAULT 'scheduled',
      capacity INTEGER DEFAULT 20,
      coach_id INTEGER,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      class_instance_id INTEGER,
      status TEXT DEFAULT 'booked',
      booking_date DATE NOT NULL,
      booked_at DATETIME DEFAULT (datetime('now')),
      attended_at DATETIME,
      waitlist INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      payment_method TEXT,
      description TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT, last_name TEXT,
      email TEXT, phone TEXT,
      stage TEXT DEFAULT 'new',
      interest_level TEXT DEFAULT 'medium',
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS staff_certifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      cert_name TEXT NOT NULL,
      expiry_date DATE,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      description TEXT,
      updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS dashboard_sparklines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_key TEXT UNIQUE,
      data TEXT,
      updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS ai_activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT,
      summary TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    );
  `);

  db.prepare(`INSERT INTO members (first_name, last_name, email, status, joined_date) VALUES (?, ?, ?, ?, ?)`).run('Test', 'User', 'test@test.com', 'active', '2024-01-01');
  db.prepare(`INSERT INTO members (first_name, last_name, email, status, joined_date) VALUES (?, ?, ?, ?, ?)`).run('Trial', 'User', 'trial@test.com', 'trial', '2024-06-01');
  db.prepare(`INSERT INTO members (first_name, last_name, email, status) VALUES (?, ?, ?, ?)`).run('Cancelled', 'User', 'cancelled@test.com', 'cancelled');
  db.prepare(`INSERT INTO transactions (member_id, type, amount, status, created_at) VALUES (?, ?, ?, ?, datetime('now'))`).run(1, 'membership', 100, 'completed');
  db.prepare(`INSERT INTO leads (first_name, last_name, stage, interest_level) VALUES (?, ?, ?, ?)`).run('Lead', 'One', 'new', 'hot');
  db.prepare(`INSERT INTO leads (first_name, last_name, stage, interest_level) VALUES (?, ?, ?, ?)`).run('Lead', 'Two', 'contacted', 'medium');
  db.prepare(`INSERT INTO staff (name, email, password_hash, role) VALUES (?, ?, ?, ?)`).run('Coach', 'coach@test.com', 'hash', 'coach');
  db.prepare(`INSERT INTO classes (name, class_type, start_time, end_time, max_capacity, location) VALUES (?, ?, ?, ?, ?, ?)`).run('BJJ', 'bjj', '09:00', '10:00', 30, 'rockingham');
  db.prepare(`INSERT INTO class_instances (class_id, date, start_time, status, capacity) VALUES (?, date('now'), ?, ?, ?)`).run(1, '09:00', 'scheduled', 30);

  app = express();
  app.use(express.json());
  app.use('/api/dashboard', dashboardRouter);

  token = jwt.sign({ id: 1, role: 'owner' }, process.env.JWT_SECRET, { expiresIn: '1h' });
});

after(() => {
  closeDatabase();
});

describe('Dashboard Routes', () => {
  it('GET / returns dashboard overview', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.kpis);
    assert.ok(res.body.kpis.active_members);
    assert.equal(typeof res.body.kpis.active_members.value, 'number');
    assert.ok(res.body.goal_progress);
    assert.ok(res.body.member_stats);
    assert.ok(res.body.booking_stats);
  });

  it('GET / returns 401 without auth', async () => {
    const res = await request(app).get('/api/dashboard');
    assert.equal(res.status, 401);
  });

  it('GET /revenue-chart returns chart data', async () => {
    const res = await request(app)
      .get('/api/dashboard/revenue-chart')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 0);
  });

  it('GET /attendance-chart returns chart data', async () => {
    const res = await request(app)
      .get('/api/dashboard/attendance-chart')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('GET /revenue-forecast returns forecast', async () => {
    const res = await request(app)
      .get('/api/dashboard/revenue-forecast')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.currentDailyAvg !== undefined);
    assert.ok(res.body.monthlyProjection !== undefined);
    assert.ok(Array.isArray(res.body.forecast));
  });

  it('PUT /goal-target updates goal', async () => {
    const res = await request(app)
      .put('/api/dashboard/goal-target')
      .set('Authorization', `Bearer ${token}`)
      .send({ target: 50 });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.target, 50);
  });

  it('PUT /goal-target rejects invalid target', async () => {
    const res = await request(app)
      .put('/api/dashboard/goal-target')
      .set('Authorization', `Bearer ${token}`)
      .send({ target: 0 });

    assert.equal(res.status, 400);
  });

  it('GET /sparklines returns sparklines', async () => {
    const db = getDatabase();
    db.prepare(`INSERT OR IGNORE INTO dashboard_sparklines (metric_key, data) VALUES (?, ?)`).run('new_members', '[]');
    db.prepare(`INSERT OR IGNORE INTO dashboard_sparklines (metric_key, data) VALUES (?, ?)`).run('revenue', '[]');
    db.prepare(`INSERT OR IGNORE INTO dashboard_sparklines (metric_key, data) VALUES (?, ?)`).run('attendance', '[]');
    db.prepare(`INSERT OR IGNORE INTO dashboard_sparklines (metric_key, data) VALUES (?, ?)`).run('leads', '[]');

    const res = await request(app)
      .get('/api/dashboard/sparklines')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.sparklines);
    assert.ok(Array.isArray(res.body.sparklines));
  });
});
