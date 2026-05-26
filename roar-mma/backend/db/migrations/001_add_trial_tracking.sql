-- Migration: Add trial tracking and automated follow-up fields
-- Date: 2026-04-29

-- Add trial tracking fields to leads table
ALTER TABLE leads ADD COLUMN trial_date TEXT;
ALTER TABLE leads ADD COLUMN trial_notes TEXT;
ALTER TABLE leads ADD COLUMN trial_experience_rating INTEGER CHECK(trial_experience_rating BETWEEN 1 AND 5);
ALTER TABLE leads ADD COLUMN trial_interest_level TEXT CHECK(trial_interest_level IN ('hot', 'warm', 'cold'));
ALTER TABLE leads ADD COLUMN trial_class_type TEXT CHECK(trial_class_type IN ('bjj', 'muay_thai', 'mma', 'boxing', 'other'));
ALTER TABLE leads ADD COLUMN trial_coach_id INTEGER REFERENCES staff(id);

-- Add follow-up tracking fields to leads table
ALTER TABLE leads ADD COLUMN follow_up_status TEXT CHECK(follow_up_status IN ('pending', 'in_progress', 'completed', 'no_response')) DEFAULT 'pending';
ALTER TABLE leads ADD COLUMN next_follow_up_date TEXT;
ALTER TABLE leads ADD COLUMN last_contact_date TEXT;
ALTER TABLE leads ADD COLUMN follow_up_count INTEGER DEFAULT 0;

-- Create message templates table
CREATE TABLE IF NOT EXISTS message_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('sms', 'email')),
    trigger_event TEXT NOT NULL CHECK(trigger_event IN ('trial_2hr', 'trial_next_day', 'trial_day3', 'trial_day7', 'trial_day14', 'lead_new', 'lead_no_response', 'member_inactive')),
    subject TEXT,
    body TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Create scheduled messages table
CREATE TABLE IF NOT EXISTS scheduled_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER REFERENCES leads(id),
    member_id INTEGER REFERENCES members(id),
    message_type TEXT NOT NULL CHECK(message_type IN ('sms', 'email')),
    template_id INTEGER REFERENCES message_templates(id),
    scheduled_for TEXT NOT NULL,
    sent_at TEXT,
    status TEXT NOT NULL CHECK(status IN ('pending', 'sent', 'failed', 'cancelled')) DEFAULT 'pending',
    recipient_phone TEXT,
    recipient_email TEXT,
    subject TEXT,
    body TEXT NOT NULL,
    response_received INTEGER DEFAULT 0,
    response_text TEXT,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_trial_date ON leads(trial_date);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up_status ON leads(follow_up_status);
CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up_date ON leads(next_follow_up_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status ON scheduled_messages(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_scheduled_for ON scheduled_messages(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_lead_id ON scheduled_messages(lead_id);
