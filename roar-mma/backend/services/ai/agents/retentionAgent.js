// Retention Agent - Monitors member activity, win-back campaigns, and at-risk members
const membersData = require('../../../data/members');
const retentionData = require('../../../data/retention');
const staffTasksData = require('../../../data/staffTasks');
const { getDatabase } = require('../../../db/connection');

async function handler({ db, aiState, openRouter, broadcast, config, agentName }) {
  try {
    console.log('[RETENTION-AGENT] Starting retention check...');

    const dbConn = db || getDatabase();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 1. Active members with no attendance in 14+ days
    const activeMembers = (membersData.getAllMembers({ status: 'active' }).members || []).slice(0, 200);

    // Batch query: get members who HAVE attended recently
    const recentAttendees = dbConn.prepare(`
      SELECT DISTINCT member_id FROM attendance
      WHERE check_in_time >= ?
    `).all(fourteenDaysAgo).map(r => r.member_id);
    const recentSet = new Set(recentAttendees);

    const atRiskMembers = activeMembers.filter(m => m && m.id && !recentSet.has(m.id));

    // Batch query existing tasks for all at-risk members
    const existingTaskKeys = new Set();
    if (atRiskMembers.length > 0) {
      const memberIds = atRiskMembers.map(m => m.id);
      const placeholders = memberIds.map(() => '?').join(',');
      const existing = dbConn.prepare(`
        SELECT member_id FROM staff_tasks
        WHERE member_id IN (${placeholders})
          AND task_type = 'retention_check_in'
          AND status = 'pending'
        GROUP BY member_id
      `).all(...memberIds);
      existing.forEach(r => existingTaskKeys.add(r.member_id));
    }

    let atRiskCount = 0;
    for (const member of atRiskMembers) {
      try {
        retentionData.logRetentionEvent({
          memberId: member.id,
          eventType: 'at_risk_inactive',
          relatedId: null,
          metadata: JSON.stringify({
            detected_by: 'retention_agent',
            days_since_last_attendance: 14
          })
        });

        if (!existingTaskKeys.has(member.id)) {
          staffTasksData.createTask({
            member_id: member.id,
            task_type: 'retention_check_in',
            priority: 'medium',
            title: `At-risk member: ${member.first_name || ''} ${member.last_name || ''}`.trim(),
            description: `No attendance in 14+ days. Reach out to re-engage.`,
            due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            status: 'pending'
          });
          atRiskCount++;
        }
      } catch (loopErr) {
        console.error(`[RETENTION-AGENT] Error processing member #${member.id}:`, loopErr.message);
      }
    }

    // 2. Cancelled members not contacted for win-back in 30+ days
    const cancelledMembers = (membersData.getAllMembers({ status: 'cancelled' }).members || []).slice(0, 100);
    const winbackCandidates = cancelledMembers.filter(m => m && m.id && m.cancellation_date && (new Date(m.cancellation_date).getTime() + 30 * 24 * 60 * 60 * 1000) <= Date.now());

    // Batch query existing win-back tasks
    const existingWinbackKeys = new Set();
    if (winbackCandidates.length > 0) {
      const memberIds = winbackCandidates.map(m => m.id);
      const placeholders = memberIds.map(() => '?').join(',');
      const existing = dbConn.prepare(`
        SELECT member_id FROM staff_tasks
        WHERE member_id IN (${placeholders})
          AND task_type = 'win_back'
          AND status = 'pending'
        GROUP BY member_id
      `).all(...memberIds);
      existing.forEach(r => existingWinbackKeys.add(r.member_id));
    }

    let winbackCreated = 0;
    for (const member of winbackCandidates) {
      try {
        if (!existingWinbackKeys.has(member.id)) {
          staffTasksData.createTask({
            member_id: member.id,
            task_type: 'win_back',
            priority: 'medium',
            title: `Win-back candidate: ${member.first_name || ''} ${member.last_name || ''}`.trim(),
            description: `Member cancelled on ${member.cancellation_date}. 30+ days passed, ready for win-back outreach.`,
            due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            status: 'pending'
          });
          winbackCreated++;
        }
      } catch (loopErr) {
        console.error(`[RETENTION-AGENT] Error processing cancelled member #${member.id}:`, loopErr.message);
      }
    }

    // Persist recommendations to retention_recommendations table
    dbConn.exec(`
      CREATE TABLE IF NOT EXISTS retention_recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL,
        recommendation_type TEXT NOT NULL,
        priority TEXT CHECK(priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
        reason TEXT,
        details TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'actioned', 'dismissed')),
        created_at DATETIME DEFAULT (datetime('now')),
        updated_at DATETIME DEFAULT (datetime('now')),
        FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
      )
    `);

    const insertRec = dbConn.prepare(`
      INSERT INTO retention_recommendations (member_id, recommendation_type, priority, reason, details)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const member of atRiskMembers) {
      insertRec.run(member.id, 'at_risk_inactive', 'medium', 'No attendance in 14+ days', JSON.stringify({ detected_by: 'retention_agent', days_since_last_attendance: 14 }));
    }
    for (const member of winbackCandidates) {
      insertRec.run(member.id, 'winback_candidate', 'medium', `Cancelled on ${member.cancellation_date}`, JSON.stringify({ detected_by: 'retention_agent', cancellation_date: member.cancellation_date }));
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

    const summary = `${atRiskCount} at-risk members detected. ${winbackCreated} win-back candidates. ${expiredCampaigns.length} expired campaigns closed.`;

    await aiState.logActivity({
      agentName: agentName || 'retention',
      actionType: 'retention_check',
      details: {
        at_risk_members: atRiskCount,
        winback_candidates: winbackCreated,
        expired_campaigns: expiredCampaigns.length,
        total_active: activeMembers.length,
        total_cancelled: cancelledMembers.length
      },
      summary
    });

    console.log(`[RETENTION-AGENT] ${summary}`);

    if ((atRiskCount > 0 || winbackCreated > 0) && broadcast) {
      broadcast({ type: 'retention_agent_update', summary, atRiskCount, winbackCandidates: winbackCreated });
    }
  } catch (err) {
    console.error('[RETENTION-AGENT] Error:', err.stack || err.message);
    try {
      await aiState.logActivity({
        agentName: agentName || 'retention',
        actionType: 'retention_check_error',
        details: { error: err.message },
        summary: `Retention agent failed: ${err.message}`
      });
    } catch (logErr) {
      console.error('[RETENTION-AGENT] Failed to log activity:', logErr.message);
    }
  }
}

module.exports = { handler };
