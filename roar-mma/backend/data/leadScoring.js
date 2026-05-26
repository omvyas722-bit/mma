// Lead scoring system
const { getDatabase } = require('../db/connection');

// Scoring weights
const SCORING = {
  // Source quality (0-30 points)
  source: {
    referral: 30,
    walk_in: 25,
    website: 20,
    facebook: 15,
    instagram: 15,
    other: 10
  },

  // Stage progress (0-25 points)
  stage: {
    converted: 25,
    trial_completed: 20,
    trial_booked: 15,
    contacted: 10,
    new: 5
  },

  // Trial interest level (0-20 points)
  interest: {
    hot: 20,
    warm: 10,
    cold: 5
  },

  // Trial experience rating (0-15 points)
  experience: {
    5: 15,
    4: 12,
    3: 8,
    2: 4,
    1: 0
  },

  // Response speed bonus (0-10 points)
  // Responded within 1 hour of first contact
  quick_response: 10
};

function calculateLeadScore(lead) {
  let score = 0;

  // Source quality
  if (lead.source && SCORING.source[lead.source]) {
    score += SCORING.source[lead.source];
  }

  // Stage progress
  if (lead.stage && SCORING.stage[lead.stage]) {
    score += SCORING.stage[lead.stage];
  }

  // Trial interest level
  if (lead.trial_interest_level && SCORING.interest[lead.trial_interest_level]) {
    score += SCORING.interest[lead.trial_interest_level];
  }

  // Trial experience rating
  if (lead.trial_experience_rating && SCORING.experience[lead.trial_experience_rating]) {
    score += SCORING.experience[lead.trial_experience_rating];
  }

  // Response speed bonus
  if (lead.last_contact_date && lead.created_at) {
    const created = new Date(lead.created_at);
    const responded = new Date(lead.last_contact_date);
    const hoursDiff = (responded - created) / (1000 * 60 * 60);

    if (hoursDiff <= 1) {
      score += SCORING.quick_response;
    }
  }

  // Recency penalty (lose 1 point per day since last contact, max -20)
  if (lead.last_contact_date) {
    const lastContact = new Date(lead.last_contact_date);
    const now = new Date();
    const daysSince = (now - lastContact) / (1000 * 60 * 60 * 24);
    const recencyPenalty = Math.min(Math.floor(daysSince), 20);
    score -= recencyPenalty;
  }

  // Ensure score is between 0-100
  return Math.max(0, Math.min(100, score));
}

function getLeadPriority(score) {
  if (score >= 70) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function getAllLeadsWithScores(filters = {}) {
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

  query += ' ORDER BY l.created_at DESC';

  const leads = db.prepare(query).all(...params);

  // Calculate scores for each lead
  return leads.map(lead => {
    const score = calculateLeadScore(lead);
    const priority = getLeadPriority(score);

    return {
      ...lead,
      score,
      priority
    };
  }).sort((a, b) => b.score - a.score); // Sort by score descending
}

function getHighPriorityLeads(limit = 20) {
  const allLeads = getAllLeadsWithScores({});

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
    const hoursDiff = (responded - created) / (1000 * 60 * 60);

    if (hoursDiff <= 1) {
      breakdown.components.response_speed = {
        value: `${Math.round(hoursDiff * 60)} minutes`,
        points: SCORING.quick_response,
        max: 10
      };
    }
  }

  // Recency penalty
  if (lead.last_contact_date) {
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
