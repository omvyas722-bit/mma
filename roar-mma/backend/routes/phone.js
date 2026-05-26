// Phone calls routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const phoneCallsData = require('../data/phoneCalls');
const aiPhoneService = require('../services/aiPhoneService');

const router = express.Router();

// Get recent calls
router.get('/calls', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const calls = phoneCallsData.getRecentCalls(limit);
    res.json(calls);
  } catch (error) {
    console.error('Error fetching calls:', error);
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
});

// Get single call with transcript
router.get('/calls/:id', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const call = phoneCallsData.getPhoneCall(req.params.id);

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    const transcript = phoneCallsData.getCallTranscript(req.params.id);

    res.json({
      ...call,
      transcript
    });
  } catch (error) {
    console.error('Error fetching call:', error);
    res.status(500).json({ error: 'Failed to fetch call' });
  }
});

// Get calls requiring followup
router.get('/calls/followup/pending', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const calls = phoneCallsData.getCallsRequiringFollowup();
    res.json(calls);
  } catch (error) {
    console.error('Error fetching followup calls:', error);
    res.status(500).json({ error: 'Failed to fetch followup calls' });
  }
});

// Get new voicemails
router.get('/voicemails/new', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const voicemails = phoneCallsData.getNewVoicemails();
    res.json(voicemails);
  } catch (error) {
    console.error('Error fetching voicemails:', error);
    res.status(500).json({ error: 'Failed to fetch voicemails' });
  }
});

// Mark voicemail as listened
router.post('/voicemails/:id/listened', authenticateToken, requirePermission('staff:write'), (req, res) => {
  try {
    phoneCallsData.markVoicemailListened(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking voicemail:', error);
    res.status(500).json({ error: 'Failed to mark voicemail' });
  }
});

// Get call analytics
router.get('/analytics', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;

    const analytics = phoneCallsData.getCallAnalytics(dateFrom, dateTo);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching call analytics:', error);
    res.status(500).json({ error: 'Failed to fetch call analytics' });
  }
});

// Get AI phone settings
router.get('/settings', authenticateToken, requirePermission('settings:read'), (req, res) => {
  try {
    const settings = phoneCallsData.getAIPhoneSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update AI phone setting
router.put('/settings/:key', authenticateToken, requirePermission('settings:write'), (req, res) => {
  try {
    phoneCallsData.updateAIPhoneSetting(req.params.key, req.body.value);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Twilio webhook - incoming call
router.post('/webhooks/twilio/voice', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const { CallSid, From, To } = req.body;

    console.log(`Incoming call: ${From} → ${To} (${CallSid})`);

    const result = await aiPhoneService.handleIncomingCall(CallSid, From, To);

    // Generate TwiML response
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

    if (result.action === 'ai_handle') {
      // AI handles the call
      twiml += `<Say voice="alice">${result.greeting}</Say>`;
      twiml += `<Gather input="speech" action="/api/phone/webhooks/twilio/gather" method="POST" timeout="5" speechTimeout="auto">`;
      twiml += `<Say voice="alice">I'm listening.</Say>`;
      twiml += `</Gather>`;
    } else if (result.action === 'transfer_to_staff') {
      // Transfer to staff
      twiml += `<Say voice="alice">Please hold while I transfer you to a staff member.</Say>`;
      twiml += `<Dial timeout="30" action="/api/phone/webhooks/twilio/dial-status">`;
      twiml += `<Number>+61899999999</Number>`; // TODO: Get from settings
      twiml += `</Dial>`;
    } else if (result.action === 'voicemail') {
      // Voicemail
      twiml += `<Say voice="alice">We're currently unavailable. Please leave a message after the beep.</Say>`;
      twiml += `<Record maxLength="120" action="/api/phone/webhooks/twilio/recording" />`;
    }

    twiml += '</Response>';

    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('Error handling incoming call:', error);
    res.status(500).send('Error');
  }
});

// Twilio webhook - gather speech input
router.post('/webhooks/twilio/gather', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const { CallSid, SpeechResult } = req.body;

    console.log(`Speech input from ${CallSid}: ${SpeechResult}`);

    const call = phoneCallsData.getPhoneCallBySid(CallSid);
    if (!call) {
      return res.status(404).send('Call not found');
    }

    const result = await aiPhoneService.processInput(call.id, SpeechResult);

    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

    if (result.actions.includes('transfer_to_staff')) {
      twiml += `<Say voice="alice">${result.response}</Say>`;
      twiml += `<Dial timeout="30"><Number>+61899999999</Number></Dial>`;
    } else {
      twiml += `<Say voice="alice">${result.response}</Say>`;
      twiml += `<Gather input="speech" action="/api/phone/webhooks/twilio/gather" method="POST" timeout="5" speechTimeout="auto">`;
      twiml += `<Say voice="alice">I'm listening.</Say>`;
      twiml += `</Gather>`;
    }

    twiml += '</Response>';

    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('Error processing speech:', error);
    res.status(500).send('Error');
  }
});

// Twilio webhook - call status
router.post('/webhooks/twilio/status', express.urlencoded({ extended: false }), (req, res) => {
  try {
    const { CallSid, CallStatus, CallDuration } = req.body;

    console.log(`Call status update: ${CallSid} → ${CallStatus}`);

    const call = phoneCallsData.getPhoneCallBySid(CallSid);
    if (call) {
      phoneCallsData.updatePhoneCall(call.id, {
        status: CallStatus,
        duration: parseInt(CallDuration) || null,
        ended_at: CallStatus === 'completed' ? new Date().toISOString() : null
      });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error updating call status:', error);
    res.sendStatus(500);
  }
});

// Twilio webhook - recording
router.post('/webhooks/twilio/recording', express.urlencoded({ extended: false }), (req, res) => {
  try {
    const { CallSid, RecordingUrl, RecordingDuration } = req.body;

    console.log(`Recording received for ${CallSid}`);

    const call = phoneCallsData.getPhoneCallBySid(CallSid);
    if (call) {
      phoneCallsData.createVoicemail({
        call_id: call.id,
        from_number: call.from_number,
        recording_url: RecordingUrl,
        duration: parseInt(RecordingDuration)
      });

      phoneCallsData.updatePhoneCall(call.id, {
        recording_url: RecordingUrl,
        handled_by: 'voicemail'
      });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error saving recording:', error);
    res.sendStatus(500);
  }
});

module.exports = router;
