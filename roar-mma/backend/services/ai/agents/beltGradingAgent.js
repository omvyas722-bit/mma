// Belt Grading Agent - Finds members eligible for next belt/stripe, logs candidates
const membersData = require('../../../data/members');
const beltGradingData = require('../../../data/beltGrading');
const { getDatabase } = require('../../../db/connection');

async function handler({ db, aiState, broadcast, config, agentName }) {
  try {
    console.log('[BELT-GRADING-AGENT] Starting eligibility check...');

    const dbConn = db || getDatabase();

    // Only runs once per day
    const lastRun = dbConn.prepare(`
      SELECT created_at FROM ai_activity_log
      WHERE action_type = 'belt_grading_check'
      ORDER BY created_at DESC LIMIT 1
    `).get();

    if (lastRun) {
      const lastRunDate = new Date(lastRun.created_at).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      if (lastRunDate === today) {
        console.log('[BELT-GRADING-AGENT] Already ran today, skipping.');
        return;
      }
    }

    // Get all active members (not paginated - grab a reasonable batch)
    const activeMembers = membersData.getAllMembers({ status: 'active' }).members;

    // Get all belt levels for reference
    const beltLevels = beltGradingData.getAllBeltLevels();
    if (!beltLevels || beltLevels.length === 0) {
      console.log('[BELT-GRADING-AGENT] No belt levels configured, skipping.');
      return;
    }
    const maxBeltRank = beltLevels.reduce((max, b) => Math.max(max, b.rank_order), 0);

    const eligibleCandidates = [];
    const stripeCandidates = [];

    const batchSize = 50;
    const membersToProcess = activeMembers.slice(0, batchSize);

    for (const member of membersToProcess) {
      if (!member || !member.id) continue;
      try {
        const progress = beltGradingData.getMemberBeltProgress(member.id);
        if (!progress) continue;

        const currentBelt = beltLevels.find(b => b.id === progress.current_belt_id);
        if (!currentBelt) continue;

        if (currentBelt.rank_order >= maxBeltRank) continue;

        const eligibility = beltGradingData.checkGradingEligibility(member.id) || {};

        if (eligibility.eligible) {
          eligibleCandidates.push({
            member_id: member.id,
            member_name: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
            current_belt: currentBelt.name,
            next_belt: eligibility.next_belt?.name || 'Unknown',
            classes_attended: eligibility.classes_attended || 0,
            classes_required: eligibility.classes_required || 0
          });
        }

        if (progress.current_stripes < currentBelt.stripe_count) {
          const today = new Date();
          if (!progress.next_grading_eligible_date) continue;
          const eligibleDate = new Date(progress.next_grading_eligible_date);
          const minClasses = currentBelt.min_classes_attended || 0;
          if (today >= eligibleDate && (progress.classes_attended_since_belt || 0) >= minClasses * 0.25) {
            stripeCandidates.push({
              member_id: member.id,
              member_name: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
              belt: currentBelt.name,
              current_stripes: progress.current_stripes || 0,
              max_stripes: currentBelt.stripe_count || 0
            });
          }
        }
      } catch (loopErr) {
        console.error(`[BELT-GRADING-AGENT] Error processing member #${member.id}:`, loopErr.message);
      }
    }

    const summary = `${eligibleCandidates.length} members eligible for next belt grading. ${stripeCandidates.length} members eligible for stripe award.`;

    await aiState.logActivity({
      agentName: agentName || 'grading',
      actionType: 'belt_grading_check',
      details: {
        grading_candidates: eligibleCandidates,
        stripe_candidates: stripeCandidates,
        total_assessed: activeMembers.length
      },
      summary
    });

    console.log(`[BELT-GRADING-AGENT] ${summary}`);
    if (eligibleCandidates.length > 0) {
      for (const c of eligibleCandidates) {
        console.log(`[BELT-GRADING-AGENT]   ${c.member_name}: ${c.current_belt} -> ${c.next_belt}`);
      }
    }
  } catch (err) {
    console.error('[BELT-GRADING-AGENT] Error:', err.stack || err.message);
    try {
      await aiState.logActivity({
        agentName: agentName || 'grading',
        actionType: 'belt_grading_error',
        details: { error: err.message },
        summary: `Belt grading agent failed: ${err.message}`
      });
    } catch (logErr) {
      console.error('[BELT-GRADING-AGENT] Failed to log activity:', logErr.message);
    }
  }
}

module.exports = { handler };
