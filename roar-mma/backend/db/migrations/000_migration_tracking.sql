-- Migration 000: Schema Version Tracking
-- Creates the migration tracking table used by all subsequent migrations.
-- This must be the first migration applied.

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  checksum TEXT,
  duration_ms INTEGER,
  success INTEGER NOT NULL DEFAULT 1
);

-- Mark this migration as applied
INSERT OR IGNORE INTO schema_version (version, name, applied_at)
VALUES (0, 'Migration tracking system', datetime('now'));
