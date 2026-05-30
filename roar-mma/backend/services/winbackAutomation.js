// Win-back campaign automation service
const { getDatabase } = require('../db/connection');
const scheduledMessagesData = require('../data/scheduledMessages');

// In-memory opt-out tracking
const optedOutMemberIds = new Set();

function isOptedOut(memberId, campaign) {
  if (optedOutMemberIds.has(memberId)) return true;

  const db = getDatabase();
  const contactValues = [campaign.phone, campaign.email].filter(Boolean);
  if (contactValues.length === 0) return false;

  const placeholders = contactValues.map(() => '?').join(',');
  const unsubscribed = db.prepare(`
    SELECT 1 FROM unsubscribes
    WHERE contact_value IN (${placeholders})
      AND (channel = 'all' OR channel = 'sms' OR channel = 'email')
    LIMIT 1
  `).get(...contactValues);
  return !!unsubscribed;
}

function optOutMember(memberId) {
  optedOutMemberIds.add(memberId);
}

function removeOptOut(memberId) {
  optedOutMemberIds.delete(memberId);
}

// Process win-back campaigns (called by scheduler)
function processWinbackCampaigns() {
  const db = getDatabase();
  const now = new Date();

  // Get active campaigns
  const campaigns = db.prepare(`
    SELECT wc.*,
           m.first_name || ' ' || m.last_name as name,
           m.email,
           m.phone
    FROM winback_campaigns wc
    JOIN members m ON wc.member_id = m.id
    WHERE wc.status = 'active'
  `).all();

  campaigns.forEach(campaign => {
    const cancelDate = new Date(campaign.cancellation_date);
    const daysSinceCancellation = Math.floor((now - cancelDate) / (1000 * 60 * 60 * 24));

    // Determine which message to send based on campaign type and days
    let shouldSend = false;
    let messageType = null;

    if (campaign.campaign_type === 'immediate' && campaign.messages_sent === 0) {
      shouldSend = true;
      messageType = 'winback_immediate';
    } else if (daysSinceCancellation >= 30 && campaign.messages_sent === 1) {
      shouldSend = true;
      messageType = 'winback_30day';
    } else if (daysSinceCancellation >= 90 && campaign.messages_sent === 2) {
      shouldSend = true;
      messageType = 'winback_90day';
    } else if (daysSinceCancellation >= 180 && campaign.messages_sent === 3) {
      shouldSend = true;
      messageType = 'winback_6month';
    }

    if (shouldSend && messageType) {
      if (isOptedOut(campaign.member_id, campaign)) {
        console.log(`Member ${campaign.member_id} has opted out, skipping winback message`);
        db.prepare(`
          UPDATE winback_campaigns SET status = 'unsubscribed' WHERE id = ?
        `).run(campaign.id);
        return;
      }
      sendWinbackMessage(campaign, messageType);
    }

    // Expire campaigns after 6 months with no response
    if (daysSinceCancellation > 180 && campaign.messages_sent >= 4) {
      db.prepare(`
        UPDATE winback_campaigns
        SET status = 'expired'
        WHERE id = ?
      `).run(campaign.id);
    }
  });
}

// Send win-back message
function sendWinbackMessage(campaign, messageType) {
  const db = getDatabase();

  // Get message template
  const template = db.prepare(`
    SELECT * FROM message_templates
    WHERE type = ? AND active = 1
    LIMIT 1
  `).get(messageType);

  if (!template) {
    console.log(`No template found for ${messageType}`);
    return;
  }

  // Parse special offer
  let offer = {};
  try {
    offer = JSON.parse(campaign.special_offer);
  } catch {
    offer = {};
    console.warn(`[WINBACK] Invalid JSON in special_offer for campaign ${campaign.id}, using empty offer`);
  }

  // Personalize message
  let content = template.content
    .replace('{{name}}', campaign.name)
    .replace('{{offer}}', offer.description || '');

  // Schedule message
  const sendDate = new Date();
  sendDate.setMinutes(sendDate.getMinutes() + 5); // Send in 5 minutes

  try {
    scheduledMessagesData.createScheduledMessage({
      member_id: campaign.member_id,
      template_id: template.id,
      message_type: template.channel,
      scheduled_for: sendDate.toISOString(),
      recipient_phone: template.channel === 'sms' ? campaign.phone : null,
      recipient_email: template.channel === 'email' ? campaign.email : null,
      body: content,
      status: 'pending',
      metadata: JSON.stringify({
        campaign_id: campaign.id,
        campaign_type: campaign.campaign_type,
        message_type: messageType
      })
    });

    // Update campaign
    db.prepare(`
      UPDATE winback_campaigns
      SET messages_sent = messages_sent + 1,
          last_message_date = datetime('now')
      WHERE id = ?
    `).run(campaign.id);

    console.log(`Win-back message scheduled for member ${campaign.member_id} (${messageType})`);
  } catch (error) {
    console.error('Error scheduling win-back message:', error);
  }
}

// Mark member as won back
function markMemberWonBack(memberId) {
  const db = getDatabase();

  db.prepare(`
    UPDATE winback_campaigns
    SET status = 'won_back', won_back_date = datetime('now')
    WHERE member_id = ? AND status = 'active'
  `).run(memberId);

  // Log retention event
  const retentionData = require('../data/retention');
  retentionData.logRetentionEvent({ memberId, eventType: 'won_back', relatedId: null });
}

// Unsubscribe from win-back
function unsubscribeWinback(memberId) {
  const db = getDatabase();

  db.prepare(`
    UPDATE winback_campaigns
    SET status = 'unsubscribed'
    WHERE member_id = ? AND status = 'active'
  `).run(memberId);
}

module.exports = {
  processWinbackCampaigns,
  markMemberWonBack,
  unsubscribeWinback,
  optOutMember,
  removeOptOut,
  isOptedOut
};
