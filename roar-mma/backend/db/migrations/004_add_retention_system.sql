-- Phase 5: Retention Automation System
-- Cancellation intervention, retention offers, win-back sequences

-- Cancellation requests (instead of instant cancel)
CREATE TABLE IF NOT EXISTS cancellation_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  requested_by INTEGER NOT NULL, -- staff_id who entered request
  request_date DATETIME DEFAULT (datetime('now')),
  cancellation_reason TEXT,
  reason_category TEXT CHECK(reason_category IN ('cost', 'time', 'injury', 'moving', 'dissatisfied', 'other')),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'retained', 'cancelled', 'expired')),
  retention_offer_id INTEGER,
  final_decision_date DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES staff(id) ON DELETE CASCADE
);

-- Retention offers (automated based on reason)
CREATE TABLE IF NOT EXISTS retention_offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cancellation_request_id INTEGER NOT NULL,
  offer_type TEXT NOT NULL CHECK(offer_type IN ('pause', 'downgrade', 'discount', 'free_pt', 'schedule_change')),
  offer_details TEXT, -- JSON with specifics
  discount_percentage INTEGER CHECK(discount_percentage BETWEEN 0 AND 100),
  discount_months INTEGER CHECK(discount_months > 0),
  pause_months INTEGER CHECK(pause_months > 0),
  new_membership_type TEXT,
  free_pt_sessions INTEGER CHECK(free_pt_sessions >= 0),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected', 'expired')),
  offered_date DATETIME DEFAULT (datetime('now')),
  response_date DATETIME,
  expires_at DATETIME,
  created_by INTEGER, -- staff_id or NULL for auto-generated
  notes TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (cancellation_request_id) REFERENCES cancellation_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES staff(id) ON DELETE CASCADE
);

-- Member pauses (freeze membership)
CREATE TABLE IF NOT EXISTS membership_pauses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
  created_by INTEGER,
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES staff(id) ON DELETE CASCADE,
  CHECK(end_date > start_date)
);

-- Win-back campaigns for cancelled members
CREATE TABLE IF NOT EXISTS winback_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  cancellation_date DATE NOT NULL,
  cancellation_reason_category TEXT,
  campaign_type TEXT CHECK(campaign_type IN ('immediate', '30_day', '90_day', '6_month')),
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'won_back', 'expired', 'unsubscribed')),
  messages_sent INTEGER DEFAULT 0 CHECK(messages_sent >= 0),
  last_message_date DATETIME,
  won_back_date DATETIME,
  special_offer TEXT, -- JSON with offer details
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- Retention analytics tracking
CREATE TABLE IF NOT EXISTS retention_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('cancellation_requested', 'offer_made', 'offer_accepted', 'offer_rejected', 'member_retained', 'member_cancelled', 'won_back')),
  event_date DATETIME DEFAULT (datetime('now')),
  related_id INTEGER, -- cancellation_request_id or retention_offer_id
  metadata TEXT, -- JSON with additional context
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
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
CREATE INDEX IF NOT EXISTS idx_retention_events_related_id ON retention_events(related_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_requested_by ON cancellation_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_retention_offers_created_by ON retention_offers(created_by);
CREATE INDEX IF NOT EXISTS idx_membership_pauses_created_by ON membership_pauses(created_by);
CREATE INDEX IF NOT EXISTS idx_retention_offers_expires ON retention_offers(expires_at);

-- Expand message_templates trigger_event constraint for win-back campaigns
-- SQLite doesn't support ALTER TABLE for constraints, so recreate table
-- Idempotent: preserves data via rename instead of destructive DROP

-- Step 1: Rename existing table out of the way
ALTER TABLE message_templates RENAME TO message_templates_old;

-- Step 2: Create new table with expanded constraint
CREATE TABLE IF NOT EXISTS message_templates (
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
    active INTEGER DEFAULT 1 CHECK(active IN (0,1)),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Step 3: Copy existing data
INSERT INTO message_templates (id, name, type, trigger_event, subject, body, active, created_at, updated_at)
SELECT id, name, type, trigger_event, subject, body, active, created_at, updated_at FROM message_templates_old;

-- Step 4: Clean up
DROP TABLE IF EXISTS message_templates_old;

-- Index on trigger_event after recreation
CREATE INDEX IF NOT EXISTS idx_message_templates_trigger_event ON message_templates(trigger_event);
