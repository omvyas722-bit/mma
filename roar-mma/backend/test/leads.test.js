const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_PATH = ':memory:';

delete require.cache[require.resolve('../db/connection')];

const { getDatabase, closeDatabase } = require('../db/connection');
const leads = require('../data/leads');

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
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );
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
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      source TEXT,
      referrer_member_id INTEGER,
      stage TEXT DEFAULT 'new',
      interest_level TEXT,
      location TEXT,
      interests TEXT,
      assigned_to INTEGER,
      converted_member_id INTEGER,
      lost_reason TEXT,
      notes TEXT,
      trial_date TEXT,
      trial_notes TEXT,
      trial_experience_rating INTEGER,
      trial_interest_level TEXT,
      trial_class_type TEXT,
      trial_coach_id INTEGER,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      score INTEGER DEFAULT 0,
      score_updated_at DATETIME,
      score_factors TEXT,
      follow_up_status TEXT DEFAULT 'pending',
      next_follow_up_date TEXT,
      last_contact_date TEXT,
      follow_up_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS lead_interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      staff_id INTEGER NOT NULL,
      interaction_type TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    INSERT INTO staff (id, name, email, password_hash, role) VALUES (1, 'Sales Agent', 'sales@test.com', '$2b$10$hash', 'sales');
    INSERT INTO members (id, first_name, last_name, email) VALUES (1, 'Ref', 'Member', 'ref@test.com');
  `);
});

after(() => {
  closeDatabase();
});

describe('Leads Data Layer', () => {
  const testLead = {
    first_name: 'Jane',
    last_name: 'Prospect',
    email: 'jane@test.com',
    phone: '0400000000',
    source: 'website',
    location: 'rockingham',
    interests: 'bjj',
    notes: 'Interested in trial'
  };

  it('createLead inserts and returns a lead', () => {
    const lead = leads.createLead(testLead);
    assert.ok(lead.id);
    assert.equal(lead.first_name, 'Jane');
    assert.equal(lead.last_name, 'Prospect');
    assert.equal(lead.email, 'jane@test.com');
    assert.equal(lead.source, 'website');
    assert.equal(lead.stage, 'new');
  });

  it('createLead with referrer and assigned_to', () => {
    const lead = leads.createLead({
      first_name: 'Bob', last_name: 'Referral', phone: '0400000001',
      source: 'referral', referrer_member_id: 1, assigned_to: 1
    });
    assert.ok(lead.id);
    assert.equal(lead.referrer_name, 'Ref Member');
    assert.equal(lead.assigned_to_name, 'Sales Agent');
  });

  it('getLeadById returns the correct lead', () => {
    const lead = leads.getLeadById(1);
    assert.ok(lead);
    assert.equal(lead.email, 'jane@test.com');
    assert.equal(lead.stage, 'new');
  });

  it('getLeadById returns undefined for missing lead', () => {
    const lead = leads.getLeadById(999);
    assert.equal(lead, undefined);
  });

  it('getAllLeads returns all leads with pagination', () => {
    leads.createLead({
      first_name: 'Sam', last_name: 'Walker', phone: '0400000002', source: 'walk_in'
    });
    const result = leads.getAllLeads({});
    assert.equal(result.leads.length, 3);
    assert.equal(result.total, 3);
    assert.ok(result.limit);
    assert.ok(result.offset >= 0);
  });

  it('getAllLeads filters by stage', () => {
    const result = leads.getAllLeads({ stage: 'new' });
    assert.ok(result.leads.length >= 2);
  });

  it('getAllLeads filters by source', () => {
    const result = leads.getAllLeads({ source: 'walk_in' });
    assert.equal(result.leads.length, 1);
  });

  it('getAllLeads filters by location', () => {
    const result = leads.getAllLeads({ location: 'rockingham' });
    assert.equal(result.leads.length, 1);
  });

  it('getAllLeads filters by assigned_to', () => {
    const result = leads.getAllLeads({ assigned_to: 1 });
    assert.ok(result.leads.length >= 1);
  });

  it('getAllLeads searches by query', () => {
    const result = leads.getAllLeads({ query: 'prospect' });
    assert.equal(result.leads.length, 1);
  });

  it('getAllLeads respects pagination', () => {
    const result = leads.getAllLeads({ limit: 1, offset: 0 });
    assert.equal(result.leads.length, 1);
  });

  it('updateLead modifies fields', () => {
    const updated = leads.updateLead(1, { stage: 'contacted', notes: 'Followed up' });
    assert.equal(updated.stage, 'contacted');
    assert.equal(updated.notes, 'Followed up');
  });

  it('updateLead throws on no valid fields', () => {
    assert.throws(() => {
      leads.updateLead(1, {});
    }, /No valid fields to update/);
  });

  it('deleteLead sets stage to lost', () => {
    const result = leads.deleteLead(3);
    assert.equal(result, true);
    const deleted = leads.getLeadById(3);
    assert.equal(deleted.stage, 'lost');
    assert.equal(deleted.lost_reason, 'Deleted by staff');
  });

  it('getLeadInteractions returns interactions for lead', () => {
    const db = getDatabase();
    db.prepare(`INSERT INTO lead_interactions (lead_id, staff_id, interaction_type, notes) VALUES (1, 1, 'phone_call', 'Spoke with Jane')`).run();
    const interactions = leads.getLeadInteractions(1);
    assert.equal(interactions.length, 1);
    assert.equal(interactions[0].interaction_type, 'phone_call');
    assert.equal(interactions[0].staff_name, 'Sales Agent');
  });

  it('addLeadInteraction creates and returns interaction', () => {
    const interaction = leads.addLeadInteraction({
      lead_id: 1, staff_id: 1, interaction_type: 'email', notes: 'Sent info pack'
    });
    assert.ok(interaction.id);
    assert.equal(interaction.interaction_type, 'email');
    assert.equal(interaction.staff_name, 'Sales Agent');
  });

  it('getLeadStats returns correct counts', () => {
    const stats = leads.getLeadStats();
    assert.ok(stats.total >= 3);
    assert.equal(typeof stats.new, 'number');
    assert.equal(typeof stats.contacted, 'number');
    assert.equal(typeof stats.lost, 'number');
  });

  it('getLeadsBySource returns grouped counts', () => {
    const sources = leads.getLeadsBySource();
    assert.ok(Array.isArray(sources));
    assert.ok(sources.length >= 2);
  });

  it('getConversionRate returns percentage', () => {
    const rate = leads.getConversionRate();
    assert.equal(typeof rate, 'string');
    assert.ok(Number(rate) >= 0);
  });

  it('getConversionRate returns 0 when no leads exist', () => {
    const db = getDatabase();
    db.prepare('DELETE FROM leads').run();
    const rate = leads.getConversionRate();
    assert.equal(rate, 0);
  });
});
