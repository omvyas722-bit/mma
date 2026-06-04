// Lead scoring routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const leadScoringData = require('../data/leadScoring');

const router = express.Router();

// Get all leads with scores
router.get('/leads-with-scores', authenticateToken, requirePermission('leads:read'), (req, res) => {
  try {
    const filters = {
      stage: req.query.stage,
      location: req.query.location,
      source: req.query.source,
      assigned_to: req.query.assigned_to
    };

    const leads = leadScoringData.getAllLeadsWithScores(filters);
    res.json(leads);
  } catch (error) {
    console.error('Error fetching leads with scores:', error);
    res.status(500).json({ error: 'Failed to fetch leads with scores' });
  }
});

// Get high priority leads
router.get('/high-priority', authenticateToken, requirePermission('leads:read'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const leads = await leadScoringData.getHighPriorityLeads(limit);
    res.json(leads);
  } catch (error) {
    console.error('Error fetching high priority leads:', error);
    res.status(500).json({ error: 'Failed to fetch high priority leads' });
  }
});

// Get lead score breakdown
router.get('/score-breakdown/:id', authenticateToken, requirePermission('leads:read'), (req, res) => {
  try {
    const breakdown = leadScoringData.getLeadScoreBreakdown(req.params.id);
    res.json(breakdown);
  } catch (error) {
    console.error('Error fetching score breakdown:', error);
    res.status(500).json({ error: 'Failed to fetch score breakdown' });
  }
});

module.exports = router;
