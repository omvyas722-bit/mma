-- Phase 10: Schema expansions for AI agent compatibility
-- Adds missing columns and expands table constraints

-- Add currency column to transactions
ALTER TABLE transactions ADD COLUMN currency TEXT DEFAULT 'AUD';

-- Expand staff_tasks task_type CHECK constraint
-- SQLite cannot ALTER CHECK constraints, so we recreate the table
ALTER TABLE staff_tasks RENAME TO staff_tasks_old;

CREATE TABLE IF NOT EXISTS staff_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    assigned_to INTEGER REFERENCES staff(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL CHECK(task_type IN (
        'call_hot_lead',
        'follow_up_trial',
        'check_no_show',
        'warm_lead_checkin',
        'trial_reminder',
        'conversion_push',
        'reengagement',
        'untouched_lead',
        'check_in',
        'follow_up',
        'retention_check_in',
        'win_back',
        'failed_payment',
        'payment_overdue_check'
    )),
    priority TEXT NOT NULL CHECK(priority IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled', 'archived')) DEFAULT 'pending',
    completed_at TEXT,
    completed_by INTEGER REFERENCES staff(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    CHECK(lead_id IS NOT NULL OR member_id IS NOT NULL)
);

INSERT INTO staff_tasks (
    id, lead_id, member_id, assigned_to, task_type, priority,
    title, description, due_date, status, completed_at, completed_by,
    notes, created_at, updated_at
)
SELECT
    id, lead_id, member_id, assigned_to, task_type, priority,
    title, description, due_date, status, completed_at, completed_by,
    notes, created_at, updated_at
FROM staff_tasks_old;

DROP TABLE IF EXISTS staff_tasks_old;

CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned_to ON staff_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_status ON staff_tasks(status);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_priority ON staff_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_due_date ON staff_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_lead_id ON staff_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_member_id ON staff_tasks(member_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_completed_by ON staff_tasks(completed_by);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_task_type ON staff_tasks(task_type);
