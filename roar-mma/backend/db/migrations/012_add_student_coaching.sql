-- Phase 12: Student coaching system - daily ratings, AI insights, drill recommendations

CREATE TABLE IF NOT EXISTS student_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  coach_id INTEGER NOT NULL,
  rating_date DATE NOT NULL DEFAULT (date('now')),
  defense INTEGER CHECK(defense BETWEEN 1 AND 10),
  stance INTEGER CHECK(stance BETWEEN 1 AND 10),
  offense INTEGER CHECK(offense BETWEEN 1 AND 10),
  practice_quality INTEGER CHECK(practice_quality BETWEEN 1 AND 10),
  notes TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (coach_id) REFERENCES staff(id)
);

CREATE TABLE IF NOT EXISTS student_ai_insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  insight_date DATE NOT NULL DEFAULT (date('now')),
  skill_level TEXT,
  fight_readiness TEXT CHECK(fight_readiness IN ('not_ready', 'developing', 'ready', 'fight_ready')),
  recommended_weight_class TEXT,
  weight_advice TEXT CHECK(weight_advice IN ('cut', 'bulk', 'maintain', 'not_sure')),
  diet_recommendation TEXT,
  strengths TEXT,
  weaknesses TEXT,
  summary TEXT,
  details TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE TABLE IF NOT EXISTS student_drill_recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  insight_id INTEGER,
  drill_name TEXT NOT NULL,
  drill_description TEXT,
  focus_area TEXT,
  difficulty TEXT CHECK(difficulty IN ('beginner', 'intermediate', 'advanced')),
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (insight_id) REFERENCES student_ai_insights(id)
);

CREATE INDEX IF NOT EXISTS idx_student_ratings_member ON student_ratings(member_id);
CREATE INDEX IF NOT EXISTS idx_student_ratings_date ON student_ratings(rating_date);
CREATE INDEX IF NOT EXISTS idx_student_insights_member ON student_ai_insights(member_id);
CREATE INDEX IF NOT EXISTS idx_student_drills_member ON student_drill_recommendations(member_id);
