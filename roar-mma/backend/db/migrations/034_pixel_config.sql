CREATE TABLE IF NOT EXISTS pixel_config (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Untitled Pixel',
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
