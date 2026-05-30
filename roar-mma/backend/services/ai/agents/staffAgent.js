// Staff Agent - Monitors staff performance, finds top performers and declining metrics
const staffPerformanceData = require('../../../data/staffPerformance');
const { getDatabase } = require('../../../db/connection');

async function handler({ db, aiState, openRouter, broadcast, config, agentName }) {
  try {
    console.log('[STAFF-AGENT] Starting staff performance check...');

    const todayStr = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 1. This week's performance
    const weekPerformance = staffPerformanceData.getAllStaffPerformance(weekAgo, todayStr) || [];

    // 2. Top performers
    const leaderboardBySignups = staffPerformanceData.getLeaderboard('signups', weekAgo, todayStr) || [];
    const topPerformer = leaderboardBySignups[0];

    // 3. Find declining metrics (compare this week to last week)
    const lastWeekPerformance = staffPerformanceData.getAllStaffPerformance(twoWeeksAgo, weekAgo) || [];

    const decliningStaff = [];
    for (const current of weekPerformance) {
      if (!current || !current.metrics || !current.staff_id) continue;
      const previous = lastWeekPerformance.find(s => s.staff_id === current.staff_id);
      if (!previous || !previous.metrics) continue;

      const declineReasons = [];
      if ((previous.metrics.signups || 0) > (current.metrics.signups || 0)) {
        declineReasons.push(`signups: ${previous.metrics.signups || 0} -> ${current.metrics.signups || 0}`);
      }
      if ((previous.metrics.trials_booked || 0) > (current.metrics.trials_booked || 0)) {
        declineReasons.push(`trials: ${previous.metrics.trials_booked || 0} -> ${current.metrics.trials_booked || 0}`);
      }
      if ((previous.metrics.trial_conversion_rate || 0) > (current.metrics.trial_conversion_rate || 0)) {
        declineReasons.push(`conversion: ${previous.metrics.trial_conversion_rate || 0}% -> ${current.metrics.trial_conversion_rate || 0}%`);
      }
      if ((current.metrics.avg_response_time_hours || 0) > (previous.metrics.avg_response_time_hours || 0) * 1.5) {
        declineReasons.push(`response time: ${Math.round(previous.metrics.avg_response_time_hours || 0)}h -> ${Math.round(current.metrics.avg_response_time_hours || 0)}h`);
      }

      if (declineReasons.length > 0) {
        decliningStaff.push({
          staff_id: current.staff_id,
          staff_name: current.staff_name,
          decline_reasons: declineReasons
        });
      }
    }

    const summary = `Top performer: ${topPerformer ? `${topPerformer.staff_name} (${topPerformer.metrics.signups} signups)` : 'N/A'}. ${decliningStaff.length} staff with declining metrics.`;

    await aiState.logActivity({
      agentName: agentName || 'staff',
      actionType: 'staff_performance_check',
      details: {
        top_performer: topPerformer || null,
        declining_staff: decliningStaff,
        total_staff: weekPerformance.length,
        leaderboard: leaderboardBySignups.slice(0, 5)
      },
      summary
    });

    console.log(`[STAFF-AGENT] ${summary}`);
    if (topPerformer) {
      console.log(`[STAFF-AGENT] Top: ${topPerformer.staff_name} (${topPerformer.metrics.signups} signups, ${topPerformer.metrics.pt_revenue} PT revenue)`);
    }
    for (const s of decliningStaff) {
      console.log(`[STAFF-AGENT] Declining: ${s.staff_name} - ${s.decline_reasons.join(', ')}`);
    }

    if (decliningStaff.length > 0 && broadcast) {
      broadcast({ type: 'staff_agent_update', summary, decliningStaff });
    }
  } catch (err) {
    console.error('[STAFF-AGENT] Error:', err.stack || err.message);
    try {
      await aiState.logActivity({
        agentName: agentName || 'staff',
        actionType: 'staff_performance_error',
        details: { error: err.message },
        summary: `Staff agent failed: ${err.message}`
      });
    } catch (logErr) {
      console.error('[STAFF-AGENT] Failed to log activity:', logErr.message);
    }
  }
}
module.exports = { handler };
