// Analytics Agent - Daily briefing: queries unified analytics, detects anomalies, logs summary
const unifiedAnalytics = require('../../unifiedAnalytics');
const { getDatabase } = require('../../../db/connection');

async function handler({ db, aiState, openRouter, broadcast, config }) {
  try {
    console.log('[ANALYTICS-AGENT] Starting daily analytics...');

    const dbConn = db || getDatabase();

    // Only runs once per day - check aiState for last analytics run
    const lastRun = dbConn.prepare(`
      SELECT created_at FROM ai_activity_log
      WHERE action_type = 'daily_analytics_briefing'
      ORDER BY created_at DESC LIMIT 1
    `).get();

    if (lastRun) {
      const lastRunDate = new Date(lastRun.created_at).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      if (lastRunDate === today) {
        console.log('[ANALYTICS-AGENT] Already ran today, skipping.');
        return;
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Today's metrics
    const todayMetrics = unifiedAnalytics.getDashboardOverview(todayStr, todayStr);
    // Yesterday's for comparison
    const yesterdayMetrics = unifiedAnalytics.getDashboardOverview(yesterday, yesterday);

    const leadsToday = todayMetrics.leads.total_leads;
    const leadsYesterday = yesterdayMetrics.leads.total_leads;

    const revenueToday = todayMetrics.revenue.total_revenue;
    const revenueYesterday = yesterdayMetrics.revenue.total_revenue;

    const signupsToday = todayMetrics.revenue.new_signups;
    const signupsYesterday = yesterdayMetrics.revenue.new_signups;

    const trialsToday = todayMetrics.trials.trials_booked;
    const trialsYesterday = yesterdayMetrics.trials.trials_booked;

    // Calculate percentage changes
    const pct = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    const leadChange = pct(leadsToday, leadsYesterday);
    const revenueChange = pct(revenueToday, revenueYesterday);
    const signupChange = pct(signupsToday, signupsYesterday);
    const trialChange = pct(trialsToday, trialsYesterday);

    // Detect anomalies
    const anomalies = [];
    if (leadsToday > 0 && leadsYesterday > 0 && leadChange <= -50) {
      anomalies.push(`Leads dropped ${Math.abs(leadChange)}% compared to yesterday`);
    }
    if (revenueToday > 0 && revenueYesterday > 0 && revenueChange <= -50) {
      anomalies.push(`Revenue dropped ${Math.abs(revenueChange)}% compared to yesterday`);
    }
    if (leadsToday > 0 && leadsYesterday > 0 && leadChange >= 100) {
      anomalies.push(`Leads surged ${leadChange}% compared to yesterday`);
    }

    const briefing = `Today: ${leadsToday} new leads, $${revenueToday} revenue, ${signupsToday} members joined, ${trialsToday} trials booked. Compared to yesterday: ${leadChange >= 0 ? '+' : ''}${leadChange}% leads, ${revenueChange >= 0 ? '+' : ''}${revenueChange}% revenue, ${signupChange >= 0 ? '+' : ''}${signupChange}% signups, ${trialChange >= 0 ? '+' : ''}${trialChange}% trials.${anomalies.length > 0 ? ` Anomalies: ${anomalies.join('; ')}.` : ''}`;

    await aiState.logActivity({
      actionType: 'daily_analytics_briefing',
      details: {
        today: todayMetrics,
        yesterday: yesterdayMetrics,
        changes: {
          leads_pct: leadChange,
          revenue_pct: revenueChange,
          signups_pct: signupChange,
          trials_pct: trialChange
        },
        anomalies
      },
      summary: briefing
    });

    console.log(`[ANALYTICS-AGENT] ${briefing}`);

    if (anomalies.length > 0) {
      broadcast({ type: 'analytics_anomaly', anomalies, summary: briefing });
    }
  } catch (err) {
    console.error('[ANALYTICS-AGENT] Error:', err.message);
    try {
      await aiState.logActivity({
        actionType: 'daily_analytics_error',
        details: { error: err.message },
        summary: `Analytics agent failed: ${err.message}`
      });
    } catch (_) {}
  }
}

module.exports = { handler };
