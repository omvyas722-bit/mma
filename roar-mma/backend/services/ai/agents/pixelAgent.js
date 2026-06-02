const { getDatabase } = require('../../../db/connection');

async function handler({ db, aiState, broadcast, config, agentName }) {
  try {
    const dbConn = db || getDatabase();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const summary = dbConn.prepare(`
      SELECT event_type, COUNT(*) as count, COALESCE(SUM(value),0) as total_value
      FROM pixel_events WHERE DATE(created_at) = ? GROUP BY event_type
    `).all(yesterday);

    const conversions = dbConn.prepare(`
      SELECT p.campaign_id, sc.name as campaign_name, COUNT(DISTINCT p.lead_id) as lead_conversions
      FROM pixel_events p LEFT JOIN social_campaigns sc ON p.campaign_id = sc.id
      WHERE p.event_type = 'Lead' AND DATE(p.created_at) = ? AND p.lead_id IS NOT NULL
      GROUP BY p.campaign_id
    `).all(yesterday);

    const report = { events: summary, conversions, date: yesterday };
    console.log(`[PIXEL-AGENT] Daily report: ${summary.length} event types, ${conversions.length} campaigns with conversions`);

    await aiState.logActivity({
      agentName: agentName || 'pixel',
      actionType: 'daily_report',
      details: report,
      summary: `Pixel processed: ${summary.reduce((a,b) => a+b.count, 0)} events, ${conversions.reduce((a,b) => a+lead_conversions, 0)} conversions`
    });

    if (broadcast) broadcast({ type: 'pixel_agent_update', report });
  } catch (err) {
    console.error('[PIXEL-AGENT] Error:', err.message);
    try { await aiState.logActivity({ agentName: 'pixel', actionType: 'pixel_error', details: { error: err.message }, summary: `Pixel failed: ${err.message}` }); } catch {}
  }
}

module.exports = { handler };