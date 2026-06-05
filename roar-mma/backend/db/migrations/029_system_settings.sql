CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO system_settings (key, value, description) VALUES
  ('hold_fee_rate', '0.71', 'Daily hold fee amount in dollars'),
  ('hold_max_days', '84', 'Maximum pause duration in days'),
  ('doc_expiry_alert_days', '60', 'Days before document expiry to show warning'),
  ('doc_expiry_critical_days', '14', 'Days before document expiry to show critical alert');
