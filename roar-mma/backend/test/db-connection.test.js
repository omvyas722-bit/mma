const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_PATH = ':memory:';

const { getDatabase, healthCheck, isUniqueConstraintError, closeDatabase } = require('../db/connection');

before(() => {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      value INTEGER
    )
  `);
});

after(() => {
  closeDatabase();
});

describe('Database Connection', () => {
  it('getDatabase returns a database instance', () => {
    const db = getDatabase();
    assert.ok(db);
    assert.equal(typeof db.prepare, 'function');
  });

  it('getDatabase returns the same singleton', () => {
    const db1 = getDatabase();
    const db2 = getDatabase();
    assert.equal(db1, db2);
  });
});

describe('Database Operations', () => {
  it('can insert and select rows', () => {
    const db = getDatabase();
    db.prepare('INSERT INTO test_items (name, value) VALUES (?, ?)').run('item1', 100);
    const row = db.prepare('SELECT * FROM test_items WHERE name = ?').get('item1');
    assert.equal(row.name, 'item1');
    assert.equal(row.value, 100);
  });

  it('enforces unique constraints', () => {
    const db = getDatabase();
    assert.throws(() => {
      db.prepare('INSERT INTO test_items (name, value) VALUES (?, ?)').run('item1', 200);
    }, /UNIQUE constraint/);
  });

  it('can update rows', () => {
    const db = getDatabase();
    const result = db.prepare('UPDATE test_items SET value = ? WHERE name = ?').run(150, 'item1');
    assert.equal(result.changes, 1);
    const row = db.prepare('SELECT value FROM test_items WHERE name = ?').get('item1');
    assert.equal(row.value, 150);
  });

  it('can delete rows', () => {
    const db = getDatabase();
    db.prepare('DELETE FROM test_items WHERE name = ?').run('item1');
    const row = db.prepare('SELECT * FROM test_items WHERE name = ?').get('item1');
    assert.equal(row, undefined);
  });

  it('can insert and select multiple rows', () => {
    const db = getDatabase();
    const insert = db.prepare('INSERT INTO test_items (name, value) VALUES (?, ?)');
    insert.run('a', 1);
    insert.run('b', 2);
    insert.run('c', 3);
    const rows = db.prepare('SELECT * FROM test_items ORDER BY name').all();
    assert.equal(rows.length, 3);
    assert.equal(rows[0].name, 'a');
    assert.equal(rows[2].value, 3);
  });

  it('supports transactions', () => {
    const db = getDatabase();
    const tx = db.transaction(() => {
      db.prepare('INSERT INTO test_items (name, value) VALUES (?, ?)').run('tx1', 10);
      db.prepare('INSERT INTO test_items (name, value) VALUES (?, ?)').run('tx2', 20);
    });
    tx();
    const row1 = db.prepare('SELECT * FROM test_items WHERE name = ?').get('tx1');
    const row2 = db.prepare('SELECT * FROM test_items WHERE name = ?').get('tx2');
    assert.ok(row1);
    assert.ok(row2);
  });
});

describe('healthCheck', () => {
  it('returns ok when database is accessible', () => {
    const result = healthCheck();
    assert.equal(result.ok, true);
    assert.equal(result.path, ':memory:');
  });

  it('returns not ok for bad database path', () => {
    const origPath = process.env.DATABASE_PATH;
    process.env.DATABASE_PATH = '\\\\invalid\\\\path\\\\db.sqlite';
    delete require.cache[require.resolve('../db/connection')];
    const badConn = require('../db/connection');
    const result = badConn.healthCheck();
    assert.equal(result.ok, false);
    assert.ok(result.error);
    badConn.closeDatabase();
    process.env.DATABASE_PATH = origPath;
    delete require.cache[require.resolve('../db/connection')];
  });
});

describe('getDatabase error handling', () => {
  it('logs error and throws for bad path', () => {
    const origPath = process.env.DATABASE_PATH;
    process.env.DATABASE_PATH = '\\\\invalid\\\\path\\\\db.sqlite';
    delete require.cache[require.resolve('../db/connection')];
    const badConn = require('../db/connection');
    const errors = [];
    const origConsole = console.error;
    console.error = (...args) => errors.push(args.join(' '));
    assert.throws(() => badConn.getDatabase());
    assert.ok(errors.some(e => e.includes('Failed to open database')));
    console.error = origConsole;
    process.env.DATABASE_PATH = origPath;
    delete require.cache[require.resolve('../db/connection')];
  });
});

describe('closeDatabase error handling', () => {
  it('logs error when close fails', () => {
    const db = getDatabase();
    db.close = () => { throw new Error('Simulated close failure'); };
    const errors = [];
    const origConsole = console.error;
    console.error = (...args) => errors.push(args.join(' '));
    closeDatabase();
    assert.ok(errors.some(e => e.includes('Failed to close database')));
    console.error = origConsole;
  });
});

describe('isUniqueConstraintError', () => {
  it('detects unique constraint error message', () => {
    const error = new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: test_items.name');
    assert.equal(isUniqueConstraintError(error), true);
  });

  it('returns false for non-constraint errors', () => {
    const error = new Error('Some other error');
    assert.equal(isUniqueConstraintError(error), false);
  });

  it('handles null/undefined gracefully', () => {
    assert.equal(isUniqueConstraintError(null), false);
    assert.equal(isUniqueConstraintError(undefined), false);
  });

  it('returns false when error has no message property', () => {
    const error = { code: 'SQLITE_ERROR' };
    assert.equal(isUniqueConstraintError(error), false);
  });
});
