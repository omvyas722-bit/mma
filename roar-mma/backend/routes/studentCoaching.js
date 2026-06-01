const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const coaching = require('../data/studentCoaching');

const router = express.Router();

router.get('/ratings', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const result = coaching.getAllMemberRatingSummaries();
    res.json(result);
  } catch (error) {
    console.error('Error fetching all ratings:', error);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

router.get('/:id/ratings', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const result = coaching.getRatings(req.params.id, limit);
    res.json(result);
  } catch (error) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

router.post('/:id/ratings', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const { defense, stance, offense, practice_quality, notes, rating_date } = req.body;
    if (!defense && !stance && !offense && !practice_quality && !notes) {
      return res.status(400).json({ error: 'At least one rating field or notes is required' });
    }
    const rating = coaching.createRating(req.params.id, req.user.id, {
      defense, stance, offense, practice_quality, notes, rating_date
    });
    res.status(201).json(rating);
  } catch (error) {
    console.error('Error creating rating:', error);
    res.status(500).json({ error: 'Failed to create rating' });
  }
});

router.get('/:id/insights', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const result = coaching.getInsights(req.params.id, limit);
    res.json(result);
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

router.get('/:id/drills', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const drills = coaching.getDrills(req.params.id, limit);
    res.json(drills);
  } catch (error) {
    console.error('Error fetching drills:', error);
    res.status(500).json({ error: 'Failed to fetch drills' });
  }
});

module.exports = router;
