-- PT (Personal Training) system tables

-- PT packages table
CREATE TABLE IF NOT EXISTS pt_packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sessions_count INTEGER NOT NULL,
    price REAL NOT NULL,
    currency TEXT DEFAULT 'AUD',
    validity_days INTEGER, -- How many days package is valid for
    description TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Member PT packages (purchased packages)
CREATE TABLE IF NOT EXISTS member_pt_packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id),
    package_id INTEGER NOT NULL REFERENCES pt_packages(id),
    sessions_total INTEGER NOT NULL,
    sessions_used INTEGER DEFAULT 0,
    sessions_remaining INTEGER NOT NULL,
    purchase_date TEXT NOT NULL,
    expiry_date TEXT,
    amount_paid REAL NOT NULL,
    status TEXT CHECK(status IN ('active', 'expired', 'exhausted', 'cancelled')) DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- PT sessions table
CREATE TABLE IF NOT EXISTS pt_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id),
    coach_id INTEGER NOT NULL REFERENCES staff(id),
    member_package_id INTEGER REFERENCES member_pt_packages(id),
    scheduled_date TEXT NOT NULL,
    scheduled_time TEXT NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status TEXT NOT NULL CHECK(status IN ('scheduled', 'completed', 'cancelled', 'no_show')) DEFAULT 'scheduled',
    session_type TEXT CHECK(session_type IN ('pt', 'assessment', 'trial')),
    amount REAL,
    commission_rate REAL, -- Percentage (e.g., 50 for 50%)
    commission_amount REAL,
    commission_paid INTEGER DEFAULT 0,
    notes TEXT,
    cancelled_reason TEXT,
    cancelled_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- PT session notes (progress tracking)
CREATE TABLE IF NOT EXISTS pt_session_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES pt_sessions(id),
    member_id INTEGER NOT NULL REFERENCES members(id),
    coach_id INTEGER NOT NULL REFERENCES staff(id),
    session_date TEXT NOT NULL,
    goals TEXT,
    exercises TEXT,
    sets_reps TEXT,
    weight_used TEXT,
    performance_notes TEXT,
    next_session_focus TEXT,
    measurements TEXT, -- JSON: weight, body_fat, etc.
    achievements TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Coach commission tracking
CREATE TABLE IF NOT EXISTS coach_commissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    coach_id INTEGER NOT NULL REFERENCES staff(id),
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    sessions_count INTEGER NOT NULL,
    total_revenue REAL NOT NULL,
    total_commission REAL NOT NULL,
    status TEXT CHECK(status IN ('pending', 'approved', 'paid')) DEFAULT 'pending',
    paid_date TEXT,
    paid_amount REAL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pt_sessions_member ON pt_sessions(member_id);
CREATE INDEX IF NOT EXISTS idx_pt_sessions_coach ON pt_sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_pt_sessions_date ON pt_sessions(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_pt_sessions_status ON pt_sessions(status);
CREATE INDEX IF NOT EXISTS idx_member_pt_packages_member ON member_pt_packages(member_id);
CREATE INDEX IF NOT EXISTS idx_member_pt_packages_status ON member_pt_packages(status);
CREATE INDEX IF NOT EXISTS idx_pt_session_notes_member ON pt_session_notes(member_id);
CREATE INDEX IF NOT EXISTS idx_pt_session_notes_coach ON pt_session_notes(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_commissions_coach ON coach_commissions(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_commissions_status ON coach_commissions(status);

-- Seed default PT packages
INSERT INTO pt_packages (name, sessions_count, price, validity_days, description) VALUES
('Single Session', 1, 80, 30, 'One personal training session'),
('5 Session Pack', 5, 375, 60, 'Five personal training sessions - Save $25'),
('10 Session Pack', 10, 700, 90, 'Ten personal training sessions - Save $100'),
('20 Session Pack', 20, 1300, 120, 'Twenty personal training sessions - Save $300');
