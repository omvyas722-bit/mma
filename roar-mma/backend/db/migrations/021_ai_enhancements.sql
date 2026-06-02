-- Phase 21: AI token usage tracking + agent config columns

ALTER TABLE ai_agent_config ADD COLUMN token_budget INTEGER DEFAULT 100000;
ALTER TABLE ai_agent_config ADD COLUMN token_used INTEGER DEFAULT 0;
ALTER TABLE ai_agent_config ADD COLUMN token_reset_at TEXT;

CREATE TABLE IF NOT EXISTS ai_token_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_name TEXT NOT NULL,
  model TEXT,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost REAL DEFAULT 0,
  endpoint TEXT,
  user_id INTEGER REFERENCES staff(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_token_agent ON ai_token_usage(agent_name);
CREATE INDEX IF NOT EXISTS idx_ai_token_created ON ai_token_usage(created_at);
