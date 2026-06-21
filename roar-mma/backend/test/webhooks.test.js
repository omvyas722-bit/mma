const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_PATH = ':memory:';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.LIGHTSPEED_WEBHOOK_SECRET = 'test-webhook-secret-key';

delete require.cache[require.resolve('../db/connection')];
delete require.cache[require.resolve('../middleware/auth')];

const { getDatabase, closeDatabase } = require('../db/connection');
const { determineTransactionType, verifyWebhookSignature } = require('../routes/webhooks');

before(() => {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT,
      active INTEGER DEFAULT 1,
      api_key TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT,
      details TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    );
  `);
});

after(() => {
  closeDatabase();
});

describe('determineTransactionType', () => {
  it('returns membership for membership descriptions', () => {
    assert.equal(determineTransactionType('Monthly Membership'), 'membership');
    assert.equal(determineTransactionType('subscription payment'), 'membership');
  });

  it('returns hold_fee for hold/pause descriptions', () => {
    assert.equal(determineTransactionType('Account hold fee'), 'hold_fee');
    assert.equal(determineTransactionType('Pause fee'), 'hold_fee');
  });

  it('returns pt_pack for PT descriptions', () => {
    assert.equal(determineTransactionType('PT Session Pack'), 'pt_pack');
    assert.equal(determineTransactionType('personal training'), 'pt_pack');
  });

  it('returns product for product/gear descriptions', () => {
    assert.equal(determineTransactionType('Product: Rash Guard'), 'product');
    assert.equal(determineTransactionType('Gear purchase'), 'product');
  });

  it('returns other for unrecognised descriptions', () => {
    assert.equal(determineTransactionType('Miscellaneous charge'), 'other');
  });

  it('returns other for null or empty', () => {
    assert.equal(determineTransactionType(''), 'other');
    assert.equal(determineTransactionType(null), 'other');
    assert.equal(determineTransactionType(undefined), 'other');
  });
});

describe('verifyWebhookSignature', () => {
  it('returns false when WEBHOOK_SECRET is not set', () => {
    const orig = process.env.LIGHTSPEED_WEBHOOK_SECRET;
    delete process.env.LIGHTSPEED_WEBHOOK_SECRET;
    delete require.cache[require.resolve('../routes/webhooks')];
    const { verifyWebhookSignature: v } = require('../routes/webhooks');
    assert.equal(v('payload', 'signature'), false);
    process.env.LIGHTSPEED_WEBHOOK_SECRET = orig;
  });

  it('returns true for valid signature', () => {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', 'test-webhook-secret-key');
    const digest = hmac.update('{"test":"data"}').digest('hex');
    assert.equal(verifyWebhookSignature('{"test":"data"}', digest), true);
  });

  it('returns false for invalid signature', () => {
    assert.equal(verifyWebhookSignature('{"test":"data"}', 'invalid-signature'), false);
  });

  it('returns false for mismatched signature length', () => {
    assert.equal(verifyWebhookSignature('payload', 'short'), false);
  });
});
