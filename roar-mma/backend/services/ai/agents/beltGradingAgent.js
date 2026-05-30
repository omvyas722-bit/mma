// Belt Grading Agent - Finds members eligible for next belt/stripe, logs candidates
const membersData = require('../../../data/members');
const beltGradingData = require('../../../data/beltGrading');
const { getDatabase } = require('../../../db/connection');

async function handler({ db, aiState, openRouter, broadcast, config }) {
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
    const maxBeltRank = beltLevels.reduce((max, b) => Math.max(max, b.rank_order), 0);

    const eligibleCandidates = [];
    const stripeCandidates = [];

    for (const member of activeMembers) {
      const progress = beltGradingData.getMemberBeltProgress(member.id);
      if (!progress) continue;

      const currentBelt = beltLevels.find(b => b.id === progress.current_belt_id);
      if (!currentBelt) continue;

      // Check if at max level - no grading possible
      if (currentBelt.rank_order >= maxBeltRank) continue;

      // Check grading eligibility
      const eligibility = beltGradingData.checkGradingEligibility(member.id);

      if (eligibility.eligible) {
        eligibleCandidates.push({
          member_id: member.id,
          member_name: `${member.first_name} ${member.last_name}`,
          current_belt: currentBelt.name,
          next_belt: eligibility.next_belt?.name || 'Unknown',
          classes_attended: eligibility.classes_attended,
          classes_required: eligibility.classes_required
        });
      }

      // Check stripe eligibility (time + attendance based for current belt)
      if (progress.current_stripes < currentBelt.stripe_count) {
        const today = new Date();
        const eligibleDate = new Date(progress.next_grading_eligible_date);
        if (today >= eligibleDate && progress.classes_attended_since_belt >= currentBelt.min_classes_attended * 0.25) {
          stripeCandidates.push({
            member_id: member.id,
            member_name: `${member.first_name} ${member.last_name}`,
            belt: currentBelt.name,
            current_stripes: progress.current_stripes,
            max_stripes: currentBelt.stripe_count
          });
        }
      }
    }

    const summary = `${eligibleCandidates.length} members eligible for next belt grading. ${stripeCandidates.length} members eligible for stripe award.`;

    await aiState.logActivity({
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
    console.error('[BELT-GRADING-AGENT] Error:', err.message);
    try {
      await aiState.logActivity({
        actionType: 'belt_grading_error',
        details: { error: err.message },
        summary: `Belt grading agent failed: ${err.message}`
      });
    } catch (_) {}
  }
}

module.exports = { handler };
