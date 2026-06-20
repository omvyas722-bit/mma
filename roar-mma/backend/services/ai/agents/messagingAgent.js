// Messaging Agent - Monitors scheduled messages, delivery success rates, pending items
const scheduledMessagesData = require('../../../data/scheduledMessages');
const { getDatabase } = require('../../../db/connection');
const messagingProviders = require('../../messagingProviders');
const crypto = require('crypto');

async function handler({ db, aiState, broadcast, config, agentName }) {
  try {
    console.log('[MESSAGING-AGENT] Starting messaging check...');

    const dbConn = db || getDatabase();

    // 0. Process SEND_PARENT_WAIVER events from event_queue
    const parentWaiverEvents = dbConn.prepare(`
      SELECT * FROM event_queue
      WHERE event_type = 'SEND_PARENT_WAIVER' AND status = 'pending'
      ORDER BY created_at ASC LIMIT 20
    `).all();

    for (const evt of parentWaiverEvents) {
      try {
        dbConn.prepare(`UPDATE event_queue SET status = 'processing', updated_at = datetime('now') WHERE id = ?`).run(evt.id);
        const payload = JSON.parse(evt.payload);
        const member = dbConn.prepare('SELECT id, first_name, last_name, email FROM members WHERE id = ?').get(payload.member_id);
        if (!member) throw new Error(`Member ${payload.member_id} not found`);

        const templateId = payload.template_id || dbConn.prepare("SELECT id FROM waiver_templates WHERE active = 1 ORDER BY id DESC LIMIT 1").get()?.id;
        if (!templateId) throw new Error('No active waiver template found');

        if (!messagingProviders._loaded) messagingProviders.loadSettings();

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
        const parentEmail = payload.parent_email || member.email;

        dbConn.prepare(`INSERT INTO pending_parent_signatures (member_id, template_id, parent_email, token, expires_at) VALUES (?, ?, ?, ?, ?)`).run(
          member.id, templateId, parentEmail, token, expiresAt
        );

        const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/parent-sign/${token}`;
        const subject = `Please sign waiver for ${member.first_name} ${member.last_name} - ROAR MMA`;
        const body = `
          <div style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px;">
            <h2>Parent Waiver Signature Required</h2>
            <p>Dear Parent/Guardian,</p>
            <p><strong>${member.first_name} ${member.last_name}</strong> needs a parent or guardian to sign their waiver.</p>
            <p>Please click the link below to review and sign the waiver:</p>
            <p style="text-align:center;margin:30px 0;">
              <a href="${link}" style="background:#dc2626;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px;display:inline-block;">Sign Waiver Now</a>
            </p>
            <p>This link will expire in 7 days.</p>
            <p>— ROAR MMA Team</p>
          </div>
        `;

        await messagingProviders.sendEmail(parentEmail, subject, body);
        dbConn.prepare(`UPDATE event_queue SET status = 'completed', processed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(evt.id);
        console.log(`[MESSAGING-AGENT] Sent parent waiver email to ${parentEmail} for ${member.first_name} ${member.last_name}`);
      } catch (err) {
        console.error(`[MESSAGING-AGENT] Failed SEND_PARENT_WAIVER event #${evt.id}:`, err.message);
        dbConn.prepare(`UPDATE event_queue SET status = 'failed', attempts = attempts + 1, error_message = ?, updated_at = datetime('now') WHERE id = ?`).run(err.message, evt.id);
      }
    }

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

    const summary = `${deliveryStats.sent || 0} messages sent, ${deliveryStats.failed || 0} failed, ${deliveryStats.pending || 0} pending. Success rate: ${successRate}%. ${overdueCount} overdue pending messages. ${parentWaiverEvents.length} parent waiver emails processed.`;

    await aiState.logActivity({
      agentName: agentName || 'messaging',
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
        overdue_messages: overdueCount,
        parent_waivers_processed: parentWaiverEvents.length
      },
      summary
    });

    console.log(`[MESSAGING-AGENT] ${summary}`);

    if (deliveryStats.failed > 0 && successRate < 80 && broadcast) {
      broadcast({ type: 'messaging_agent_alert', summary, successRate, failed: deliveryStats.failed });
    }
  } catch (err) {
    console.error('[MESSAGING-AGENT] Error:', err.stack || err.message);
    try {
      await aiState.logActivity({
        agentName: agentName || 'messaging',
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
