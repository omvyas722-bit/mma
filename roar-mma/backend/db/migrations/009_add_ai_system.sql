-- AI Automation System Tables
-- Agent activity logging, agent config, and task queue

CREATE TABLE IF NOT EXISTS ai_activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'completed' CHECK(status IN ('completed', 'failed', 'running', 'pending')),
  created_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_agent_config (
  agent_name TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 1 CHECK(enabled IN (0,1)),
  interval_ms INTEGER DEFAULT 60000 CHECK(interval_ms > 0),
  model_override TEXT,
  config_json TEXT,
  updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_task_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_name TEXT,
  task_type TEXT NOT NULL,
  priority INTEGER DEFAULT 0 CHECK(priority BETWEEN 1 AND 10),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payload TEXT,
  result TEXT,
  retry_count INTEGER DEFAULT 0 CHECK(retry_count >= 0),
  max_retries INTEGER DEFAULT 3 CHECK(max_retries > 0),
  scheduled_for DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_activity_log_agent ON ai_activity_log(agent_name);
CREATE INDEX IF NOT EXISTS idx_ai_activity_log_status ON ai_activity_log(status);
CREATE INDEX IF NOT EXISTS idx_ai_activity_log_created ON ai_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_task_queue_status ON ai_task_queue(status);
CREATE INDEX IF NOT EXISTS idx_ai_task_queue_agent ON ai_task_queue(agent_name);
CREATE INDEX IF NOT EXISTS idx_ai_task_queue_scheduled ON ai_task_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_ai_task_queue_priority ON ai_task_queue(priority);
