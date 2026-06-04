const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_PATH = ':memory:';

delete require.cache[require.resolve('../db/connection')];

const { getDatabase, closeDatabase } = require('../db/connection');
const transactions = require('../data/transactions');

before(() => {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'AUD',
      type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      payment_method TEXT,
      lightspeed_transaction_id TEXT,
      description TEXT,
      processed_at DATETIME,
      failure_reason TEXT,
      stripe_payment_intent_id TEXT,
      stripe_payment_method TEXT,
      write_off_reason TEXT,
      write_off_at DATETIME,
      write_off_by INTEGER,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      plan_name TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'AUD',
      status TEXT DEFAULT 'active',
      stripe_subscription_id TEXT,
      stripe_price_id TEXT,
      current_period_start DATE,
      current_period_end DATE,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );
    INSERT INTO members (id, first_name, last_name, email) VALUES (1, 'John', 'Doe', 'john@test.com');
    INSERT INTO members (id, first_name, last_name, email) VALUES (2, 'Jane', 'Smith', 'jane@test.com');
  `);
});

after(() => {
  closeDatabase();
});

describe('Transactions Data Layer', () => {
  it('createTransaction inserts and returns a transaction', () => {
    const txn = transactions.createTransaction({
      member_id: 1, amount: 99.99, type: 'membership', status: 'completed', payment_method: 'card'
    });
    assert.ok(txn.id);
    assert.equal(txn.member_id, 1);
    assert.equal(txn.amount, 99.99);
    assert.equal(txn.type, 'membership');
    assert.equal(txn.status, 'completed');
    assert.equal(txn.member_name, 'John Doe');
    assert.equal(txn.member_email, 'john@test.com');
  });

  it('createTransaction with all optional fields', () => {
    const txn = transactions.createTransaction({
      member_id: 2, amount: 199.50, type: 'pt', currency: 'AUD',
      status: 'pending', payment_method: 'bank_transfer',
      lightspeed_transaction_id: 'LS-001', description: 'PT session',
      processed_at: '2026-05-01T10:00:00'
    });
    assert.ok(txn.id);
    assert.equal(txn.currency, 'AUD');
    assert.equal(txn.lightspeed_transaction_id, 'LS-001');
    assert.equal(txn.description, 'PT session');
  });

  it('getTransactionById returns the correct transaction', () => {
    const txn = transactions.getTransactionById(1);
    assert.ok(txn);
    assert.equal(txn.amount, 99.99);
    assert.equal(txn.member_name, 'John Doe');
    assert.equal(txn.member_phone, null);
  });

  it('getTransactionById returns undefined for missing', () => {
    const txn = transactions.getTransactionById(999);
    assert.equal(txn, undefined);
  });

  it('getAllTransactions returns all with pagination', () => {
    const result = transactions.getAllTransactions({});
    assert.equal(result.transactions.length, 2);
    assert.equal(result.total, 2);
    assert.equal(result.limit, 50);
    assert.equal(result.offset, 0);
  });

  it('getAllTransactions filters by member_id', () => {
    const result = transactions.getAllTransactions({ member_id: 1 });
    assert.equal(result.transactions.length, 1);
    assert.equal(result.total, 1);
  });

  it('getAllTransactions filters by status', () => {
    const result = transactions.getAllTransactions({ status: 'completed' });
    assert.equal(result.transactions.length, 1);
  });

  it('getAllTransactions filters by type', () => {
    const result = transactions.getAllTransactions({ type: 'pt' });
    assert.equal(result.transactions.length, 1);
  });

  it('getAllTransactions filters by date range', () => {
    const result = transactions.getAllTransactions({ date_from: '2026-01-01', date_to: '2026-12-31' });
    assert.equal(result.transactions.length, 2);
  });

  it('getAllTransactions respects limit and offset', () => {
    const result = transactions.getAllTransactions({ limit: 1, offset: 0 });
    assert.equal(result.transactions.length, 1);
  });

  it('updateTransaction modifies fields', () => {
    const updated = transactions.updateTransaction(1, { status: 'refunded', failure_reason: 'Customer request' });
    assert.equal(updated.status, 'refunded');
    assert.equal(updated.failure_reason, 'Customer request');
  });

  it('updateTransaction throws on no valid fields', () => {
    assert.throws(() => {
      transactions.updateTransaction(1, {});
    }, /No valid fields to update/);
  });

  it('getRevenueStats returns revenue data', () => {
    const stats = transactions.getRevenueStats();
    assert.equal(typeof stats.today, 'number');
    assert.equal(typeof stats.this_month, 'number');
    assert.ok(stats.failed_this_month);
    assert.equal(typeof stats.failed_this_month.count, 'number');
    assert.equal(typeof stats.mrr, 'number');
    assert.ok(Array.isArray(stats.by_type));
  });

  it('getFailedPayments returns failed transactions', () => {
    const db = getDatabase();
    db.prepare(`INSERT INTO transactions (member_id, amount, type, status) VALUES (1, 50, 'product', 'failed')`).run();
    const failed = transactions.getFailedPayments();
    assert.equal(failed.length, 1);
    assert.equal(failed[0].status, 'failed');
    assert.equal(failed[0].member_name, 'John Doe');
  });

  it('getAllTransactions with positive offset', () => {
    const result = transactions.getAllTransactions({ offset: 5 });
    assert.equal(result.offset, 5);
    assert.equal(typeof result.total, 'number');
    assert.ok(Array.isArray(result.transactions));
  });
});
