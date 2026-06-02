-- Phase 28: Workflow Builder
CREATE TABLE IF NOT EXISTS workflow_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK(trigger_type IN (
    'lead_created','lead_stage_changed','trial_booked','trial_completed',
    'member_created','member_status_changed','attendance_dropped','booking_made','booking_cancelled',
    'payment_succeeded','payment_failed','subscription_created','subscription_cancelled',
    'task_created','task_completed','scheduled_time','scheduled_interval'
  )),
  trigger_config TEXT,
  condition_type TEXT CHECK(condition_type IN ('all','any','none')),
  conditions TEXT,
  action_type TEXT NOT NULL CHECK(action_type IN (
    'create_task','send_sms','send_email','update_lead_stage','assign_lead',
    'create_follow_up','flag_member','add_note','webhook'
  )),
  action_config TEXT,
  enabled INTEGER DEFAULT 1,
  created_by INTEGER REFERENCES staff(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workflow_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id INTEGER REFERENCES workflow_rules(id),
  trigger_type TEXT NOT NULL,
  trigger_entity_type TEXT,
  trigger_entity_id INTEGER,
  conditions_met INTEGER DEFAULT 1,
  action_results TEXT,
  status TEXT DEFAULT 'completed' CHECK(status IN ('pending','completed','failed')),
  error_message TEXT,
  executed_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_workflow_exec_rule ON workflow_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_workflow_exec_trigger ON workflow_executions(trigger_type, trigger_entity_id);
