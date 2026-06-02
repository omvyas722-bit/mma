-- Phase 19: Staff scheduling system

CREATE TABLE IF NOT EXISTS staff_shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  location TEXT,
  role TEXT,
  recurrence TEXT DEFAULT 'weekly',
  notes TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staff_time_off (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date_from TEXT NOT NULL,
  date_to TEXT NOT NULL,
  reason TEXT,
  type TEXT NOT NULL DEFAULT 'vacation' CHECK(type IN ('vacation', 'sick', 'personal', 'training', 'other')),
  approved INTEGER DEFAULT 0,
  approved_by INTEGER REFERENCES staff(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_staff_shifts_staff ON staff_shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_day ON staff_shifts(day_of_week);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_staff ON staff_time_off(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_dates ON staff_time_off(date_from, date_to);
