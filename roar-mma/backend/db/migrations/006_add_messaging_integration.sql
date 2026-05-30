-- Phase 7: Smart Email/SMS Integration
-- Real message sending with Twilio + Brevo, delivery tracking, unsubscribe management

-- Message delivery tracking
CREATE TABLE IF NOT EXISTS message_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scheduled_message_id INTEGER,
  external_id TEXT, -- Twilio SID or Brevo message ID
  channel TEXT NOT NULL CHECK(channel IN ('sms', 'email')),
  recipient TEXT NOT NULL,
  status TEXT DEFAULT 'sending' CHECK(status IN ('sending', 'sent', 'delivered', 'failed', 'bounced', 'unsubscribed')),
  status_detail TEXT, -- detailed error or delivery info
  sent_at DATETIME,
  delivered_at DATETIME,
  failed_at DATETIME,
  cost REAL CHECK(cost >= 0), -- cost in dollars
  segments INTEGER CHECK(segments > 0), -- SMS segments (for cost calculation)
  provider TEXT CHECK(provider IN ('twilio', 'brevo')),
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (scheduled_message_id) REFERENCES scheduled_messages(id) ON DELETE CASCADE
);

-- Unsubscribe list
CREATE TABLE IF NOT EXISTS unsubscribes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_type TEXT NOT NULL CHECK(contact_type IN ('phone', 'email')),
  contact_value TEXT NOT NULL UNIQUE,
  channel TEXT CHECK(channel IN ('sms', 'email', 'all')),
  reason TEXT,
  unsubscribed_at DATETIME DEFAULT (datetime('now')),
  member_id INTEGER,
  lead_id INTEGER,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- Bounce tracking
CREATE TABLE IF NOT EXISTS message_bounces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_id INTEGER NOT NULL,
  bounce_type TEXT CHECK(bounce_type IN ('hard', 'soft', 'complaint')),
  bounce_reason TEXT,
  bounced_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (delivery_id) REFERENCES message_deliveries(id) ON DELETE CASCADE
);

-- Rate limiting tracking
CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_value TEXT NOT NULL,
  channel TEXT NOT NULL CHECK(channel IN ('sms', 'email')),
  messages_sent INTEGER DEFAULT 1 CHECK(messages_sent >= 0),
  window_start DATETIME DEFAULT (datetime('now')),
  window_end DATETIME,
  blocked INTEGER DEFAULT 0 CHECK(blocked IN (0,1)),
  UNIQUE(contact_value, channel)
);

-- Message cost tracking (daily aggregation)
CREATE TABLE IF NOT EXISTS message_costs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL UNIQUE,
  sms_sent INTEGER DEFAULT 0 CHECK(sms_sent >= 0),
  sms_cost REAL DEFAULT 0 CHECK(sms_cost >= 0),
  email_sent INTEGER DEFAULT 0 CHECK(email_sent >= 0),
  email_cost REAL DEFAULT 0 CHECK(email_cost >= 0),
  total_cost REAL DEFAULT 0 CHECK(total_cost >= 0),
  created_at DATETIME DEFAULT (datetime('now'))
);

-- Provider settings
CREATE TABLE IF NOT EXISTS messaging_provider_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL CHECK(provider IN ('twilio', 'brevo')),
  setting_key TEXT NOT NULL,
  setting_value TEXT,
  encrypted INTEGER DEFAULT 0 CHECK(encrypted IN (0,1)),
  updated_at DATETIME DEFAULT (datetime('now')),
  UNIQUE(provider, setting_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_deliveries_scheduled ON message_deliveries(scheduled_message_id);
CREATE INDEX IF NOT EXISTS idx_message_deliveries_status ON message_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_message_deliveries_external ON message_deliveries(external_id);
CREATE INDEX IF NOT EXISTS idx_unsubscribes_contact ON unsubscribes(contact_value);
CREATE INDEX IF NOT EXISTS idx_unsubscribes_type ON unsubscribes(contact_type);
CREATE INDEX IF NOT EXISTS idx_message_bounces_delivery ON message_bounces(delivery_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_contact ON rate_limits(contact_value, channel);
CREATE INDEX IF NOT EXISTS idx_message_costs_date ON message_costs(date);

-- Default provider settings (placeholders - need real credentials)
INSERT OR IGNORE INTO messaging_provider_settings (provider, setting_key, setting_value, encrypted) VALUES
  ('twilio', 'account_sid', 'YOUR_TWILIO_ACCOUNT_SID', 0),
  ('twilio', 'auth_token', 'YOUR_TWILIO_AUTH_TOKEN', 1),
  ('twilio', 'from_number', '+61412345678', 0),
  ('twilio', 'enabled', 'false', 0),
  ('brevo', 'api_key', 'YOUR_BREVO_API_KEY', 1),
  ('brevo', 'from_email', 'info@roarmma.com.au', 0),
  ('brevo', 'from_name', 'ROAR MMA', 0),
  ('brevo', 'enabled', 'false', 0);

-- Rate limit defaults (per contact per day)
-- SMS: max 5 per day
-- Email: max 10 per day
