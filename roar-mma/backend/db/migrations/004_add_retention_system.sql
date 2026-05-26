-- Phase 5: Retention Automation System
-- Cancellation intervention, retention offers, win-back sequences

-- Cancellation requests (instead of instant cancel)
CREATE TABLE IF NOT EXISTS cancellation_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  requested_by INTEGER NOT NULL, -- staff_id who entered request
  request_date DATETIME DEFAULT (datetime('now')),
  cancellation_reason TEXT,
  reason_category TEXT, -- 'cost', 'time', 'injury', 'moving', 'dissatisfied', 'other'
  status TEXT DEFAULT 'pending', -- 'pending', 'retained', 'cancelled', 'expired'
  retention_offer_id INTEGER,
  final_decision_date DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (requested_by) REFERENCES staff(id)
);

-- Retention offers (automated based on reason)
CREATE TABLE IF NOT EXISTS retention_offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cancellation_request_id INTEGER NOT NULL,
  offer_type TEXT NOT NULL, -- 'pause', 'downgrade', 'discount', 'free_pt', 'schedule_change'
  offer_details TEXT, -- JSON with specifics
  discount_percentage INTEGER,
  discount_months INTEGER,
  pause_months INTEGER,
  new_membership_type TEXT,
  free_pt_sessions INTEGER,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired'
  offered_date DATETIME DEFAULT (datetime('now')),
  response_date DATETIME,
  expires_at DATETIME,
  created_by INTEGER, -- staff_id or NULL for auto-generated
  notes TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (cancellation_request_id) REFERENCES cancellation_requests(id),
  FOREIGN KEY (created_by) REFERENCES staff(id)
);

-- Member pauses (freeze membership)
CREATE TABLE IF NOT EXISTS membership_pauses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  created_by INTEGER,
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (created_by) REFERENCES staff(id)
);

-- Win-back campaigns for cancelled members
CREATE TABLE IF NOT EXISTS winback_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  cancellation_date DATE NOT NULL,
  cancellation_reason_category TEXT,
  campaign_type TEXT, -- 'immediate', '30_day', '90_day', '6_month'
  status TEXT DEFAULT 'active', -- 'active', 'won_back', 'expired', 'unsubscribed'
  messages_sent INTEGER DEFAULT 0,
  last_message_date DATETIME,
  won_back_date DATETIME,
  special_offer TEXT, -- JSON with offer details
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Retention analytics tracking
CREATE TABLE IF NOT EXISTS retention_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  event_type TEXT NOT NULL, -- 'cancellation_requested', 'offer_made', 'offer_accepted', 'offer_rejected', 'member_retained', 'member_cancelled', 'won_back'
  event_date DATETIME DEFAULT (datetime('now')),
  related_id INTEGER, -- cancellation_request_id or retention_offer_id
  metadata TEXT, -- JSON with additional context
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_member ON cancellation_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_status ON cancellation_requests(status);
CREATE INDEX IF NOT EXISTS idx_retention_offers_request ON retention_offers(cancellation_request_id);
CREATE INDEX IF NOT EXISTS idx_retention_offers_status ON retention_offers(status);
CREATE INDEX IF NOT EXISTS idx_membership_pauses_member ON membership_pauses(member_id);
CREATE INDEX IF NOT EXISTS idx_membership_pauses_dates ON membership_pauses(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_winback_campaigns_member ON winback_campaigns(member_id);
CREATE INDEX IF NOT EXISTS idx_winback_campaigns_status ON winback_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_retention_events_member ON retention_events(member_id);
CREATE INDEX IF NOT EXISTS idx_retention_events_type ON retention_events(event_type);

-- Expand message_templates trigger_event constraint for win-back campaigns
-- SQLite doesn't support ALTER TABLE for constraints, so recreate table
CREATE TABLE message_templates_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('sms', 'email')),
    trigger_event TEXT NOT NULL CHECK(trigger_event IN (
      'trial_2hr', 'trial_next_day', 'trial_day3', 'trial_day7', 'trial_day14',
      'lead_new', 'lead_no_response', 'member_inactive',
      'winback_immediate', 'winback_30day', 'winback_90day', 'winback_6month'
    )),
    subject TEXT,
    body TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Copy existing data
INSERT INTO message_templates_new SELECT * FROM message_templates;

-- Drop old table
DROP TABLE message_templates;

-- Rename new table
ALTER TABLE message_templates_new RENAME TO message_templates;
