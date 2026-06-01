-- Phase 17: Remaining features - certifications, approval queue, makeup, auto-messages, sparklines

CREATE TABLE IF NOT EXISTS staff_certifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  cert_name TEXT NOT NULL,
  issuing_body TEXT,
  cert_number TEXT,
  issued_date TEXT,
  expiry_date TEXT,
  cert_file_path TEXT,
  verified INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS approval_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  payload TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by INTEGER REFERENCES users(id),
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS automated_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger_event TEXT NOT NULL,
  template_id INTEGER REFERENCES message_templates(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'both' CHECK (channel IN ('sms', 'email', 'both')),
  audience_filter TEXT DEFAULT '{}',
  enabled INTEGER DEFAULT 1,
  last_sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS makeup_classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  original_date TEXT NOT NULL,
  original_class_id INTEGER REFERENCES classes(id),
  granted_by INTEGER REFERENCES users(id),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  used_for_class_id INTEGER REFERENCES class_instances(id),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dashboard_sparklines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  color TEXT DEFAULT '#dc2626',
  data TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_staff_certs_staff ON staff_certifications(staff_id);
CREATE INDEX IF NOT EXISTS idx_approval_queue_status ON approval_queue(status);
CREATE INDEX IF NOT EXISTS idx_approval_queue_agent ON approval_queue(agent_name);
CREATE INDEX IF NOT EXISTS idx_auto_messages_trigger ON automated_messages(trigger_event);
CREATE INDEX IF NOT EXISTS idx_makeup_member ON makeup_classes(member_id);
CREATE INDEX IF NOT EXISTS idx_makeup_expires ON makeup_classes(expires_at);

INSERT INTO automated_messages (trigger_event, title, body, channel) VALUES
  ('birthday', 'Happy Birthday!', 'Happy Birthday {first_name}! 🎉 Come celebrate with us at Roar MMA — enjoy a FREE class on us today! Show this message at the front desk. #RoarMMA #Birthday', 'both'),
  ('membership_anniversary', 'Membership Anniversary', 'Happy {years}-year anniversary {first_name}! 🥋 We are grateful to have you as part of the Roar MMA family. Here is to many more years of growth and discipline! Reply to this message for a special anniversary offer.', 'both'),
  ('inactive_30_days', 'We Miss You!', 'Hey {first_name}, we have noticed you have not trained in a while. Your fitness journey is important to us — come back this week and your first class back is FREE. Book now at {link} or reply to this message.', 'both'),
  ('trial_expiring', 'Trial Ending Soon', 'Hi {first_name}, your trial membership ends on {date}. Join now and get {discount}% off your first month! Sign up at the front desk or reply to this message. #RoarMMA', 'both')
ON CONFLICT DO NOTHING;

INSERT INTO dashboard_sparklines (metric_key, label, color, data) VALUES
  ('new_members', 'New Members (30d)', '#22c55e', '[]'),
  ('revenue', 'Revenue (30d)', '#dc2626', '[]'),
  ('attendance', 'Attendance (30d)', '#3b82f6', '[]'),
  ('leads', 'Leads (30d)', '#f59e0b', '[]')
ON CONFLICT DO NOTHING;
