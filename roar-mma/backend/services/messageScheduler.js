// Message scheduler service - processes and sends scheduled messages
const scheduledMessagesData = require('../data/scheduledMessages');
const messageTemplatesData = require('../data/messageTemplates');
const leadsData = require('../data/leads');
const winbackAutomation = require('./winbackAutomation');
const messagingProviders = require('./messagingProviders');

class MessageScheduler {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.checkInterval = 60000; // Check every minute
  }

  start() {
    if (this.isRunning) {
      console.log('Message scheduler already running');
      return;
    }

    console.log('Starting message scheduler...');
    this.isRunning = true;

    // Run immediately on start
    this.processMessages();

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.processMessages();
    }, this.checkInterval);
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping message scheduler...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async processMessages() {
    try {
      // Process scheduled messages
      const pendingMessages = scheduledMessagesData.getPendingMessages();

      if (pendingMessages.length > 0) {
        console.log(`Processing ${pendingMessages.length} pending messages...`);

        for (const message of pendingMessages) {
          try {
            await this.sendMessage(message);
          } catch (error) {
            console.error(`Failed to send message ${message.id}:`, error);
            scheduledMessagesData.markMessageFailed(message.id, error.message);
          }
        }
      }

      // Process win-back campaigns
      winbackAutomation.processWinbackCampaigns();
    } catch (error) {
      console.error('Error processing messages:', error);
    }
  }

  async sendMessage(message) {
    console.log(`Sending ${message.message_type} to ${message.recipient_phone || message.recipient_email}`);

    // Personalize message body
    const personalizedBody = this.personalizeMessage(message);

    let result;

    if (message.message_type === 'sms') {
      result = await this.sendSMS(message.recipient_phone, personalizedBody, message.id);
    } else if (message.message_type === 'email') {
      result = await this.sendEmail(
        message.recipient_email,
        message.subject,
        personalizedBody,
        message.id
      );
    }

    // Check if send was successful
    if (!result.success) {
      throw new Error(result.reason || result.error || 'Send failed');
    }

    // Mark as sent
    scheduledMessagesData.markMessageSent(message.id);

    // Update lead follow-up tracking
    if (message.lead_id) {
      const lead = leadsData.getLeadById(message.lead_id);
      const currentCount = (lead && lead.follow_up_count) || 0;
      leadsData.updateLead(message.lead_id, {
        last_contact_date: new Date().toISOString(),
        follow_up_count: currentCount + 1
      });
    }

    console.log(`✓ Message ${message.id} sent successfully`);
  }

  personalizeMessage(message) {
    if (!message || !message.body) return message?.body || '';
    let body = message.body;

    const replacements = {
      '{{first_name}}': message.lead_first_name || message.member_first_name || '',
      '{{last_name}}': message.lead_last_name || message.member_last_name || '',
      '{{phone}}': message.lead_phone || message.member_phone || '',
      '{{email}}': message.lead_email || message.member_email || '',
      '{{gym_phone}}': process.env.GYM_PHONE || '(08) 9999 9999',
      '{{booking_link}}': process.env.BOOKING_URL || 'https://roarmma.com.au/book',
      '{{schedule_link}}': process.env.SCHEDULE_URL || 'https://roarmma.com.au/schedule',
      '{{class_type}}': message.trial_class_type || 'class',
      '{{coach_name}}': message.coach_name || 'our coach',
      '{{staff_name}}': process.env.DEFAULT_STAFF_NAME || 'ROAR Team',
      '{{location}}': message.location || 'Rockingham',
      '{{offer_details}}': 'First month 50% off when you join this week'
    };

    body = Object.entries(replacements).reduce((acc, [placeholder, value]) => {
      const escaped = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return acc.replace(new RegExp(escaped, 'g'), value || '');
    }, body);

    return body;
  }

  async sendSMS(phone, message, scheduledMessageId = null) {
    return await messagingProviders.sendSMS(phone, message, scheduledMessageId);
  }

  async sendEmail(email, subject, body, scheduledMessageId = null) {
    return await messagingProviders.sendEmail(email, subject, body, scheduledMessageId);
  }

  // Schedule follow-up messages for a trial
  scheduleTrialFollowUps(leadId, trialDate) {
    const lead = leadsData.getLeadById(leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    const trialDateTime = new Date(trialDate);
    const messages = [];

    // Get templates
    const templates = messageTemplatesData.getAllTemplates({ active: 1 });
    const templateMap = {};
    templates.forEach(t => {
      templateMap[t.trigger_event] = t;
    });

    // Schedule 2hr follow-up (SMS)
    if (templateMap.trial_2hr) {
      const scheduled2hr = new Date(trialDateTime.getTime() + 2 * 60 * 60 * 1000);
      messages.push({
        lead_id: leadId,
        message_type: 'sms',
        template_id: templateMap.trial_2hr.id,
        scheduled_for: scheduled2hr.toISOString(),
        recipient_phone: lead.phone,
        body: templateMap.trial_2hr.body
      });
    }

    // Schedule next day follow-up (Email)
    if (templateMap.trial_next_day) {
      const scheduledNextDay = new Date(trialDateTime);
      scheduledNextDay.setDate(scheduledNextDay.getDate() + 1);
      scheduledNextDay.setHours(9, 0, 0, 0); // 9am next day

      messages.push({
        lead_id: leadId,
        message_type: 'email',
        template_id: templateMap.trial_next_day.id,
        scheduled_for: scheduledNextDay.toISOString(),
        recipient_email: lead.email,
        subject: templateMap.trial_next_day.subject,
        body: templateMap.trial_next_day.body
      });
    }

    // Schedule day 3 follow-up (SMS)
    if (templateMap.trial_day3) {
      const scheduledDay3 = new Date(trialDateTime);
      scheduledDay3.setDate(scheduledDay3.getDate() + 3);
      scheduledDay3.setHours(10, 0, 0, 0);

      messages.push({
        lead_id: leadId,
        message_type: 'sms',
        template_id: templateMap.trial_day3.id,
        scheduled_for: scheduledDay3.toISOString(),
        recipient_phone: lead.phone,
        body: templateMap.trial_day3.body
      });
    }

    // Schedule day 7 follow-up (Email)
    if (templateMap.trial_day7) {
      const scheduledDay7 = new Date(trialDateTime);
      scheduledDay7.setDate(scheduledDay7.getDate() + 7);
      scheduledDay7.setHours(9, 0, 0, 0);

      messages.push({
        lead_id: leadId,
        message_type: 'email',
        template_id: templateMap.trial_day7.id,
        scheduled_for: scheduledDay7.toISOString(),
        recipient_email: lead.email,
        subject: templateMap.trial_day7.subject,
        body: templateMap.trial_day7.body
      });
    }

    // Schedule day 14 follow-up (SMS)
    if (templateMap.trial_day14) {
      const scheduledDay14 = new Date(trialDateTime);
      scheduledDay14.setDate(scheduledDay14.getDate() + 14);
      scheduledDay14.setHours(10, 0, 0, 0);

      messages.push({
        lead_id: leadId,
        message_type: 'sms',
        template_id: templateMap.trial_day14.id,
        scheduled_for: scheduledDay14.toISOString(),
        recipient_phone: lead.phone,
        body: templateMap.trial_day14.body
      });
    }

    // Create all scheduled messages
    const created = [];
    for (const msg of messages) {
      const scheduled = scheduledMessagesData.createScheduledMessage(msg);
      created.push(scheduled);
    }

    return created;
  }
}

// Singleton instance
const scheduler = new MessageScheduler();

module.exports = scheduler;
