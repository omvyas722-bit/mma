-- Phase 11: Add missing transaction columns for Lightspeed integration
ALTER TABLE transactions ADD COLUMN lightspeed_transaction_id TEXT;
ALTER TABLE transactions ADD COLUMN processed_at TEXT;
ALTER TABLE transactions ADD COLUMN failure_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_transactions_lightspeed_id ON transactions(lightspeed_transaction_id);
