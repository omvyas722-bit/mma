-- Phase 10: Belt Grading System
-- Member progression tracking, grading requirements, technique tracking

-- Belt levels
CREATE TABLE IF NOT EXISTS belt_levels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE, -- 'White', 'Blue', 'Purple', 'Brown', 'Black'
  rank_order INTEGER NOT NULL UNIQUE CHECK(rank_order > 0), -- 1, 2, 3, 4, 5
  stripe_count INTEGER DEFAULT 0 CHECK(stripe_count BETWEEN 0 AND 4), -- 0-4 stripes per belt
  color_code TEXT, -- hex color for UI
  min_time_months INTEGER NOT NULL CHECK(min_time_months >= 0), -- minimum time at this level
  min_classes_attended INTEGER NOT NULL CHECK(min_classes_attended >= 0), -- minimum classes required
  description TEXT,
  created_at DATETIME DEFAULT (datetime('now'))
);

-- Grading requirements (techniques per belt)
CREATE TABLE IF NOT EXISTS grading_requirements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  belt_level_id INTEGER NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('striking', 'grappling', 'submissions', 'defense', 'conditioning')),
  technique_name TEXT NOT NULL,
  description TEXT,
  required INTEGER DEFAULT 1 CHECK(required IN (0,1)), -- 1 = required, 0 = optional
  display_order INTEGER DEFAULT 0 CHECK(display_order >= 0),
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (belt_level_id) REFERENCES belt_levels(id) ON DELETE CASCADE
);

-- Member belt progress
CREATE TABLE IF NOT EXISTS member_belt_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  current_belt_id INTEGER NOT NULL,
  current_stripes INTEGER DEFAULT 0 CHECK(current_stripes BETWEEN 0 AND 4),
  belt_awarded_date DATE NOT NULL,
  next_grading_eligible_date DATE,
  classes_attended_since_belt INTEGER DEFAULT 0 CHECK(classes_attended_since_belt >= 0),
  months_at_current_belt INTEGER DEFAULT 0 CHECK(months_at_current_belt >= 0),
  is_current INTEGER DEFAULT 1 CHECK(is_current IN (0,1)), -- 1 for current belt, 0 for historical
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (current_belt_id) REFERENCES belt_levels(id) ON DELETE CASCADE
);

-- Technique tracking (member progress on specific techniques)
CREATE TABLE IF NOT EXISTS member_techniques (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  requirement_id INTEGER NOT NULL,
  proficiency_level TEXT DEFAULT 'learning' CHECK(proficiency_level IN ('learning', 'practicing', 'proficient', 'mastered')),
  last_practiced_date DATE,
  coach_notes TEXT,
  assessed_by INTEGER, -- staff_id
  assessed_at DATETIME,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (requirement_id) REFERENCES grading_requirements(id) ON DELETE CASCADE,
  FOREIGN KEY (assessed_by) REFERENCES staff(id) ON DELETE CASCADE,
  UNIQUE(member_id, requirement_id)
);

-- Grading sessions (belt tests)
CREATE TABLE IF NOT EXISTS grading_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_date DATE NOT NULL,
  session_time TIME,
  location TEXT,
  grading_coach_id INTEGER NOT NULL, -- staff_id conducting grading
  status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (grading_coach_id) REFERENCES staff(id) ON DELETE CASCADE
);

-- Grading participants (members taking the test)
CREATE TABLE IF NOT EXISTS grading_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grading_session_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  current_belt_id INTEGER NOT NULL,
  testing_for_belt_id INTEGER NOT NULL,
  result TEXT CHECK(result IN ('passed', 'failed', 'pending')),
  score INTEGER CHECK(score BETWEEN 0 AND 100),
  feedback TEXT,
  awarded_stripes INTEGER DEFAULT 0 CHECK(awarded_stripes BETWEEN 0 AND 4),
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (grading_session_id) REFERENCES grading_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (current_belt_id) REFERENCES belt_levels(id) ON DELETE CASCADE,
  FOREIGN KEY (testing_for_belt_id) REFERENCES belt_levels(id) ON DELETE CASCADE,
  UNIQUE(grading_session_id, member_id)
);

-- Grading history (audit trail of all belt changes)
CREATE TABLE IF NOT EXISTS grading_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  from_belt_id INTEGER,
  to_belt_id INTEGER NOT NULL,
  stripes_awarded INTEGER DEFAULT 0 CHECK(stripes_awarded BETWEEN 0 AND 4),
  grading_session_id INTEGER,
  graded_by INTEGER NOT NULL, -- staff_id
  grading_date DATE NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (from_belt_id) REFERENCES belt_levels(id) ON DELETE CASCADE,
  FOREIGN KEY (to_belt_id) REFERENCES belt_levels(id) ON DELETE CASCADE,
  FOREIGN KEY (grading_session_id) REFERENCES grading_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (graded_by) REFERENCES staff(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_belt_levels_rank ON belt_levels(rank_order);
CREATE INDEX IF NOT EXISTS idx_grading_requirements_belt ON grading_requirements(belt_level_id);
CREATE INDEX IF NOT EXISTS idx_member_belt_progress_member ON member_belt_progress(member_id);
CREATE INDEX IF NOT EXISTS idx_member_belt_progress_current ON member_belt_progress(is_current);
CREATE INDEX IF NOT EXISTS idx_member_techniques_member ON member_techniques(member_id);
CREATE INDEX IF NOT EXISTS idx_member_techniques_requirement ON member_techniques(requirement_id);
CREATE INDEX IF NOT EXISTS idx_grading_sessions_date ON grading_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_grading_participants_session ON grading_participants(grading_session_id);
CREATE INDEX IF NOT EXISTS idx_grading_participants_member ON grading_participants(member_id);
CREATE INDEX IF NOT EXISTS idx_grading_history_member ON grading_history(member_id);
CREATE INDEX IF NOT EXISTS idx_member_belt_progress_belt ON member_belt_progress(current_belt_id);
CREATE INDEX IF NOT EXISTS idx_member_techniques_assessed_by ON member_techniques(assessed_by);
CREATE INDEX IF NOT EXISTS idx_grading_sessions_coach ON grading_sessions(grading_coach_id);
CREATE INDEX IF NOT EXISTS idx_grading_participants_current_belt ON grading_participants(current_belt_id);
CREATE INDEX IF NOT EXISTS idx_grading_participants_testing_belt ON grading_participants(testing_for_belt_id);
CREATE INDEX IF NOT EXISTS idx_grading_history_from_belt ON grading_history(from_belt_id);
CREATE INDEX IF NOT EXISTS idx_grading_history_to_belt ON grading_history(to_belt_id);
CREATE INDEX IF NOT EXISTS idx_grading_history_graded_by ON grading_history(graded_by);

-- Prevent multiple 'current' belt records per member
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_belt_current_unique ON member_belt_progress(member_id) WHERE is_current = 1;

-- Seed belt levels
INSERT OR IGNORE INTO belt_levels (id, name, rank_order, stripe_count, color_code, min_time_months, min_classes_attended, description) VALUES
  (1, 'White', 1, 4, '#FFFFFF', 0, 0, 'Beginner level - learning fundamentals'),
  (2, 'Blue', 2, 4, '#0066CC', 6, 48, 'Intermediate level - developing technique'),
  (3, 'Purple', 3, 4, '#6600CC', 18, 144, 'Advanced level - refining skills'),
  (4, 'Brown', 4, 4, '#663300', 24, 192, 'Expert level - mastering techniques'),
  (5, 'Black', 5, 0, '#000000', 36, 288, 'Master level - teaching and leading');

-- Seed grading requirements for White Belt
INSERT OR IGNORE INTO grading_requirements (belt_level_id, category, technique_name, description, required, display_order) VALUES
  (1, 'striking', 'Jab', 'Basic straight punch with lead hand', 1, 1),
  (1, 'striking', 'Cross', 'Straight punch with rear hand', 1, 2),
  (1, 'striking', 'Hook', 'Curved punch to side of head', 1, 3),
  (1, 'striking', 'Front Kick', 'Basic front kick technique', 1, 4),
  (1, 'grappling', 'Double Leg Takedown', 'Basic wrestling takedown', 1, 5),
  (1, 'grappling', 'Guard Position', 'Closed guard control', 1, 6),
  (1, 'defense', 'Breakfall', 'Safe falling technique', 1, 7),
  (1, 'defense', 'Shrimp Escape', 'Hip escape from bottom', 1, 8);

-- Seed grading requirements for Blue Belt
INSERT OR IGNORE INTO grading_requirements (belt_level_id, category, technique_name, description, required, display_order) VALUES
  (2, 'striking', 'Uppercut', 'Upward punch under chin', 1, 1),
  (2, 'striking', 'Roundhouse Kick', 'Circular kick to body/head', 1, 2),
  (2, 'striking', 'Elbow Strike', 'Close range elbow techniques', 1, 3),
  (2, 'grappling', 'Single Leg Takedown', 'Advanced takedown technique', 1, 4),
  (2, 'grappling', 'Mount Position', 'Top control position', 1, 5),
  (2, 'submissions', 'Armbar', 'Arm hyperextension submission', 1, 6),
  (2, 'submissions', 'Rear Naked Choke', 'Back control choke', 1, 7),
  (2, 'defense', 'Guard Pass', 'Passing closed guard', 1, 8),
  (2, 'defense', 'Mount Escape', 'Escaping from bottom mount', 1, 9);

-- Seed grading requirements for Purple Belt
INSERT OR IGNORE INTO grading_requirements (belt_level_id, category, technique_name, description, required, display_order) VALUES
  (3, 'striking', 'Spinning Back Fist', 'Advanced spinning strike', 1, 1),
  (3, 'striking', 'Flying Knee', 'Jumping knee strike', 1, 2),
  (3, 'grappling', 'Kimura', 'Shoulder lock submission', 1, 3),
  (3, 'grappling', 'Triangle Choke', 'Leg choke from guard', 1, 4),
  (3, 'submissions', 'Guillotine Choke', 'Front headlock choke', 1, 5),
  (3, 'submissions', 'Ankle Lock', 'Leg submission', 1, 6),
  (3, 'defense', 'Sweep from Guard', 'Reversing position from bottom', 1, 7),
  (3, 'conditioning', 'Sparring Rounds', '5x5 minute rounds', 1, 8);
