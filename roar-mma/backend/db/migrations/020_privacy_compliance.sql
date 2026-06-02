-- Phase 20: Privacy compliance - consent tracking, data retention, data export log

CREATE TABLE IF NOT EXISTS member_consents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK(consent_type IN ('marketing_sms', 'marketing_email', 'data_sharing', 'photo_usage', 'terms_agreed', 'privacy_policy')),
  granted INTEGER NOT NULL DEFAULT 1,
  granted_at TEXT,
  revoked_at TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(member_id, consent_type)
);

CREATE TABLE IF NOT EXISTS data_retention_policy (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data_category TEXT NOT NULL UNIQUE,
  retention_days INTEGER NOT NULL DEFAULT 365,
  auto_delete INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS data_export_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER REFERENCES members(id),
  export_type TEXT NOT NULL DEFAULT 'full',
  format TEXT NOT NULL DEFAULT 'json',
  requested_by INTEGER NOT NULL REFERENCES staff(id),
  file_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

INSERT OR IGNORE INTO data_retention_policy (data_category, retention_days, auto_delete) VALUES
  ('audit_logs', 1825, 0),
  ('member_communications', 730, 0),
  ('payment_records', 2555, 0),
  ('attendance_records', 365, 0),
  ('waiver_documents', 2555, 0),
  ('inactive_members', 730, 1);

CREATE INDEX IF NOT EXISTS idx_member_consents_member ON member_consents(member_id);
CREATE INDEX IF NOT EXISTS idx_data_export_member ON data_export_log(member_id);
