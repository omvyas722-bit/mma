-- Phase 30: Add columns referenced in application code but missing from schema
ALTER TABLE members ADD COLUMN reg_fee_paid INTEGER DEFAULT 0;
ALTER TABLE classes ADD COLUMN duration_mins INTEGER;
ALTER TABLE classes ADD COLUMN room TEXT;
ALTER TABLE staff ADD COLUMN pt_rate REAL;
ALTER TABLE staff ADD COLUMN pt_split_pct REAL;
