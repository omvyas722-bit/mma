const { getDatabase } = require('../../../db/connection');
const staffTasksData = require('../../../data/staffTasks');
const { emit: agentStep } = require('../agentSteps');

async function handler({ db, aiState, broadcast, config, agentName }) {
  try {
    const dbConn = db || getDatabase();
    agentStep(broadcast, agentName || 'healer', 'load', 'Loading members for health scoring');
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

    agentStep(broadcast, agentName || 'healer', 'scoring', `Scoring ${members.length} members`);
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

      // Chronic no-show flag (3+ no-shows without cancellation in 60 days)
      const chronicNoShows = dbConn.prepare(`
        SELECT COUNT(*) as c FROM bookings
        WHERE member_id=? AND status='no_show' AND created_at >= datetime('now', '-60 days')
      `).get(m.id)?.c || 0;
      if (chronicNoShows >= 3) {
        score -= 10; factors.chronic_no_show = -10;
        const existingFlag = dbConn.prepare("SELECT id FROM staff_tasks WHERE member_id=? AND task_type='chronic_no_show' AND status='pending'").get(m.id);
        if (!existingFlag) {
          staffTasksData.createTask({
            member_id: m.id, task_type: 'chronic_no_show', priority: 'high',
            title: `Chronic no-show: ${m.first_name || ''} ${m.last_name || ''}`.trim(),
            description: `Flagged for ${chronicNoShows} consecutive no-shows without cancellation. Requires follow-up.`,
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), status: 'pending'
          });
          tasksCreated++;
        }
      }

      // Pause return alert (7 days before pause_end)
      if (m.status === 'paused' && m.pause_end) {
        const daysUntilReturn = Math.round((new Date(m.pause_end).getTime() - Date.now()) / 86400000);
        if (daysUntilReturn >= 0 && daysUntilReturn <= 7) {
          const existingAlert = dbConn.prepare("SELECT id FROM staff_tasks WHERE member_id=? AND task_type='pause_return_alert' AND status='pending'").get(m.id);
          if (!existingAlert) {
            staffTasksData.createTask({
              member_id: m.id, task_type: 'pause_return_alert', priority: 'medium',
              title: `Pause return: ${m.first_name || ''} ${m.last_name || ''}`.trim(),
              description: `Pause ends ${m.pause_end} (${daysUntilReturn} days). Send return reminder.`,
              due_date: m.pause_end, status: 'pending'
            });
            tasksCreated++;
          }
        }
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

    await analyzeRejectionPatterns({ db: dbConn, aiState, broadcast, agentName });
  } catch (err) {
    console.error('[HEALER-AGENT] Error:', err.message);
    try { await aiState.logActivity({ agentName: 'healer', actionType: 'healer_error', details: { error: err.message }, summary: `Healer failed: ${err.message}` }); } catch (logErr) { console.error('[HEALER] Log error:', logErr.message); }
  }
}

async function analyzeRejectionPatterns({ db, aiState, broadcast, agentName }) {
  try {
    agentStep(broadcast, agentName || 'healer', 'rejection_analysis', 'Analyzing failure patterns');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const recentRejections = db.prepare(`
      SELECT action_type, COUNT(*) as count
      FROM ai_activity_log
      WHERE status = 'failed'
        AND created_at >= datetime('now', '-7 days')
        AND agent_name != 'healer'
      GROUP BY action_type
      HAVING count >= 3
    `).all();

    agentStep(broadcast, agentName || 'healer', 'rejection_analysis', `Found ${recentRejections.length} failure patterns to analyze`);
    for (const rejection of recentRejections) {
      const existingProposal = db.prepare(`
        SELECT id FROM ai_activity_log
        WHERE agent_name = 'healer'
          AND action_type = 'healer_proposal'
          AND details LIKE ?
          AND created_at >= datetime('now', '-7 days')
      `).get(`%"message_type":"${rejection.action_type}"%`);

      if (existingProposal) continue;

      const samples = db.prepare(`
        SELECT summary, details FROM ai_activity_log
        WHERE action_type = ? AND status = 'failed'
          AND created_at >= datetime('now', '-7 days')
        LIMIT 3
      `).all(rejection.action_type);

      const errorReasons = samples.map(s => {
        try {
          const d = typeof s.details === 'string' ? JSON.parse(s.details) : (s.details || {});
          return d.error || s.summary || 'unknown';
        } catch { return s.summary || 'unknown'; }
      }).filter(Boolean);

      const suggestion = `Modify prompt for ${rejection.action_type} to reduce failures. Recent errors: ${errorReasons.join('; ')}`;

      const details = {
        message_type: rejection.action_type,
        failure_count: rejection.count,
        samples: errorReasons,
        suggestion,
        status: 'pending'
      };

      db.prepare(`
        INSERT INTO ai_activity_log (agent_name, action_type, summary, details, status)
        VALUES (?, ?, ?, ?, ?)
      `).run('healer', 'healer_proposal', suggestion, JSON.stringify(details), 'pending');

      agentStep(broadcast, agentName || 'healer', 'healing', `Proposed fix for ${rejection.action_type} (${rejection.count} failures)`);
      console.log(`[HEALER] Generated improvement proposal for ${rejection.action_type} (${rejection.count} failures)`);

      if (broadcast) {
        broadcast({ type: 'healer_proposal', data: { message_type: rejection.action_type, failure_count: rejection.count, suggestion } });
      }
    }

    const approvedProposals = db.prepare(`
      SELECT * FROM ai_activity_log
      WHERE agent_name = 'healer'
        AND action_type = 'healer_proposal'
        AND status = 'approved'
        AND created_at >= datetime('now', '-30 days')
    `).all();

    for (const proposal of approvedProposals) {
      try {
        const details = typeof proposal.details === 'string' ? JSON.parse(proposal.details) : (proposal.details || {});
        const agentDb = details.message_type ? db.prepare("SELECT agent_name FROM ai_activity_log WHERE action_type = ? LIMIT 1").get(details.message_type) : null;

        if (agentDb) {
          const config = await aiState.getAgentConfig(agentDb.agent_name);
          if (config) {
            const existingPrompt = config.config_json?.prompt_override || '';
            const newPrompt = existingPrompt
              ? `${existingPrompt}\n\n[HEALER IMPROVEMENT] ${details.suggestion}`
              : `[HEALER IMPROVEMENT] ${details.suggestion}`;

            await aiState.updateAgentConfig(agentDb.agent_name, {
              config_json: { ...(config.config_json || {}), prompt_override: newPrompt, healer_improved_at: new Date().toISOString() }
            });

            await aiState.logActivity({
              agentName: 'healer',
              actionType: 'improvement_applied',
              summary: `Applied prompt improvement to ${agentDb.agent_name}: ${details.suggestion}`,
              status: 'completed',
              details: { agent: agentDb.agent_name, message_type: details.message_type, suggestion: details.suggestion }
            });
          }
        }
      } catch (applyErr) {
        console.error('[HEALER] Failed to apply proposal:', applyErr.message);
      }
    }
  } catch (err) {
    console.error('[HEALER] Rejection analysis error:', err.message);
  }
}

module.exports = { handler, analyzeRejectionPatterns };