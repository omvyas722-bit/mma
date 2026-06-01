// AI Phone Receptionist Service
const phoneCallsData = require('../data/phoneCalls');
const leadsData = require('../data/leads');
const { getDatabase } = require('../db/connection');

class AIPhoneService {
  constructor() {
    this.settings = null;
  }

  // Load settings
  loadSettings() {
    this.settings = phoneCallsData.getAIPhoneSettings();
  }

  // Handle incoming call
  async handleIncomingCall(callSid, fromNumber, toNumber) {
    try {
      if (!this.settings) this.loadSettings();

      // Create call record
      const call = phoneCallsData.createPhoneCall({
        call_sid: callSid,
        from_number: fromNumber,
        to_number: toNumber,
        direction: 'inbound',
        status: 'in-progress',
        started_at: new Date().toISOString()
      });

      if (!call || !call.id) {
        console.error('[AI-PHONE] Failed to create call record');
        return { action: 'voicemail', call_id: null };
      }

      // Check if caller is existing member or lead
      const caller = this.identifyCaller(fromNumber);
      if (caller.member_id) {
        phoneCallsData.updatePhoneCall(call.id, { member_id: caller.member_id });
      }
      if (caller.lead_id) {
        phoneCallsData.updatePhoneCall(call.id, { lead_id: caller.lead_id });
      }

      // Determine routing
      const route = this.determineRouting(caller);

      if (route === 'staff') {
        return { action: 'transfer_to_staff', call_id: call.id };
      } else if (route === 'voicemail') {
        return { action: 'voicemail', call_id: call.id };
      }

      // AI handles call
      return {
        action: 'ai_handle',
        call_id: call.id,
        greeting: this.settings?.ai_greeting || 'Welcome to ROAR MMA. How can I help you today?'
      };
    } catch (err) {
      console.error('[AI-PHONE] handleIncomingCall error:', err);
      return { action: 'voicemail', call_id: null, error: err.message };
    }
  }

  // Identify caller
  identifyCaller(phoneNumber) {
    const db = getDatabase();

    // Check members
    const member = db.prepare('SELECT id FROM members WHERE phone = ?').get(phoneNumber);
    if (member) {
      return { member_id: member.id, type: 'member' };
    }

    // Check leads
    const lead = db.prepare('SELECT id FROM leads WHERE phone = ?').get(phoneNumber);
    if (lead) {
      return { lead_id: lead.id, type: 'lead' };
    }

    return { type: 'new' };
  }

  // Determine call routing
  determineRouting(caller) {
    if (!this.settings) this.loadSettings();

    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday

    // Check business hours
    const startHour = this.settings.business_hours_start
      ? parseInt(this.settings.business_hours_start.split(':')[0], 10)
      : 6;
    const endHour = this.settings.business_hours_end
      ? parseInt(this.settings.business_hours_end.split(':')[0], 10)
      : 21;
    const businessDays = (this.settings.business_days || '1,2,3,4,5,6').split(',').map(d => parseInt(d, 10));

    const isBusinessHours = hour >= startHour && hour < endHour && businessDays.includes(day);

    // After hours → AI
    if (!isBusinessHours) {
      return 'ai';
    }

    // Members during business hours → staff (if available)
    if (caller.type === 'member') {
      return 'staff'; // Could check staff availability here
    }

    // Default to AI
    return 'ai';
  }

  // Process caller speech input
  async processInput(callId, userInput) {
    // Detect intent
    const intent = this.detectIntent(userInput);

    // Get conversation context
    let context = phoneCallsData.getConversationContext(callId);
    if (!context) {
      context = { collected_info: {} };
    } else {
      try {
        context.collected_info = context.collected_info
          ? (typeof context.collected_info === 'string' ? JSON.parse(context.collected_info) : context.collected_info)
          : {};
      } catch {
        context.collected_info = {};
      }
    }

    // Add transcript entry
    phoneCallsData.addTranscriptEntry(callId, 'caller', userInput);

    // Handle based on intent
    let response = '';
    let actions = [];

    switch (intent.type) {
      case 'trial_inquiry':
        response = await this.handleTrialInquiry(callId, userInput, context);
        break;

      case 'schedule_question':
        response = this.handleScheduleQuestion();
        break;

      case 'pricing_question':
        response = this.handlePricingQuestion();
        break;

      case 'location_question':
        response = this.handleLocationQuestion();
        break;

      case 'transfer_request':
        response = 'Let me transfer you to a staff member.';
        actions.push('transfer_to_staff');
        break;

      case 'provide_name':
        context.collected_info.name = this.extractName(userInput);
        response = `Thanks ${context.collected_info.name}! Can I get your phone number?`;
        break;

      case 'provide_phone':
        context.collected_info.phone = this.extractPhone(userInput);
        response = 'Great! And your email address?';
        break;

      case 'provide_email':
        context.collected_info.email = this.extractEmail(userInput);
        response = 'Perfect! Let me book that trial for you.';
        actions.push('create_lead');
        break;

      default:
        response = 'I understand. Can you tell me more about what you need?';
    }

    // Update context
    phoneCallsData.updateConversationContext(
      callId,
      context,
      intent.type,
      context.collected_info
    );

    // Add AI response to transcript
    phoneCallsData.addTranscriptEntry(callId, 'ai', response);

    // Execute actions
    for (const action of actions) {
      await this.executeAction(callId, action, context);
    }

    return {
      response,
      intent: intent.type,
      actions
    };
  }

  // Detect intent from user input
  detectIntent(input) {
    const lower = input.toLowerCase();

    // Trial inquiry
    if (lower.match(/(?:^|\s)trial(?:\s|$)|(?:^|\s)try\b|first class|free class|visit/)) {
      return { type: 'trial_inquiry', confidence: 0.9 };
    }

    // Schedule
    if (lower.match(/schedule|times|when|hours|open/)) {
      return { type: 'schedule_question', confidence: 0.85 };
    }

    // Pricing
    if (lower.match(/price|cost|how much|membership|fee/)) {
      return { type: 'pricing_question', confidence: 0.85 };
    }

    // Location
    if (lower.match(/where|location|address|directions/)) {
      return { type: 'location_question', confidence: 0.85 };
    }

    // Transfer request
    if (lower.match(/speak to|talk to|human|person|staff|manager/)) {
      return { type: 'transfer_request', confidence: 0.95 };
    }

    // Name provided
    if (lower.match(/my name is|i'm|i am|this is/)) {
      return { type: 'provide_name', confidence: 0.7 };
    }

    // Phone provided
    if (lower.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/) || lower.match(/\d{10}/)) {
      return { type: 'provide_phone', confidence: 0.9 };
    }

    // Email provided
    if (lower.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)) {
      return { type: 'provide_email', confidence: 0.9 };
    }

    return { type: 'unknown', confidence: 0.3 };
  }

  // Handle trial inquiry
  async handleTrialInquiry(callId, input, context) {
    if (!context.collected_info.name) {
      return 'Great! We offer free trial classes. What\'s your name?';
    }

    if (!context.collected_info.phone) {
      return 'And what\'s the best phone number to reach you?';
    }

    if (!context.collected_info.email) {
      return 'Perfect! And your email address?';
    }

    // Have all info - create lead
    return 'Excellent! I\'ve got you down for a trial class. Someone from our team will call you shortly to schedule a time that works for you. Is there anything else I can help with?';
  }

  // Handle schedule question
  handleScheduleQuestion() {
    return `We're open Monday through Saturday, 6am to 9pm. We have classes throughout the day for all skill levels. Would you like to book a free trial class?`;
  }

  // Handle pricing question
  handlePricingQuestion() {
    return `Our memberships start at $150 per month for unlimited classes. We also offer PT packages. The best way to learn more is to come in for a free trial class. Would you like to book one?`;
  }

  // Handle location question
  handleLocationQuestion() {
    if (!this.settings) this.loadSettings();
    return `We're located in ${this.settings.gym_location}. I can text you the address and directions. What's your phone number?`;
  }

  // Execute action
  async executeAction(callId, action, context) {
    if (action === 'create_lead') {
      const info = context.collected_info;

      if (info.name && info.phone) {
        // Deduplication: check if lead with this phone already exists
        const db = getDatabase();
        const existingLead = db.prepare('SELECT id, \'lead\' as source FROM leads WHERE phone = ? UNION ALL SELECT id, \'member\' as source FROM members WHERE phone = ? LIMIT 1').get(info.phone, info.phone);
        if (existingLead) {
          phoneCallsData.updatePhoneCall(callId, {
            lead_id: existingLead.id,
            call_type: 'trial_inquiry',
            actions_taken: JSON.stringify(['lead_already_exists'])
          });
          console.log(`[AI-PHONE] Lead already exists for phone ${info.phone}, linking to lead #${existingLead.id}`);
          return { id: existingLead.id, already_existed: true };
        }

        const nameParts = info.name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';

        const lead = leadsData.createLead({
          first_name: firstName,
          last_name: lastName,
          phone: info.phone,
          email: info.email || null,
          source: 'phone_call',
          stage: 'new',
          interest_level: 'high'
        });

        // Update call with lead_id
        phoneCallsData.updatePhoneCall(callId, {
          lead_id: lead.id,
          call_type: 'trial_inquiry',
          actions_taken: JSON.stringify(['lead_created'])
        });

        return lead;
      }
    }

    return null;
  }

  // Extract name from input
  extractName(input) {
    const match = input.match(/(?:my name is|i'm|i am|this is)\s+([a-záéíóúñüA-ZÁÉÍÓÚÑÜ'-]+(?:\s+[a-záéíóúñüA-ZÁÉÍÓÚÑÜ'-]+)?)/i);
    if (match) {
      return match[1].trim();
    }

    const words = input.trim().split(/\s+/).filter(w => /^[a-záéíóúñüA-ZÁÉÍÓÚÑÜ'-]+$/.test(w));
    if (words.length >= 2) {
      return words.slice(0, 2).join(' ');
    }

    return '';
  }

  // Extract phone from input
  extractPhone(input) {
    const match = input.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\d{10})/);
    return match ? match[1].replace(/[-.\s]/g, '') : input.trim();
  }

  // Extract email from input
  extractEmail(input) {
    const match = input.match(/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i);
    return match ? match[1] : input.trim();
  }

  // Complete call
  completeCall(callId, duration, sentiment = 'neutral') {
    phoneCallsData.updatePhoneCall(callId, {
      status: 'completed',
      duration,
      sentiment,
      ended_at: new Date().toISOString()
    });
  }
}

// Singleton instance
const aiPhoneService = new AIPhoneService();

module.exports = aiPhoneService;
