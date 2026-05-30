// Lead nurturing sequences - multi-day automated campaigns
const scheduledMessagesData = require('../data/scheduledMessages');
const messageTemplatesData = require('../data/messageTemplates');
const leadsData = require('../data/leads');

class NurturingSequences {
  // New lead sequence (Days 0, 3, 7)
  static scheduleNewLeadSequence(leadId) {
    const lead = leadsData.getLeadById(leadId);
    if (!lead) throw new Error('Lead not found');

    const templates = messageTemplatesData.getAllTemplates({ active: 1 });
    const templateMap = {};
    templates.forEach(t => { templateMap[t.trigger_event] = t; });

    const messages = [];

    // Day 0: Welcome message (supports both email and SMS)
    const newLeadTemplate = templateMap.lead_new;
    if (newLeadTemplate) {
      const scheduled = new Date();
      scheduled.setMinutes(scheduled.getMinutes() + 5);

      const baseMessage = {
        lead_id: leadId,
        template_id: newLeadTemplate.id,
        scheduled_for: scheduled.toISOString(),
      };

      if (newLeadTemplate.type === 'email') {
        messages.push({
          ...baseMessage,
          message_type: 'email',
          recipient_email: lead.email,
          subject: newLeadTemplate.subject,
          body: newLeadTemplate.body,
        });
      } else if (newLeadTemplate.type === 'sms') {
        messages.push({
          ...baseMessage,
          message_type: 'sms',
          recipient_phone: lead.phone,
          body: newLeadTemplate.body,
        });
      }
    }

    // Day 3: No response follow-up
    if (templateMap.lead_no_response) {
      const day3 = new Date();
      day3.setDate(day3.getDate() + 3);
      day3.setHours(10, 0, 0, 0);

      messages.push({
        lead_id: leadId,
        message_type: 'sms',
        template_id: templateMap.lead_no_response.id,
        scheduled_for: day3.toISOString(),
        recipient_phone: lead.phone,
        body: templateMap.lead_no_response.body
      });
    }

    // Create all messages
    const created = [];
    for (const msg of messages) {
      const scheduled = scheduledMessagesData.createScheduledMessage(msg);
      created.push(scheduled);
    }

    return created;
  }

  // Trial booked sequence (reminder day before)
  static scheduleTrialBookedSequence(leadId, trialDate) {
    const lead = leadsData.getLeadById(leadId);
    if (!lead) throw new Error('Lead not found');

    const messages = [];
    const trial = new Date(trialDate);

    // Day before: Reminder SMS
    const dayBefore = new Date(trial);
    dayBefore.setDate(dayBefore.getDate() - 1);
    dayBefore.setHours(18, 0, 0, 0); // 6pm day before

    messages.push({
      lead_id: leadId,
      message_type: 'sms',
      scheduled_for: dayBefore.toISOString(),
      recipient_phone: lead.phone,
      body: `Hi {{first_name}}! Reminder: Your trial class at ROAR MMA is tomorrow at ${trial.toLocaleTimeString()}. See you on the mats! Reply CANCEL if you can't make it. - ROAR Team`
    });

    // Morning of: Final reminder
    const morningOf = new Date(trial);
    morningOf.setHours(9, 0, 0, 0);

    if (!trial) {
      return messages;
    }
    // Schedule morning-of reminder (always schedule; scheduler will send immediately if past due)
    messages.push({
      lead_id: leadId,
      message_type: 'sms',
      scheduled_for: morningOf.toISOString(),
      recipient_phone: lead.phone,
      body: `Hi {{first_name}}! Your trial at ROAR MMA is today at ${trial.toLocaleTimeString()}. Address: {{location}}. Can't wait to see you! - ROAR Team`
    });

    const created = [];
    for (const msg of messages) {
      const scheduled = scheduledMessagesData.createScheduledMessage(msg);
      created.push(scheduled);
    }

    return created;
  }

  // Cancel scheduled messages for a lead
  static cancelLeadSequence(leadId) {
    const messages = scheduledMessagesData.getAllScheduledMessages({
      lead_id: leadId,
      status: 'pending'
    });

    let cancelled = 0;
    for (const msg of messages) {
      scheduledMessagesData.cancelScheduledMessage(msg.id);
      cancelled++;
    }

    return cancelled;
  }

  // Re-engagement sequence for cold leads
  static scheduleReengagementSequence(leadId) {
    const lead = leadsData.getLeadById(leadId);
    if (!lead) throw new Error('Lead not found');

    const messages = [];

    // Day 0: Re-engagement SMS
    const now = new Date();
    now.setHours(now.getHours() + 1);

    messages.push({
      lead_id: leadId,
      message_type: 'sms',
      scheduled_for: now.toISOString(),
      recipient_phone: lead.phone,
      body: `Hi {{first_name}}, it's been a while! Still interested in trying martial arts at ROAR MMA? We have new class times available. Reply YES for details. - {{staff_name}}`
    });

    // Day 3: Special offer email
    const day3 = new Date();
    day3.setDate(day3.getDate() + 3);
    day3.setHours(10, 0, 0, 0);

    if (lead.email) {
      messages.push({
        lead_id: leadId,
        message_type: 'email',
        scheduled_for: day3.toISOString(),
        recipient_email: lead.email,
        subject: 'Special offer just for you, {{first_name}}',
        body: `Hi {{first_name}},\n\nWe noticed you haven't booked your trial yet. Here's a special offer:\n\n🎁 FREE trial class + FREE week of unlimited training\n\nThis offer expires in 48 hours.\n\nBook now: {{booking_link}}\n\nQuestions? Call {{gym_phone}}\n\n{{staff_name}}\nROAR MMA`
      });
    }

    const created = [];
    for (const msg of messages) {
      const scheduled = scheduledMessagesData.createScheduledMessage(msg);
      created.push(scheduled);
    }

    return created;
  }
}

module.exports = NurturingSequences;
