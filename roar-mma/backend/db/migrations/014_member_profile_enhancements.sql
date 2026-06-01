-- Migration 014: Member profile enhancements
-- Multi-discipline belt tracking, member notes, fighter competitions, referrals

-- 1. Add discipline to belt levels
ALTER TABLE belt_levels ADD COLUMN discipline TEXT DEFAULT 'bjj';
UPDATE belt_levels SET discipline = 'bjj' WHERE discipline IS NULL;

-- 2. Add Muay Thai belt levels
INSERT OR IGNORE INTO belt_levels (name, rank_order, stripe_count, color_code, min_time_months, min_classes_attended, description, discipline) VALUES
  ('MT Beginner', 100, 0, '#FF6B35', 0, 0, 'Muay Thai beginner - basic strikes', 'muay_thai'),
  ('MT Intermediate', 101, 0, '#FFD700', 6, 48, 'Muay Thai intermediate - combinations and clinch', 'muay_thai'),
  ('MT Advanced', 102, 0, '#C0C0C0', 18, 96, 'Muay Thai advanced - advanced techniques', 'muay_thai');

-- 3. Add Wrestling levels
INSERT OR IGNORE INTO belt_levels (name, rank_order, stripe_count, color_code, min_time_months, min_classes_attended, description, discipline) VALUES
  ('Wrestling Fundamentals', 200, 0, '#4CAF50', 0, 0, 'Wrestling fundamentals - basic takedowns', 'wrestling'),
  ('Wrestling Advanced', 201, 0, '#2E7D32', 12, 72, 'Wrestling advanced - chain wrestling', 'wrestling');

-- 4. Add Kids BJJ levels
INSERT OR IGNORE INTO belt_levels (name, rank_order, stripe_count, color_code, min_time_months, min_classes_attended, description, discipline) VALUES
  ('Kids White/Yellow', 300, 4, '#FFFF00', 0, 0, 'Kids BJJ beginner', 'kids_bjj'),
  ('Kids Orange/Green', 301, 4, '#FF8C00', 6, 24, 'Kids BJJ intermediate', 'kids_bjj');

-- 5. Recreate member_belt_progress with per-discipline support
ALTER TABLE member_belt_progress RENAME TO member_belt_progress_old;

CREATE TABLE IF NOT EXISTS member_belt_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  discipline TEXT NOT NULL DEFAULT 'bjj',
  current_belt_id INTEGER NOT NULL,
  current_stripes INTEGER DEFAULT 0 CHECK(current_stripes BETWEEN 0 AND 4),
  belt_awarded_date DATE NOT NULL,
  next_grading_eligible_date DATE,
  classes_attended_since_belt INTEGER DEFAULT 0 CHECK(classes_attended_since_belt >= 0),
  months_at_current_belt INTEGER DEFAULT 0 CHECK(months_at_current_belt >= 0),
  is_current INTEGER DEFAULT 1 CHECK(is_current IN (0,1)),
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (current_belt_id) REFERENCES belt_levels(id) ON DELETE CASCADE
);

INSERT INTO member_belt_progress (member_id, discipline, current_belt_id, current_stripes, belt_awarded_date, next_grading_eligible_date, classes_attended_since_belt, months_at_current_belt, is_current, created_at, updated_at)
SELECT member_id, 'bjj', current_belt_id, current_stripes, belt_awarded_date, next_grading_eligible_date, classes_attended_since_belt, months_at_current_belt, is_current, created_at, updated_at
FROM member_belt_progress_old;

DROP TABLE IF EXISTS member_belt_progress_old;

CREATE UNIQUE INDEX IF NOT EXISTS idx_member_belt_current_discipline ON member_belt_progress(member_id, discipline) WHERE is_current = 1;
CREATE INDEX IF NOT EXISTS idx_member_belt_progress_member ON member_belt_progress(member_id);
CREATE INDEX IF NOT EXISTS idx_member_belt_progress_belt ON member_belt_progress(current_belt_id);

-- 6. Member notes / timeline table
CREATE TABLE IF NOT EXISTS member_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  author_id INTEGER,
  note_type TEXT DEFAULT 'general' CHECK(note_type IN ('general', 'call', 'meeting', 'incident', 'achievement', 'complaint')),
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES staff(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_member_notes_member ON member_notes(member_id);

-- 7. Fighter competitions table
CREATE TABLE IF NOT EXISTS fighter_competitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  opponent_name TEXT,
  weight_class TEXT,
  discipline TEXT CHECK(discipline IN ('mma', 'boxing', 'bjj', 'muay_thai', 'wrestling')),
  result TEXT CHECK(result IN ('win', 'loss', 'draw', 'nc')),
  method TEXT CHECK(method IN ('ko', 'tko', 'submission', 'decision', 'dq')),
  round INTEGER,
  time TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fighter_competitions_member ON fighter_competitions(member_id);

-- 8. Referral vouchers
CREATE TABLE IF NOT EXISTS referral_vouchers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_member_id INTEGER NOT NULL,
  referred_member_id INTEGER NOT NULL,
  voucher_type TEXT DEFAULT 'free_week',
  voucher_value REAL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'issued', 'redeemed', 'expired')),
  issued_at DATETIME DEFAULT (datetime('now')),
  redeemed_at DATETIME,
  expires_at DATETIME,
  FOREIGN KEY (referrer_member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_referral_vouchers_referrer ON referral_vouchers(referrer_member_id);

-- 9. Missing columns on members
ALTER TABLE members ADD COLUMN membership_type TEXT DEFAULT 'adult';
ALTER TABLE members ADD COLUMN is_fighter INTEGER DEFAULT 0;
ALTER TABLE members ADD COLUMN parent_id INTEGER REFERENCES members(id);
ALTER TABLE members ADD COLUMN referred_by INTEGER REFERENCES members(id);
ALTER TABLE members ADD COLUMN gender TEXT;
ALTER TABLE members ADD COLUMN address TEXT;
ALTER TABLE members ADD COLUMN suburb TEXT;
ALTER TABLE members ADD COLUMN postcode TEXT;
