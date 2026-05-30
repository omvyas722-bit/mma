const Database = require('better-sqlite3');
const path = require('path');

// Check both possible db paths
const paths = [
  path.join(__dirname, 'data', 'roarmma.db'),
  path.join(__dirname, 'db', 'roar_mma.db')
];

paths.forEach((dbPath) => {
  try {
    const fs = require('fs');
    console.log(`\nDB Path: ${dbPath}`);
    console.log(`Exists: ${fs.existsSync(dbPath)}`);
    if (fs.existsSync(dbPath)) {
      const db = new Database(dbPath);
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      console.log('Tables:', tables.map(t => t.name));
      const staff = db.prepare('SELECT id, name, email, role FROM staff').all();
      console.log('Staff:', JSON.stringify(staff, null, 2));
      db.close();
    }
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }
});
