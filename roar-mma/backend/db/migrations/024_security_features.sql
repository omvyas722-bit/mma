-- Phase 24: Security features (2FA, password reset, API keys)
ALTER TABLE staff ADD COLUMN reset_token TEXT;
ALTER TABLE staff ADD COLUMN reset_token_expires TEXT;
ALTER TABLE staff ADD COLUMN two_factor_secret TEXT;
ALTER TABLE staff ADD COLUMN two_factor_enabled INTEGER DEFAULT 0;
ALTER TABLE staff ADD COLUMN api_key TEXT;
ALTER TABLE staff ADD COLUMN api_key_name TEXT;
CREATE INDEX IF NOT EXISTS idx_staff_reset_token ON staff(reset_token);
CREATE INDEX IF NOT EXISTS idx_staff_api_key ON staff(api_key);
