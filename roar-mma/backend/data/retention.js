// Retention system data layer
const { getDatabase } = require('../db/connection');

// Create cancellation request
function createCancellationRequest(data) {
  const db = getDatabase();

  const result = db.prepare(`
    INSERT INTO cancellation_requests (
      member_id, requested_by, cancellation_reason, reason_category, notes
    ) VALUES (?, ?, ?, ?, ?)
  `).run(
    data.member_id,
    data.requested_by,
    data.cancellation_reason,
    data.reason_category,
    data.notes || null
  );

  const request = db.prepare('SELECT * FROM cancellation_requests WHERE id = ?').get(result.lastInsertRowid);

  // Log retention event
  logRetentionEvent(data.member_id, 'cancellation_requested', result.lastInsertRowid);

  // Auto-generate retention offers based on reason
  generateRetentionOffers(result.lastInsertRowid, data.reason_category);

  return request;
}

// Generate retention offers based on cancellation reason
function generateRetentionOffers(cancellationRequestId, reasonCategory) {
  const db = getDatabase();
  const offers = [];

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

  // Cost-related: discount + downgrade options
  if (reasonCategory === 'cost') {
    // 20% discount for 3 months
    offers.push({
      offer_type: 'discount',
      offer_details: JSON.stringify({ description: '20% off for 3 months' }),
      discount_percentage: 20,
      discount_months: 3,
      expires_at: expiresAt.toISOString()
    });

    // Downgrade to basic membership
    offers.push({
      offer_type: 'downgrade',
      offer_details: JSON.stringify({ description: 'Switch to basic membership (save $30/month)' }),
      new_membership_type: 'basic',
      expires_at: expiresAt.toISOString()
    });

    // 3-month pause option
    offers.push({
      offer_type: 'pause',
      offer_details: JSON.stringify({ description: 'Pause membership for up to 3 months' }),
      pause_months: 3,
      expires_at: expiresAt.toISOString()
    });
  }

  // Time-related: schedule change + pause
  if (reasonCategory === 'time') {
    offers.push({
      offer_type: 'schedule_change',
      offer_details: JSON.stringify({ description: 'Switch to flexible class times or weekend-only' }),
      expires_at: expiresAt.toISOString()
    });

    offers.push({
      offer_type: 'pause',
      offer_details: JSON.stringify({ description: 'Pause membership for up to 6 months' }),
      pause_months: 6,
      expires_at: expiresAt.toISOString()
    });
  }

  // Injury-related: pause + free PT
  if (reasonCategory === 'injury') {
    offers.push({
      offer_type: 'pause',
      offer_details: JSON.stringify({ description: 'Pause until recovered (up to 6 months)' }),
      pause_months: 6,
      expires_at: expiresAt.toISOString()
    });

    offers.push({
      offer_type: 'free_pt',
      offer_details: JSON.stringify({ description: '2 free PT sessions for recovery training' }),
      free_pt_sessions: 2,
      expires_at: expiresAt.toISOString()
    });
  }

  // Moving: pause (maybe they come back)
  if (reasonCategory === 'moving') {
    offers.push({
      offer_type: 'pause',
      offer_details: JSON.stringify({ description: 'Pause membership - come back anytime' }),
      pause_months: 12,
      expires_at: expiresAt.toISOString()
    });
  }

  // Dissatisfied: free PT + discount
  if (reasonCategory === 'dissatisfied') {
    offers.push({
      offer_type: 'free_pt',
      offer_details: JSON.stringify({ description: '3 free PT sessions to get back on track' }),
      free_pt_sessions: 3,
      expires_at: expiresAt.toISOString()
    });

    offers.push({
      offer_type: 'discount',
      offer_details: JSON.stringify({ description: '30% off for 2 months while we make it right' }),
      discount_percentage: 30,
      discount_months: 2,
      expires_at: expiresAt.toISOString()
    });
  }

  // Insert all offers
  const stmt = db.prepare(`
    INSERT INTO retention_offers (
      cancellation_request_id, offer_type, offer_details,
      discount_percentage, discount_months, pause_months,
      new_membership_type, free_pt_sessions, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  offers.forEach(offer => {
    stmt.run(
      cancellationRequestId,
      offer.offer_type,
      offer.offer_details,
      offer.discount_percentage || null,
      offer.discount_months || null,
      offer.pause_months || null,
      offer.new_membership_type || null,
      offer.free_pt_sessions || null,
      offer.expires_at
    );
  });

  return offers.length;
}

// Get cancellation request with offers
function getCancellationRequest(id) {
  const db = getDatabase();

  const request = db.prepare(`
    SELECT cr.*,
           m.first_name || ' ' || m.last_name as member_name,
           s.name as requested_by_name
    FROM cancellation_requests cr
    JOIN members m ON cr.member_id = m.id
    JOIN staff s ON cr.requested_by = s.id
    WHERE cr.id = ?
  `).get(id);

  if (!request) return null;

  // Get associated offers
  request.offers = db.prepare(`
    SELECT * FROM retention_offers
    WHERE cancellation_request_id = ?
    ORDER BY offered_date DESC
  `).all(id);

  return request;
}

// Get all pending cancellation requests
function getPendingCancellationRequests() {
  const db = getDatabase();

  return db.prepare(`
    SELECT cr.*,
           m.first_name || ' ' || m.last_name as member_name,
           m.email, m.phone
    FROM cancellation_requests cr
    JOIN members m ON cr.member_id = m.id
    WHERE cr.status = 'pending'
    ORDER BY cr.request_date DESC
  `).all();
}

// Accept retention offer
function acceptRetentionOffer(offerId, memberId) {
  const db = getDatabase();

  const offer = db.prepare('SELECT * FROM retention_offers WHERE id = ?').get(offerId);
  if (!offer) throw new Error('Offer not found');

  const request = db.prepare('SELECT * FROM cancellation_requests WHERE id = ?').get(offer.cancellation_request_id);
  if (!request) throw new Error('Cancellation request not found');

  // Update offer status
  db.prepare(`
    UPDATE retention_offers
    SET status = 'accepted', response_date = datetime('now')
    WHERE id = ?
  `).run(offerId);

  // Update cancellation request
  db.prepare(`
    UPDATE cancellation_requests
    SET status = 'retained', retention_offer_id = ?, final_decision_date = datetime('now')
    WHERE id = ?
  `).run(offerId, offer.cancellation_request_id);

  // Apply the offer
  applyRetentionOffer(offer, memberId);

  // Log retention event
  logRetentionEvent(memberId, 'offer_accepted', offerId);
  logRetentionEvent(memberId, 'member_retained', offer.cancellation_request_id);

  return { success: true, offer };
}

// Apply retention offer to member
function applyRetentionOffer(offer, memberId) {
  const db = getDatabase();

  if (offer.offer_type === 'pause') {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (offer.pause_months || 1));

    db.prepare(`
      INSERT INTO membership_pauses (member_id, start_date, end_date, reason)
      VALUES (?, ?, ?, ?)
    `).run(
      memberId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
      'Retention offer accepted'
    );
  }

  if (offer.offer_type === 'discount') {
    // Create transaction record for discount
    const details = JSON.parse(offer.offer_details);
    db.prepare(`
      INSERT INTO transactions (member_id, type, amount, description, status)
      VALUES (?, 'discount', 0, ?, 'completed')
    `).run(memberId, `Retention discount: ${details.description}`);
  }

  if (offer.offer_type === 'downgrade' && offer.new_membership_type) {
    db.prepare(`
      UPDATE members
      SET membership_type = ?
      WHERE id = ?
    `).run(offer.new_membership_type, memberId);
  }

  if (offer.offer_type === 'free_pt' && offer.free_pt_sessions) {
    // Create PT package with free sessions
    db.prepare(`
      INSERT INTO member_pt_packages (member_id, package_id, sessions_remaining, purchase_date, expiry_date, amount_paid)
      VALUES (?, 1, ?, date('now'), date('now', '+60 days'), 0)
    `).run(memberId, offer.free_pt_sessions);
  }
}

// Reject retention offer
function rejectRetentionOffer(offerId) {
  const db = getDatabase();

  db.prepare(`
    UPDATE retention_offers
    SET status = 'rejected', response_date = datetime('now')
    WHERE id = ?
  `).run(offerId);

  const offer = db.prepare('SELECT * FROM retention_offers WHERE id = ?').get(offerId);
  const request = db.prepare('SELECT * FROM cancellation_requests WHERE id = ?').get(offer.cancellation_request_id);

  logRetentionEvent(request.member_id, 'offer_rejected', offerId);

  return { success: true };
}

// Process cancellation (final step)
function processCancellation(cancellationRequestId) {
  const db = getDatabase();

  const request = db.prepare('SELECT * FROM cancellation_requests WHERE id = ?').get(cancellationRequestId);
  if (!request) throw new Error('Request not found');

  // Update member status
  db.prepare(`
    UPDATE members
    SET status = 'cancelled',
        cancellation_request_id = ?,
        cancelled_date = date('now'),
        cancellation_reason = ?
    WHERE id = ?
  `).run(cancellationRequestId, request.cancellation_reason, request.member_id);

  // Update request status
  db.prepare(`
    UPDATE cancellation_requests
    SET status = 'cancelled', final_decision_date = datetime('now')
    WHERE id = ?
  `).run(cancellationRequestId);

  // Log event
  logRetentionEvent(request.member_id, 'member_cancelled', cancellationRequestId);

  // Create win-back campaign
  createWinbackCampaign(request.member_id, request.reason_category);

  return { success: true };
}

// Create win-back campaign
function createWinbackCampaign(memberId, reasonCategory) {
  const db = getDatabase();

  const cancelDate = new Date().toISOString().split('T')[0];

  // Determine special offer based on reason
  let specialOffer = {};
  if (reasonCategory === 'cost') {
    specialOffer = { type: 'discount', value: 25, duration: 3, description: '25% off for 3 months' };
  } else if (reasonCategory === 'time') {
    specialOffer = { type: 'flexible', description: 'Flexible schedule + weekend classes' };
  } else {
    specialOffer = { type: 'trial', description: 'Free week to try us again' };
  }

  db.prepare(`
    INSERT INTO winback_campaigns (
      member_id, cancellation_date, cancellation_reason_category,
      campaign_type, special_offer
    ) VALUES (?, ?, ?, ?, ?)
  `).run(
    memberId,
    cancelDate,
    reasonCategory,
    'immediate',
    JSON.stringify(specialOffer)
  );
}

// Get active win-back campaigns
function getActiveWinbackCampaigns() {
  const db = getDatabase();

  return db.prepare(`
    SELECT wc.*, m.name, m.email, m.phone
    FROM winback_campaigns wc
    JOIN members m ON wc.member_id = m.id
    WHERE wc.status = 'active'
    ORDER BY wc.created_at DESC
  `).all();
}

// Log retention event
function logRetentionEvent(memberId, eventType, relatedId = null, metadata = null) {
  const db = getDatabase();

  db.prepare(`
    INSERT INTO retention_events (member_id, event_type, related_id, metadata)
    VALUES (?, ?, ?, ?)
  `).run(memberId, eventType, relatedId, metadata ? JSON.stringify(metadata) : null);
}

// Get retention analytics
function getRetentionAnalytics(dateFrom = null, dateTo = null) {
  const db = getDatabase();

  if (!dateFrom) {
    const now = new Date();
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  }
  if (!dateTo) {
    dateTo = new Date().toISOString().split('T')[0];
  }

  const stats = {};

  // Total cancellation requests
  stats.total_requests = db.prepare(`
    SELECT COUNT(*) as count
    FROM cancellation_requests
    WHERE DATE(request_date) BETWEEN ? AND ?
  `).get(dateFrom, dateTo).count;

  // Retention rate
  const retention = db.prepare(`
    SELECT
      COUNT(CASE WHEN status = 'retained' THEN 1 END) as retained,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
    FROM cancellation_requests
    WHERE DATE(request_date) BETWEEN ? AND ?
  `).get(dateFrom, dateTo);

  stats.retained_count = retention.retained;
  stats.cancelled_count = retention.cancelled;
  stats.retention_rate = stats.total_requests > 0
    ? Math.round((retention.retained / stats.total_requests) * 100)
    : 0;

  // Cancellation reasons breakdown
  stats.reasons = db.prepare(`
    SELECT reason_category, COUNT(*) as count
    FROM cancellation_requests
    WHERE DATE(request_date) BETWEEN ? AND ?
    GROUP BY reason_category
    ORDER BY count DESC
  `).all(dateFrom, dateTo);

  // Offer acceptance rate
  const offers = db.prepare(`
    SELECT
      COUNT(*) as total_offers,
      COUNT(CASE WHEN ro.status = 'accepted' THEN 1 END) as accepted,
      COUNT(CASE WHEN ro.status = 'rejected' THEN 1 END) as rejected
    FROM retention_offers ro
    JOIN cancellation_requests cr ON ro.cancellation_request_id = cr.id
    WHERE DATE(cr.request_date) BETWEEN ? AND ?
  `).get(dateFrom, dateTo);

  stats.offer_acceptance_rate = offers.total_offers > 0
    ? Math.round((offers.accepted / offers.total_offers) * 100)
    : 0;

  // Most effective offer type
  stats.offer_effectiveness = db.prepare(`
    SELECT
      offer_type,
      COUNT(*) as offered,
      COUNT(CASE WHEN ro.status = 'accepted' THEN 1 END) as accepted
    FROM retention_offers ro
    JOIN cancellation_requests cr ON ro.cancellation_request_id = cr.id
    WHERE DATE(cr.request_date) BETWEEN ? AND ?
    GROUP BY offer_type
    ORDER BY accepted DESC
  `).all(dateFrom, dateTo);

  // Win-back success
  stats.winback_success = db.prepare(`
    SELECT
      COUNT(*) as total_campaigns,
      COUNT(CASE WHEN status = 'won_back' THEN 1 END) as won_back
    FROM winback_campaigns
    WHERE DATE(cancellation_date) BETWEEN ? AND ?
  `).get(dateFrom, dateTo);

  return stats;
}

module.exports = {
  createCancellationRequest,
  getCancellationRequest,
  getPendingCancellationRequests,
  acceptRetentionOffer,
  rejectRetentionOffer,
  processCancellation,
  getActiveWinbackCampaigns,
  getRetentionAnalytics,
  logRetentionEvent
};
