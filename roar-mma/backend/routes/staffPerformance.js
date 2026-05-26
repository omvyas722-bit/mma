// Staff performance routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const staffPerformanceData = require('../data/staffPerformance');

const router = express.Router();

// Get single staff performance metrics
router.get('/:staffId', authenticateToken, requirePermission('staff:read'), (req, res) => {
  try {
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;

    const metrics = staffPerformanceData.getStaffPerformanceMetrics(
      req.params.staffId,
      dateFrom,
      dateTo
    );

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching staff performance:', error);
    res.status(500).json({ error: 'Failed to fetch staff performance' });
  }
});

// Get all staff performance
router.get('/', authenticateToken, requirePermission('staff:read'), (req, res) => {
  try {
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;

    const performance = staffPerformanceData.getAllStaffPerformance(dateFrom, dateTo);
    res.json(performance);
  } catch (error) {
    console.error('Error fetching all staff performance:', error);
    res.status(500).json({ error: 'Failed to fetch staff performance' });
  }
});

// Get leaderboard
router.get('/leaderboard/:metric', authenticateToken, requirePermission('staff:read'), (req, res) => {
  try {
    const metric = req.params.metric;
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;

    const leaderboard = staffPerformanceData.getLeaderboard(metric, dateFrom, dateTo);
    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get staff achievements
router.get('/:staffId/achievements', authenticateToken, requirePermission('staff:read'), (req, res) => {
  try {
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;

    const achievements = staffPerformanceData.getStaffAchievements(
      req.params.staffId,
      dateFrom,
      dateTo
    );

    res.json(achievements);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

module.exports = router;
