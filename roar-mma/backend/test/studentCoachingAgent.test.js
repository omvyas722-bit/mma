const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';

delete require.cache[require.resolve('../data/studentCoaching')];
delete require.cache[require.resolve('../db/connection')];

const { getDatabase, closeDatabase } = require('../db/connection');
const coaching = require('../data/studentCoaching');
const { handler, buildStudentProfile, generateLocalInsight, extractJson } = require('../services/ai/agents/studentCoachingAgent');

const origCoachingMethods = {
  getAllMembersWithRecentRatings: coaching.getAllMembersWithRecentRatings,
  getInsights: coaching.getInsights,
  createInsight: coaching.createInsight
};

before(() => {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT, last_name TEXT,
      status TEXT, email TEXT, phone TEXT, membership_type TEXT,
      experience_level TEXT, goals TEXT
    );
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, role TEXT
    );
    INSERT INTO members (id, first_name, last_name, status, experience_level, goals) VALUES
      (1, 'John', 'Doe', 'active', 'intermediate', 'Compete'),
      (2, 'Jane', 'Smith', 'active', 'beginner', 'Get fit');
  `);
});

after(() => {
  Object.assign(coaching, origCoachingMethods);
  closeDatabase();
});

describe('buildStudentProfile', () => {
  it('returns formatted text with all fields', () => {
    const member = {
      first_name: 'John', last_name: 'Doe', experience_level: 'intermediate',
      goals: 'Compete in tournaments', avg_defense: 7.5, avg_stance: 8.0,
      avg_offense: 6.5, avg_practice: 7.0, rating_count: 5
    };
    const profile = buildStudentProfile(member);
    assert.ok(profile.includes('John Doe'));
    assert.ok(profile.includes('Experience: intermediate'));
    assert.ok(profile.includes('Goals: Compete in tournaments'));
    assert.ok(profile.includes('Avg Defense: 7.5/10'));
    assert.ok(profile.includes('Avg Stance: 8.0/10'));
    assert.ok(profile.includes('Avg Offense: 6.5/10'));
    assert.ok(profile.includes('Avg Practice Quality: 7.0/10'));
    assert.ok(profile.includes('Total ratings: 5'));
  });

  it('handles missing optional fields', () => {
    const member = { first_name: 'Jane', last_name: 'Smith', rating_count: 0 };
    const profile = buildStudentProfile(member);
    assert.ok(profile.includes('Jane Smith'));
    assert.ok(profile.includes('Total ratings: 0'));
    assert.ok(!profile.includes('Experience:'));
    assert.ok(!profile.includes('Avg Defense:'));
  });
});

describe('generateLocalInsight', () => {
  it('returns fight_ready for high averages', () => {
    const member = { avg_defense: 8, avg_stance: 8, avg_offense: 8, avg_practice: 8, first_name: 'Test', rating_count: 4 };
    const insight = generateLocalInsight(member);
    assert.equal(insight.fight_readiness, 'fight_ready');
    assert.equal(insight.skill_level, 'Advanced');
    assert.equal(insight.weight_advice, 'maintain');
    assert.ok(insight.strengths.includes('Strong defense'));
    assert.ok(insight.strengths.includes('Good stance'));
    assert.ok(insight.strengths.includes('Strong offense'));
  });

  it('returns developing for mid averages', () => {
    const member = { avg_defense: 5, avg_stance: 5, avg_offense: 5, avg_practice: 5, first_name: 'Test', rating_count: 4 };
    const insight = generateLocalInsight(member);
    assert.equal(insight.fight_readiness, 'developing');
    assert.equal(insight.skill_level, 'Intermediate');
    assert.ok(insight.drills.length > 0);
  });

  it('returns not_ready for low averages', () => {
    const member = { avg_defense: 2, avg_stance: 3, avg_offense: 2, avg_practice: 3, first_name: 'Test', rating_count: 4 };
    const insight = generateLocalInsight(member);
    assert.equal(insight.fight_readiness, 'not_ready');
    assert.equal(insight.skill_level, 'Beginner');
    assert.ok(insight.weaknesses.includes('Defense needs work'));
    assert.ok(insight.weaknesses.includes('Stance needs improvement'));
    assert.ok(insight.weaknesses.includes('Offense needs development'));
  });

  it('limits drills to 3', () => {
    const member = { avg_defense: 4, avg_stance: 4, avg_offense: 4, avg_practice: 4, first_name: 'Test', rating_count: 4 };
    const insight = generateLocalInsight(member);
    assert.ok(insight.drills.length <= 3);
  });

  it('returns ready for borderline averages', () => {
    const member = { avg_defense: 6, avg_stance: 6, avg_offense: 6, avg_practice: 6, first_name: 'Test', rating_count: 4 };
    const insight = generateLocalInsight(member);
    assert.equal(insight.fight_readiness, 'ready');
  });
});

describe('extractJson', () => {
  it('extracts JSON from plain object string', () => {
    const result = extractJson('{"key": "value", "num": 42}');
    assert.deepEqual(result, { key: 'value', num: 42 });
  });

  it('extracts JSON from markdown code fence', () => {
    const text = 'Here is the analysis:\n```json\n{"skill_level": "Advanced", "fight_readiness": "ready"}\n```\nEnd.';
    const result = extractJson(text);
    assert.deepEqual(result, { skill_level: 'Advanced', fight_readiness: 'ready' });
  });

  it('extracts JSON with surrounding text', () => {
    const text = 'Response: {"drills": [{"drill_name": "Test Drill"}]} Thank you.';
    const result = extractJson(text);
    assert.deepEqual(result, { drills: [{ drill_name: 'Test Drill' }] });
  });

  it('returns null when no JSON found', () => {
    const result = extractJson('This is plain text without any JSON');
    assert.equal(result, null);
  });

  it('returns null for malformed JSON', () => {
    const result = extractJson('{"key": broken}');
    assert.equal(result, null);
  });
});

describe('handler', () => {
  beforeEach(() => {
    coaching.getAllMembersWithRecentRatings = origCoachingMethods.getAllMembersWithRecentRatings;
    coaching.createInsight = origCoachingMethods.createInsight;
    coaching.getInsights = origCoachingMethods.getInsights;
  });

  it('processes members and broadcasts new insights', async () => {
    coaching.getAllMembersWithRecentRatings = () => [
      { id: 1, first_name: 'John', last_name: 'Doe', experience_level: 'intermediate',
        goals: 'Compete', avg_defense: 7.5, avg_stance: 8.0, avg_offense: 6.5,
        avg_practice: 7.0, rating_count: 5 }
    ];
    let createdInsightData = null;
    coaching.createInsight = (memberId, data) => {
      createdInsightData = data;
      return { insights: [{ ...data, id: 1, drills: data.drills || [] }], latest: { ...data, id: 1 } };
    };
    let loggedActivity = null;
    let broadcastMsg = null;
    const dbMock = { prepare: () => ({ get: () => undefined }) };
    await handler({
      db: dbMock, aiState: { logActivity: (a) => { loggedActivity = a; } },
      openRouter: null, broadcast: (msg) => { broadcastMsg = msg; },
      config: {}, agentName: 'test_coaching'
    });
    assert.ok(createdInsightData);
    assert.equal(createdInsightData.skill_level, 'Advanced');
    assert.equal(createdInsightData.fight_readiness, 'ready');
    assert.ok(createdInsightData.drills);
    assert.ok(broadcastMsg);
    assert.equal(broadcastMsg.type, 'coaching_insight');
    assert.equal(broadcastMsg.memberId, 1);
    assert.ok(loggedActivity);
    assert.equal(loggedActivity.actionType, 'coaching_analysis');
  });

  it('skips members with existing insight today', async () => {
    coaching.getAllMembersWithRecentRatings = () => [
      { id: 1, first_name: 'John', last_name: 'Doe', experience_level: 'intermediate',
        avg_defense: 7.5, avg_stance: 8.0, avg_offense: 6.5, avg_practice: 7.0,
        rating_count: 5 }
    ];
    let insightCreated = false;
    coaching.createInsight = () => { insightCreated = true; };
    const dbMock = { prepare: () => ({ get: () => ({ id: 99 }) }) };
    let loggedActivity = null;
    await handler({
      db: dbMock, aiState: { logActivity: (a) => { loggedActivity = a; } },
      openRouter: null, broadcast: null, config: {}, agentName: 'test'
    });
    assert.equal(insightCreated, false);
    assert.equal(loggedActivity.details.skipped, 1);
    assert.equal(loggedActivity.details.analyzed, 0);
  });

  it('falls back to local insight when openRouter fails', async () => {
    coaching.getAllMembersWithRecentRatings = () => [
      { id: 1, first_name: 'John', last_name: 'Doe', experience_level: 'beginner',
        goals: 'Learn', avg_defense: 5, avg_stance: 5, avg_offense: 5,
        avg_practice: 5, rating_count: 3 }
    ];
    let createdInsightData = null;
    coaching.createInsight = (memberId, data) => {
      createdInsightData = data;
      return { latest: data };
    };
    const dbMock = { prepare: () => ({ get: () => undefined }) };
    const failingOrClient = { completeChat: async () => { throw new Error('API error'); } };
    await handler({
      db: dbMock, aiState: { logActivity: async () => {} },
      openRouter: failingOrClient, broadcast: null, config: {}, agentName: 'test'
    });
    assert.ok(createdInsightData);
    assert.equal(createdInsightData.fight_readiness, 'developing');
    assert.equal(createdInsightData.skill_level, 'Intermediate');
  });

  it('uses AI insight when openRouter succeeds', async () => {
    coaching.getAllMembersWithRecentRatings = () => [
      { id: 1, first_name: 'John', last_name: 'Doe', experience_level: 'advanced',
        avg_defense: 9, avg_stance: 9, avg_offense: 9, avg_practice: 9,
        rating_count: 10 }
    ];
    let createdInsightData = null;
    coaching.createInsight = (memberId, data) => {
      createdInsightData = data;
      return { latest: data };
    };
    const dbMock = { prepare: () => ({ get: () => undefined }) };
    const aiResponse = {
      choices: [{ message: { content: '{"skill_level":"Expert","fight_readiness":"fight_ready","recommended_weight_class":"welterweight","weight_advice":"cut","diet_recommendation":"Low carb","strengths":"Everything","weaknesses":"Nothing","drills":[{"drill_name":"AI Drill","focus_area":"defense","difficulty":"advanced"}]}' } }]
    };
    const workingOrClient = { completeChat: async () => aiResponse };
    await handler({
      db: dbMock, aiState: { logActivity: async () => {} },
      openRouter: workingOrClient, broadcast: null, config: {}, agentName: 'test'
    });
    assert.ok(createdInsightData);
    assert.equal(createdInsightData.skill_level, 'Expert');
    assert.equal(createdInsightData.fight_readiness, 'fight_ready');
    assert.equal(createdInsightData.drills.length, 1);
    assert.equal(createdInsightData.drills[0].drill_name, 'AI Drill');
  });

  it('exits early when no members found', async () => {
    coaching.getAllMembersWithRecentRatings = () => [];
    let insightCreated = false;
    coaching.createInsight = () => { insightCreated = true; };
    await handler({
      db: {}, aiState: { logActivity: async () => {} },
      openRouter: null, broadcast: null, config: {}, agentName: 'test'
    });
    assert.equal(insightCreated, false);
  });

  it('filters out members with zero ratings', async () => {
    coaching.getAllMembersWithRecentRatings = () => [
      { id: 1, first_name: 'John', last_name: 'Doe', rating_count: 0 }
    ];
    let insightCreated = false;
    coaching.createInsight = () => { insightCreated = true; };
    const dbMock = { prepare: () => ({ get: () => undefined }) };
    let loggedActivity = null;
    await handler({
      db: dbMock, aiState: { logActivity: (a) => { loggedActivity = a; } },
      openRouter: null, broadcast: null, config: {}, agentName: 'test'
    });
    assert.equal(insightCreated, false);
    assert.equal(loggedActivity.details.analyzed, 0);
  });
});
