// Retention system routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const retentionData = require('../data/retention');

const router = express.Router();

// Create cancellation request
router.post('/cancellation-requests', authenticateToken, requirePermission('members:write'), (req, res) => {
  try {
    const allowedFields = ['member_id', 'reason', 'cancellation_date', 'notes', 'notice_period_days'];
    const requestData = {
      requested_by: req.user.id
    };
    allowedFields.forEach(f => { if (req.body[f] !== undefined) requestData[f] = req.body[f]; });
    const request = retentionData.createCancellationRequest(requestData);

    // Broadcast to connected clients
    if (global.wsBroadcast) {
      global.wsBroadcast({
        type: 'cancellation_request_created',
        data: request
      });
    }

    res.status(201).json(request);
  } catch (error) {
    console.error('Error creating cancellation request:', error);
    res.status(500).json({ error: 'Failed to create cancellation request' });
  }
});

// Get single cancellation request with offers
router.get('/cancellation-requests/:id', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const request = retentionData.getCancellationRequest(req.params.id);

    if (!request) {
      return res.status(404).json({ error: 'Cancellation request not found' });
    }

    res.json(request);
  } catch (error) {
    console.error('Error fetching cancellation request:', error);
    res.status(500).json({ error: 'Failed to fetch cancellation request' });
  }
});

// Get all pending cancellation requests
router.get('/cancellation-requests', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const requests = retentionData.getPendingCancellationRequests();
    res.json(requests);
  } catch (error) {
    console.error('Error fetching cancellation requests:', error);
    res.status(500).json({ error: 'Failed to fetch cancellation requests' });
  }
});

// Accept retention offer
router.post('/retention-offers/:id/accept', authenticateToken, requirePermission('members:write'), (req, res) => {
  try {
    const result = retentionData.acceptRetentionOffer(req.params.id, req.body.member_id);

    if (global.wsBroadcast) {
      global.wsBroadcast({
        type: 'retention_offer_accepted',
        data: result
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error accepting retention offer:', error);
    res.status(500).json({ error: 'Failed to accept offer' });
  }
});

// Reject retention offer
router.post('/retention-offers/:id/reject', authenticateToken, requirePermission('members:write'), (req, res) => {
  try {
    const result = retentionData.rejectRetentionOffer(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error rejecting retention offer:', error);
    res.status(500).json({ error: 'Failed to reject offer' });
  }
});

// Process final cancellation
router.post('/cancellation-requests/:id/process', authenticateToken, requirePermission('members:write'), (req, res) => {
  try {
    const result = retentionData.processCancellation(req.params.id);

    if (global.wsBroadcast) {
      global.wsBroadcast({
        type: 'member_cancelled',
        data: result
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error processing cancellation:', error);
    res.status(500).json({ error: 'Failed to process cancellation' });
  }
});

// Get active win-back campaigns
router.get('/winback-campaigns', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const campaigns = retentionData.getActiveWinbackCampaigns();
    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching win-back campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch win-back campaigns' });
  }
});

// Get retention analytics
router.get('/analytics', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;

    const analytics = retentionData.getRetentionAnalytics(dateFrom, dateTo);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching retention analytics:', error);
    res.status(500).json({ error: 'Failed to fetch retention analytics' });
  }
});

module.exports = router;
