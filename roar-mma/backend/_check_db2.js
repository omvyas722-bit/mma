const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'data', 'roarmma.db');
console.log('DB Path:', dbPath);
const db = new Database(dbPath);
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables count:', tables.length);
console.log('Tables:', tables.map(t => t.name));
if (tables.find(t => t.name === 'staff')) {
  const staff = db.prepare('SELECT id, name, email, role, active FROM staff').all();
  console.log('Staff:', JSON.stringify(staff, null, 2));
} else {
  console.log('No staff table found');
}
const members = db.prepare('SELECT COUNT(*) as count FROM members').get();
console.log('Members count:', members.count);
db.close();
