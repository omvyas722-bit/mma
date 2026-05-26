// Database initialization script
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'roarmma.db');
const SCHEMA_PATH = path.join(__dirname, '..', 'db', 'schema.sql');

function initDatabase() {
  console.log('Initializing database...');

  // Create data directory if it doesn't exist
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Create database connection
  const db = new Database(DB_PATH);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Read and execute schema
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);

  console.log('Database schema created successfully');

  // Create default owner account
  const existingOwner = db.prepare('SELECT id FROM staff WHERE role = ?').get('owner');

  if (!existingOwner) {
    console.log('Creating default owner account...');
    const passwordHash = bcrypt.hashSync('admin123', 10);

    db.prepare(`
      INSERT INTO staff (name, email, password_hash, role, phone)
      VALUES (?, ?, ?, ?, ?)
    `).run('System Owner', 'owner@roarmma.com.au', passwordHash, 'owner', '0400000000');

    console.log('Default owner account created');
    console.log('Email: owner@roarmma.com.au');
    console.log('Password: admin123');
    console.log('IMPORTANT: Change this password after first login!');
  }

  db.close();
  console.log('Database initialization complete');
}

// Run if called directly
if (require.main === module) {
  try {
    initDatabase();
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

module.exports = { initDatabase };
