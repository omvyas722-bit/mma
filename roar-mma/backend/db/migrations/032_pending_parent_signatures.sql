CREATE TABLE IF NOT EXISTS pending_parent_signatures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  template_id INTEGER NOT NULL,
  parent_email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  parent_name TEXT,
  parent_relation TEXT,
  signature_data TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'signed', 'expired')),
  expires_at DATETIME,
  signed_at DATETIME,
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES waiver_templates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pending_parent_token ON pending_parent_signatures(token);
CREATE INDEX IF NOT EXISTS idx_pending_parent_member ON pending_parent_signatures(member_id);
CREATE INDEX IF NOT EXISTS idx_pending_parent_status ON pending_parent_signatures(status);
