// Task automation service - auto-generate staff tasks based on triggers
const staffTasksData = require('../data/staffTasks');
const leadScoringData = require('../data/leadScoring');
const leadsData = require('../data/leads');

class TaskAutomation {
  // Auto-generate task when new hot lead created
  static createHotLeadTask(lead) {
    const score = leadScoringData.calculateLeadScore(lead);

    if (score >= 70) {
      const dueDate = new Date();
      dueDate.setMinutes(dueDate.getMinutes() + 15); // Due in 15 minutes

      return staffTasksData.createTask({
        lead_id: lead.id,
        assigned_to: lead.assigned_to,
        task_type: 'call_hot_lead',
        priority: 'critical',
        title: `🔥 Call hot lead: ${lead.first_name} ${lead.last_name}`,
        description: `High-priority lead (score: ${score}). Call within 15 minutes.\nPhone: ${lead.phone}\nSource: ${lead.source}`,
        due_date: dueDate.toISOString()
      });
    }
  }

  // Auto-generate task for trial follow-up
  static createTrialFollowUpTask(lead) {
    if (lead.stage === 'trial_completed' && lead.trial_interest_level === 'hot') {
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + 24); // Due in 24 hours

      return staffTasksData.createTask({
        lead_id: lead.id,
        assigned_to: lead.assigned_to,
        task_type: 'follow_up_trial',
        priority: 'high',
        title: `Follow up on hot trial: ${lead.first_name} ${lead.last_name}`,
        description: `Trial completed with high interest. Push for conversion.\nPhone: ${lead.phone}\nRating: ${lead.trial_experience_rating}/5\nNotes: ${lead.trial_notes || 'None'}`,
        due_date: dueDate.toISOString()
      });
    }
  }

  // Auto-generate task for no-show trial
  static createNoShowTask(lead) {
    if (lead.stage === 'trial_booked' && lead.trial_date) {
      const trialDate = new Date(lead.trial_date);
      const now = new Date();

      // If trial was scheduled in past and still in trial_booked stage
      if (trialDate < now) {
        const dueDate = new Date();
        dueDate.setHours(dueDate.getHours() + 2); // Due in 2 hours

        return staffTasksData.createTask({
          lead_id: lead.id,
          assigned_to: lead.assigned_to,
          task_type: 'check_no_show',
          priority: 'high',
          title: `Check no-show: ${lead.first_name} ${lead.last_name}`,
          description: `Trial was scheduled for ${trialDate.toLocaleDateString()} but lead still in trial_booked stage. Call to reschedule.\nPhone: ${lead.phone}`,
          due_date: dueDate.toISOString()
        });
      }
    }
  }

  // Auto-generate task for warm lead check-in
  static createWarmLeadTask(lead) {
    if (lead.last_contact_date) {
      const lastContact = new Date(lead.last_contact_date);
      const now = new Date();
      const daysSince = (now - lastContact) / (1000 * 60 * 60 * 24);

      // If no contact in 3+ days and lead is warm/hot
      if (daysSince >= 3 && (lead.trial_interest_level === 'warm' || lead.trial_interest_level === 'hot')) {
        const dueDate = new Date();
        dueDate.setHours(dueDate.getHours() + 4);

        return staffTasksData.createTask({
          lead_id: lead.id,
          assigned_to: lead.assigned_to,
          task_type: 'warm_lead_checkin',
          priority: lead.trial_interest_level === 'hot' ? 'high' : 'medium',
          title: `Check in with ${lead.trial_interest_level} lead: ${lead.first_name} ${lead.last_name}`,
          description: `No contact in ${Math.floor(daysSince)} days. Re-engage before they go cold.\nPhone: ${lead.phone}\nLast contact: ${lastContact.toLocaleDateString()}`,
          due_date: dueDate.toISOString()
        });
      }
    }
  }

  // Auto-generate task for trial reminder (day before)
  static createTrialReminderTask(lead) {
    if (lead.stage === 'trial_booked' && lead.trial_date) {
      const trialDate = new Date(lead.trial_date);
      const now = new Date();
      const hoursUntil = (trialDate - now) / (1000 * 60 * 60);

      // If trial is 12-36 hours away
      if (hoursUntil > 12 && hoursUntil < 36) {
        const dueDate = new Date(trialDate);
        dueDate.setHours(dueDate.getHours() - 24); // Due 24 hours before trial

        return staffTasksData.createTask({
          lead_id: lead.id,
          assigned_to: lead.assigned_to,
          task_type: 'trial_reminder',
          priority: 'medium',
          title: `Send trial reminder: ${lead.first_name} ${lead.last_name}`,
          description: `Trial scheduled for ${trialDate.toLocaleDateString()} at ${trialDate.toLocaleTimeString()}. Send reminder SMS.\nPhone: ${lead.phone}`,
          due_date: dueDate.toISOString()
        });
      }
    }
  }

  // Run all automation checks for a lead
  static processLead(lead) {
    const tasks = [];

    try {
      const hotLeadTask = this.createHotLeadTask(lead);
      if (hotLeadTask) tasks.push(hotLeadTask);
    } catch (err) {
      console.error('Error creating hot lead task:', err);
    }

    try {
      const trialFollowUpTask = this.createTrialFollowUpTask(lead);
      if (trialFollowUpTask) tasks.push(trialFollowUpTask);
    } catch (err) {
      console.error('Error creating trial follow-up task:', err);
    }

    try {
      const noShowTask = this.createNoShowTask(lead);
      if (noShowTask) tasks.push(noShowTask);
    } catch (err) {
      console.error('Error creating no-show task:', err);
    }

    try {
      const warmLeadTask = this.createWarmLeadTask(lead);
      if (warmLeadTask) tasks.push(warmLeadTask);
    } catch (err) {
      console.error('Error creating warm lead task:', err);
    }

    try {
      const reminderTask = this.createTrialReminderTask(lead);
      if (reminderTask) tasks.push(reminderTask);
    } catch (err) {
      console.error('Error creating trial reminder task:', err);
    }

    return tasks;
  }

  // Scan all leads and generate tasks
  static scanAllLeads() {
    const allLeads = leadsData.getAllLeads({});
    const generatedTasks = [];

    for (const lead of allLeads) {
      // Skip converted/lost leads
      if (lead.stage === 'converted' || lead.stage === 'lost') {
        continue;
      }

      const tasks = this.processLead(lead);
      generatedTasks.push(...tasks);
    }

    console.log(`✓ Task automation scan complete: ${generatedTasks.length} tasks generated`);
    return generatedTasks;
  }
}

module.exports = TaskAutomation;
