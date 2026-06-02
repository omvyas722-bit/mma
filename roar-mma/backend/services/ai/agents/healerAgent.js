const { getDatabase } = require('../../../db/connection');
const staffTasksData = require('../../../data/staffTasks');

async function handler({ db, aiState, broadcast, config, agentName }) {
  try {
    const dbConn = db || getDatabase();
    const members = dbConn.prepare(`
      SELECT m.*,
        (SELECT COUNT(*) FROM attendance a WHERE a.member_id = m.id AND a.check_in_time >= datetime('now', '-30 days')) as attendance_30d,
        (SELECT COUNT(*) FROM bookings b WHERE b.member_id = m.id AND b.created_at >= datetime('now', '-30 days')) as bookings_30d,
        (SELECT COALESCE(COUNT(*), 0) FROM transactions t WHERE t.member_id = m.id AND t.status = 'failed' AND t.created_at >= datetime('now', '-30 days')) as failed_payments_30d,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions t WHERE t.member_id = m.id AND t.status = 'completed' AND t.created_at >= datetime('now', '-30 days')) as revenue_30d,
        (SELECT COUNT(*) FROM bookings b WHERE b.member_id = m.id AND b.status = 'no_show' AND b.created_at >= datetime('now', '-30 days')) as no_shows_30d
      FROM members m WHERE m.status IN ('active','trial')
    `).all();

    const now = new Date();
    let updated = 0;
    let tasksCreated = 0;

    for (const m of members) {
      let score = 100;
      const factors = {};

      // Attendance (-20 if 0 classes in 30d)
      if (m.attendance_30d === 0) { score -= 20; factors.low_attendance = -20; }
      else if (m.attendance_30d < 4) { score -= 10; factors.low_attendance = -10; }

      // No-shows (-5 per no-show, max -15)
      const noShowPenalty = Math.min((m.no_shows_30d || 0) * 5, 15);
      if (noShowPenalty > 0) { score -= noShowPenalty; factors.no_shows = -noShowPenalty; }

      // Failed payments (-10 per failed, max -30)
      const failedPenalty = Math.min((m.failed_payments_30d || 0) * 10, 30);
      if (failedPenalty > 0) { score -= failedPenalty; factors.failed_payments = -failedPenalty; }

      // Inactivity duration (-5 per 7 days since last attendance, max -25)
      const lastActivity = m.last_visit || m.updated_at || m.joined_date;
      if (lastActivity) {
        const daysSince = (now - new Date(lastActivity).getTime()) / 86400000;
        const inactivityPenalty = Math.min(Math.floor(daysSince / 7) * 5, 25);
        if (inactivityPenalty > 0) { score -= inactivityPenalty; factors.inactivity = -inactivityPenalty; }
      } else {
        score -= 10;
        factors.inactivity = -10;
      }

      // Trial bonus (+10 for trial members)
      if (m.status === 'trial') {
        score += 10;
        factors.trial_bonus = 10;
      }

      const finalScore = Math.max(0, Math.min(100, score));
      dbConn.prepare("UPDATE members SET health_score=?, health_score_updated_at=datetime('now'), health_score_factors=? WHERE id=?")
        .run(finalScore, JSON.stringify(factors), m.id);
      updated++;

      // Flag critical members for intervention
      if (finalScore <= 30) {
        const existing = dbConn.prepare("SELECT id FROM staff_tasks WHERE member_id=? AND task_type='healer_intervention' AND status='pending'").get(m.id);
        if (!existing) {
          staffTasksData.createTask({
            member_id: m.id,
            task_type: 'healer_intervention',
            priority: 'high',
            title: `Critical health: ${m.first_name || ''} ${m.last_name || ''}`.trim(),
            description: `Health score: ${finalScore}/100. Factors: ${JSON.stringify(factors)}. Requires intervention.`,
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending'
          });
          tasksCreated++;
        }
      }
    }

    const summary = `Healed ${members.length} members, health scores updated. ${tasksCreated} interventions created.`;
    console.log(`[HEALER-AGENT] ${summary}`);

    await aiState.logActivity({
      agentName: agentName || 'healer',
      actionType: 'health_scoring',
      details: { total_members: members.length, updated, tasks_created: tasksCreated },
      summary
    });

    if ((tasksCreated > 0) && broadcast) broadcast({ type: 'healer_agent_update', summary, tasksCreated });
  } catch (err) {
    console.error('[HEALER-AGENT] Error:', err.message);
    try { await aiState.logActivity({ agentName: 'healer', actionType: 'healer_error', details: { error: err.message }, summary: `Healer failed: ${err.message}` }); } catch {}
  }
}

module.exports = { handler };