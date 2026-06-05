// Lead scoring system
const { getDatabase } = require('../db/connection');
const providerChain = require('../services/ai/providerChain');

// Scoring weights (used by getLeadScoreBreakdown)
const SCORING = {
  source: { referral: 30, walk_in: 25, website: 20, facebook: 15, instagram: 15, other: 10 },
  stage: { converted: 25, trial_completed: 20, trial_booked: 15, contacted: 10, new: 5 },
  interest: { hot: 20, warm: 10, cold: 5 },
  experience: { 5: 15, 4: 12, 3: 8, 2: 4, 1: 0 },
  quick_response: 10
};

async function calculateAiLeadScore(lead) {
  const prompt = `Score this MMA gym lead 0-100 based on conversion likelihood.
Return ONLY a JSON object with score (int 0-100), reasoning (1 sentence), and priority (critical/high/medium/low).

Lead: ${lead.first_name || ''} ${lead.last_name || ''}
Source: ${lead.source || 'unknown'}
Stage: ${lead.stage || 'new'}
Interests: ${lead.interests || 'not specified'}
Location: ${lead.location || 'unknown'}
Notes: ${lead.notes || 'none'}
Days since created: ${lead.created_at ? Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86400000) : 'unknown'}
Has email: ${!!lead.email}
Has phone: ${!!lead.phone}`;

  try {
    const result = await providerChain.completeChat(
      [{ role: 'user', content: prompt }],
      { jsonMode: true, temperature: 0.3, maxTokens: 300 }
    );
    if (result.content) {
      const parsed = JSON.parse(result.content);
      return {
        score: Math.max(0, Math.min(100, parsed.score || 50)),
        reasoning: parsed.reasoning || 'AI scored',
        priority: parsed.priority || 'medium'
      };
    }
  } catch (err) {
    console.warn('[AI-SCORING] AI scoring failed, using fallback:', err.message);
  }

  const db = getDatabase();
  if (db) {
    const detScore = calculateLeadScore(lead);
    return { score: detScore.total, reasoning: `Fallback scoring (source: ${detScore.breakdown?.source || 0}, stage: ${detScore.breakdown?.stage || 0}, interest: ${detScore.breakdown?.interest || 0})`, priority: detScore.total >= 60 ? 'high' : detScore.total >= 30 ? 'medium' : 'low' };
  }
  return { score: 50, reasoning: 'Fallback scoring', priority: 'medium' };
}

function calculateLeadScore(lead) {
  let score = 0;

  // Source quality
  const sourceScores = { referral: 30, walk_in: 25, website: 20, facebook: 15, instagram: 15, other: 10 };
  if (lead.source && sourceScores[lead.source]) {
    score += sourceScores[lead.source];
  }

  // Stage progress
  const stageScores = { converted: 25, trial_completed: 20, trial_booked: 15, contacted: 10, new: 5 };
  if (lead.stage && stageScores[lead.stage]) {
    score += stageScores[lead.stage];
  }

  // Interest level
  const interestScores = { hot: 20, warm: 10, cold: 5 };
  if (lead.trial_interest_level && interestScores[lead.trial_interest_level]) {
    score += interestScores[lead.trial_interest_level];
  }

  // Experience rating
  const expScores = { 5: 15, 4: 12, 3: 8, 2: 4, 1: 0 };
  if (lead.trial_experience_rating && expScores[lead.trial_experience_rating]) {
    score += expScores[lead.trial_experience_rating];
  }

  // Response speed bonus
  if (lead.last_contact_date && lead.created_at) {
    const hoursDiff = Math.abs((new Date(lead.last_contact_date) - new Date(lead.created_at)) / (1000 * 60 * 60));
    if (hoursDiff <= 1) score += 10;
  }

  // Recency penalty
  if (lead.last_contact_date && lead.stage !== 'new') {
    const daysSince = (Date.now() - new Date(lead.last_contact_date).getTime()) / 86400000;
    score -= Math.min(Math.floor(daysSince), 20);
  }

  return Math.max(0, Math.min(100, score));
}

function getLeadPriority(score) {
  if (score >= 70) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

async function getAllLeadsWithScores(filters = {}) {
  const db = getDatabase();

  let query = `
    SELECT
      l.*,
      s.name as assigned_to_name,
      m.first_name || ' ' || m.last_name as referrer_name
    FROM leads l
    LEFT JOIN staff s ON l.assigned_to = s.id
    LEFT JOIN members m ON l.referrer_member_id = m.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.stage) {
    query += ' AND l.stage = ?';
    params.push(filters.stage);
  }

  if (filters.location) {
    query += ' AND l.location = ?';
    params.push(filters.location);
  }

  if (filters.source) {
    query += ' AND l.source = ?';
    params.push(filters.source);
  }

  if (filters.assigned_to) {
    query += ' AND l.assigned_to = ?';
    params.push(filters.assigned_to);
  }

  query += ' ORDER BY l.created_at DESC LIMIT 200';

  const leads = db.prepare(query).all(...params);

  // Rule-based scores first
  const scored = leads.map(lead => {
    const score = calculateLeadScore(lead);
    return { ...lead, score, priority: getLeadPriority(score) };
  });
  scored.sort((a, b) => b.score - a.score);

  // AI-score top 30 valuable leads (race-winner pattern)
  const topLeads = scored.slice(0, 30).filter(l => l.stage !== 'converted' && l.stage !== 'lost');
  const aiPromises = topLeads.map(l =>
    calculateAiLeadScore(l).then(ai => {
      l.score = ai.score;
      l.priority = ai.priority;
      l.score_reasoning = ai.reasoning;
    }).catch(() => {})
  );
  await Promise.all(aiPromises);
  scored.sort((a, b) => b.score - a.score);

  return scored;
}

async function getHighPriorityLeads(limit = 20) {
  const allLeads = await getAllLeadsWithScores({});

  return allLeads
    .filter(lead => lead.priority === 'critical' || lead.priority === 'high')
    .filter(lead => lead.stage !== 'converted' && lead.stage !== 'lost')
    .slice(0, limit);
}

function getLeadScoreBreakdown(leadId) {
  const db = getDatabase();
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);

  if (!lead) {
    throw new Error('Lead not found');
  }

  const breakdown = {
    total_score: calculateLeadScore(lead),
    priority: getLeadPriority(calculateLeadScore(lead)),
    components: {}
  };

  // Source
  if (lead.source && SCORING.source[lead.source]) {
    breakdown.components.source = {
      value: lead.source,
      points: SCORING.source[lead.source],
      max: 30
    };
  }

  // Stage
  if (lead.stage && SCORING.stage[lead.stage]) {
    breakdown.components.stage = {
      value: lead.stage,
      points: SCORING.stage[lead.stage],
      max: 25
    };
  }

  // Interest level
  if (lead.trial_interest_level && SCORING.interest[lead.trial_interest_level]) {
    breakdown.components.interest = {
      value: lead.trial_interest_level,
      points: SCORING.interest[lead.trial_interest_level],
      max: 20
    };
  }

  // Experience rating
  if (lead.trial_experience_rating && SCORING.experience[lead.trial_experience_rating]) {
    breakdown.components.experience = {
      value: lead.trial_experience_rating,
      points: SCORING.experience[lead.trial_experience_rating],
      max: 15
    };
  }

  // Response speed
  if (lead.last_contact_date && lead.created_at) {
    const created = new Date(lead.created_at);
    const responded = new Date(lead.last_contact_date);
    const hoursDiff = Math.abs((responded - created) / (1000 * 60 * 60));

    if (hoursDiff <= 1) {
      breakdown.components.response_speed = {
        value: `${Math.round(hoursDiff * 60)} minutes`,
        points: SCORING.quick_response,
        max: 10
      };
    }
  }

  // Recency penalty
  if (lead.last_contact_date && lead.stage !== 'new') {
    const lastContact = new Date(lead.last_contact_date);
    const now = new Date();
    const daysSince = (now - lastContact) / (1000 * 60 * 60 * 24);
    const recencyPenalty = Math.min(Math.floor(daysSince), 20);

    if (recencyPenalty > 0) {
      breakdown.components.recency_penalty = {
        value: `${Math.floor(daysSince)} days since contact`,
        points: -recencyPenalty,
        max: -20
      };
    }
  }

  return breakdown;
}

module.exports = {
  calculateLeadScore,
  getLeadPriority,
  getAllLeadsWithScores,
  getHighPriorityLeads,
  getLeadScoreBreakdown
};
