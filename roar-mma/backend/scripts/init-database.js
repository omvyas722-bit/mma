// Database initialization script
// Run this to set up the database from scratch

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '..', '..', 'data', 'roarmma.db');
const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');

const migrations = [
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
  '022_class_enhancements.sql'
];

function initDatabase(seedDefaults = false) {
  console.log('🚀 Initializing ROAR MMA Database...\n');

  // Create data directory if it doesn't exist
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('✅ Created data directory');
  }

  // Create new database (overwrite existing)
  const db = new Database(dbPath);
  console.log('✅ Opened database\n');

  // Enable WAL for performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create migration tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now')),
      checksum TEXT,
      duration_ms INTEGER,
      success INTEGER DEFAULT 1
    )
  `);

  // Get already-applied migrations
  let applied;
  try {
    applied = new Set(
      db.prepare('SELECT name FROM schema_version ORDER BY version').all().map(r => r.name)
    );
  } catch {
    applied = new Set();
  }

  console.log('Running migrations...\n');

  migrations.forEach((filename, index) => {
    const migrationPath = path.join(migrationsDir, filename);

    if (!fs.existsSync(migrationPath)) {
      console.log(`⚠️  Migration ${filename} not found, skipping`);
      return;
    }

    if (applied.has(filename)) {
      console.log(`⏭️  ${filename} already applied, skipping`);
      return;
    }

    const version = index + 1;

    try {
      const sql = fs.readFileSync(migrationPath, 'utf8');

      // Compute checksum for integrity
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      const startTime = Date.now();

      // Apply migration in a transaction
      const applyMigration = db.transaction(() => {
        db.exec(sql);
        db.prepare(`
          INSERT INTO schema_version (version, name, checksum, duration_ms, success)
          VALUES (?, ?, ?, ?, 1)
        `).run(version, filename, checksum, Date.now() - startTime);
      });

      applyMigration();
      console.log(`✅ ${index + 1}/${migrations.length} ${filename}`);
    } catch (error) {
      console.error(`❌ Error in ${filename}:`, error.message);
      try {
        db.prepare('INSERT INTO schema_version (version, name, checksum, duration_ms, success) VALUES (?, ?, ?, 0, 0)')
          .run(index + 1, filename, '', 0);
      } catch (logErr) {
        console.error(`❌ Failed to log migration failure:`, logErr.message);
      }
      db.close();
      process.exit(1);
    }
  });

  console.log('\n✅ All migrations complete\n');

  if (seedDefaults) {
    seedDefaultData(db);
  }

  return db;
}

function seedDefaultData(db) {
  const bcrypt = require('bcrypt');

  // Seed message templates
  console.log('Seeding message templates...');
  const seedTemplatesPath = path.join(__dirname, '..', 'db', 'seed_templates.sql');
  if (fs.existsSync(seedTemplatesPath)) {
    try {
      const sql = fs.readFileSync(seedTemplatesPath, 'utf8');
      db.exec(sql);
      console.log('✅ Message templates seeded');
    } catch (error) {
      console.log('⚠️  Message templates already exist or error:', error.message);
    }
  }

  // Seed win-back templates
  const seedWinbackPath = path.join(__dirname, '..', 'db', 'seed_winback_templates.sql');
  if (fs.existsSync(seedWinbackPath)) {
    try {
      const sql = fs.readFileSync(seedWinbackPath, 'utf8');
      db.exec(sql);
      console.log('✅ Win-back templates seeded');
    } catch (error) {
      console.log('⚠️  Win-back templates already exist or error:', error.message);
    }
  }

  // Create default admin user
  console.log('\nCreating default admin user...');
  const hashedPassword = bcrypt.hashSync('changeme123', 10);

  try {
    db.prepare(`
      INSERT INTO staff (name, email, password_hash, role, active)
      VALUES (?, ?, ?, ?, 1)
    `).run('Admin User', 'admin@roarmma.com.au', hashedPassword, 'owner');
    console.log('✅ Admin user created');
    console.log('   Email: admin@roarmma.com.au');
    console.log('   Password: changeme123');
    console.log('   Role: owner (full permissions)');
    console.log('   ⚠️  CHANGE PASSWORD IMMEDIATELY\n');
  } catch (error) {
    console.log('⚠️  Admin user already exists or error:', error.message);
  }

  // Create test member for API examples
  console.log('Creating test member...');
  try {
    db.prepare(`
      INSERT INTO members (first_name, last_name, email, phone, status, plan, joined_date)
      VALUES (?, ?, ?, ?, ?, ?, date('now'))
    `).run('Test', 'Member', 'test@example.com', '0400000000', 'active', 'unlimited');
    console.log('✅ Test member created (ID: 1)');
    console.log('   Name: Test Member');
    console.log('   Email: test@example.com\n');
  } catch (error) {
    console.log('⚠️  Test member already exists or error:', error.message);
  }

  // Print statistics
  console.log('\n📊 Database Statistics:\n');

  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table'
    AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  console.log(`Total tables: ${tables.length}`);

  const counts = {
    'Belt Levels': db.prepare('SELECT COUNT(*) as count FROM belt_levels').get().count,
    'Grading Requirements': db.prepare('SELECT COUNT(*) as count FROM grading_requirements').get().count,
    'Products': db.prepare('SELECT COUNT(*) as count FROM products').get().count,
    'Suppliers': db.prepare('SELECT COUNT(*) as count FROM suppliers').get().count,
    'Message Templates': db.prepare('SELECT COUNT(*) as count FROM message_templates').get().count,
    'AI Phone Settings': db.prepare('SELECT COUNT(*) as count FROM ai_phone_settings').get().count,
    'Staff': db.prepare('SELECT COUNT(*) as count FROM staff').get().count
  };

  Object.entries(counts).forEach(([name, count]) => {
    console.log(`${name}: ${count}`);
  });

  console.log('\n🎉 Database initialization complete!\n');
  console.log('Next steps:');
  console.log('1. Configure .env file with your settings');
  console.log('2. Add Twilio and Brevo credentials');
  console.log('3. Start server: node server.js');
  console.log('4. Login with admin credentials and change password\n');
}

// Run if called directly
if (require.main === module) {
  let hasData = false;
  try {
    const checkDb = new Database(dbPath, { readonly: true });
    hasData = checkDb.prepare("SELECT COUNT(*) as count FROM members").get().count > 0;
    checkDb.close();
  } catch { /* first run — no db yet */ }

  if (hasData) {
    const rl = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question('\n\u26a0\ufe0f  Database already has members. Re-initializing will re-run migrations and seed data. Continue? (y/N) ', (answer) => {
      rl.close();
      if (answer.toLowerCase() !== 'y') {
        console.log('Aborted.');
        process.exit(0);
      }
      const db2 = initDatabase(true);
      db2.close();
    });
  } else {
    const db2 = initDatabase(true);
    db2.close();
  }
} else {
  module.exports = { initDatabase, seedDefaultData };
}
