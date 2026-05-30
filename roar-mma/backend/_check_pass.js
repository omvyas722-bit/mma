const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'data', 'roarmma.db');
const db = new Database(dbPath);

const user = db.prepare('SELECT id, name, email, password_hash, role FROM staff WHERE email = ?').get('admin@roarmma.com.au');
console.log('User:', user);
if (user) {
  console.log('Hash length:', user.password_hash.length);
  console.log('Hash preview:', user.password_hash.substring(0, 20) + '...');
  try {
    const valid = bcrypt.compareSync('changeme123', user.password_hash);
    console.log('Password valid:', valid);
  } catch (e) {
    console.log('bcrypt error:', e.message);
  }
}
db.close();
