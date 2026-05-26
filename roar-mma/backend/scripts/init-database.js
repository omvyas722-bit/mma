// Database initialization script
// Run this to set up the database from scratch

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'data', 'roarmma.db');
const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');

console.log('🚀 Initializing ROAR MMA Database...\n');

// Create data directory if it doesn't exist
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✅ Created data directory');
}

// Remove existing database if present
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('✅ Removed existing database');
}

// Create new database
const db = new Database(dbPath);
console.log('✅ Created new database\n');

// Run migrations in order
const migrations = [
  '000_base_schema.sql',
  '001_add_trial_tracking.sql',
  '002_add_staff_tasks.sql',
  '003_add_pt_system.sql',
  '004_add_retention_system.sql',
  '005_add_ai_phone_system.sql',
  '006_add_messaging_integration.sql',
  '007_add_stock_system.sql',
  '008_add_belt_grading_system.sql'
];

console.log('Running migrations...\n');

migrations.forEach((filename, index) => {
  const migrationPath = path.join(migrationsDir, filename);

  if (!fs.existsSync(migrationPath)) {
    console.log(`⚠️  Migration ${filename} not found, skipping`);
    return;
  }

  try {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    db.exec(sql);
    console.log(`✅ ${index + 1}/${migrations.length} ${filename}`);
  } catch (error) {
    console.error(`❌ Error in ${filename}:`, error.message);
    process.exit(1);
  }
});

console.log('\n✅ All migrations complete\n');

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
const bcrypt = require('bcrypt');
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

db.close();

console.log('\n🎉 Database initialization complete!\n');
console.log('Next steps:');
console.log('1. Configure .env file with your settings');
console.log('2. Add Twilio and Brevo credentials');
console.log('3. Start server: node server.js');
console.log('4. Login with admin credentials and change password\n');
