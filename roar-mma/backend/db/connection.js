// Database connection module
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'roarmma.db');

// NOTE: datetime('now') convention - SQLite's datetime('now') returns UTC
// in 'YYYY-MM-DD HH:MM:SS' format. When comparing with JS Date values,
// convert JS dates to ISO strings consistently (e.g., date.toISOString()).

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const MIGRATIONS = [
  '000_base_schema.sql',
  '001_add_trial_tracking.sql',
  '002_add_staff_tasks.sql',
  '003_add_pt_system.sql',
  '004_add_retention_system.sql',
  '005_add_ai_phone_system.sql',
  '006_add_messaging_integration.sql',
  '007_add_stock_system.sql',
  '008_add_belt_grading_system.sql',
  '009_add_ai_system.sql',
  '010_expand_schema.sql',
  '011_add_transaction_columns.sql',
  '012_add_student_coaching.sql',
  '013_add_waivers_and_documents.sql',
  '014_member_profile_enhancements.sql',
  '015_social_media.sql',
  '016_kiosk_enhancements.sql',
  '017_remaining_features.sql',
  '018_family_discounts.sql',
  '019_staff_schedule.sql',
  '020_privacy_compliance.sql',
  '021_ai_enhancements.sql',
  '022_class_enhancements.sql',
  '023_social_campaigns.sql',
  '024_security_features.sql',
  '025_billing_enhancements.sql',
  '026_ai_enhancements.sql',
  '027_member_portal.sql',
  '028_workflow_builder.sql'
];

function ensureMigrated(db) {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY, name TEXT NOT NULL,
    applied_at TEXT DEFAULT (datetime('now')), checksum TEXT,
    duration_ms INTEGER, success INTEGER DEFAULT 1
  )`);

  let applied;
  try {
    applied = new Set(
      db.prepare('SELECT name FROM schema_version ORDER BY version').all().map(r => r.name)
    );
  } catch {
    applied = new Set();
  }

  // Patch: class_instances was never created by any migration
  if (!applied.has('patch_class_instances')) {
    try {
      db.exec(`CREATE TABLE IF NOT EXISTS class_instances (
        id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER NOT NULL,
        date DATE NOT NULL, start_time TIME NOT NULL, end_time TIME,
        capacity INTEGER DEFAULT 20, status TEXT DEFAULT 'scheduled',
        class_notes TEXT, created_at DATETIME DEFAULT (datetime('now')),
        updated_at DATETIME DEFAULT (datetime('now'))
      )`);
      const ciCols = db.prepare("PRAGMA table_info('class_instances')").all().map(c => c.name);
      db.prepare('INSERT OR IGNORE INTO schema_version (version, name, checksum, duration_ms, success) VALUES (?, ?, ?, ?, 1)')
        .run(-30, 'patch_class_instances', '', 0);
      console.log('[DB] Patch class_instances applied');
    } catch (e) {
      console.log('[DB] Patch class_instances error:', e.message);
    }
  }

  // Patch: class_instances missing coach_id column
  if (!applied.has('patch_class_instances_coach_id')) {
    try {
      const ciCols = db.prepare("PRAGMA table_info('class_instances')").all().map(c => c.name);
      if (!ciCols.includes('coach_id')) {
        db.exec("ALTER TABLE class_instances ADD COLUMN coach_id INTEGER REFERENCES staff(id)");
        console.log('[DB] Patch class_instances.coach_id added');
      }
      db.prepare('INSERT OR IGNORE INTO schema_version (version, name, checksum, duration_ms, success) VALUES (?, ?, ?, ?, 1)')
        .run(-29, 'patch_class_instances_coach_id', '', 0);
    } catch (e) {
      console.log('[DB] Patch class_instances.coach_id error:', e.message);
    }
  }

  // Patch: bookings table missing columns that the code expects
  if (!applied.has('patch_bookings_columns')) {
    try {
      const cols = db.prepare("PRAGMA table_info('bookings')").all().map(c => c.name);
      const missing = [];
      if (!cols.includes('class_instance_id')) { db.exec("ALTER TABLE bookings ADD COLUMN class_instance_id INTEGER REFERENCES class_instances(id)"); missing.push('class_instance_id'); }
      if (!cols.includes('waitlist')) { db.exec("ALTER TABLE bookings ADD COLUMN waitlist INTEGER DEFAULT 0"); missing.push('waitlist'); }
      if (!cols.includes('waitlist_position')) { db.exec("ALTER TABLE bookings ADD COLUMN waitlist_position INTEGER"); missing.push('waitlist_position'); }
      if (!cols.includes('booked_at')) { db.exec("ALTER TABLE bookings ADD COLUMN booked_at DATETIME"); missing.push('booked_at'); }
      if (!cols.includes('attended_at')) { db.exec("ALTER TABLE bookings ADD COLUMN attended_at DATETIME"); missing.push('attended_at'); }
      if (!cols.includes('cancelled_at')) { db.exec("ALTER TABLE bookings ADD COLUMN cancelled_at DATETIME"); missing.push('cancelled_at'); }
      db.prepare('INSERT OR IGNORE INTO schema_version (version, name, checksum, duration_ms, success) VALUES (?, ?, ?, ?, 1)')
        .run(-28, 'patch_bookings_columns', '', 0);
      if (missing.length) console.log('[DB] Patch bookings columns added:', missing.join(', '));
    } catch (e) {
      console.log('[DB] Patch bookings columns error:', e.message);
    }
  }

  MIGRATIONS.forEach((filename, index) => {
    const migrationPath = path.join(MIGRATIONS_DIR, filename);
    if (!fs.existsSync(migrationPath)) return;
    if (applied.has(filename)) return;

    const version = index + 1;
    try {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      const startTime = Date.now();
      db.transaction(() => {
        db.exec(sql);
        db.prepare('INSERT INTO schema_version (version, name, checksum, duration_ms, success) VALUES (?, ?, ?, ?, 1)')
          .run(version, filename, checksum, Date.now() - startTime);
      })();
      console.log(`[DB] Migration ${index + 1}/${MIGRATIONS.length} ${filename}`);
    } catch (error) {
      // Idempotent ALTER TABLE: ignore duplicate column / table errors
      if (error.message?.includes('duplicate column name') || error.message?.includes('already exists')) {
        console.log(`[DB] Migration ${filename} skipped (already applied): ${error.message}`);
      } else {
        console.error(`[DB] Migration ${filename} failed:`, error.message);
        return;
      }
    }
  });

  // Seed default admin user if staff table is empty
  const staffCount = db.prepare('SELECT COUNT(*) as c FROM staff').get().c;
  if (staffCount === 0) {
    try {
      const bcrypt = require('bcrypt');
      const hash = bcrypt.hashSync('changeme123', 10);
      db.prepare(`INSERT INTO staff (name, email, password_hash, role, active) VALUES (?, ?, ?, ?, 1)`)
        .run('Admin User', 'admin@roarmma.com.au', hash, 'owner');
      console.log('[DB] Default admin user seeded');
    } catch (e) {
      console.log('[DB] Seed admin error:', e.message);
    }
  }
}

let db = null;

function getDatabase() {
  if (!db) {
    try {
      db = new Database(DB_PATH);
      ensureMigrated(db);
    } catch (err) {
      console.error('Failed to open database:', err);
      throw err;
    }
  }

  return db;
}

function healthCheck() {
  try {
    const d = getDatabase();
    d.prepare('SELECT 1 AS ok').get();
    return { ok: true, path: DB_PATH };
  } catch (err) {
    return { ok: false, path: DB_PATH, error: err.message };
  }
}

function isUniqueConstraintError(error) {
  return error?.message?.includes('UNIQUE constraint') === true;
}

function closeDatabase() {
  if (db) {
    try {
      db.close();
    } catch (err) {
      console.error('Failed to close database:', err);
    }
    db = null;
  }
}

module.exports = {
  getDatabase,
  closeDatabase,
  healthCheck,
  isUniqueConstraintError
};
