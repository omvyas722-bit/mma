const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_PATH = ':memory:';

delete require.cache[require.resolve('../db/connection')];

const { getDatabase, closeDatabase } = require('../db/connection');
const retention = require('../data/retention');

before(() => {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT, last_name TEXT,
      status TEXT, email TEXT, phone TEXT, membership_type TEXT,
      cancellation_date TEXT, cancellation_reason TEXT
    );
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, role TEXT
    );
    CREATE TABLE IF NOT EXISTS cancellation_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER,
      requested_by INTEGER, cancellation_reason TEXT, reason_category TEXT,
      notes TEXT, status TEXT DEFAULT 'pending', retention_offer_id INTEGER,
      request_date DATETIME DEFAULT (datetime('now')),
      final_decision_date TEXT,
      FOREIGN KEY (member_id) REFERENCES members(id),
      FOREIGN KEY (requested_by) REFERENCES staff(id)
    );
    CREATE TABLE IF NOT EXISTS retention_offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT, cancellation_request_id INTEGER,
      offer_type TEXT NOT NULL, offer_details TEXT,
      discount_percentage REAL, discount_months INTEGER,
      pause_months INTEGER, new_membership_type TEXT,
      free_pt_sessions INTEGER, expires_at TEXT,
      status TEXT DEFAULT 'pending', response_date TEXT,
      offered_date DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (cancellation_request_id) REFERENCES cancellation_requests(id)
    );
    CREATE TABLE IF NOT EXISTS membership_pauses (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER,
      start_date TEXT, end_date TEXT, reason TEXT
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER,
      type TEXT, amount REAL, description TEXT, status TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS member_pt_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER,
      package_id INTEGER, sessions_remaining INTEGER,
      purchase_date TEXT, expiry_date TEXT, amount_paid REAL
    );
    CREATE TABLE IF NOT EXISTS winback_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER,
      cancellation_date TEXT, cancellation_reason_category TEXT,
      campaign_type TEXT, special_offer TEXT, status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS retention_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER,
      event_type TEXT, related_id INTEGER, metadata TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS membership_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT
    );
    INSERT INTO membership_plans (id, type) VALUES (1, 'pt_package');
    INSERT INTO members (id, first_name, last_name, status) VALUES
      (1, 'John', 'Doe', 'active');
    INSERT INTO staff (id, name, role) VALUES
      (1, 'Staff One', 'manager');
  `);
});

beforeEach(() => {
  const db = getDatabase();
  db.exec(`DELETE FROM retention_offers`);
  db.exec(`DELETE FROM cancellation_requests`);
  db.exec(`DELETE FROM membership_pauses`);
  db.exec(`DELETE FROM transactions`);
  db.exec(`DELETE FROM member_pt_packages`);
  db.exec(`DELETE FROM winback_campaigns`);
  db.exec(`DELETE FROM retention_events`);
});

after(() => closeDatabase());

describe('Retention Data Layer', () => {
  it('createCancellationRequest creates and auto-generates offers', () => {
    const req = retention.createCancellationRequest({
      member_id: 1, requested_by: 1, cancellation_reason: 'Too expensive',
      reason_category: 'cost'
    });
    assert.ok(req.id);
    assert.equal(req.status, 'pending');

    const db = getDatabase();
    const offers = db.prepare('SELECT * FROM retention_offers WHERE cancellation_request_id = ?').all(req.id);
    assert.equal(offers.length, 3);
    assert.ok(offers.some(o => o.offer_type === 'discount'));
    assert.ok(offers.some(o => o.offer_type === 'downgrade'));
    assert.ok(offers.some(o => o.offer_type === 'pause'));
  });

  it('createCancellationRequest generates time offers', () => {
    const req = retention.createCancellationRequest({
      member_id: 1, requested_by: 1, cancellation_reason: 'No time',
      reason_category: 'time'
    });
    const db = getDatabase();
    const offers = db.prepare('SELECT * FROM retention_offers WHERE cancellation_request_id = ?').all(req.id);
    assert.equal(offers.length, 2);
    assert.ok(offers.some(o => o.offer_type === 'pause'));
    assert.ok(offers.some(o => o.offer_type === 'schedule_change'));
  });

  it('getCancellationRequest returns request with offers', () => {
    const req = retention.createCancellationRequest({
      member_id: 1, requested_by: 1, cancellation_reason: 'Cost',
      reason_category: 'cost'
    });
    const found = retention.getCancellationRequest(req.id);
    assert.ok(found);
    assert.ok(found.member_name);
    assert.ok(Array.isArray(found.offers));
    assert.equal(found.offers.length, 3);
  });

  it('getPendingCancellationRequests returns pending only', () => {
    retention.createCancellationRequest({ member_id: 1, requested_by: 1, cancellation_reason: 'Cost', reason_category: 'cost' });
    const pending = retention.getPendingCancellationRequests();
    assert.equal(pending.length, 1);
    assert.ok(pending[0].member_name);
  });

  it('acceptRetentionOffer updates offer and applies discount', () => {
    const req = retention.createCancellationRequest({ member_id: 1, requested_by: 1, cancellation_reason: 'Cost', reason_category: 'cost' });
    const db = getDatabase();
    const offer = db.prepare("SELECT * FROM retention_offers WHERE cancellation_request_id = ? AND offer_type = 'discount'").get(req.id);
    const result = retention.acceptRetentionOffer(offer.id, 1);
    assert.ok(result.success);

    const updatedRequest = db.prepare('SELECT * FROM cancellation_requests WHERE id = ?').get(req.id);
    assert.equal(updatedRequest.status, 'retained');
    const updatedOffer = db.prepare('SELECT * FROM retention_offers WHERE id = ?').get(offer.id);
    assert.equal(updatedOffer.status, 'accepted');
  });

  it('rejectRetentionOffer updates offer status', () => {
    const req = retention.createCancellationRequest({ member_id: 1, requested_by: 1, cancellation_reason: 'Cost', reason_category: 'cost' });
    const db = getDatabase();
    const offer = db.prepare('SELECT * FROM retention_offers WHERE cancellation_request_id = ?').get(req.id);
    const result = retention.rejectRetentionOffer(offer.id);
    assert.ok(result.success);
    const rejected = db.prepare('SELECT * FROM retention_offers WHERE id = ?').get(offer.id);
    assert.equal(rejected.status, 'rejected');
  });

  it('processCancellation updates member and creates winback', () => {
    const req = retention.createCancellationRequest({ member_id: 1, requested_by: 1, cancellation_reason: 'Cost', reason_category: 'cost' });
    const result = retention.processCancellation(req.id);
    assert.ok(result.success);

    const db = getDatabase();
    const member = db.prepare('SELECT * FROM members WHERE id = 1').get();
    assert.equal(member.status, 'cancelled');
    const campaign = db.prepare('SELECT * FROM winback_campaigns WHERE member_id = 1').get();
    assert.ok(campaign);
    assert.equal(campaign.status, 'active');
  });

  it('getActiveWinbackCampaigns returns active campaigns', () => {
    const req = retention.createCancellationRequest({ member_id: 1, requested_by: 1, cancellation_reason: 'Cost', reason_category: 'cost' });
    retention.processCancellation(req.id);
    const campaigns = retention.getActiveWinbackCampaigns();
    assert.equal(campaigns.length, 1);
    assert.ok(campaigns[0].name);
  });

  it('getRetentionAnalytics returns stats', () => {
    const req = retention.createCancellationRequest({ member_id: 1, requested_by: 1, cancellation_reason: 'Cost', reason_category: 'cost' });
    retention.acceptRetentionOffer(
      getDatabase().prepare("SELECT * FROM retention_offers WHERE cancellation_request_id = ? AND offer_type = 'discount'").get(req.id).id,
      1
    );
    const analytics = retention.getRetentionAnalytics('2026-01-01', '2026-12-31');
    assert.ok(analytics.total_requests >= 1);
    assert.ok(analytics.retained_count >= 1);
    assert.ok(analytics.reasons.length > 0);
    assert.ok(analytics.offer_effectiveness.length > 0);
  });

  it('logRetentionEvent logs event', () => {
    retention.logRetentionEvent({ memberId: 1, eventType: 'test_event', relatedId: 1 });
    const db = getDatabase();
    const events = db.prepare('SELECT * FROM retention_events WHERE member_id = 1').all();
    assert.equal(events.length, 1);
    assert.equal(events[0].event_type, 'test_event');
  });

  it('createCancellationRequest with injury generates pause and free_pt', () => {
    const req = retention.createCancellationRequest({
      member_id: 1, requested_by: 1, cancellation_reason: 'Injured',
      reason_category: 'injury'
    });
    assert.ok(req.id);
    const db = getDatabase();
    const offers = db.prepare('SELECT * FROM retention_offers WHERE cancellation_request_id = ?').all(req.id);
    assert.equal(offers.length, 2);
    assert.ok(offers.some(o => o.offer_type === 'pause'));
    assert.ok(offers.some(o => o.offer_type === 'free_pt'));
  });

  it('createCancellationRequest with moving generates pause only', () => {
    const req = retention.createCancellationRequest({
      member_id: 1, requested_by: 1, cancellation_reason: 'Moving away',
      reason_category: 'moving'
    });
    const db = getDatabase();
    const offers = db.prepare('SELECT * FROM retention_offers WHERE cancellation_request_id = ?').all(req.id);
    assert.equal(offers.length, 1);
    assert.equal(offers[0].offer_type, 'pause');
    assert.equal(offers[0].pause_months, 12);
  });

  it('createCancellationRequest with dissatisfied generates free_pt and discount', () => {
    const req = retention.createCancellationRequest({
      member_id: 1, requested_by: 1, cancellation_reason: 'Not happy',
      reason_category: 'dissatisfied'
    });
    const db = getDatabase();
    const offers = db.prepare('SELECT * FROM retention_offers WHERE cancellation_request_id = ?').all(req.id);
    assert.equal(offers.length, 2);
    assert.ok(offers.some(o => o.offer_type === 'free_pt'));
    assert.ok(offers.some(o => o.offer_type === 'discount'));
    const freePt = offers.find(o => o.offer_type === 'free_pt');
    assert.equal(freePt.free_pt_sessions, 3);
    const disc = offers.find(o => o.offer_type === 'discount');
    assert.equal(disc.discount_percentage, 30);
    assert.equal(disc.discount_months, 2);
  });

  it('acceptRetentionOffer with pause creates membership_pause', () => {
    const req = retention.createCancellationRequest({
      member_id: 1, requested_by: 1, cancellation_reason: 'Moving',
      reason_category: 'moving'
    });
    const db = getDatabase();
    const offer = db.prepare("SELECT * FROM retention_offers WHERE cancellation_request_id = ? AND offer_type = 'pause'").get(req.id);
    const result = retention.acceptRetentionOffer(offer.id, 1);
    assert.ok(result.success);
    const pause = db.prepare('SELECT * FROM membership_pauses WHERE member_id = 1').get();
    assert.ok(pause);
    assert.ok(pause.start_date);
    assert.ok(pause.end_date);
    assert.equal(pause.reason, 'Retention offer accepted');
  });

  it('acceptRetentionOffer with downgrade updates membership_type', () => {
    const req = retention.createCancellationRequest({
      member_id: 1, requested_by: 1, cancellation_reason: 'Too expensive',
      reason_category: 'cost'
    });
    const db = getDatabase();
    const offer = db.prepare("SELECT * FROM retention_offers WHERE cancellation_request_id = ? AND offer_type = 'downgrade'").get(req.id);
    assert.ok(offer);
    const result = retention.acceptRetentionOffer(offer.id, 1);
    assert.ok(result.success);
    const member = db.prepare('SELECT * FROM members WHERE id = 1').get();
    assert.equal(member.membership_type, 'basic');
  });

  it('acceptRetentionOffer with free_pt creates member_pt_packages', () => {
    const req = retention.createCancellationRequest({
      member_id: 1, requested_by: 1, cancellation_reason: 'Injured',
      reason_category: 'injury'
    });
    const db = getDatabase();
    const offer = db.prepare("SELECT * FROM retention_offers WHERE cancellation_request_id = ? AND offer_type = 'free_pt'").get(req.id);
    assert.ok(offer);
    const result = retention.acceptRetentionOffer(offer.id, 1);
    assert.ok(result.success);
    const pkg = db.prepare('SELECT * FROM member_pt_packages WHERE member_id = 1').get();
    assert.ok(pkg);
    assert.equal(pkg.sessions_remaining, 2);
    assert.equal(pkg.amount_paid, 0);
  });

  it('getRetentionAnalytics works without dates', () => {
    const req = retention.createCancellationRequest({
      member_id: 1, requested_by: 1, cancellation_reason: 'Cost',
      reason_category: 'cost'
    });
    retention.acceptRetentionOffer(
      getDatabase().prepare("SELECT * FROM retention_offers WHERE cancellation_request_id = ? AND offer_type = 'discount'").get(req.id).id,
      1
    );
    const analytics = retention.getRetentionAnalytics();
    assert.ok(analytics.total_requests >= 1);
    assert.ok(analytics.retained_count >= 1);
    assert.ok(analytics.reasons.length > 0);
    assert.ok(analytics.offer_effectiveness.length > 0);
  });

  it('processCancellation with time reason creates flexible winback', () => {
    const req = retention.createCancellationRequest({
      member_id: 1, requested_by: 1, cancellation_reason: 'No time',
      reason_category: 'time'
    });
    const result = retention.processCancellation(req.id);
    assert.ok(result.success);
    const db = getDatabase();
    const member = db.prepare('SELECT * FROM members WHERE id = 1').get();
    assert.equal(member.status, 'cancelled');
    const campaign = db.prepare('SELECT * FROM winback_campaigns WHERE member_id = 1').get();
    assert.ok(campaign);
    const offer = JSON.parse(campaign.special_offer);
    assert.equal(offer.type, 'flexible');
  });

  it('processCancellation with other reason creates trial winback', () => {
    const req = retention.createCancellationRequest({
      member_id: 1, requested_by: 1, cancellation_reason: 'Moving away',
      reason_category: 'moving'
    });
    const result = retention.processCancellation(req.id);
    assert.ok(result.success);
    const db = getDatabase();
    const campaign = db.prepare('SELECT * FROM winback_campaigns WHERE member_id = 1').get();
    assert.ok(campaign);
    const offer = JSON.parse(campaign.special_offer);
    assert.equal(offer.type, 'trial');
  });
});

describe('Retention edge cases', () => {
  it('getCancellationRequest returns null for non-existent id', () => {
    const result = retention.getCancellationRequest(99999);
    assert.equal(result, null);
  });

  it('acceptRetentionOffer throws for non-existent offer', () => {
    assert.throws(() => retention.acceptRetentionOffer(99999, 1), /Offer not found/);
  });

  it('acceptRetentionOffer throws for already accepted offer', () => {
    const req = retention.createCancellationRequest({ member_id: 1, requested_by: 1, cancellation_reason: 'Cost', reason_category: 'cost' });
    const db = getDatabase();
    const offer = db.prepare("SELECT * FROM retention_offers WHERE cancellation_request_id = ? AND offer_type = 'discount'").get(req.id);
    retention.acceptRetentionOffer(offer.id, 1);
    assert.throws(() => retention.acceptRetentionOffer(offer.id, 1), /Offer already accepted/);
  });

  it('acceptRetentionOffer handles offer without expires_at', () => {
    const req = retention.createCancellationRequest({ member_id: 1, requested_by: 1, cancellation_reason: 'Cost', reason_category: 'cost' });
    const db = getDatabase();
    const ins = db.prepare(`INSERT INTO retention_offers (cancellation_request_id, offer_type, offer_details) VALUES (?, 'discount', ?)`).run(req.id, JSON.stringify({ description: 'No expiry offer' }));
    const offer = db.prepare('SELECT * FROM retention_offers WHERE id = ?').get(ins.lastInsertRowid);
    const result = retention.acceptRetentionOffer(offer.id, 1);
    assert.ok(result.success);
  });

  it('acceptRetentionOffer handles malformed offer_details JSON', () => {
    const req = retention.createCancellationRequest({ member_id: 1, requested_by: 1, cancellation_reason: 'Cost', reason_category: 'cost' });
    const db = getDatabase();
    const offer = db.prepare("SELECT * FROM retention_offers WHERE cancellation_request_id = ? AND offer_type = 'discount'").get(req.id);
    db.prepare('UPDATE retention_offers SET offer_details = ? WHERE id = ?').run('not valid json', offer.id);
    const result = retention.acceptRetentionOffer(offer.id, 1);
    assert.ok(result.success);
  });

  it('logRetentionEvent handles no arguments', () => {
    retention.logRetentionEvent();
    const db = getDatabase();
    const events = db.prepare('SELECT * FROM retention_events WHERE member_id IS NULL').all();
    assert.equal(events.length, 1);
  });

  it('acceptRetentionOffer handles downgrade without new_membership_type', () => {
    const req = retention.createCancellationRequest({ member_id: 1, requested_by: 1, cancellation_reason: 'Cost', reason_category: 'cost' });
    const db = getDatabase();
    const ins = db.prepare(`INSERT INTO retention_offers (cancellation_request_id, offer_type, offer_details, expires_at) VALUES (?, 'downgrade', ?, datetime('now', '+7 days'))`).run(req.id, JSON.stringify({ description: 'Downgrade without type' }));
    const offer = db.prepare('SELECT * FROM retention_offers WHERE id = ?').get(ins.lastInsertRowid);
    const result = retention.acceptRetentionOffer(offer.id, 1);
    assert.ok(result.success);
  });

  it('acceptRetentionOffer handles free_pt without free_pt_sessions', () => {
    const req = retention.createCancellationRequest({ member_id: 1, requested_by: 1, cancellation_reason: 'Injured', reason_category: 'injury' });
    const db = getDatabase();
    const ins = db.prepare(`INSERT INTO retention_offers (cancellation_request_id, offer_type, offer_details, expires_at) VALUES (?, 'free_pt', ?, datetime('now', '+7 days'))`).run(req.id, JSON.stringify({ description: 'Free PT without sessions' }));
    const offer = db.prepare('SELECT * FROM retention_offers WHERE id = ?').get(ins.lastInsertRowid);
    const result = retention.acceptRetentionOffer(offer.id, 1);
    assert.ok(result.success);
    const pkgs = db.prepare('SELECT * FROM member_pt_packages WHERE member_id = 1').all();
    assert.equal(pkgs.length, 0);
  });
});
