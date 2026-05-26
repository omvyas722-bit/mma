-- Phase 6: AI Phone Receptionist System
-- 24/7 call handling, trial booking, call logging

-- Phone calls log
CREATE TABLE IF NOT EXISTS phone_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  call_sid TEXT UNIQUE, -- Twilio call SID
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  direction TEXT NOT NULL, -- 'inbound', 'outbound'
  status TEXT NOT NULL, -- 'queued', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer'
  duration INTEGER, -- seconds
  recording_url TEXT,
  transcription TEXT,
  call_type TEXT, -- 'trial_inquiry', 'membership_question', 'schedule_question', 'complaint', 'other'
  handled_by TEXT DEFAULT 'ai', -- 'ai', 'staff', 'voicemail'
  staff_id INTEGER,
  member_id INTEGER,
  lead_id INTEGER,
  sentiment TEXT, -- 'positive', 'neutral', 'negative'
  intent_detected TEXT, -- JSON array of detected intents
  actions_taken TEXT, -- JSON array of actions (trial_booked, lead_created, etc)
  ai_confidence REAL, -- 0-1 confidence score
  requires_followup INTEGER DEFAULT 0,
  followup_reason TEXT,
  started_at DATETIME,
  ended_at DATETIME,
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (staff_id) REFERENCES staff(id),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

-- Call transcripts (detailed turn-by-turn)
CREATE TABLE IF NOT EXISTS call_transcripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  call_id INTEGER NOT NULL,
  speaker TEXT NOT NULL, -- 'caller', 'ai', 'staff'
  message TEXT NOT NULL,
  timestamp DATETIME DEFAULT (datetime('now')),
  confidence REAL, -- transcription confidence
  FOREIGN KEY (call_id) REFERENCES phone_calls(id)
);

-- AI phone settings
CREATE TABLE IF NOT EXISTS ai_phone_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT (datetime('now'))
);

-- Call routing rules
CREATE TABLE IF NOT EXISTS call_routing_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  priority INTEGER DEFAULT 0, -- higher = checked first
  condition_type TEXT NOT NULL, -- 'time_of_day', 'day_of_week', 'caller_type', 'keyword'
  condition_value TEXT NOT NULL, -- JSON with condition details
  route_to TEXT NOT NULL, -- 'ai', 'staff', 'voicemail', 'specific_staff_id'
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT (datetime('now'))
);

-- Voicemail messages
CREATE TABLE IF NOT EXISTS voicemails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  call_id INTEGER NOT NULL,
  from_number TEXT NOT NULL,
  recording_url TEXT NOT NULL,
  transcription TEXT,
  duration INTEGER,
  status TEXT DEFAULT 'new', -- 'new', 'listened', 'returned', 'archived'
  listened_by INTEGER,
  listened_at DATETIME,
  returned_at DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (call_id) REFERENCES phone_calls(id),
  FOREIGN KEY (listened_by) REFERENCES staff(id)
);

-- AI conversation context (for multi-turn conversations)
CREATE TABLE IF NOT EXISTS ai_conversation_context (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  call_id INTEGER NOT NULL,
  context_data TEXT NOT NULL, -- JSON with conversation state
  last_intent TEXT,
  collected_info TEXT, -- JSON with info gathered (name, interest, etc)
  next_expected_input TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (call_id) REFERENCES phone_calls(id)
);

-- Call analytics aggregation
CREATE TABLE IF NOT EXISTS call_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  total_calls INTEGER DEFAULT 0,
  ai_handled INTEGER DEFAULT 0,
  staff_handled INTEGER DEFAULT 0,
  voicemails INTEGER DEFAULT 0,
  trials_booked INTEGER DEFAULT 0,
  leads_created INTEGER DEFAULT 0,
  avg_duration INTEGER DEFAULT 0,
  avg_ai_confidence REAL DEFAULT 0,
  positive_sentiment INTEGER DEFAULT 0,
  neutral_sentiment INTEGER DEFAULT 0,
  negative_sentiment INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT (datetime('now')),
  UNIQUE(date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_phone_calls_from ON phone_calls(from_number);
CREATE INDEX IF NOT EXISTS idx_phone_calls_status ON phone_calls(status);
CREATE INDEX IF NOT EXISTS idx_phone_calls_type ON phone_calls(call_type);
CREATE INDEX IF NOT EXISTS idx_phone_calls_date ON phone_calls(DATE(started_at));
CREATE INDEX IF NOT EXISTS idx_phone_calls_member ON phone_calls(member_id);
CREATE INDEX IF NOT EXISTS idx_phone_calls_lead ON phone_calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_transcripts_call ON call_transcripts(call_id);
CREATE INDEX IF NOT EXISTS idx_voicemails_status ON voicemails(status);
CREATE INDEX IF NOT EXISTS idx_call_analytics_date ON call_analytics(date);

-- Default AI phone settings
INSERT INTO ai_phone_settings (setting_key, setting_value, description) VALUES
  ('business_hours_start', '06:00', 'Business hours start time (24hr format)'),
  ('business_hours_end', '21:00', 'Business hours end time (24hr format)'),
  ('business_days', '1,2,3,4,5,6', 'Business days (1=Mon, 7=Sun)'),
  ('ai_enabled', 'true', 'Enable AI phone receptionist'),
  ('ai_greeting', 'Thanks for calling ROAR MMA! I''m your virtual assistant. How can I help you today?', 'AI greeting message'),
  ('ai_voice', 'alloy', 'AI voice selection'),
  ('transfer_to_staff_keywords', 'speak to someone,talk to person,human,manager', 'Keywords that trigger staff transfer'),
  ('gym_name', 'ROAR MMA', 'Gym name for AI responses'),
  ('gym_location', 'Rockingham', 'Gym location'),
  ('trial_class_price', '0', 'Trial class price (0 = free)'),
  ('max_call_duration', '600', 'Max call duration in seconds (10 min)');

-- Default routing rules
INSERT INTO call_routing_rules (priority, condition_type, condition_value, route_to, active) VALUES
  (100, 'time_of_day', '{"start": "21:00", "end": "06:00"}', 'ai', 1),
  (90, 'day_of_week', '{"days": [0]}', 'ai', 1),
  (50, 'caller_type', '{"type": "member"}', 'staff', 1),
  (10, 'time_of_day', '{"start": "06:00", "end": "21:00"}', 'ai', 1);
