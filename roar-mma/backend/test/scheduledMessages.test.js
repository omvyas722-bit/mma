const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_PATH = ':memory:';

delete require.cache[require.resolve('../db/connection')];

const { getDatabase, closeDatabase } = require('../db/connection');
const sm = require('../data/scheduledMessages');

before(() => {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT, last_name TEXT,
      email TEXT, phone TEXT, stage TEXT
    );
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT, last_name TEXT,
      email TEXT, phone TEXT
    );
    CREATE TABLE IF NOT EXISTS message_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL,
      trigger_event TEXT NOT NULL, body TEXT NOT NULL, active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS scheduled_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, lead_id INTEGER, member_id INTEGER,
      message_type TEXT NOT NULL, template_id INTEGER, scheduled_for TEXT NOT NULL,
      sent_at TEXT, status TEXT DEFAULT 'pending', recipient_phone TEXT, recipient_email TEXT,
      subject TEXT, body TEXT NOT NULL, response_received INTEGER DEFAULT 0,
      response_text TEXT, error_message TEXT,
      created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id),
      FOREIGN KEY (member_id) REFERENCES members(id),
      FOREIGN KEY (template_id) REFERENCES message_templates(id)
    )
  `);
  db.exec(`
    INSERT INTO leads (id, first_name, last_name, email, phone, stage) VALUES
      (1, 'John', 'Doe', 'john@test.com', '555-0100', 'new');
    INSERT INTO members (id, first_name, last_name, email, phone) VALUES
      (1, 'Jane', 'Smith', 'jane@test.com', '555-0200');
    INSERT INTO message_templates (id, name, type, trigger_event, body) VALUES
      (1, 'Trial Reminder', 'sms', 'trial_2hr', 'Reminder text');
  `);
});

beforeEach(() => {
  const db = getDatabase();
  db.exec(`DELETE FROM scheduled_messages`);
});

after(() => closeDatabase());

describe('Scheduled Messages Data Layer', () => {
  it('createScheduledMessage inserts lead message', () => {
    const msg = sm.createScheduledMessage({
      lead_id: 1, message_type: 'sms', template_id: 1,
      scheduled_for: '2026-06-01T10:00:00Z', body: 'Hello!'
    });
    assert.ok(msg.id);
    assert.equal(msg.lead_id, 1);
    assert.equal(msg.message_type, 'sms');
    assert.equal(msg.status, 'pending');
  });

  it('createScheduledMessage inserts member message with email', () => {
    const msg = sm.createScheduledMessage({
      member_id: 1, message_type: 'email', scheduled_for: '2026-06-01T10:00:00Z',
      recipient_email: 'jane@test.com', subject: 'Hi', body: 'Body'
    });
    assert.ok(msg.id);
    assert.equal(msg.member_id, 1);
    assert.equal(msg.recipient_email, 'jane@test.com');
  });

  it('getScheduledMessageById returns message', () => {
    const msg = sm.createScheduledMessage({
      lead_id: 1, message_type: 'sms', template_id: 1,
      scheduled_for: '2026-06-01T10:00:00Z', body: 'Test'
    });
    const found = sm.getScheduledMessageById(msg.id);
    assert.ok(found);
    assert.equal(found.id, msg.id);
    assert.ok(found.lead_name);
    assert.ok(found.template_name);
  });

  it('getScheduledMessageById returns undefined for missing', () => {
    assert.equal(sm.getScheduledMessageById(999), undefined);
  });

  it('getAllScheduledMessages returns all', () => {
    sm.createScheduledMessage({ lead_id: 1, message_type: 'sms', scheduled_for: '2026-06-01T10:00:00Z', body: 'A' });
    sm.createScheduledMessage({ member_id: 1, message_type: 'email', scheduled_for: '2026-06-01T11:00:00Z', body: 'B' });
    assert.equal(sm.getAllScheduledMessages({}).length, 2);
  });

  it('getAllScheduledMessages filters by status', () => {
    sm.createScheduledMessage({ lead_id: 1, message_type: 'sms', scheduled_for: '2026-06-01T10:00:00Z', body: 'A' });
    const r = sm.getAllScheduledMessages({ status: 'pending' });
    assert.equal(r.length, 1);
    const r2 = sm.getAllScheduledMessages({ status: 'sent' });
    assert.equal(r2.length, 0);
  });

  it('getAllScheduledMessages filters by message_type', () => {
    sm.createScheduledMessage({ lead_id: 1, message_type: 'sms', scheduled_for: '2026-06-01T10:00:00Z', body: 'A' });
    sm.createScheduledMessage({ member_id: 1, message_type: 'email', scheduled_for: '2026-06-01T11:00:00Z', body: 'B' });
    const r = sm.getAllScheduledMessages({ message_type: 'email' });
    assert.equal(r.length, 1);
  });

  it('getAllScheduledMessages filters by lead_id', () => {
    sm.createScheduledMessage({ lead_id: 1, message_type: 'sms', scheduled_for: '2026-06-01T10:00:00Z', body: 'A' });
    sm.createScheduledMessage({ member_id: 1, message_type: 'email', scheduled_for: '2026-06-01T11:00:00Z', body: 'B' });
    const r = sm.getAllScheduledMessages({ lead_id: 1 });
    assert.equal(r.length, 1);
  });

  it('getAllScheduledMessages filters by member_id', () => {
    sm.createScheduledMessage({ lead_id: 1, message_type: 'sms', scheduled_for: '2026-06-01T10:00:00Z', body: 'A' });
    sm.createScheduledMessage({ member_id: 1, message_type: 'email', scheduled_for: '2026-06-01T11:00:00Z', body: 'B' });
    const r = sm.getAllScheduledMessages({ member_id: 1 });
    assert.equal(r.length, 1);
  });

  it('updateScheduledMessage modifies status', () => {
    const msg = sm.createScheduledMessage({
      lead_id: 1, message_type: 'sms', scheduled_for: '2026-06-01T10:00:00Z', body: 'Test'
    });
    const updated = sm.updateScheduledMessage(msg.id, { status: 'sent' });
    assert.equal(updated.status, 'sent');
  });

  it('updateScheduledMessage throws on empty fields', () => {
    const msg = sm.createScheduledMessage({
      lead_id: 1, message_type: 'sms', scheduled_for: '2026-06-01T10:00:00Z', body: 'Test'
    });
    assert.throws(() => {
      sm.updateScheduledMessage(msg.id, {});
    }, /No valid fields to update/);
  });

  it('markMessageSent sets sent status and timestamp', () => {
    const msg = sm.createScheduledMessage({
      lead_id: 1, message_type: 'sms', scheduled_for: '2026-06-01T10:00:00Z', body: 'Test'
    });
    const sent = sm.markMessageSent(msg.id, '2026-06-01T10:05:00Z');
    assert.equal(sent.status, 'sent');
    assert.equal(sent.sent_at, '2026-06-01T10:05:00Z');
  });

  it('markMessageFailed sets failed status and error', () => {
    const msg = sm.createScheduledMessage({
      lead_id: 1, message_type: 'sms', scheduled_for: '2026-06-01T10:00:00Z', body: 'Test'
    });
    const failed = sm.markMessageFailed(msg.id, 'Connection error');
    assert.equal(failed.status, 'failed');
    assert.equal(failed.error_message, 'Connection error');
  });

  it('cancelScheduledMessage sets cancelled status', () => {
    const msg = sm.createScheduledMessage({
      lead_id: 1, message_type: 'sms', scheduled_for: '2026-06-01T10:00:00Z', body: 'Test'
    });
    const cancelled = sm.cancelScheduledMessage(msg.id);
    assert.equal(cancelled.status, 'cancelled');
  });

  it('getPendingMessages returns pending before time', () => {
    const msg = sm.createScheduledMessage({
      lead_id: 1, message_type: 'sms', scheduled_for: '2025-01-01T10:00:00Z', body: 'Old'
    });
    const pending = sm.getPendingMessages('2026-06-01T00:00:00Z');
    assert.ok(pending.some(m => m.id === msg.id));
    assert.ok(pending[0].lead_first_name);
    assert.ok(pending[0].lead_phone);
  });

  it('getPendingMessages excludes future messages', () => {
    sm.createScheduledMessage({
      lead_id: 1, message_type: 'sms', scheduled_for: '2027-01-01T10:00:00Z', body: 'Future'
    });
    const pending = sm.getPendingMessages('2026-06-01T00:00:00Z');
    assert.equal(pending.length, 0);
  });

  it('deleteScheduledMessage removes and returns true', () => {
    const msg = sm.createScheduledMessage({
      lead_id: 1, message_type: 'sms', scheduled_for: '2026-06-01T10:00:00Z', body: 'Test'
    });
    assert.equal(sm.deleteScheduledMessage(msg.id), true);
    assert.equal(sm.getScheduledMessageById(msg.id), undefined);
  });

  it('deleteScheduledMessage returns false for missing', () => {
    assert.equal(sm.deleteScheduledMessage(999), false);
  });
});
