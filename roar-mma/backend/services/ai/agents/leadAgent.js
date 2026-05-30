// Lead Agent - Processes new leads, scores them, creates tasks, flags untouched leads
const leadsData = require('../../../data/leads');
const leadScoringData = require('../../../data/leadScoring');
const staffTasksData = require('../../../data/staffTasks');

async function handler({ db, aiState, openRouter, broadcast, config }) {
  try {
    console.log('[LEAD-AGENT] Starting lead processing...');

    // 1. Check for new leads in last 60 min that haven't been contacted
    const sixtyMinAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const allLeads = (leadsData.getAllLeads({}) || []).slice(0, 500);
    const newUncontactedLeads = allLeads.filter(l => {
      if (l.stage !== 'new') return false;
      const created = new Date(l.created_at);
      return created >= new Date(sixtyMinAgo);
    });

    let tasksCreated = 0;

    for (const lead of newUncontactedLeads.slice(0, 50)) {
      if (!lead || !lead.id) continue;
      try {
        const score = leadScoringData.calculateLeadScore(lead);
        if (score > 50) {
          staffTasksData.createTask({
            lead_id: lead.id,
            task_type: 'call_hot_lead',
            priority: 'high',
            title: `Hot lead: ${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
            description: `Lead scored ${score}/100. Call immediately. Source: ${lead.source || 'unknown'}.`,
            due_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            status: 'pending'
          });
          tasksCreated++;
          console.log(`[LEAD-AGENT] Created hot lead task for lead #${lead.id} (score: ${score})`);
        }
      } catch (loopErr) {
        console.error(`[LEAD-AGENT] Error scoring lead #${lead.id}:`, loopErr.message);
      }
    }

    // 2. Check leads in 'new' stage for > 24 hours - flag needing attention
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const untouchedLeads = allLeads.filter(l => {
      if (l.stage !== 'new') return false;
      const created = new Date(l.created_at);
      return created < twentyFourHoursAgo;
    });

    let flaggedCount = 0;
    for (const lead of untouchedLeads.slice(0, 50)) {
      if (!lead || !lead.id) continue;
      try {
        const existingTasks = staffTasksData.getAllTasks({
          lead_id: lead.id,
          task_type: 'untouched_lead',
          status: 'pending'
        });
        if (!existingTasks || existingTasks.length === 0) {
          staffTasksData.createTask({
            lead_id: lead.id,
            task_type: 'untouched_lead',
            priority: 'medium',
            title: `Untouched lead: ${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
            description: `Lead in 'new' stage for > 24 hours. Created: ${lead.created_at}. Needs initial contact.`,
            due_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
            status: 'pending'
          });
          flaggedCount++;
        }
      } catch (loopErr) {
        console.error(`[LEAD-AGENT] Error flagging lead #${lead.id}:`, loopErr.message);
      }
    }

    // 3. Check leads not contacted in 3+ days with warm/hot interest
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const staleWarmLeads = allLeads.filter(l => {
      if (l.stage === 'converted' || l.stage === 'lost') return false;
      if (l.trial_interest_level !== 'warm' && l.trial_interest_level !== 'hot') return false;
      const lastContact = l.last_contact_date ? new Date(l.last_contact_date) : null;
      if (!lastContact) return new Date(l.created_at) < threeDaysAgo;
      return lastContact < threeDaysAgo;
    });

    let checkinTasks = 0;
    for (const lead of staleWarmLeads.slice(0, 50)) {
      if (!lead || !lead.id) continue;
      try {
        const existing = staffTasksData.getAllTasks({
          lead_id: lead.id,
          task_type: 'check_in',
          status: 'pending'
        });
        if (!existing || existing.length === 0) {
          staffTasksData.createTask({
            lead_id: lead.id,
            task_type: 'check_in',
            priority: 'medium',
            title: `Check-in: ${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
            description: `Warm/hot lead not contacted in 3+ days. Interest: ${lead.trial_interest_level || 'N/A'}. Last contact: ${lead.last_contact_date || 'never'}.`,
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending'
          });
          checkinTasks++;
        }
      } catch (loopErr) {
        console.error(`[LEAD-AGENT] Error checking lead #${lead.id}:`, loopErr.message);
      }
    }

    const totalTasks = tasksCreated + flaggedCount + checkinTasks;
    const summary = `Processed ${allLeads.length} leads. Created ${totalTasks} tasks (${tasksCreated} hot lead, ${flaggedCount} untouched flagged, ${checkinTasks} check-in).`;

    await aiState.logActivity({
      actionType: 'lead_check',
      details: {
        total_leads: allLeads.length,
        new_uncontacted: newUncontactedLeads.length,
        tasks_created: totalTasks,
        untouched_flagged: flaggedCount,
        checkin_tasks: checkinTasks
      },
      summary
    });

    console.log(`[LEAD-AGENT] ${summary}`);

    if (totalTasks > 0) {
      broadcast({ type: 'lead_agent_update', summary, tasksCreated: totalTasks });
    }
  } catch (err) {
    console.error('[LEAD-AGENT] Error:', err.stack || err.message);
    try {
      await aiState.logActivity({
        actionType: 'lead_check_error',
        details: { error: err.message },
        summary: `Lead agent failed: ${err.message}`
      });
    } catch (logErr) {
      console.error('[LEAD-AGENT] Failed to log activity:', logErr.message);
    }
  }
}

module.exports = { handler };
