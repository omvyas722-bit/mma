const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_PATH = ':memory:';

delete require.cache[require.resolve('../db/connection')];

const { getDatabase, closeDatabase } = require('../db/connection');
const ta = require('../data/trialAnalytics');

before(() => {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT, last_name TEXT,
      phone TEXT, email TEXT, stage TEXT, trial_date TEXT,
      trial_interest_level INTEGER, trial_experience_rating INTEGER,
      trial_class_type TEXT, follow_up_status TEXT,
      assigned_to INTEGER, created_at TEXT, updated_at TEXT
    )
  `);
  db.exec(`
    INSERT INTO leads (stage, trial_date, trial_interest_level, trial_experience_rating, trial_class_type, follow_up_status, created_at, updated_at) VALUES
      ('converted', '2026-05-01', 5, 5, 'muay_thai', 'completed', datetime('now'), datetime('now')),
      ('converted', '2026-05-02', 4, 4, 'bjj', 'completed', datetime('now'), datetime('now')),
      ('trial_completed', '2026-05-03', 3, 3, 'muay_thai', 'pending', datetime('now'), datetime('now')),
      ('lost', '2026-05-04', 2, 2, 'fitness', 'completed', datetime('now'), datetime('now')),
      ('trial_completed', '2026-05-10', 4, 4, 'muay_thai', 'pending', datetime('now'), datetime('now'))
  `);
});

after(() => closeDatabase());

describe('Trial Analytics', () => {
  it('getTrialConversionStats returns overall stats', () => {
    const stats = ta.getTrialConversionStats();
    assert.ok(stats.overall);
    assert.equal(stats.overall.trials_completed, 2);
    assert.equal(stats.overall.converted, 2);
    assert.ok(stats.overall.conversion_rate > 0);
  });

  it('getTrialConversionStats returns by interest level', () => {
    const stats = ta.getTrialConversionStats();
    assert.ok(Array.isArray(stats.by_interest_level));
    assert.ok(stats.by_interest_level.length > 0);
  });

  it('getTrialConversionStats returns by experience rating', () => {
    const stats = ta.getTrialConversionStats();
    assert.ok(Array.isArray(stats.by_experience_rating));
    assert.ok(stats.by_experience_rating.length > 0);
  });

  it('getTrialConversionStats returns by class type', () => {
    const stats = ta.getTrialConversionStats();
    assert.ok(Array.isArray(stats.by_class_type));
    assert.ok(stats.by_class_type.length > 0);
  });

  it('getTrialConversionStats returns needs follow-up', () => {
    const stats = ta.getTrialConversionStats();
    assert.ok(Array.isArray(stats.needs_follow_up));
    assert.equal(stats.needs_follow_up.length, 2);
  });

  it('getTrialConversionStats returns follow-up effectiveness', () => {
    const stats = ta.getTrialConversionStats();
    assert.ok(Array.isArray(stats.follow_up_effectiveness));
    assert.ok(stats.follow_up_effectiveness.length > 0);
  });

  it('getTrialTrends returns daily breakdown', () => {
    const trends = ta.getTrialTrends(60);
    assert.ok(Array.isArray(trends));
    assert.ok(trends.length > 0);
    assert.ok(trends[0].trials >= 1);
  });
});

describe('getTrialTrends without days param', () => {
  it('uses default 30 days when not provided', () => {
    const trends = ta.getTrialTrends();
    assert.ok(Array.isArray(trends));
  });
});

describe('getTrialConversionStats with no converted leads', () => {
  beforeEach(() => {
    const db = getDatabase();
    db.exec("UPDATE leads SET stage = 'lost' WHERE stage = 'converted'");
  });

  it('returns 0 avg_time_to_conversion when no converted leads exist', () => {
    const stats = ta.getTrialConversionStats();
    assert.equal(stats.avg_time_to_conversion, 0);
  });
});
