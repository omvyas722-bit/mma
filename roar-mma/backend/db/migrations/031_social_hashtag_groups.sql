-- Phase 31: Social media hashtag groups, post types, campaign ROI tracking
CREATE TABLE IF NOT EXISTS social_hashtag_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  hashtags TEXT NOT NULL DEFAULT '[]',
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE social_posts ADD COLUMN post_type TEXT DEFAULT 'image';
ALTER TABLE social_campaigns ADD COLUMN spend REAL DEFAULT 0;
ALTER TABLE social_campaigns ADD COLUMN revenue REAL DEFAULT 0;
