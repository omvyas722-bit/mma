// Messaging Agent - Monitors scheduled messages, delivery success rates, pending items
const scheduledMessagesData = require('../../../data/scheduledMessages');
const { getDatabase } = require('../../../db/connection');

async function handler({ db, aiState, openRouter, broadcast, config }) {
  try {
    console.log('[MESSAGING-AGENT] Starting messaging check...');

    const dbConn = db || getDatabase();

    // 1. Scheduled messages that are pending and past schedule
    const pendingMessages = (scheduledMessagesData.getPendingMessages() || []).slice(0, 500);
    const pastDueMessages = pendingMessages.filter(m => {
      return m && m.scheduled_for && m.scheduled_for <= new Date().toISOString();
    });

    // Log overdue messages
    let overdueCount = 0;
    for (const msg of pastDueMessages) {
      if (!msg) continue;
      console.log(`[MESSAGING-AGENT] Overdue message #${msg.id} scheduled for ${msg.scheduled_for} to ${msg.recipient_phone || msg.recipient_email}`);
      overdueCount++;
    }

    // 2. Check delivery success rates - get stats for today and this month
    const todayStr = new Date().toISOString().split('T')[0];
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    const deliveryStats = dbConn.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM scheduled_messages
      WHERE DATE(created_at) >= ?
    `).get(monthStartStr);

    const totalProcessed = (deliveryStats.sent || 0) + (deliveryStats.failed || 0);
    const successRate = totalProcessed > 0
      ? Math.round(((deliveryStats.sent || 0) / totalProcessed) * 100) || 0
      : 0;

    // Also check today's numbers
    const todayStats = dbConn.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM scheduled_messages
      WHERE DATE(created_at) = ?
    `).get(todayStr);

    const summary = `${deliveryStats.sent || 0} messages sent, ${deliveryStats.failed || 0} failed, ${deliveryStats.pending || 0} pending. Success rate: ${successRate}%. ${overdueCount} overdue pending messages.`;

    await aiState.logActivity({
      actionType: 'messaging_check',
      details: {
        monthly: {
          sent: deliveryStats.sent || 0,
          failed: deliveryStats.failed || 0,
          pending: deliveryStats.pending || 0,
          success_rate: successRate
        },
        today: {
          sent: todayStats.sent || 0,
          failed: todayStats.failed || 0,
          total: todayStats.total || 0
        },
        overdue_messages: overdueCount
      },
      summary
    });

    console.log(`[MESSAGING-AGENT] ${summary}`);

    if (deliveryStats.failed > 0 && successRate < 80) {
      broadcast({ type: 'messaging_agent_alert', summary, successRate, failed: deliveryStats.failed });
    }
  } catch (err) {
    console.error('[MESSAGING-AGENT] Error:', err.stack || err.message);
    try {
      await aiState.logActivity({
        actionType: 'messaging_check_error',
        details: { error: err.message },
        summary: `Messaging agent failed: ${err.message}`
      });
    } catch (logErr) {
      console.error('[MESSAGING-AGENT] Failed to log activity:', logErr.message);
    }
  }
}

module.exports = { handler };
