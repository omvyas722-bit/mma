const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_PATH = ':memory:';

delete require.cache[require.resolve('../db/connection')];

const { getDatabase, closeDatabase } = require('../db/connection');
const pc = require('../data/phoneCalls');

before(() => {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT, last_name TEXT
    );
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT, last_name TEXT
    );
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, role TEXT
    );
    CREATE TABLE IF NOT EXISTS phone_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT, call_sid TEXT, from_number TEXT,
      to_number TEXT, direction TEXT DEFAULT 'inbound', status TEXT DEFAULT 'queued',
      call_type TEXT, handled_by TEXT DEFAULT 'ai', staff_id INTEGER,
      member_id INTEGER, lead_id INTEGER, duration INTEGER,
      recording_url TEXT, transcription TEXT, sentiment TEXT,
      intent_detected TEXT, actions_taken TEXT, ai_confidence REAL,
      requires_followup INTEGER DEFAULT 0, followup_reason TEXT,
      started_at TEXT, ended_at TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES members(id),
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );
    CREATE TABLE IF NOT EXISTS call_transcripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, call_id INTEGER,
      speaker TEXT NOT NULL, message TEXT NOT NULL, confidence REAL,
      timestamp DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (call_id) REFERENCES phone_calls(id)
    );
    CREATE TABLE IF NOT EXISTS voicemails (
      id INTEGER PRIMARY KEY AUTOINCREMENT, call_id INTEGER,
      from_number TEXT, recording_url TEXT, transcription TEXT,
      duration INTEGER, status TEXT DEFAULT 'new',
      listened_by INTEGER, listened_at TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (call_id) REFERENCES phone_calls(id)
    );
    CREATE TABLE IF NOT EXISTS ai_conversation_context (
      id INTEGER PRIMARY KEY AUTOINCREMENT, call_id INTEGER,
      context_data TEXT, last_intent TEXT, collected_info TEXT,
      next_expected_input TEXT, updated_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (call_id) REFERENCES phone_calls(id)
    );
    CREATE TABLE IF NOT EXISTS ai_phone_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, setting_key TEXT UNIQUE,
      setting_value TEXT, updated_at DATETIME DEFAULT (datetime('now'))
    );
    INSERT INTO members (id, first_name, last_name) VALUES (1, 'John', 'Doe');
    INSERT INTO leads (id, first_name, last_name) VALUES (1, 'Jane', 'Smith');
    INSERT INTO staff (id, name, role) VALUES (1, 'Staff One', 'manager');
  `);
});

beforeEach(() => {
  const db = getDatabase();
  db.exec(`DELETE FROM call_transcripts`);
  db.exec(`DELETE FROM voicemails`);
  db.exec(`DELETE FROM ai_conversation_context`);
  db.exec(`DELETE FROM phone_calls`);
  db.exec(`DELETE FROM ai_phone_settings`);
});

after(() => closeDatabase());

describe('Phone Calls Data Layer', { concurrency: false }, () => {
  it('createPhoneCall inserts and returns', () => {
    const c = pc.createPhoneCall({
      call_sid: 'CA123', from_number: '+15551112222', to_number: '+15553333444',
      direction: 'inbound', status: 'queued'
    });
    assert.ok(c.id);
    assert.equal(c.call_sid, 'CA123');
    assert.equal(c.from_number, '+15551112222');
  });

  it('getPhoneCall returns by id', () => {
    const c = pc.createPhoneCall({ call_sid: 'CA1', from_number: '+1', to_number: '+2' });
    assert.ok(pc.getPhoneCall(c.id));
  });

  it('getPhoneCallBySid returns by call_sid', () => {
    pc.createPhoneCall({ call_sid: 'CA456', from_number: '+1', to_number: '+2' });
    const found = pc.getPhoneCallBySid('CA456');
    assert.ok(found);
  });

  it('updatePhoneCall modifies fields', () => {
    const c = pc.createPhoneCall({ call_sid: 'CA1', from_number: '+1', to_number: '+2' });
    const u = pc.updatePhoneCall(c.id, { status: 'completed', duration: 120, sentiment: 'positive' });
    assert.equal(u.status, 'completed');
    assert.equal(u.duration, 120);
    assert.equal(u.sentiment, 'positive');
  });

  it('getRecentCalls returns with member/lead names', () => {
    pc.createPhoneCall({ call_sid: 'CA1', from_number: '+1', to_number: '+2', member_id: 1, lead_id: 1 });
    const calls = pc.getRecentCalls(10);
    assert.equal(calls.length, 1);
    assert.ok(calls[0].member_name);
    assert.ok(calls[0].lead_name);
  });

  it('getCallsRequiringFollowup returns flagged calls', () => {
    const c = pc.createPhoneCall({ call_sid: 'CA1', from_number: '+1', to_number: '+2' });
    pc.updatePhoneCall(c.id, { requires_followup: 1, followup_reason: 'Need callback' });
    const calls = pc.getCallsRequiringFollowup();
    assert.equal(calls.length, 1);
  });

  it('addTranscriptEntry and getCallTranscript', () => {
    const c = pc.createPhoneCall({ call_sid: 'CA1', from_number: '+1', to_number: '+2' });
    pc.addTranscriptEntry(c.id, 'ai', 'Hello, how can I help?', 0.95);
    pc.addTranscriptEntry(c.id, 'member', 'I want to book a trial');
    const transcript = pc.getCallTranscript(c.id);
    assert.equal(transcript.length, 2);
    assert.equal(transcript[0].speaker, 'ai');
  });

  it('createVoicemail and getNewVoicemails', () => {
    const c = pc.createPhoneCall({ call_sid: 'CA1', from_number: '+15551112222', to_number: '+2' });
    pc.createVoicemail({ call_id: c.id, from_number: '+15551112222', recording_url: 'http://recording.com/1', transcription: 'Call me back' });
    const vms = pc.getNewVoicemails();
    assert.equal(vms.length, 1);
    assert.equal(vms[0].status, 'new');
    assert.equal(vms[0].transcription, 'Call me back');
  });

  it('markVoicemailListened updates status', () => {
    const c = pc.createPhoneCall({ call_sid: 'CA1', from_number: '+1', to_number: '+2' });
    pc.createVoicemail({ call_id: c.id, from_number: '+1', recording_url: 'http://r.com/1' });
    const vms = pc.getNewVoicemails();
    pc.markVoicemailListened(vms[0].id, 1);
    const vms2 = pc.getNewVoicemails();
    assert.equal(vms2.length, 0);
  });

  it('updateConversationContext creates new', () => {
    const c = pc.createPhoneCall({ call_sid: 'CA1', from_number: '+1', to_number: '+2' });
    pc.updateConversationContext(c.id, { current_intent: 'booking', conversation_stage: 'inquiry' }, 'booking', null, 'class_type');
    const ctx = pc.getConversationContext(c.id);
    assert.ok(ctx);
    const data = JSON.parse(ctx.context_data);
    assert.equal(data.current_intent, 'booking');
  });

  it('updateConversationContext updates existing', () => {
    const c = pc.createPhoneCall({ call_sid: 'CA1', from_number: '+1', to_number: '+2' });
    pc.updateConversationContext(c.id, { current_intent: 'booking' }, 'booking');
    pc.updateConversationContext(c.id, { current_intent: 'confirmed' }, 'confirmed');
    const ctx = pc.getConversationContext(c.id);
    const data = JSON.parse(ctx.context_data);
    assert.equal(data.current_intent, 'confirmed');
  });

  it('getAIPhoneSettings returns settings map', () => {
    const db = getDatabase();
    db.prepare("INSERT INTO ai_phone_settings (setting_key, setting_value) VALUES ('greeting', 'Hello!'), ('voice', 'en-US')").run();
    const settings = pc.getAIPhoneSettings();
    assert.equal(settings.greeting, 'Hello!');
    assert.equal(settings.voice, 'en-US');
  });

  it('updateAIPhoneSetting updates setting', () => {
    const db = getDatabase();
    db.prepare("INSERT INTO ai_phone_settings (setting_key, setting_value) VALUES ('greeting', 'Hello!')").run();
    pc.updateAIPhoneSetting('greeting', 'Welcome!');
    const settings = pc.getAIPhoneSettings();
    assert.equal(settings.greeting, 'Welcome!');
  });

  it('getCallAnalytics returns stats', () => {
    const c = pc.createPhoneCall({ call_sid: 'CA1', from_number: '+1', to_number: '+2', started_at: '2026-05-01T10:00:00Z', handled_by: 'ai', call_type: 'inquiry' });
    pc.updatePhoneCall(c.id, { status: 'completed', duration: 300, sentiment: 'positive' });
    pc.createVoicemail({ call_id: c.id, from_number: '+1', recording_url: 'http://r.com/1' });
    const analytics = pc.getCallAnalytics('2026-05-01', '2026-06-01');
    assert.equal(analytics.total_calls, 1);
    assert.equal(analytics.ai_handled, 1);
    assert.ok(analytics.by_type.length > 0);
    assert.equal(analytics.positive_sentiment, 1);
    assert.ok(analytics.avg_duration_seconds > 0);
    assert.equal(analytics.voicemails, 1);
  });

  it('getCallAnalytics works without date arguments', () => {
    const c = pc.createPhoneCall({ call_sid: 'CA2', from_number: '+1', to_number: '+2', started_at: new Date().toISOString(), handled_by: 'ai', call_type: 'inquiry' });
    pc.updatePhoneCall(c.id, { status: 'completed', duration: 300, sentiment: 'positive' });
    const analytics = pc.getCallAnalytics();
    assert.ok(analytics.total_calls >= 1);
    assert.equal(analytics.ai_handled, 1);
    assert.ok(analytics.avg_duration_seconds > 0);
  });

  describe('Coverage improvements', { concurrency: false }, () => {
    it('createPhoneCall with staff_id provided', () => {
      const c = pc.createPhoneCall({
        call_sid: 'CA-staff',
        from_number: '+15551115555',
        to_number: '+15553333555',
        staff_id: 1
      });
      assert.equal(c.staff_id, 1);
    });

    it('updatePhoneCall with empty object returns null', () => {
      const c = pc.createPhoneCall({ call_sid: 'CA-empty', from_number: '+1', to_number: '+2' });
      const result = pc.updatePhoneCall(c.id, {});
      assert.equal(result, null);
    });

    it('updateConversationContext with collectedInfo on insert', () => {
      const c = pc.createPhoneCall({ call_sid: 'CA-info1', from_number: '+1', to_number: '+2' });
      pc.updateConversationContext(c.id, { current_intent: 'booking' }, 'booking', { name: 'John Doe' });
      const ctx = pc.getConversationContext(c.id);
      assert.ok(ctx);
      const info = JSON.parse(ctx.collected_info);
      assert.equal(info.name, 'John Doe');
    });

    it('updateConversationContext with collectedInfo on update', () => {
      const c = pc.createPhoneCall({ call_sid: 'CA-info2', from_number: '+1', to_number: '+2' });
      pc.updateConversationContext(c.id, { current_intent: 'booking' }, 'booking');
      pc.updateConversationContext(c.id, { current_intent: 'confirmed' }, 'confirmed', { name: 'Jane Doe' });
      const ctx = pc.getConversationContext(c.id);
      assert.ok(ctx);
      const info = JSON.parse(ctx.collected_info);
      assert.equal(info.name, 'Jane Doe');
    });
  });
});
