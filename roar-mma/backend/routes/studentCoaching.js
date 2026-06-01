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

router.put('/ratings/:id', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const allowedFields = ['defense', 'stance', 'offense', 'practice_quality', 'notes'];
    const updateData = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });
    const rating = coaching.updateRating(req.params.id, updateData);
    if (!rating) return res.status(404).json({ error: 'Rating not found' });
    res.json(rating);
  } catch (error) {
    console.error('Error updating rating:', error);
    res.status(500).json({ error: 'Failed to update rating' });
  }
});

router.delete('/ratings/:id', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const ok = coaching.deleteRating(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Rating not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting rating:', error);
    res.status(500).json({ error: 'Failed to delete rating' });
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

router.delete('/drills/:id', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const ok = coaching.deleteDrill(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Drill not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting drill:', error);
    res.status(500).json({ error: 'Failed to delete drill' });
  }
});

router.put('/insights/:id', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const allowedFields = ['skill_level', 'fight_readiness', 'recommended_weight_class', 'weight_advice',
      'diet_recommendation', 'strengths', 'weaknesses', 'summary', 'details'];
    const updateData = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });
    const insight = coaching.updateInsight(req.params.id, updateData);
    if (!insight) return res.status(404).json({ error: 'Insight not found' });
    res.json(insight);
  } catch (error) {
    console.error('Error updating insight:', error);
    res.status(500).json({ error: 'Failed to update insight' });
  }
});

router.delete('/insights/:id', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const ok = coaching.deleteInsight(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Insight not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting insight:', error);
    res.status(500).json({ error: 'Failed to delete insight' });
  }
});

module.exports = router;
