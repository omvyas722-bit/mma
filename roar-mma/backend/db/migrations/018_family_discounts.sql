-- Phase 18: Family discount system

CREATE TABLE IF NOT EXISTS family_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  discount_percentage INTEGER NOT NULL DEFAULT 10 CHECK(discount_percentage BETWEEN 0 AND 100),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS family_group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_group_id INTEGER NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  UNIQUE(family_group_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_family_members_group ON family_group_members(family_group_id);
CREATE INDEX IF NOT EXISTS idx_family_members_member ON family_group_members(member_id);

INSERT OR IGNORE INTO family_groups (name, discount_percentage) VALUES ('Default Family', 10);
