-- Phase 23: Social media campaigns, lead tracking, TikTok platform
CREATE TABLE IF NOT EXISTS social_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  campaign_type TEXT DEFAULT 'promotion',
  budget REAL,
  start_date TEXT,
  end_date TEXT,
  target_url TEXT,
  utm_campaign TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','active','paused','completed','cancelled')),
  notes TEXT,
  created_by INTEGER,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS social_campaign_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL REFERENCES social_campaigns(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  leads_generated INTEGER DEFAULT 0,
  spend REAL DEFAULT 0,
  fetched_at DATETIME DEFAULT (datetime('now'))
);

-- Add platform_type column to social_platforms if missing
ALTER TABLE social_platforms ADD COLUMN platform_type TEXT;

-- Add TikTok to social_platforms if not exists
INSERT OR IGNORE INTO social_platforms (name, platform_type, connected) VALUES ('TikTok', 'tiktok', 0);

-- Add utm columns if not already there (leads)
ALTER TABLE social_posts ADD COLUMN utm_campaign TEXT;
