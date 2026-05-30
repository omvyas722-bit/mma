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
    const allFailed = transactionsData.getFailedPayments();
    const recentFailed = allFailed.filter(t => t.created_at >= twentyFourHoursAgo);

    let failedTotal = 0;
    for (const tx of recentFailed) {
      failedTotal += Math.abs(tx.amount || 0);
      const existingTasks = staffTasksData.getAllTasks({
        member_id: tx.member_id,
        task_type: 'failed_payment',
        status: 'pending'
      });
      if (existingTasks.length === 0) {
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
        AND m.id NOT IN (
          SELECT DISTINCT t.member_id FROM transactions t
          WHERE t.status = 'completed' AND t.created_at >= ?
        )
    `).all(thirtyDaysAgo);

    let overdueFlagged = 0;
    for (const member of possiblyOverdue) {
      const existingTasks = staffTasksData.getAllTasks({
        member_id: member.id,
        task_type: 'payment_overdue_check',
        status: 'pending'
      });
      if (existingTasks.length === 0) {
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
    console.error('[BILLING-AGENT] Error:', err.message);
    try {
      await aiState.logActivity({
        actionType: 'billing_check_error',
        details: { error: err.message },
        summary: `Billing agent failed: ${err.message}`
      });
    } catch (_) {}
  }
}

module.exports = { handler };
