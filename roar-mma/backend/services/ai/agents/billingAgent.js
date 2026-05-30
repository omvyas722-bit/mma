// Billing Agent - Monitors failed payments, flags overdue members
const transactionsData = require('../../../data/transactions');
const staffTasksData = require('../../../data/staffTasks');
const { getDatabase } = require('../../../db/connection');

async function handler({ db, aiState, openRouter, broadcast, config }) {
  try {
    console.log('[BILLING-AGENT] Starting billing check...');

    const dbConn = db || getDatabase();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 1. Failed transactions in last 24 hours
    const allFailed = (transactionsData.getFailedPayments() || []).slice(0, 500);
    const recentFailed = allFailed.filter(t => t.created_at >= twentyFourHoursAgo);

    let failedTotal = 0;

    // Batch query existing failed payment tasks
    const existingFailedKeys = new Set();
    const failedMemberIds = [...new Set(recentFailed.filter(t => t && t.member_id).map(t => t.member_id))];
    if (failedMemberIds.length > 0) {
      const placeholders = failedMemberIds.map(() => '?').join(',');
      const existing = dbConn.prepare(`
        SELECT member_id FROM staff_tasks
        WHERE member_id IN (${placeholders})
          AND task_type = 'failed_payment'
          AND status = 'pending'
        GROUP BY member_id
      `).all(...failedMemberIds);
      existing.forEach(r => existingFailedKeys.add(r.member_id));
    }

    for (const tx of recentFailed) {
      if (!tx || !tx.member_id) continue;
      failedTotal += Math.abs(tx.amount || 0);
      if (!existingFailedKeys.has(tx.member_id)) {
        staffTasksData.createTask({
          member_id: tx.member_id,
          task_type: 'failed_payment',
          priority: 'high',
          title: `Failed payment: ${tx.member_name || `Member #${tx.member_id}`}`,
          description: `Payment of $${Math.abs(tx.amount)} failed. Reason: ${tx.failure_reason || 'Unknown'}. Transaction #${tx.id}.`,
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        });
      }
    }

    // 2. Members with no recent transaction (possibly overdue)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const possiblyOverdue = dbConn.prepare(`
      SELECT m.id, m.first_name, m.last_name, m.email, m.phone, m.joined_date
      FROM members m
      WHERE m.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM transactions t
          WHERE t.member_id = m.id AND t.status = 'completed' AND t.created_at >= ?
        )
      LIMIT 100
    `).all(thirtyDaysAgo);

    // Batch query existing overdue check tasks
    const existingOverdueKeys = new Set();
    const overdueMemberIds = possiblyOverdue.map(m => m.id);
    if (overdueMemberIds.length > 0) {
      const placeholders = overdueMemberIds.map(() => '?').join(',');
      const existing = dbConn.prepare(`
        SELECT member_id FROM staff_tasks
        WHERE member_id IN (${placeholders})
          AND task_type = 'payment_overdue_check'
          AND status = 'pending'
        GROUP BY member_id
      `).all(...overdueMemberIds);
      existing.forEach(r => existingOverdueKeys.add(r.member_id));
    }

    let overdueFlagged = 0;
    for (const member of possiblyOverdue) {
      if (!existingOverdueKeys.has(member.id)) {
        staffTasksData.createTask({
          member_id: member.id,
          task_type: 'payment_overdue_check',
          priority: 'medium',
          title: `Possible overdue: ${member.first_name} ${member.last_name}`,
          description: `No completed transactions in 30+ days. Member since ${member.joined_date}. Verify payment status.`,
          due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        });
        overdueFlagged++;
      }
    }

    const summary = `${recentFailed.length} failed payments today totaling $${failedTotal}. ${overdueFlagged} members possibly overdue.`;

    await aiState.logActivity({
      actionType: 'billing_check',
      details: {
        failed_payments_24h: recentFailed.length,
        failed_total_amount: failedTotal,
        overdue_members_flagged: overdueFlagged,
        total_overdue_candidates: possiblyOverdue.length
      },
      summary
    });

    console.log(`[BILLING-AGENT] ${summary}`);

    if (recentFailed.length > 0 || overdueFlagged > 0) {
      broadcast({ type: 'billing_agent_update', summary, failedPayments: recentFailed.length, overdueFlagged });
    }
  } catch (err) {
    console.error('[BILLING-AGENT] Error:', err.stack || err.message);
    try {
      await aiState.logActivity({
        actionType: 'billing_check_error',
        details: { error: err.message },
        summary: `Billing agent failed: ${err.message}`
      });
    } catch (logErr) {
      console.error('[BILLING-AGENT] Failed to log activity:', logErr.message);
    }
  }
}

module.exports = { handler };
