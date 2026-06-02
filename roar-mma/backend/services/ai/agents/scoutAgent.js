const { getDatabase } = require('../../../db/connection');

async function handler({ db, aiState, broadcast, config, agentName }) {
  try {
    const dbConn = db || getDatabase();
    const leads = dbConn.prepare(`
      SELECT l.*,
        (SELECT COUNT(*) FROM ai_activity_log WHERE agent_name='leads' AND created_at >= datetime('now', '-30 days')) as interactions_30d,
        (SELECT MAX(created_at) FROM ai_activity_log WHERE agent_name='leads') as last_interaction,
        (SELECT COUNT(*) FROM bookings b JOIN classes c ON b.class_id=c.id WHERE b.member_id=l.converted_member_id AND b.status='attended' AND b.created_at >= datetime('now', '-90 days')) as trials_attended
      FROM leads l WHERE l.stage NOT IN ('converted','lost')
    `).all();

    let updated = 0;
    for (const lead of leads) {
      let score = 0;
      const factors = {};

      // Source quality (0-15)
      const sourceScores = { referral: 15, walk_in: 12, website: 10, facebook: 8, instagram: 8, google: 8, other: 5 };
      if (lead.source && sourceScores[lead.source]) {
        score += sourceScores[lead.source];
        factors.source = sourceScores[lead.source];
      }

      // Profile completeness (0-15)
      let completeness = 0;
      if (lead.first_name) completeness += 3;
      if (lead.last_name) completeness += 3;
      if (lead.email) completeness += 3;
      if (lead.phone) completeness += 3;
      if (lead.trial_date) completeness += 3;
      score += completeness;
      factors.profile_completeness = completeness;

      // Engagement recency (0-20)
      const daysSinceCreated = (Date.now() - new Date(lead.created_at).getTime()) / 86400000;
      if (lead.last_contact_date) {
        const daysSinceContact = (Date.now() - new Date(lead.last_contact_date).getTime()) / 86400000;
        if (daysSinceContact <= 1) { score += 20; factors.recency = 20; }
        else if (daysSinceContact <= 3) { score += 15; factors.recency = 15; }
        else if (daysSinceContact <= 7) { score += 10; factors.recency = 10; }
        else if (daysSinceContact <= 14) { score += 5; factors.recency = 5; }
        else { score += 0; factors.recency = 0; }
      } else if (daysSinceCreated <= 1) {
        score += 15; factors.recency = 15;
      }

      // Interaction volume (0-15)
      const interactions = lead.interactions_30d || 0;
      if (interactions >= 5) { score += 15; factors.interactions = 15; }
      else if (interactions >= 3) { score += 10; factors.interactions = 10; }
      else if (interactions >= 1) { score += 5; factors.interactions = 5; }

      // Stage progress (0-20)
      const stageScores = { new: 0, contacted: 5, trial_booked: 10, trial_completed: 15, converted: 20 };
      if (lead.stage && stageScores[lead.stage] !== undefined) {
        score += stageScores[lead.stage];
        factors.stage = stageScores[lead.stage];
      }

      // Interest level (0-15)
      const interestScores = { hot: 15, warm: 10, cold: 5 };
      if (lead.trial_interest_level && interestScores[lead.trial_interest_level]) {
        score += interestScores[lead.trial_interest_level];
        factors.interest = interestScores[lead.trial_interest_level];
      }

      // Trial attended (0-10)
      if (lead.trials_attended > 0) {
        score += Math.min(lead.trials_attended * 5, 10);
        factors.trials_attended = Math.min(lead.trials_attended * 5, 10);
      }

      const finalScore = Math.max(0, Math.min(100, score));
      dbConn.prepare("UPDATE leads SET score=?, score_updated_at=datetime('now'), score_factors=? WHERE id=?")
        .run(finalScore, JSON.stringify(factors), lead.id);
      updated++;
    }

    const summary = `Scouted ${leads.length} leads, scored ${updated}`;
    console.log(`[SCOUT-AGENT] ${summary}`);

    await aiState.logActivity({
      agentName: agentName || 'scout',
      actionType: 'lead_scoring',
      details: { total_leads: leads.length, updated },
      summary
    });

    if (broadcast) broadcast({ type: 'scout_agent_update', summary });
  } catch (err) {
    console.error('[SCOUT-AGENT] Error:', err.message);
    try { await aiState.logActivity({ agentName: 'scout', actionType: 'scout_error', details: { error: err.message }, summary: `Scout failed: ${err.message}` }); } catch {}
  }
}

module.exports = { handler };