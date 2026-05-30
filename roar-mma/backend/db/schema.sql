-- ROAR MMA Database Schema
-- IMPORTANT: This file is AUTO-GENERATED from the canonical migration files.
-- DO NOT EDIT DIRECTLY. The canonical sources are the individual .sql files in:
--   db/migrations/
-- Full schema is built by running all migrations in order via init-database.js.
-- To regenerate this file, run all migrations against a fresh database and
-- extract the full schema, or update this file from the base migration:
--   db/migrations/000_base_schema.sql

-- Base Schema Migration
-- Creates core tables that other migrations depend on

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner', 'gm', 'front_desk', 'coach', 'sales', 'social', 'staff')),
  phone TEXT,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

-- Members table
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  date_of_birth DATE,
  location TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'cancelled', 'paused')),
  plan TEXT,
  joined_date DATE DEFAULT (date('now')),
  trial_end_date DATE,
  pause_start DATE,
  pause_end DATE,
  cancellation_date DATE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  medical_conditions TEXT,
  injuries TEXT,
  goals TEXT,
  experience_level TEXT,
  lightspeed_customer_id TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  source TEXT,
  referrer_member_id INTEGER,
  stage TEXT DEFAULT 'new' CHECK(stage IN ('new', 'contacted', 'trial_booked', 'trial_completed', 'converted', 'lost')),
  interest_level TEXT CHECK(interest_level IN ('high', 'medium', 'low')),
  location TEXT,
  interests TEXT,
  assigned_to INTEGER,
  converted_member_id INTEGER,
  lost_reason TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (assigned_to) REFERENCES staff(id),
  FOREIGN KEY (referrer_member_id) REFERENCES members(id),
  FOREIGN KEY (converted_member_id) REFERENCES members(id)
);

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  class_type TEXT NOT NULL,
  instructor_id INTEGER,
  day_of_week INTEGER CHECK(day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_capacity INTEGER DEFAULT 20,
  location TEXT,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (instructor_id) REFERENCES staff(id)
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  class_id INTEGER NOT NULL,
  booking_date DATE NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'cancelled', 'attended', 'no_show')),
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (class_id) REFERENCES classes(id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('membership', 'pt', 'product', 'other')),
  amount REAL NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  class_id INTEGER,
  check_in_time DATETIME DEFAULT (datetime('now')),
  check_out_time DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (class_id) REFERENCES classes(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_bookings_member ON bookings(member_id);
CREATE INDEX IF NOT EXISTS idx_bookings_class ON bookings(class_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_transactions_member ON transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
