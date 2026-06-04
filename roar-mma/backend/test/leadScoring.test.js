const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_PATH = ':memory:';

delete require.cache[require.resolve('../db/connection')];

const { getDatabase, closeDatabase } = require('../db/connection');
const leadScoring = require('../data/leadScoring');

before(() => {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL, role TEXT NOT NULL, phone TEXT, active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
      email TEXT UNIQUE, phone TEXT, status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
      email TEXT, phone TEXT NOT NULL, source TEXT, stage TEXT DEFAULT 'new', interest_level TEXT,
      location TEXT, assigned_to INTEGER, referrer_member_id INTEGER, trial_interest_level TEXT, trial_experience_rating INTEGER,
      last_contact_date TEXT, created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );
  `);
});

after(() => {
  closeDatabase();
});

describe('Lead Scoring', () => {
  describe('calculateLeadScore', () => {
    it('returns 0 for empty lead', () => {
      assert.equal(leadScoring.calculateLeadScore({}), 0);
    });

    it('scores source correctly', () => {
      assert.equal(leadScoring.calculateLeadScore({ source: 'referral' }), 30);
      assert.equal(leadScoring.calculateLeadScore({ source: 'website' }), 20);
    });

    it('scores stage correctly', () => {
      assert.equal(leadScoring.calculateLeadScore({ stage: 'converted' }), 25);
      assert.equal(leadScoring.calculateLeadScore({ stage: 'new' }), 5);
    });

    it('scores trial interest', () => {
      const lead = { trial_interest_level: 'hot' };
      assert.equal(leadScoring.calculateLeadScore(lead), 20);
    });

    it('scores trial experience rating', () => {
      const lead = { trial_experience_rating: 5 };
      assert.equal(leadScoring.calculateLeadScore(lead), 15);
    });

    it('gives quick response bonus', () => {
      const now = new Date();
      const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const lead = {
        created_at: now.toISOString(),
        last_contact_date: fiveMinAgo.toISOString()
      };
      assert.equal(leadScoring.calculateLeadScore(lead), 10);
    });

    it('does not give bonus for slow response', () => {
      const lead = {
        created_at: '2026-01-01T10:00:00.000Z',
        last_contact_date: '2026-01-01T12:00:00.000Z'
      };
      assert.equal(leadScoring.calculateLeadScore(lead), 0);
    });

    it('applies recency penalty', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      const lead = {
        last_contact_date: oldDate.toISOString(),
        stage: 'contacted'
      };
      const score = leadScoring.calculateLeadScore(lead);
      assert.ok(score < 10);
    });

    it('caps recency penalty at 20', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);
      const lead = {
        last_contact_date: oldDate.toISOString(),
        stage: 'contacted'
      };
      const score = leadScoring.calculateLeadScore(lead);
      assert.ok(score >= 0);
    });

    it('no recency penalty for new leads', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 30);
      const lead = {
        last_contact_date: oldDate.toISOString(),
        stage: 'new'
      };
      const score = leadScoring.calculateLeadScore(lead);
      assert.equal(score, 5);
    });

    it('clamps score between 0-100', () => {
      const low = leadScoring.calculateLeadScore({});
      assert.equal(low, 0);
      const high = leadScoring.calculateLeadScore({
        source: 'referral', stage: 'converted', trial_interest_level: 'hot',
        trial_experience_rating: 5
      });
      assert.ok(high <= 100);
    });
  });

  describe('getLeadPriority', () => {
    it('returns critical for score >= 70', () => {
      assert.equal(leadScoring.getLeadPriority(70), 'critical');
      assert.equal(leadScoring.getLeadPriority(85), 'critical');
    });

    it('returns high for score 50-69', () => {
      assert.equal(leadScoring.getLeadPriority(50), 'high');
      assert.equal(leadScoring.getLeadPriority(69), 'high');
    });

    it('returns medium for score 30-49', () => {
      assert.equal(leadScoring.getLeadPriority(30), 'medium');
      assert.equal(leadScoring.getLeadPriority(49), 'medium');
    });

    it('returns low for score < 30', () => {
      assert.equal(leadScoring.getLeadPriority(0), 'low');
      assert.equal(leadScoring.getLeadPriority(29), 'low');
    });
  });

  describe('getAllLeadsWithScores', () => {
    it('returns leads with calculated scores', async () => {
      const db = getDatabase();
      db.prepare(`INSERT INTO leads (first_name, last_name, phone, source, stage) VALUES ('Test', 'Lead', '0400000000', 'referral', 'contacted')`).run();
      const results = await leadScoring.getAllLeadsWithScores({});
      assert.equal(results.length, 1);
      assert.ok(results[0].score > 0);
      assert.equal(typeof results[0].priority, 'string');
    });

    it('filters by stage', async () => {
      const db = getDatabase();
      db.prepare(`INSERT INTO leads (first_name, last_name, phone, source, stage) VALUES ('New', 'Lead', '0400000001', 'website', 'new')`).run();
      const results = await leadScoring.getAllLeadsWithScores({ stage: 'new' });
      assert.equal(results.length, 1);
    });

    it('filters by location', async () => {
      const results = await leadScoring.getAllLeadsWithScores({ location: 'rockingham' });
      assert.equal(results.length, 0);
    });

    it('filters by source', async () => {
      const db = getDatabase();
      db.prepare(`INSERT INTO leads (first_name, last_name, phone, source, stage) VALUES ('Src', 'Lead', '0400000002', 'facebook', 'new')`).run();
      const results = await leadScoring.getAllLeadsWithScores({ source: 'facebook' });
      assert.equal(results.length, 1);
    });

    it('filters by assigned_to', async () => {
      const db = getDatabase();
      db.prepare(`INSERT INTO staff (id, name, email, password_hash, role) VALUES (99, 'Test', 'test@test.com', 'hash', 'sales')`).run();
      db.prepare(`INSERT INTO leads (first_name, last_name, phone, source, stage, assigned_to) VALUES ('Assigned', 'Lead', '0400000003', 'website', 'new', 99)`).run();
      const results = await leadScoring.getAllLeadsWithScores({ assigned_to: 99 });
      assert.equal(results.length, 1);
    });

    it('returns sorted by score descending', async () => {
      const results = await leadScoring.getAllLeadsWithScores({});
      if (results.length >= 2) {
        assert.ok(results[0].score >= results[1].score);
      }
    });
  });

  describe('getHighPriorityLeads', () => {
    it('returns only critical and high priority leads', async () => {
      const results = await leadScoring.getHighPriorityLeads();
      assert.ok(Array.isArray(results));
      results.forEach(r => {
        assert.ok(r.priority === 'critical' || r.priority === 'high');
      });
    });
  });

  describe('getLeadScoreBreakdown', () => {
    it('returns breakdown for existing lead', () => {
      const breakdown = leadScoring.getLeadScoreBreakdown(1);
      assert.ok(breakdown);
      assert.equal(typeof breakdown.total_score, 'number');
      assert.equal(typeof breakdown.priority, 'string');
      assert.ok(breakdown.components);
    });

    it('returns interest and experience components', () => {
      const db = getDatabase();
      db.prepare(`INSERT INTO leads (id, first_name, last_name, phone, source, stage, trial_interest_level, trial_experience_rating) VALUES (100, 'Hot', 'Lead', '0400000010', 'referral', 'trial_completed', 'hot', 5)`).run();
      const breakdown = leadScoring.getLeadScoreBreakdown(100);
      assert.ok(breakdown.components.interest);
      assert.equal(breakdown.components.interest.points, 20);
      assert.ok(breakdown.components.experience);
      assert.equal(breakdown.components.experience.points, 15);
    });

    it('returns response speed component', () => {
      const db = getDatabase();
      const now = new Date();
      const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
      db.prepare(`INSERT INTO leads (id, first_name, last_name, phone, source, stage, created_at, last_contact_date) VALUES (101, 'Fast', 'Lead', '0400000011', 'website', 'contacted', ?, ?)`).run(now.toISOString(), fiveMinAgo.toISOString());
      const breakdown = leadScoring.getLeadScoreBreakdown(101);
      assert.ok(breakdown.components.response_speed);
      assert.equal(breakdown.components.response_speed.points, 10);
    });

    it('returns recency penalty component', () => {
      const db = getDatabase();
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 15);
      db.prepare(`INSERT INTO leads (id, first_name, last_name, phone, source, stage, last_contact_date) VALUES (102, 'Old', 'Lead', '0400000012', 'website', 'contacted', ?)`).run(oldDate.toISOString());
      const breakdown = leadScoring.getLeadScoreBreakdown(102);
      assert.ok(breakdown.components.recency_penalty);
      assert.ok(breakdown.components.recency_penalty.points < 0);
    });

    it('throws for non-existent lead', () => {
      assert.throws(() => {
        leadScoring.getLeadScoreBreakdown(999);
      }, /Lead not found/);
    });
  });
});
