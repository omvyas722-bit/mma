-- ROAR MMA Database Schema
-- SQLite with WAL mode for better concurrency

-- Staff table (authentication and RBAC)
CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('owner', 'gm', 'front_desk', 'coach', 'sales', 'social')),
    phone TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Members table
CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    date_of_birth TEXT,
    location TEXT NOT NULL CHECK(location IN ('rockingham', 'bibra_lake')),
    status TEXT NOT NULL CHECK(status IN ('trial', 'active', 'paused', 'cancelled')) DEFAULT 'trial',
    plan TEXT CHECK(plan IN ('unlimited', '2x_week', '3x_week', 'fighter', 'pt_only')),
    joined_date TEXT NOT NULL,
    trial_end_date TEXT,
    pause_start TEXT,
    pause_end TEXT,
    cancellation_date TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    medical_conditions TEXT,
    injuries TEXT,
    goals TEXT,
    experience_level TEXT CHECK(experience_level IN ('beginner', 'intermediate', 'advanced')),
    lightspeed_customer_id TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Classes table (recurring class definitions)
CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL CHECK(location IN ('rockingham', 'bibra_lake')),
    day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
    start_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    capacity INTEGER NOT NULL DEFAULT 20,
    class_type TEXT NOT NULL CHECK(class_type IN ('bjj', 'muay_thai', 'mma', 'kids', 'pt')),
    coach_id INTEGER,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (coach_id) REFERENCES staff(id)
);

-- Class instances table (specific occurrences)
CREATE TABLE IF NOT EXISTS class_instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    coach_id INTEGER,
    capacity INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('scheduled', 'cancelled', 'completed')) DEFAULT 'scheduled',
    cancellation_reason TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (coach_id) REFERENCES staff(id),
    UNIQUE(class_id, date)
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    class_instance_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('booked', 'attended', 'no_show', 'cancelled')) DEFAULT 'booked',
    booked_at TEXT DEFAULT (datetime('now')),
    attended_at TEXT,
    cancelled_at TEXT,
    waitlist INTEGER DEFAULT 0,
    waitlist_position INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (class_instance_id) REFERENCES class_instances(id),
    UNIQUE(member_id, class_instance_id)
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    source TEXT CHECK(source IN ('website', 'facebook', 'instagram', 'referral', 'walk_in', 'other')),
    referrer_member_id INTEGER,
    stage TEXT NOT NULL CHECK(stage IN ('new', 'contacted', 'trial_booked', 'trial_completed', 'converted', 'lost')) DEFAULT 'new',
    location TEXT CHECK(location IN ('rockingham', 'bibra_lake')),
    interests TEXT,
    notes TEXT,
    assigned_to INTEGER,
    converted_member_id INTEGER,
    lost_reason TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (referrer_member_id) REFERENCES members(id),
    FOREIGN KEY (assigned_to) REFERENCES staff(id),
    FOREIGN KEY (converted_member_id) REFERENCES members(id)
);

-- Lead interactions table
CREATE TABLE IF NOT EXISTS lead_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    staff_id INTEGER NOT NULL,
    interaction_type TEXT NOT NULL CHECK(interaction_type IN ('call', 'email', 'sms', 'in_person', 'note')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (lead_id) REFERENCES leads(id),
    FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'AUD',
    type TEXT NOT NULL CHECK(type IN ('membership', 'hold_fee', 'pt_pack', 'product', 'other')),
    status TEXT NOT NULL CHECK(status IN ('pending', 'succeeded', 'failed', 'refunded')) DEFAULT 'pending',
    payment_method TEXT CHECK(payment_method IN ('card', 'cash', 'bank_transfer')),
    lightspeed_transaction_id TEXT UNIQUE,
    description TEXT,
    failure_reason TEXT,
    processed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Belt records table
CREATE TABLE IF NOT EXISTS belt_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    discipline TEXT NOT NULL CHECK(discipline IN ('bjj', 'muay_thai')),
    belt_rank TEXT NOT NULL,
    awarded_date TEXT NOT NULL,
    awarded_by INTEGER,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (awarded_by) REFERENCES staff(id)
);

-- Event queue table (for AI agents)
CREATE TABLE IF NOT EXISTS event_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    payload TEXT,
    status TEXT NOT NULL CHECK(status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    assigned_agent TEXT,
    requires_approval INTEGER DEFAULT 0,
    approved_by INTEGER,
    approved_at TEXT,
    processed_at TEXT,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (approved_by) REFERENCES staff(id)
);

-- Waivers table
CREATE TABLE IF NOT EXISTS waivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    waiver_type TEXT NOT NULL CHECK(waiver_type IN ('liability', 'medical', 'photo_release')),
    version TEXT NOT NULL,
    signed_at TEXT NOT NULL,
    signature_data TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Products table (for POS)
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category TEXT CHECK(category IN ('apparel', 'equipment', 'supplements', 'other')),
    sku TEXT UNIQUE,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Social media posts table
CREATE TABLE IF NOT EXISTS social_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL CHECK(platform IN ('facebook', 'instagram', 'both')),
    content TEXT NOT NULL,
    media_urls TEXT,
    scheduled_for TEXT,
    status TEXT NOT NULL CHECK(status IN ('draft', 'pending_approval', 'approved', 'published', 'failed')) DEFAULT 'draft',
    created_by INTEGER,
    approved_by INTEGER,
    published_at TEXT,
    engagement_likes INTEGER DEFAULT 0,
    engagement_comments INTEGER DEFAULT 0,
    engagement_shares INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES staff(id),
    FOREIGN KEY (approved_by) REFERENCES staff(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_location ON members(location);
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
CREATE INDEX IF NOT EXISTS idx_bookings_member ON bookings(member_id);
CREATE INDEX IF NOT EXISTS idx_bookings_class_instance ON bookings(class_instance_id);
CREATE INDEX IF NOT EXISTS idx_class_instances_date ON class_instances(date);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_transactions_member ON transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_event_queue_status ON event_queue(status);
