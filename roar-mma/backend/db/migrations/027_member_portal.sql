-- Phase 27: Member self-service portal
ALTER TABLE members ADD COLUMN password_hash TEXT;
ALTER TABLE members ADD COLUMN portal_enabled INTEGER DEFAULT 1;
