const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

process.env.DATABASE_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';

delete require.cache[require.resolve('../db/connection')];

const { getDatabase, closeDatabase } = require('../db/connection');

before(() => {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT, last_name TEXT,
      status TEXT, email TEXT, phone TEXT, membership_type TEXT,
      experience_level TEXT, goals TEXT
    );
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, role TEXT
    );
    CREATE TABLE IF NOT EXISTS student_ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, coach_id INTEGER,
      rating_date TEXT, defense REAL, stance REAL, offense REAL,
      practice_quality REAL, notes TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES members(id),
      FOREIGN KEY (coach_id) REFERENCES staff(id)
    );
    CREATE TABLE IF NOT EXISTS student_ai_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER,
      insight_date TEXT, skill_level TEXT, fight_readiness TEXT,
      recommended_weight_class TEXT, weight_advice TEXT,
      diet_recommendation TEXT, strengths TEXT, weaknesses TEXT,
      summary TEXT, details TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES members(id)
    );
    CREATE TABLE IF NOT EXISTS student_drill_recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, insight_id INTEGER,
      drill_name TEXT, drill_description TEXT, focus_area TEXT,
      difficulty TEXT DEFAULT 'intermediate',
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES members(id),
      FOREIGN KEY (insight_id) REFERENCES student_ai_insights(id)
    );
    INSERT INTO members (id, first_name, last_name, status, experience_level) VALUES
      (1, 'John', 'Doe', 'active', 'intermediate'),
      (2, 'Jane', 'Smith', 'active', 'beginner');
    INSERT INTO staff (id, name, role) VALUES
      (1, 'Coach Bob', 'coach');
  `);
});

beforeEach(() => {
  const db = getDatabase();
  db.exec(`DELETE FROM student_drill_recommendations`);
  db.exec(`DELETE FROM student_ai_insights`);
  db.exec(`DELETE FROM student_ratings`);
});

after(() => closeDatabase());

function createApp() {
  delete require.cache[require.resolve('../middleware/auth')];
  delete require.cache[require.resolve('../routes/studentCoaching')];

  const auth = require('../middleware/auth');
  auth.authenticateToken = (req, res, next) => {
    req.user = { id: 1, role: 'owner' };
    next();
  };
  auth.requirePermission = () => (req, res, next) => next();

  const coachingRoutes = require('../routes/studentCoaching');
  const app = express();
  app.use(express.json());
  app.use('/api/coaching', coachingRoutes);
  return app;
}

describe('Coaching Routes', () => {
  it('GET /api/coaching/ratings returns all member rating summaries', async () => {
    const db = getDatabase();
    db.prepare(`INSERT INTO student_ratings (member_id, coach_id, rating_date, defense, stance)
      VALUES (1, 1, '2026-05-01', 8.0, 7.5)`).run();
    const app = createApp();
    const res = await request(app).get('/api/coaching/ratings');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 1);
    assert.equal(res.body[0].first_name, 'John');
  });

  it('GET /api/coaching/:id/ratings returns ratings for specific member', async () => {
    const app = createApp();
    const res = await request(app).get('/api/coaching/1/ratings');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.ratings));
    assert.ok(res.body.averages);
  });

  it('GET /api/coaching/:id/ratings respects limit query param', async () => {
    const app = createApp();
    const res = await request(app).get('/api/coaching/1/ratings?limit=5');
    assert.equal(res.status, 200);
  });

  it('POST /api/coaching/:id/ratings creates a rating', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/coaching/1/ratings')
      .send({ defense: 7.0, stance: 8.0, notes: 'Good work' });
    assert.equal(res.status, 201);
    assert.ok(res.body.id);
    assert.equal(res.body.defense, 7.0);
    assert.equal(res.body.notes, 'Good work');
    assert.equal(res.body.coach_name, 'Coach Bob');
  });

  it('POST /api/coaching/:id/ratings returns 400 when no fields provided', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/coaching/1/ratings')
      .send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'At least one rating field or notes is required');
  });

  it('GET /api/coaching/:id/insights returns insights', async () => {
    const db = getDatabase();
    db.prepare(`INSERT INTO student_ai_insights (member_id, insight_date, skill_level, fight_readiness)
      VALUES (1, '2026-05-15', 'Intermediate', 'ready')`).run();
    const app = createApp();
    const res = await request(app).get('/api/coaching/1/insights');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.insights));
    assert.equal(res.body.insights.length, 1);
    assert.equal(res.body.insights[0].skill_level, 'Intermediate');
  });

  it('GET /api/coaching/:id/insights respects limit', async () => {
    const app = createApp();
    const res = await request(app).get('/api/coaching/1/insights?limit=5');
    assert.equal(res.status, 200);
  });

  it('GET /api/coaching/:id/drills returns drills', async () => {
    const app = createApp();
    const res = await request(app).get('/api/coaching/1/drills');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('GET /api/coaching/:id/drills respects limit', async () => {
    const app = createApp();
    const res = await request(app).get('/api/coaching/1/drills?limit=5');
    assert.equal(res.status, 200);
  });

  it('returns 404 for unknown route', async () => {
    const app = createApp();
    const res = await request(app).get('/api/coaching/unknown');
    assert.equal(res.status, 404);
  });
});
