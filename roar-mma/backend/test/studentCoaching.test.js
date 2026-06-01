const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_PATH = ':memory:';

delete require.cache[require.resolve('../db/connection')];

const { getDatabase, closeDatabase } = require('../db/connection');
const coaching = require('../data/studentCoaching');

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
    INSERT INTO members (id, first_name, last_name, status, experience_level, goals) VALUES
      (1, 'John', 'Doe', 'active', 'intermediate', 'Compete in local tournaments'),
      (2, 'Jane', 'Smith', 'active', 'beginner', 'Get fit and learn self-defense'),
      (3, 'Cancelled', 'User', 'cancelled', 'advanced', 'None');
    INSERT INTO staff (id, name, role) VALUES
      (1, 'Coach Bob', 'coach'),
      (2, 'Coach Sam', 'coach');
  `);
});

beforeEach(() => {
  const db = getDatabase();
  db.exec(`DELETE FROM student_drill_recommendations`);
  db.exec(`DELETE FROM student_ai_insights`);
  db.exec(`DELETE FROM student_ratings`);
});

after(() => closeDatabase());

describe('Coaching Data Layer', () => {
  describe('getRatings', () => {
    it('returns ratings and averages for a member', () => {
      const db = getDatabase();
      db.prepare(`INSERT INTO student_ratings (member_id, coach_id, rating_date, defense, stance, offense, practice_quality, notes)
        VALUES (1, 1, '2026-05-01', 7.5, 8.0, 6.5, 7.0, 'Good session')`).run();
      db.prepare(`INSERT INTO student_ratings (member_id, coach_id, rating_date, defense, stance, offense, practice_quality)
        VALUES (1, 2, '2026-05-10', 8.0, 7.5, 7.0, 8.0)`).run();
      const result = coaching.getRatings(1);
      assert.ok(Array.isArray(result.ratings));
      assert.equal(result.ratings.length, 2);
      assert.equal(result.ratings[0].coach_name, 'Coach Sam');
      assert.equal(result.ratings[1].coach_name, 'Coach Bob');
      assert.ok(result.averages);
      assert.equal(Number(result.averages.avg_defense).toFixed(1), '7.8');
      assert.equal(Number(result.averages.total_ratings), 2);
    });

    it('respects limit parameter', () => {
      const db = getDatabase();
      for (let i = 0; i < 5; i++) {
        db.prepare(`INSERT INTO student_ratings (member_id, coach_id, rating_date, defense)
          VALUES (1, 1, '2026-05-${String(i + 1).padStart(2, '0')}', ${6 + i})`).run();
      }
      const result = coaching.getRatings(1, 2);
      assert.equal(result.ratings.length, 2);
    });

    it('returns empty ratings for member with no ratings', () => {
      const result = coaching.getRatings(999);
      assert.equal(result.ratings.length, 0);
      assert.equal(result.averages.total_ratings, 0);
    });
  });

  describe('createRating', () => {
    it('creates a rating with all optional fields', () => {
      const rating = coaching.createRating(1, 1, {
        defense: 8.5, stance: 7.0, offense: 9.0, practice_quality: 8.0,
        notes: 'Great improvement', rating_date: '2026-06-01'
      });
      assert.ok(rating.id);
      assert.equal(rating.member_id, 1);
      assert.equal(rating.coach_id, 1);
      assert.equal(rating.coach_name, 'Coach Bob');
      assert.equal(rating.defense, 8.5);
      assert.equal(rating.stance, 7.0);
      assert.equal(rating.offense, 9.0);
      assert.equal(rating.practice_quality, 8.0);
      assert.equal(rating.notes, 'Great improvement');
      assert.equal(rating.rating_date, '2026-06-01');
    });

    it('creates a rating with only minimum required data', () => {
      const rating = coaching.createRating(1, 2, {});
      assert.ok(rating.id);
      assert.equal(rating.coach_name, 'Coach Sam');
      assert.equal(rating.defense, null);
    });

    it('defaults rating_date to today', () => {
      const rating = coaching.createRating(1, 1, { defense: 7.0 });
      const today = new Date().toISOString().split('T')[0];
      assert.equal(rating.rating_date, today);
    });

    it('throws for non-existent member', () => {
      assert.throws(() => coaching.createRating(999, 1, { defense: 5.0 }), /FOREIGN KEY constraint/);
    });

    it('throws for non-existent coach', () => {
      assert.throws(() => coaching.createRating(1, 999, { defense: 5.0 }), /FOREIGN KEY constraint/);
    });
  });

  describe('getInsights', () => {
    it('returns insights with parsed details and drills', () => {
      const db = getDatabase();
      db.prepare(`INSERT INTO student_ai_insights (id, member_id, insight_date, skill_level, fight_readiness, details)
        VALUES (1, 1, '2026-05-15', 'Intermediate', 'ready', '{"extra":"info"}')`).run();
      db.prepare(`INSERT INTO student_drill_recommendations (member_id, insight_id, drill_name, drill_description, focus_area, difficulty)
        VALUES (1, 1, 'Sprawl Drills', 'Practice sprawling', 'defense', 'intermediate')`).run();
      const result = coaching.getInsights(1);
      assert.equal(result.insights.length, 1);
      assert.equal(result.insights[0].skill_level, 'Intermediate');
      assert.deepEqual(result.insights[0].details, { extra: 'info' });
      assert.equal(result.insights[0].drills.length, 1);
      assert.equal(result.insights[0].drills[0].drill_name, 'Sprawl Drills');
      assert.ok(result.latest);
      assert.equal(result.latest.id, 1);
    });

    it('returns null latest when no insights exist', () => {
      const result = coaching.getInsights(999);
      assert.equal(result.insights.length, 0);
      assert.equal(result.latest, null);
    });

    it('respects limit parameter', () => {
      const db = getDatabase();
      for (let i = 0; i < 3; i++) {
        db.prepare(`INSERT INTO student_ai_insights (member_id, insight_date, skill_level)
          VALUES (1, '2026-05-${String(i + 1).padStart(2, '0')}', 'Level ${i}')`).run();
      }
      const result = coaching.getInsights(1, 2);
      assert.equal(result.insights.length, 2);
    });

    it('handles malformed details JSON', () => {
      const db = getDatabase();
      db.prepare(`INSERT INTO student_ai_insights (member_id, insight_date, details)
        VALUES (1, '2026-05-01', '{not json}')`).run();
      const result = coaching.getInsights(1);
      assert.ok(result.insights[0].details === '{not json}');
    });
  });

  describe('createInsight', () => {
    it('creates insight with batch drills and returns latest', () => {
      const result = coaching.createInsight(1, {
        skill_level: 'Advanced',
        fight_readiness: 'fight_ready',
        recommended_weight_class: 'lightweight',
        weight_advice: 'maintain',
        diet_recommendation: 'Eat clean',
        strengths: 'Strong defense',
        weaknesses: 'Needs more offense',
        summary: 'John Doe analysis',
        details: { custom: 'data' },
        drills: [
          { drill_name: 'Shadow Boxing', drill_description: 'Practice technique', focus_area: 'offense', difficulty: 'advanced' },
          { drill_name: 'Pad Work', drill_description: 'Speed drills', focus_area: 'conditioning' }
        ]
      });
      assert.ok(result.latest);
      assert.equal(result.latest.skill_level, 'Advanced');
      assert.equal(result.latest.fight_readiness, 'fight_ready');
      assert.equal(result.insights.length, 1);
      assert.equal(result.latest.drills.length, 2);
      const names = result.latest.drills.map(d => d.drill_name);
      assert.ok(names.includes('Shadow Boxing'));
      assert.ok(names.includes('Pad Work'));
      const shadowBoxing = result.latest.drills.find(d => d.drill_name === 'Shadow Boxing');
      assert.equal(shadowBoxing.difficulty, 'advanced');
    });

    it('creates insight without drills', () => {
      const result = coaching.createInsight(1, {
        skill_level: 'Beginner',
        fight_readiness: 'developing',
        summary: 'Test'
      });
      assert.ok(result.latest);
      assert.equal(result.latest.drills.length, 0);
    });

    it('defaults insight_date to today', () => {
      const result = coaching.createInsight(1, {
        skill_level: 'Intermediate',
        fight_readiness: 'ready',
        summary: 'Test'
      });
      const today = new Date().toISOString().split('T')[0];
      assert.equal(result.latest.insight_date, today);
    });
  });

  describe('getDrills', () => {
    it('returns drills joined with insight info', () => {
      const db = getDatabase();
      db.prepare(`INSERT INTO student_ai_insights (id, member_id, insight_date, skill_level, summary)
        VALUES (1, 1, '2026-05-15', 'Intermediate', 'Good progress')`).run();
      db.prepare(`INSERT INTO student_drill_recommendations (member_id, insight_id, drill_name, drill_description, focus_area, difficulty)
        VALUES (1, 1, 'Takedown Defense', 'Work on sprawl', 'defense', 'intermediate')`).run();
      const drills = coaching.getDrills(1);
      assert.equal(drills.length, 1);
      assert.equal(drills[0].drill_name, 'Takedown Defense');
      assert.equal(drills[0].insight_date, '2026-05-15');
      assert.equal(drills[0].insight_summary, 'Good progress');
    });

    it('respects limit parameter', () => {
      const db = getDatabase();
      db.prepare(`INSERT INTO student_ai_insights (id, member_id, insight_date, summary)
        VALUES (1, 1, '2026-05-01', 'One')`).run();
      db.prepare(`INSERT INTO student_ai_insights (id, member_id, insight_date, summary)
        VALUES (2, 1, '2026-05-02', 'Two')`).run();
      db.prepare(`INSERT INTO student_drill_recommendations (member_id, insight_id, drill_name)
        VALUES (1, 1, 'Drill A'), (1, 2, 'Drill B')`).run();
      const drills = coaching.getDrills(1, 1);
      assert.equal(drills.length, 1);
    });

    it('returns empty array for member with no drills', () => {
      const drills = coaching.getDrills(999);
      assert.equal(drills.length, 0);
    });
  });

  describe('getAllMembersWithRecentRatings', () => {
    it('returns members with rating aggregates within limitDays', () => {
      const db = getDatabase();
      const today = new Date().toISOString().split('T')[0];
      db.prepare(`INSERT INTO student_ratings (member_id, coach_id, rating_date, defense, stance, offense, practice_quality)
        VALUES (1, 1, ?, 8.0, 7.0, 9.0, 8.0)`, today).run(today);
      const members = coaching.getAllMembersWithRecentRatings(30);
      assert.ok(members.length >= 1);
      const john = members.find(m => m.id === 1);
      assert.ok(john);
      assert.equal(john.first_name, 'John');
      assert.ok(john.rating_count >= 1);
      assert.ok(john.avg_defense);
    });

    it('includes members without ratings in period', () => {
      const members = coaching.getAllMembersWithRecentRatings(1);
      const jane = members.find(m => m.id === 2);
      assert.ok(jane);
      assert.equal(jane.rating_count, 0);
    });

    it('excludes cancelled members', () => {
      const members = coaching.getAllMembersWithRecentRatings();
      const cancelled = members.find(m => m.id === 3);
      assert.equal(cancelled, undefined);
    });
  });

  describe('getAllMemberRatingSummaries', () => {
    it('returns all non-cancelled members with aggregated rating info', () => {
      const db = getDatabase();
      db.prepare(`INSERT INTO student_ratings (member_id, coach_id, rating_date, defense, stance)
        VALUES (1, 1, '2026-05-01', 8.0, 7.5)`).run();
      db.prepare(`INSERT INTO student_ratings (member_id, coach_id, rating_date, offense, practice_quality)
        VALUES (2, 1, '2026-05-02', 6.0, 7.0)`).run();
      db.prepare(`INSERT INTO student_ai_insights (member_id, insight_date)
        VALUES (1, '2026-05-03')`).run();
      const summaries = coaching.getAllMemberRatingSummaries();
      assert.equal(summaries.length, 2);
      const john = summaries.find(m => m.id === 1);
      assert.ok(john);
      assert.equal(john.total_ratings, 1);
      assert.ok(john.last_insight_date);
      assert.equal(john.avg_defense, 8.0);
      const jane = summaries.find(m => m.id === 2);
      assert.ok(jane);
      assert.equal(jane.total_ratings, 1);
    });

    it('excludes cancelled members', () => {
      const summaries = coaching.getAllMemberRatingSummaries();
      const cancelled = summaries.find(m => m.id === 3);
      assert.equal(cancelled, undefined);
    });

    it('returns members with zero ratings', () => {
      const summaries = coaching.getAllMemberRatingSummaries();
      const jane = summaries.find(m => m.id === 2);
      assert.ok(jane);
      assert.equal(jane.total_ratings, jane.total_ratings || 0);
    });
  });
});
