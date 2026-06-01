const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_PATH = ':memory:';

delete require.cache[require.resolve('../db/connection')];

const { getDatabase, closeDatabase } = require('../db/connection');
const bg = require('../data/beltGrading');

before(() => {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS belt_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      color_code TEXT, rank_order INTEGER NOT NULL,
      min_time_months INTEGER DEFAULT 0, min_classes_attended INTEGER DEFAULT 0,
      stripe_count INTEGER
    );
    CREATE TABLE IF NOT EXISTS grading_requirements (
      id INTEGER PRIMARY KEY AUTOINCREMENT, belt_level_id INTEGER,
      technique_name TEXT NOT NULL, category TEXT, description TEXT,
      required INTEGER DEFAULT 1, display_order INTEGER DEFAULT 0,
      FOREIGN KEY (belt_level_id) REFERENCES belt_levels(id)
    );
    CREATE TABLE IF NOT EXISTS member_belt_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER,
      current_belt_id INTEGER, current_stripes INTEGER DEFAULT 0,
      belt_awarded_date TEXT, next_grading_eligible_date TEXT,
      classes_attended_since_belt INTEGER DEFAULT 0,
      is_current INTEGER DEFAULT 1, updated_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES members(id),
      FOREIGN KEY (current_belt_id) REFERENCES belt_levels(id)
    );
    CREATE TABLE IF NOT EXISTS grading_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER,
      from_belt_id INTEGER, to_belt_id INTEGER, stripes_awarded INTEGER DEFAULT 0,
      grading_session_id INTEGER, graded_by INTEGER, grading_date TEXT, notes TEXT,
      FOREIGN KEY (member_id) REFERENCES members(id),
      FOREIGN KEY (from_belt_id) REFERENCES belt_levels(id),
      FOREIGN KEY (to_belt_id) REFERENCES belt_levels(id)
    );
    CREATE TABLE IF NOT EXISTS member_techniques (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER,
      requirement_id INTEGER, proficiency_level TEXT,
      last_practiced_date TEXT, coach_notes TEXT,
      assessed_by INTEGER, assessed_at TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES members(id),
      FOREIGN KEY (requirement_id) REFERENCES grading_requirements(id)
    );
    CREATE TABLE IF NOT EXISTS grading_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, session_date TEXT NOT NULL,
      session_time TEXT, location TEXT, grading_coach_id INTEGER,
      status TEXT DEFAULT 'scheduled', notes TEXT,
      FOREIGN KEY (grading_coach_id) REFERENCES staff(id)
    );
    CREATE TABLE IF NOT EXISTS grading_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT, grading_session_id INTEGER,
      member_id INTEGER, current_belt_id INTEGER,
      testing_for_belt_id INTEGER, result TEXT,
      score REAL, feedback TEXT, awarded_stripes INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (grading_session_id) REFERENCES grading_sessions(id),
      FOREIGN KEY (member_id) REFERENCES members(id)
    );
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT, last_name TEXT
    );
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, role TEXT
    );
    INSERT INTO members (id, first_name, last_name) VALUES (1, 'John', 'Doe');
    INSERT INTO staff (id, name, role) VALUES (1, 'Coach Bob', 'coach');
    INSERT INTO belt_levels (id, name, color_code, rank_order, min_time_months, min_classes_attended, stripe_count) VALUES
      (1, 'White', '#FFFFFF', 1, 0, 0, 2),
      (2, 'Yellow', '#FFFF00', 2, 3, 10, 2),
      (3, 'Orange', '#FF8C00', 3, 6, 20, NULL),
      (4, 'Black', '#000000', 4, 24, 100, NULL);
    INSERT INTO grading_requirements (id, belt_level_id, technique_name, category, required, display_order) VALUES
      (1, 2, 'Jab', 'striking', 1, 1),
      (2, 2, 'Cross', 'striking', 1, 2),
      (3, 2, 'Roundhouse Kick', 'striking', 0, 3);
  `);
});

beforeEach(() => {
  const db = getDatabase();
  db.exec(`DELETE FROM member_belt_progress`);
  db.exec(`DELETE FROM grading_history`);
  db.exec(`DELETE FROM member_techniques`);
  db.exec(`DELETE FROM grading_participants`);
  db.exec(`DELETE FROM grading_sessions`);
});

after(() => closeDatabase());

describe('Belt Grading Data Layer', () => {
  describe('Belt Levels', () => {
    it('getAllBeltLevels returns ordered', () => {
      const levels = bg.getAllBeltLevels();
      assert.equal(levels.length, 4);
      assert.equal(levels[0].name, 'White');
      assert.equal(levels[3].name, 'Black');
    });

    it('getBeltLevel returns by id', () => {
      const b = bg.getBeltLevel(2);
      assert.equal(b.name, 'Yellow');
    });
  });

  describe('Grading Requirements', () => {
    it('getRequirementsForBelt returns requirements', () => {
      const reqs = bg.getRequirementsForBelt(2);
      assert.equal(reqs.length, 3);
      assert.ok(reqs.every(r => r.belt_level_id === 2));
    });
  });

  describe('Member Belt Progress', () => {
    it('getMemberBeltProgress assigns white belt for new member', () => {
      const progress = bg.getMemberBeltProgress(1);
      assert.ok(progress);
      assert.equal(progress.current_stripes, 0);
    });

    it('assignBelt upgrades belt and logs history', () => {
      bg.getMemberBeltProgress(1);
      const upgraded = bg.assignBelt({ memberId: 1, beltLevelId: 2, stripes: 0, awardedDate: '2026-06-01', gradedBy: 1 });
      assert.equal(upgraded.current_belt_id, 2);
      assert.ok(upgraded.next_grading_eligible_date);

      const db = getDatabase();
      const history = db.prepare('SELECT * FROM grading_history WHERE member_id = 1').all();
      assert.equal(history.length, 2);
    });

    it('assignBelt throws for non-existent belt level', () => {
      assert.throws(() => bg.assignBelt({ memberId: 1, beltLevelId: 999 }), /Belt level not found/);
    });

    it('assignBelt works without existing belt progress', () => {
      const result = bg.assignBelt({ memberId: 1, beltLevelId: 2, stripes: 0, awardedDate: '2026-06-01', gradedBy: 1 });
      assert.equal(result.current_belt_id, 2);
      const db = getDatabase();
      const history = db.prepare('SELECT * FROM grading_history WHERE member_id = 1').all();
      assert.equal(history.length, 1);
      assert.equal(history[0].from_belt_id, null);
    });

    it('awardStripe increments stripes', () => {
      bg.getMemberBeltProgress(1);
      const p = bg.awardStripe(1, 1);
      assert.equal(p.current_stripes, 1);
    });

    it('awardStripe throws when max stripes reached', () => {
      bg.getMemberBeltProgress(1);
      bg.awardStripe(1, 1);
      bg.awardStripe(1, 1);
      assert.throws(() => bg.awardStripe(1, 1), /Maximum stripes reached/);
    });

    it('awardStripe works with belt that has null stripe_count', () => {
      const db = getDatabase();
      bg.getMemberBeltProgress(1);
      db.prepare("UPDATE member_belt_progress SET current_belt_id = 3 WHERE member_id = 1 AND is_current = 1").run();
      const p = bg.awardStripe(1, 1);
      assert.equal(p.current_stripes, 1);
      const p2 = bg.awardStripe(1, 1);
      assert.equal(p2.current_stripes, 2);
    });

    it('getMemberBeltProgress returns null when no white belt', () => {
      const db = getDatabase();
      const existingLevels = db.prepare('SELECT * FROM belt_levels').all();
      db.pragma('foreign_keys = OFF');
      const existingReqs = db.prepare('SELECT * FROM grading_requirements').all();
      db.prepare('DELETE FROM grading_requirements').run();
      db.prepare('DELETE FROM belt_levels').run();
      db.prepare("INSERT INTO belt_levels (id, name, color_code, rank_order, min_time_months, min_classes_attended, stripe_count) VALUES (10, 'Blue', '#0000FF', 5, 0, 0, NULL)").run();
      const result = bg.getMemberBeltProgress(1);
      assert.equal(result, null);
      db.prepare('DELETE FROM belt_levels').run();
      const stmt = db.prepare('INSERT INTO belt_levels (id, name, color_code, rank_order, min_time_months, min_classes_attended, stripe_count) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const l of existingLevels) stmt.run(l.id, l.name, l.color_code, l.rank_order, l.min_time_months, l.min_classes_attended, l.stripe_count);
      const reqStmt = db.prepare('INSERT INTO grading_requirements (id, belt_level_id, technique_name, category, required, display_order) VALUES (?, ?, ?, ?, ?, ?)');
      for (const r of existingReqs) reqStmt.run(r.id, r.belt_level_id, r.technique_name, r.category, r.required, r.display_order);
      db.pragma('foreign_keys = ON');
    });
  });

  describe('Grading Eligibility', () => {
    it('checkGradingEligibility returns not eligible initially', () => {
      const progress = bg.getMemberBeltProgress(1);
      progress.classes_attended_since_belt = 0;
      progress.next_grading_eligible_date = '2099-01-01';
      const db = getDatabase();
      db.prepare("UPDATE member_belt_progress SET classes_attended_since_belt = 0, next_grading_eligible_date = '2099-01-01' WHERE id = ?").run(progress.id);

      const check = bg.checkGradingEligibility(1);
      assert.equal(check.eligible, false);
      assert.ok(check.reasons.length > 0);
    });

    it('checkGradingEligibility returns eligible when conditions met', () => {
      const progress = bg.getMemberBeltProgress(1);
      const db = getDatabase();
      db.prepare("UPDATE member_belt_progress SET classes_attended_since_belt = 10, next_grading_eligible_date = '2020-01-01', current_stripes = 2 WHERE id = ?").run(progress.id);

      bg.updateMemberTechnique(1, 1, 'mastered', 1);
      bg.updateMemberTechnique(1, 2, 'mastered', 1);

      const check = bg.checkGradingEligibility(1);
      assert.equal(check.eligible, true);
    });

    it('checkGradingEligibility returns already at max belt', () => {
      bg.getMemberBeltProgress(1);
      const db = getDatabase();
      db.prepare('UPDATE member_belt_progress SET current_belt_id = 4 WHERE member_id = 1 AND is_current = 1').run();
      const check = bg.checkGradingEligibility(1);
      assert.equal(check.eligible, false);
      assert.ok(check.reasons.some(r => r.includes('maximum belt level')));
    });

    it('checkGradingEligibility attendance requirement not met', () => {
      bg.getMemberBeltProgress(1);
      const db = getDatabase();
      db.prepare("UPDATE member_belt_progress SET current_belt_id = 2, classes_attended_since_belt = 0, next_grading_eligible_date = '2020-01-01', current_stripes = 2 WHERE member_id = 1 AND is_current = 1").run();
      const check = bg.checkGradingEligibility(1);
      assert.equal(check.eligible, false);
      assert.ok(check.reasons.some(r => r.includes('Attendance requirement')));
    });

    it('checkGradingEligibility no next belt level from gap', () => {
      const db = getDatabase();
      const existingLevels = db.prepare('SELECT * FROM belt_levels').all();
      db.pragma('foreign_keys = OFF');
      const existingReqs = db.prepare('SELECT * FROM grading_requirements').all();
      db.prepare('DELETE FROM grading_requirements').run();
      db.prepare('DELETE FROM belt_levels').run();
      db.prepare("INSERT INTO belt_levels (id, name, color_code, rank_order, min_time_months, min_classes_attended, stripe_count) VALUES (1, 'White', '#FFFFFF', 1, 0, 0, 2)").run();
      db.prepare("INSERT INTO belt_levels (id, name, color_code, rank_order, min_time_months, min_classes_attended, stripe_count) VALUES (2, 'Yellow', '#FFFF00', 2, 3, 10, 2)").run();
      db.prepare("INSERT INTO belt_levels (id, name, color_code, rank_order, min_time_months, min_classes_attended, stripe_count) VALUES (3, 'Orange', '#FF8C00', 3, 6, 20, NULL)").run();
      db.prepare("INSERT INTO belt_levels (id, name, color_code, rank_order, min_time_months, min_classes_attended, stripe_count) VALUES (5, 'Blue', '#0000FF', 5, 0, 0, NULL)").run();
      bg.getMemberBeltProgress(1);
      db.prepare("UPDATE member_belt_progress SET current_belt_id = 3, classes_attended_since_belt = 100, next_grading_eligible_date = '2020-01-01', current_stripes = 2 WHERE member_id = 1 AND is_current = 1").run();
      const check = bg.checkGradingEligibility(1);
      assert.equal(check.eligible, false);
      assert.ok(check.reasons.some(r => r.includes('maximum belt level')));
      db.prepare('DELETE FROM belt_levels').run();
      const stmt = db.prepare('INSERT INTO belt_levels (id, name, color_code, rank_order, min_time_months, min_classes_attended, stripe_count) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const l of existingLevels) stmt.run(l.id, l.name, l.color_code, l.rank_order, l.min_time_months, l.min_classes_attended, l.stripe_count);
      const reqStmt = db.prepare('INSERT INTO grading_requirements (id, belt_level_id, technique_name, category, required, display_order) VALUES (?, ?, ?, ?, ?, ?)');
      for (const r of existingReqs) reqStmt.run(r.id, r.belt_level_id, r.technique_name, r.category, r.required, r.display_order);
      db.pragma('foreign_keys = ON');
    });
  });

  describe('Member Techniques', () => {
    it('updateMemberTechnique creates and updates', () => {
      const t = bg.updateMemberTechnique(1, 1, 'mastered', 1);
      assert.equal(t.proficiency_level, 'mastered');
      const t2 = bg.updateMemberTechnique(1, 1, 'proficient', 1);
      assert.equal(t2.proficiency_level, 'proficient');
    });

    it('getMemberTechniques returns techniques', () => {
      bg.updateMemberTechnique(1, 1, 'proficient', 1);
      bg.updateMemberTechnique(1, 2, 'mastered', 1);
      const techs = bg.getMemberTechniques(1);
      assert.equal(techs.length, 2);
    });

    it('getMemberTechniques filters by beltLevelId', () => {
      const db = getDatabase();
      db.prepare("INSERT INTO grading_requirements (id, belt_level_id, technique_name, category, required, display_order) VALUES (10, 1, 'Basic Stance', 'fundamentals', 1, 1)").run();
      bg.updateMemberTechnique(1, 1, 'proficient', 1);
      bg.updateMemberTechnique(1, 2, 'mastered', 1);
      bg.updateMemberTechnique(1, 10, 'proficient', 1);
      const techs = bg.getMemberTechniques(1, 2);
      assert.equal(techs.length, 2);
    });
  });

  describe('Grading Sessions', () => {
    it('createGradingSession creates session', () => {
      const s = bg.createGradingSession({ session_date: '2026-06-15', session_time: '10:00', location: 'Main Gym', grading_coach_id: 1 });
      assert.ok(s.id);
    });

    it('addGradingParticipant adds member to session', () => {
      bg.getMemberBeltProgress(1);
      const s = bg.createGradingSession({ session_date: '2026-06-15', grading_coach_id: 1 });
      const p = bg.addGradingParticipant(s.id, 1, 2);
      assert.ok(p.id);
      assert.equal(p.member_id, 1);
    });

    it('recordGradingResult updates participant and assigns belt on pass', () => {
      bg.getMemberBeltProgress(1);
      const s = bg.createGradingSession({ session_date: '2026-06-15', grading_coach_id: 1 });
      const p = bg.addGradingParticipant(s.id, 1, 2);
      const result = bg.recordGradingResult(p.id, 'passed', 90, 'Great work', 1);
      assert.equal(result.result, 'passed');
      assert.equal(result.score, 90);

      const progress = bg.getMemberBeltProgress(1);
      assert.equal(progress.current_belt_id, 2);
    });

    it('recordGradingResult does not assign belt on failed', () => {
      bg.getMemberBeltProgress(1);
      const s = bg.createGradingSession({ session_date: '2026-06-15', grading_coach_id: 1 });
      const p = bg.addGradingParticipant(s.id, 1, 2);
      const result = bg.recordGradingResult(p.id, 'failed', 40, 'Needs more practice', 0);
      assert.equal(result.result, 'failed');
      const progress = bg.getMemberBeltProgress(1);
      assert.equal(progress.current_belt_id, 1);
    });

    it('getGradingSessions returns sessions', () => {
      bg.createGradingSession({ session_date: '2026-06-15', grading_coach_id: 1 });
      const sessions = bg.getGradingSessions({});
      assert.equal(sessions.length, 1);
    });

    it('getGradingSessions filters by status', () => {
      bg.createGradingSession({ session_date: '2026-06-15', grading_coach_id: 1 });
      const db = getDatabase();
      db.prepare("INSERT INTO grading_sessions (session_date, grading_coach_id, status, notes) VALUES ('2026-07-15', 1, 'completed', 'Done')").run();
      const sessions = bg.getGradingSessions({ status: 'completed' });
      assert.equal(sessions.length, 1);
    });
  });

  describe('Grading History', () => {
    it('getMemberGradingHistory returns history', () => {
      bg.getMemberBeltProgress(1);
      bg.assignBelt({ memberId: 1, beltLevelId: 2, gradedBy: 1 });
      const history = bg.getMemberGradingHistory(1);
      assert.ok(history.length > 0);
      assert.ok(history[0].to_belt_name);
    });
  });
});
