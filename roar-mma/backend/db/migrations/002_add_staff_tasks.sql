-- Staff tasks table for automated task generation
CREATE TABLE IF NOT EXISTS staff_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER REFERENCES leads(id),
    member_id INTEGER REFERENCES members(id),
    assigned_to INTEGER REFERENCES staff(id),
    task_type TEXT NOT NULL CHECK(task_type IN (
        'call_hot_lead',
        'follow_up_trial',
        'check_no_show',
        'warm_lead_checkin',
        'trial_reminder',
        'conversion_push',
        'reengagement'
    )),
    priority TEXT NOT NULL CHECK(priority IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
    completed_at TEXT,
    completed_by INTEGER REFERENCES staff(id),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned_to ON staff_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_status ON staff_tasks(status);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_priority ON staff_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_due_date ON staff_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_lead_id ON staff_tasks(lead_id);
