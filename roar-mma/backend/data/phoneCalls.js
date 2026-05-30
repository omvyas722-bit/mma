// Phone calls data layer
const { getDatabase } = require('../db/connection');

// Create phone call record
function createPhoneCall(data) {
  const db = getDatabase();

  const result = db.prepare(`
    INSERT INTO phone_calls (
      call_sid, from_number, to_number, direction, status,
      call_type, handled_by, staff_id, member_id, lead_id,
      started_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.call_sid,
    data.from_number,
    data.to_number,
    data.direction || 'inbound',
    data.status || 'queued',
    data.call_type || null,
    data.handled_by || 'ai',
    data.staff_id || null,
    data.member_id || null,
    data.lead_id || null,
    data.started_at || new Date().toISOString()
  );

  return db.prepare('SELECT * FROM phone_calls WHERE id = ?').get(result.lastInsertRowid);
}

// Update phone call
function updatePhoneCall(callId, data) {
  const db = getDatabase();

  const updates = [];
  const values = [];

  const fieldMap = {
    status: 'status',
    duration: 'duration',
    recording_url: 'recording_url',
    transcription: 'transcription',
    call_type: 'call_type',
    sentiment: 'sentiment',
    intent_detected: 'intent_detected',
    actions_taken: 'actions_taken',
    ai_confidence: 'ai_confidence',
    requires_followup: 'requires_followup',
    followup_reason: 'followup_reason',
    ended_at: 'ended_at',
    member_id: 'member_id',
    lead_id: 'lead_id'
  };
  const jsonFields = new Set(['intent_detected', 'actions_taken']);

  for (const [key, column] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) {
      updates.push(`${column} = ?`);
      values.push(jsonFields.has(key) ? JSON.stringify(data[key]) : data[key]);
    }
  }

  if (updates.length === 0) return null;

  values.push(callId);

  db.prepare(`
    UPDATE phone_calls
    SET ${updates.join(', ')}
    WHERE id = ?
  `).run(...values);

  return db.prepare('SELECT * FROM phone_calls WHERE id = ?').get(callId);
}

// Get phone call by ID
function getPhoneCall(callId) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM phone_calls WHERE id = ?').get(callId);
}

// Get phone call by Twilio SID
function getPhoneCallBySid(callSid) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM phone_calls WHERE call_sid = ?').get(callSid);
}

// Get recent calls
function getRecentCalls(limit = 50) {
  const db = getDatabase();
  return db.prepare(`
    SELECT pc.*,
           m.first_name || ' ' || m.last_name as member_name,
           l.first_name || ' ' || l.last_name as lead_name
    FROM phone_calls pc
    LEFT JOIN members m ON pc.member_id = m.id
    LEFT JOIN leads l ON pc.lead_id = l.id
    ORDER BY pc.started_at DESC
    LIMIT ?
  `).all(limit);
}

// Get calls requiring followup
function getCallsRequiringFollowup() {
  const db = getDatabase();
  return db.prepare(`
    SELECT pc.*,
           m.first_name || ' ' || m.last_name as member_name,
           l.first_name || ' ' || l.last_name as lead_name
    FROM phone_calls pc
    LEFT JOIN members m ON pc.member_id = m.id
    LEFT JOIN leads l ON pc.lead_id = l.id
    WHERE pc.requires_followup = 1
    ORDER BY pc.started_at DESC
  `).all();
}

// Add transcript entry
function addTranscriptEntry(callId, speaker, message, confidence = null) {
  const db = getDatabase();

  db.prepare(`
    INSERT INTO call_transcripts (call_id, speaker, message, confidence)
    VALUES (?, ?, ?, ?)
  `).run(callId, speaker, message, confidence);
}

// Get call transcript
function getCallTranscript(callId) {
  const db = getDatabase();
  return db.prepare(`
    SELECT * FROM call_transcripts
    WHERE call_id = ?
    ORDER BY timestamp ASC
  `).all(callId);
}

// Create voicemail
function createVoicemail(data) {
  const db = getDatabase();

  const result = db.prepare(`
    INSERT INTO voicemails (
      call_id, from_number, recording_url, transcription, duration
    ) VALUES (?, ?, ?, ?, ?)
  `).run(
    data.call_id,
    data.from_number,
    data.recording_url,
    data.transcription || null,
    data.duration || null
  );

  return db.prepare('SELECT * FROM voicemails WHERE id = ?').get(result.lastInsertRowid);
}

// Get new voicemails
function getNewVoicemails() {
  const db = getDatabase();
  return db.prepare(`
    SELECT v.*, pc.from_number, pc.started_at
    FROM voicemails v
    JOIN phone_calls pc ON v.call_id = pc.id
    WHERE v.status = 'new'
    ORDER BY v.created_at DESC
  `).all();
}

// Mark voicemail as listened
function markVoicemailListened(voicemailId, staffId) {
  const db = getDatabase();

  db.prepare(`
    UPDATE voicemails
    SET status = 'listened',
        listened_by = ?,
        listened_at = datetime('now')
    WHERE id = ?
  `).run(staffId, voicemailId);
}

// Get/create conversation context
function getConversationContext(callId) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM ai_conversation_context WHERE call_id = ?').get(callId);
}

const ALLOWED_CONTEXT_FIELDS = [
  'current_intent', 'conversation_stage', 'member_info', 'booking_details',
  'inquiry_type', 'call_summary', 'action_items', 'next_steps'
];

function updateConversationContext(callId, contextData, lastIntent = null, collectedInfo = null, nextExpectedInput = null) {
  const db = getDatabase();

  const filteredContext = {};
  for (const key of Object.keys(contextData)) {
    if (ALLOWED_CONTEXT_FIELDS.includes(key)) {
      filteredContext[key] = contextData[key];
    }
  }

  const existing = getConversationContext(callId);

  if (existing) {
    db.prepare(`
      UPDATE ai_conversation_context
      SET context_data = ?,
          last_intent = ?,
          collected_info = ?,
          next_expected_input = ?,
          updated_at = datetime('now')
      WHERE call_id = ?
    `).run(
      JSON.stringify(filteredContext),
      lastIntent,
      collectedInfo ? JSON.stringify(collectedInfo) : null,
      nextExpectedInput,
      callId
    );
  } else {
    db.prepare(`
      INSERT INTO ai_conversation_context (
        call_id, context_data, last_intent, collected_info, next_expected_input
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
      callId,
      JSON.stringify(filteredContext),
      lastIntent,
      collectedInfo ? JSON.stringify(collectedInfo) : null,
      nextExpectedInput
    );
  }
}

// Get AI phone settings
function getAIPhoneSettings() {
  const db = getDatabase();
  const rows = db.prepare('SELECT setting_key, setting_value FROM ai_phone_settings').all();

  const settings = {};
  rows.forEach(row => {
    settings[row.setting_key] = row.setting_value;
  });

  return settings;
}

// Update AI phone setting
function updateAIPhoneSetting(key, value) {
  const db = getDatabase();

  db.prepare(`
    UPDATE ai_phone_settings
    SET setting_value = ?,
        updated_at = datetime('now')
    WHERE setting_key = ?
  `).run(value, key);
}

// Get call analytics
function getCallAnalytics(dateFrom = null, dateTo = null) {
  const db = getDatabase();

  if (!dateFrom) {
    const now = new Date();
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  }
  if (!dateTo) {
    dateTo = new Date().toISOString().split('T')[0];
  }

  const stats = {};

  // Total calls
  stats.total_calls = db.prepare(`
    SELECT COUNT(*) as count
    FROM phone_calls
    WHERE DATE(started_at) BETWEEN ? AND ?
  `).get(dateFrom, dateTo).count;

  // By handler
  const byHandler = db.prepare(`
    SELECT
      handled_by,
      COUNT(*) as count
    FROM phone_calls
    WHERE DATE(started_at) BETWEEN ? AND ?
    GROUP BY handled_by
  `).all(dateFrom, dateTo);

  stats.ai_handled = byHandler.find(h => h.handled_by === 'ai')?.count || 0;
  stats.staff_handled = byHandler.find(h => h.handled_by === 'staff')?.count || 0;

  // By call type
  stats.by_type = db.prepare(`
    SELECT call_type, COUNT(*) as count
    FROM phone_calls
    WHERE DATE(started_at) BETWEEN ? AND ?
      AND call_type IS NOT NULL
    GROUP BY call_type
    ORDER BY count DESC
  `).all(dateFrom, dateTo);

  // Trials booked via phone
  stats.trials_booked = db.prepare(`
    SELECT COUNT(*) as count
    FROM phone_calls
    WHERE DATE(started_at) BETWEEN ? AND ?
      AND json_extract(actions_taken, '$') LIKE '%"trial_booked"%'
  `).get(dateFrom, dateTo).count;

  // Leads created via phone
  stats.leads_created = db.prepare(`
    SELECT COUNT(*) as count
    FROM phone_calls
    WHERE DATE(started_at) BETWEEN ? AND ?
      AND lead_id IS NOT NULL
  `).get(dateFrom, dateTo).count;

  // Average duration
  const avgDuration = db.prepare(`
    SELECT AVG(duration) as avg
    FROM phone_calls
    WHERE DATE(started_at) BETWEEN ? AND ?
      AND duration IS NOT NULL
  `).get(dateFrom, dateTo);

  stats.avg_duration_seconds = Math.round(avgDuration.avg || 0);

  // Sentiment breakdown
  const sentiment = db.prepare(`
    SELECT
      sentiment,
      COUNT(*) as count
    FROM phone_calls
    WHERE DATE(started_at) BETWEEN ? AND ?
      AND sentiment IS NOT NULL
    GROUP BY sentiment
  `).all(dateFrom, dateTo);

  stats.positive_sentiment = sentiment.find(s => s.sentiment === 'positive')?.count || 0;
  stats.neutral_sentiment = sentiment.find(s => s.sentiment === 'neutral')?.count || 0;
  stats.negative_sentiment = sentiment.find(s => s.sentiment === 'negative')?.count || 0;

  // Voicemails
  stats.voicemails = db.prepare(`
    SELECT COUNT(*) as count
    FROM voicemails v
    JOIN phone_calls pc ON v.call_id = pc.id
    WHERE DATE(pc.started_at) BETWEEN ? AND ?
  `).get(dateFrom, dateTo).count;

  // Calls requiring followup
  stats.requires_followup = db.prepare(`
    SELECT COUNT(*) as count
    FROM phone_calls
    WHERE DATE(started_at) BETWEEN ? AND ?
      AND requires_followup = 1
  `).get(dateFrom, dateTo).count;

  return stats;
}

module.exports = {
  createPhoneCall,
  updatePhoneCall,
  getPhoneCall,
  getPhoneCallBySid,
  getRecentCalls,
  getCallsRequiringFollowup,
  addTranscriptEntry,
  getCallTranscript,
  createVoicemail,
  getNewVoicemails,
  markVoicemailListened,
  getConversationContext,
  updateConversationContext,
  getAIPhoneSettings,
  updateAIPhoneSetting,
  getCallAnalytics
};
