const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', '..', 'data', 'roarmma.db');
const sqlPath = path.join(__dirname, '..', 'db', 'migrations', '012_add_student_coaching.sql');

const db = new Database(dbPath);
const sql = fs.readFileSync(sqlPath, 'utf8');

db.exec(sql);

try {
  db.prepare(`INSERT INTO schema_version (version, name, checksum, duration_ms, success) VALUES (?, ?, ?, ?, 1)`)
    .run(12, '012_add_student_coaching.sql', '', 0);
} catch (e) {
  console.log('Version tracking already exists, skipping:', e.message);
}

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'student_%'").all();
console.log('Migration 012 applied successfully');
console.log('Tables:', tables.map(t => t.name).join(', '));

db.close();
