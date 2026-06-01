-- Phase 15: Social media content calendar, post composer, platform metrics

CREATE TABLE IF NOT EXISTS social_platforms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  icon TEXT,
  connected INTEGER NOT NULL DEFAULT 0,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TEXT,
  page_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS social_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform_ids TEXT NOT NULL DEFAULT '[]',
  title TEXT,
  content TEXT NOT NULL,
  media_urls TEXT DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed', 'cancelled')),
  scheduled_at TEXT,
  published_at TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS social_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER REFERENCES social_posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS social_content_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  media_urls TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO social_platforms (name, display_name, icon, connected) VALUES
  ('facebook', 'Facebook', '📘', 0),
  ('instagram', 'Instagram', '📸', 0),
  ('tiktok', 'TikTok', '🎵', 0),
  ('youtube', 'YouTube', '▶️', 0)
ON CONFLICT(name) DO NOTHING;

INSERT INTO social_content_templates (name, category, content, tags) VALUES
  ('Class Promotion', 'promotion', '🔥 New class alert! {class_name} is now available at {time} on {days}. First class FREE for new students! Sign up at {link} #MMA #BJJ #MuayThai #Fitness',
   '["classes","promotion"]'),
  ('Member Spotlight', 'community', '🏆 Member of the Week: {member_name}! {member_name} has been training {discipline} for {duration} and has shown incredible progress. Keep up the amazing work! {link} #MemberSpotlight #MMA',
   '["community","members"]'),
  ('Competition Result', 'events', '🥇 {fighter_name} took {result} at {event_name}! We could not be prouder of our fighter! {link} #TeamRoar #MMA #FightNight',
   '["events","competition"]'),
  ('Tip Tuesday', 'tips', '💡 Training Tip #{number}: {tip_text} Master this technique and level up your game! 📹 Watch the full breakdown at {link} #TrainingTuesday #MMATips #BJJ #MuayThai',
   '["tips","education"]'),
  ('Holiday Closure', 'notice', '📢 Important Notice: Roar MMA will be closed on {date} for {holiday}. Regular training resumes on {resume_date}. Train hard, rest harder! {link}',
   '["notice","schedule"]')
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON social_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_social_analytics_post ON social_analytics(post_id);
