CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  type TEXT NOT NULL CHECK(type IN ('payment_failed', 'ai_approval', 'new_lead', 'class_cancelled', 'trial_overdue', 'system', 'member_created', 'booking_reminder', 'stock_alert', 'grading_result')),
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  channel TEXT DEFAULT 'in_app' CHECK(channel IN ('in_app', 'email', 'sms', 'both')),
  status TEXT DEFAULT 'unread' CHECK(status IN ('unread', 'read', 'dismissed')),
  created_at DATETIME DEFAULT (datetime('now')),
  read_at DATETIME
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  email_notifications INTEGER DEFAULT 1,
  sms_notifications INTEGER DEFAULT 0,
  payment_alerts INTEGER DEFAULT 1,
  lead_alerts INTEGER DEFAULT 1,
  class_alerts INTEGER DEFAULT 1,
  system_alerts INTEGER DEFAULT 1,
  marketing INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);
