-- Phase 13: Waiver templates, member-signed waivers, member documents, event_queue

CREATE TABLE IF NOT EXISTS waiver_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  body_text TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS member_waivers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  template_id INTEGER NOT NULL,
  signed_at DATETIME DEFAULT (datetime('now')),
  signature_data TEXT NOT NULL,
  ip_address TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES waiver_templates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS member_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  doc_type TEXT NOT NULL CHECK(doc_type IN ('waiver', 'health', 'insurance', 'id', 'other')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  notes TEXT,
  uploaded_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS event_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  payload TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'approved', 'rejected')),
  assigned_agent TEXT,
  requires_approval INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  processed_at DATETIME,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_member_waivers_member ON member_waivers(member_id);
CREATE INDEX IF NOT EXISTS idx_member_waivers_template ON member_waivers(template_id);
CREATE INDEX IF NOT EXISTS idx_member_documents_member ON member_documents(member_id);
CREATE INDEX IF NOT EXISTS idx_member_documents_type ON member_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_event_queue_status ON event_queue(status);
CREATE INDEX IF NOT EXISTS idx_event_queue_agent ON event_queue(assigned_agent);
CREATE INDEX IF NOT EXISTS idx_event_queue_entity ON event_queue(entity_type, entity_id);
