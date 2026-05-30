// Retention Agent - Monitors member activity, win-back campaigns, and at-risk members
const membersData = require('../../../data/members');
const retentionData = require('../../../data/retention');
const staffTasksData = require('../../../data/staffTasks');
const { getDatabase } = require('../../../db/connection');

async function handler({ db, aiState, openRouter, broadcast, config }) {
  try {
    console.log('[RETENTION-AGENT] Starting retention check...');

    const dbConn = db || getDatabase();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 1. Active members with no attendance in 14+ days
    const activeMembers = membersData.getAllMembers({ status: 'active' }).members;

    let atRiskCount = 0;
    for (const member of activeMembers) {
      const recentBooking = dbConn.prepare(`
        SELECT b.id FROM bookings b
        JOIN class_instances ci ON b.class_instance_id = ci.id
        WHERE b.member_id = ? AND b.status = 'attended' AND ci.date >= ?
        LIMIT 1
      `).get(member.id, fourteenDaysAgo);

      if (!recentBooking) {
        retentionData.logRetentionEvent(member.id, 'at_risk_inactive', null, JSON.stringify({
          detected_by: 'retention_agent',
          days_since_last_attendance: 14
        }));

        const existingTasks = staffTasksData.getAllTasks({
          member_id: member.id,
          task_type: 'retention_check_in',
          status: 'pending'
        });
        if (existingTasks.length === 0) {
          staffTasksData.createTask({
            member_id: member.id,
            task_type: 'retention_check_in',
            priority: 'medium',
            title: `At-risk member: ${member.first_name} ${member.last_name}`,
            description: `No attendance in 14+ days. Reach out to re-engage.`,
            due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            status: 'pending'
          });
        }
        atRiskCount++;
      }
    }

    // 2. Cancelled members not contacted for win-back in 30+ days
    const cancelledMembers = membersData.getAllMembers({ status: 'cancelled' }).members;
    let winbackCandidates = 0;

    for (const member of cancelledMembers) {
      if (!member.cancellation_date) continue;
      const cancelDate = new Date(member.cancellation_date);
      const thirtyDaysAfterCancel = new Date(cancelDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      if (thirtyDaysAfterCancel <= new Date()) {
        const existingTasks = staffTasksData.getAllTasks({
          member_id: member.id,
          task_type: 'win_back',
          status: 'pending'
        });
        if (existingTasks.length === 0) {
          staffTasksData.createTask({
            member_id: member.id,
            task_type: 'win_back',
            priority: 'medium',
            title: `Win-back candidate: ${member.first_name} ${member.last_name}`,
            description: `Member cancelled on ${member.cancellation_date}. 30+ days passed, ready for win-back outreach.`,
            due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            status: 'pending'
          });
          winbackCandidates++;
        }
      }
    }

    // 3. Check winback_campaigns for expired campaigns
    const expiredCampaigns = dbConn.prepare(`
      SELECT id, member_id FROM winback_campaigns
      WHERE status = 'active' AND created_at <= date('now', '-60 days')
    `).all();

    for (const campaign of expiredCampaigns) {
      dbConn.prepare(`
        UPDATE winback_campaigns SET status = 'expired', updated_at = datetime('now')
        WHERE id = ?
      `).run(campaign.id);
    }

    const summary = `${atRiskCount} at-risk members detected. ${winbackCandidates} win-back candidates. ${expiredCampaigns.length} expired campaigns closed.`;

    await aiState.logActivity({
      actionType: 'retention_check',
      details: {
        at_risk_members: atRiskCount,
        winback_candidates: winbackCandidates,
        expired_campaigns: expiredCampaigns.length,
        total_active: activeMembers.length,
        total_cancelled: cancelledMembers.length
      },
      summary
    });

    console.log(`[RETENTION-AGENT] ${summary}`);

    if (atRiskCount > 0 || winbackCandidates > 0) {
      broadcast({ type: 'retention_agent_update', summary, atRiskCount, winbackCandidates });
    }
  } catch (err) {
    console.error('[RETENTION-AGENT] Error:', err.message);
    try {
      await aiState.logActivity({
        actionType: 'retention_check_error',
        details: { error: err.message },
        summary: `Retention agent failed: ${err.message}`
      });
    } catch (_) {}
  }
}

module.exports = { handler };
