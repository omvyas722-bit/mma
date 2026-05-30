// Database connection module
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'roarmma.db');

// NOTE: datetime('now') convention - SQLite's datetime('now') returns UTC
// in 'YYYY-MM-DD HH:MM:SS' format. When comparing with JS Date values,
// convert JS dates to ISO strings consistently (e.g., date.toISOString()).

let db = null;

function getDatabase() {
  if (!db) {
    try {
      db = new Database(DB_PATH);

      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
      db.pragma('busy_timeout = 5000');
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
