// Trial analytics routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const trialAnalyticsData = require('../data/trialAnalytics');

const router = express.Router();

// Get trial conversion statistics
router.get('/conversion-stats', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const stats = trialAnalyticsData.getTrialConversionStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching trial conversion stats:', error);
    res.status(500).json({ error: 'Failed to fetch trial conversion stats' });
  }
});

// Get trial conversion trends
router.get('/conversion-trends', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const trends = trialAnalyticsData.getTrialTrends(days);
    res.json(trends);
  } catch (error) {
    console.error('Error fetching trial trends:', error);
    res.status(500).json({ error: 'Failed to fetch trial trends' });
  }
});

module.exports = router;
