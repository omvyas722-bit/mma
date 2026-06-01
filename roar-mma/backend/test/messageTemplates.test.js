const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_PATH = ':memory:';

delete require.cache[require.resolve('../db/connection')];

const { getDatabase, closeDatabase } = require('../db/connection');
const templates = require('../data/messageTemplates');

before(() => {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS message_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL,
      trigger_event TEXT NOT NULL, subject TEXT, body TEXT NOT NULL, active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME DEFAULT (datetime('now'))
    )
  `);
});

beforeEach(() => {
  const db = getDatabase();
  db.exec(`DELETE FROM message_templates`);
});

after(() => closeDatabase());

describe('Message Templates Data Layer', () => {
  it('createTemplate inserts and returns', () => {
    const t = templates.createTemplate({
      name: 'Trial Reminder', type: 'sms', trigger_event: 'trial_2hr',
      body: 'Reminder: your trial is in 2 hours!'
    });
    assert.ok(t.id);
    assert.equal(t.name, 'Trial Reminder');
    assert.equal(t.type, 'sms');
    assert.equal(t.active, 1);
  });

  it('createTemplate with optional fields', () => {
    const t = templates.createTemplate({
      name: 'Welcome Email', type: 'email', trigger_event: 'lead_new',
      subject: 'Welcome!', body: 'Thanks for your interest', active: 0
    });
    assert.equal(t.subject, 'Welcome!');
    assert.equal(t.active, 0);
  });

  it('getTemplateById returns correct template', () => {
    const t = templates.createTemplate({
      name: 'Test', type: 'sms', trigger_event: 'trial_2hr', body: 'Test'
    });
    const found = templates.getTemplateById(t.id);
    assert.ok(found);
    assert.equal(found.name, 'Test');
  });

  it('getTemplateById returns undefined for missing', () => {
    assert.equal(templates.getTemplateById(999), undefined);
  });

  it('getAllTemplates returns all', () => {
    templates.createTemplate({ name: 'A', type: 'sms', trigger_event: 'trial_2hr', body: 'Body A' });
    templates.createTemplate({ name: 'B', type: 'email', trigger_event: 'lead_new', body: 'Body B' });
    const all = templates.getAllTemplates({});
    assert.equal(all.length, 2);
  });

  it('getAllTemplates filters by type', () => {
    templates.createTemplate({ name: 'A', type: 'sms', trigger_event: 'trial_2hr', body: 'Body A' });
    const r = templates.getAllTemplates({ type: 'sms' });
    assert.equal(r.length, 1);
  });

  it('getAllTemplates filters by trigger_event', () => {
    templates.createTemplate({ name: 'B', type: 'email', trigger_event: 'lead_new', body: 'Body B' });
    const r = templates.getAllTemplates({ trigger_event: 'lead_new' });
    assert.equal(r.length, 1);
  });

  it('getAllTemplates filters by active', () => {
    templates.createTemplate({ name: 'C', type: 'sms', trigger_event: 'trial_2hr', body: 'Body C', active: 1 });
    const r = templates.getAllTemplates({ active: true });
    assert.equal(r.length, 1);
    const r2 = templates.getAllTemplates({ active: false });
    assert.equal(r2.length, 0);
  });

  it('updateTemplate modifies fields', () => {
    const t = templates.createTemplate({
      name: 'Orig', type: 'sms', trigger_event: 'trial_2hr', body: 'Orig body'
    });
    const updated = templates.updateTemplate(t.id, { name: 'Updated', body: 'New body' });
    assert.equal(updated.name, 'Updated');
    assert.equal(updated.body, 'New body');
  });

  it('updateTemplate throws on empty fields', () => {
    const t = templates.createTemplate({
      name: 'T', type: 'sms', trigger_event: 'trial_2hr', body: 'B'
    });
    assert.throws(() => {
      templates.updateTemplate(t.id, {});
    }, /No valid fields to update/);
  });

  it('deleteTemplate removes template', () => {
    const t = templates.createTemplate({
      name: 'Del', type: 'sms', trigger_event: 'trial_2hr', body: 'B'
    });
    const result = templates.deleteTemplate(t.id);
    assert.equal(result, true);
    assert.equal(templates.getTemplateById(t.id), undefined);
  });

  it('deleteTemplate returns false for missing', () => {
    const result = templates.deleteTemplate(999);
    assert.equal(result, false);
  });
});
