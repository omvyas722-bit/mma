-- Phase 26: AI enhancements (SCOUT, HEALER, PIXEL)
ALTER TABLE leads ADD COLUMN score INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN score_updated_at TEXT;
ALTER TABLE leads ADD COLUMN score_factors TEXT;
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);

ALTER TABLE members ADD COLUMN health_score INTEGER DEFAULT 100;
ALTER TABLE members ADD COLUMN health_score_updated_at TEXT;
ALTER TABLE members ADD COLUMN health_score_factors TEXT;

CREATE TABLE IF NOT EXISTS pixel_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pixel_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  lead_id INTEGER,
  campaign_id INTEGER,
  value REAL,
  currency TEXT DEFAULT 'AUD',
  page_url TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pixel_pixel_id ON pixel_events(pixel_id);
CREATE INDEX IF NOT EXISTS idx_pixel_event_type ON pixel_events(event_type);
CREATE INDEX IF NOT EXISTS idx_pixel_lead ON pixel_events(lead_id);
