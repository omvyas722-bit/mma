// Trial Agent - Manages trial pipeline: no-shows, conversions, reminders, rate tracking
const leadsData = require('../../../data/leads');
const staffTasksData = require('../../../data/staffTasks');
const scheduledMessagesData = require('../../../data/scheduledMessages');
const { getDatabase } = require('../../../db/connection');

async function handler({ db, aiState, broadcast, config, agentName }) {
  try {
    console.log('[TRIAL-AGENT] Starting trial pipeline check...');

    const dbConn = db || getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const todayStart = today + 'T00:00:00';
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1. No-shows: trial_booked with past trial_date
    const trialLeads = (leadsData.getAllLeads({ stage: 'trial_booked' }).leads || []).slice(0, 200);
    const noShows = trialLeads.filter(l => {
      if (!l.trial_date) return false;
      return l.trial_date < today;
    });

    let noShowTasks = 0;
    for (const lead of noShows.slice(0, 50)) {
      if (!lead || !lead.id) continue;
      try {
        const existing = staffTasksData.getAllTasks({
          lead_id: lead.id,
          task_type: 'check_no_show',
          status: 'pending'
        });
        if (!existing || existing.length === 0) {
          staffTasksData.createTask({
            lead_id: lead.id,
            task_type: 'check_no_show',
            priority: 'high',
            title: `No-show follow-up: ${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
            description: `Trial was on ${lead.trial_date} but lead is still in trial_booked stage. Contact to reschedule.`,
            due_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
            status: 'pending'
          });
          noShowTasks++;
        }
      } catch (loopErr) {
        console.error(`[TRIAL-AGENT] Error processing no-show lead #${lead.id}:`, loopErr.message);
      }
    }

    // 2. High interest trial_completed not converted in 7 days
    const completedLeads = (leadsData.getAllLeads({ stage: 'trial_completed' }).leads || []).slice(0, 200);
    const highInterestNotConverted = completedLeads.filter(l => {
      if (!l || !l.trial_interest_level) return false;
      if (l.trial_interest_level !== 'hot' && l.trial_interest_level !== 'warm') return false;
      if (!l.trial_date) return false;
      return l.trial_date < sevenDaysAgo;
    });

    let followUpTasks = 0;
    for (const lead of highInterestNotConverted.slice(0, 50)) {
      if (!lead || !lead.id) continue;
      try {
        const existing = staffTasksData.getAllTasks({
          lead_id: lead.id,
          task_type: 'follow_up',
          status: 'pending'
        });
        if (!existing || existing.length === 0) {
          staffTasksData.createTask({
            lead_id: lead.id,
            task_type: 'follow_up',
            priority: 'high',
            title: `Follow-up high interest: ${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
            description: `High interest (${lead.trial_interest_level}) trial ${lead.trial_date} completed but not converted in 7+ days.`,
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending'
          });
          followUpTasks++;
        }
      } catch (loopErr) {
        console.error(`[TRIAL-AGENT] Error processing follow-up lead #${lead.id}:`, loopErr.message);
      }
    }

    // 3. Trial tomorrow - schedule reminder messages
    const tomorrowBooked = trialLeads.filter(l => l && l.trial_date === tomorrow).slice(0, 50);

    let remindersScheduled = 0;
    for (const lead of tomorrowBooked.slice(0, 30)) {
      if (!lead || !lead.id) continue;
      try {
        const existingMessages = scheduledMessagesData.getAllScheduledMessages({
          lead_id: lead.id,
          status: 'pending'
        });
        const hasReminder = existingMessages && existingMessages.some(m => m.body && m.body.includes('trial'));
        if (!hasReminder) {
          const reminderTime = new Date(tomorrow + 'T08:00:00').toISOString();
          scheduledMessagesData.createScheduledMessage({
            lead_id: lead.id,
            message_type: 'sms',
            scheduled_for: reminderTime,
            recipient_phone: lead.phone,
            body: `Hi ${lead.first_name}, this is a reminder about your trial at ROAR MMA tomorrow! We're excited to have you. Reply if you need to reschedule.`,
            status: 'pending'
          });
          remindersScheduled++;
        }
      } catch (loopErr) {
        console.error(`[TRIAL-AGENT] Error scheduling reminder for lead #${lead.id}:`, loopErr.message);
      }
    }

    // 4. Trial conversion rate
    const conversionStats = dbConn.prepare(`
      SELECT
        COUNT(*) as total_completed,
        SUM(CASE WHEN stage = 'converted' THEN 1 ELSE 0 END) as converted
      FROM leads
      WHERE stage IN ('trial_completed', 'converted')
        AND trial_date IS NOT NULL
    `).get();

    const conversionRate = conversionStats.total_completed > 0
      ? Math.round((conversionStats.converted / conversionStats.total_completed) * 100)
      : 0;

    const summary = `Trial pipeline: ${noShowTasks} no-shows flagged, ${followUpTasks} follow-ups created, ${remindersScheduled} reminders scheduled. Conversion rate: ${conversionRate}% (${conversionStats.converted}/${conversionStats.total_completed}).`;

    await aiState.logActivity({
      agentName: agentName || 'trials',
      actionType: 'trial_pipeline_check',
      details: {
        no_shows: noShowTasks,
        follow_ups: followUpTasks,
        reminders_scheduled: remindersScheduled,
        conversion_rate: conversionRate,
        total_completed: conversionStats.total_completed,
        total_converted: conversionStats.converted
      },
      summary
    });

    console.log(`[TRIAL-AGENT] ${summary}`);

    if ((noShowTasks > 0 || followUpTasks > 0) && broadcast) {
      broadcast({ type: 'trial_agent_update', summary, noShowTasks, followUpTasks });
    }
  } catch (err) {
    console.error('[TRIAL-AGENT] Error:', err.stack || err.message);
    try {
      await aiState.logActivity({
        agentName: agentName || 'trials',
        actionType: 'trial_pipeline_error',
        details: { error: err.message },
        summary: `Trial agent failed: ${err.message}`
      });
    } catch (logErr) {
      console.error('[TRIAL-AGENT] Failed to log activity:', logErr.message);
    }
  }
}

module.exports = { handler };
