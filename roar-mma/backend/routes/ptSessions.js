// PT sessions routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const ptSessionsData = require('../data/ptSessions');

const router = express.Router();

// Get all PT sessions
router.get('/', authenticateToken, requirePermission('staff:read'), (req, res) => {
  try {
    const filters = {
      member_id: req.query.member_id,
      coach_id: req.query.coach_id,
      status: req.query.status,
      date_from: req.query.date_from,
      date_to: req.query.date_to
    };

    const sessions = ptSessionsData.getAllSessions(filters);
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching PT sessions:', error);
    res.status(500).json({ error: 'Failed to fetch PT sessions' });
  }
});

// Get coach stats
router.get('/coach-stats/:coachId', authenticateToken, requirePermission('staff:read'), (req, res) => {
  try {
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;
    const stats = ptSessionsData.getCoachStats(req.params.coachId, dateFrom, dateTo);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching coach stats:', error);
    res.status(500).json({ error: 'Failed to fetch coach stats' });
  }
});

// Get single PT session
router.get('/:id', authenticateToken, requirePermission('staff:read'), (req, res) => {
  try {
    const session = ptSessionsData.getSessionById(req.params.id);

    if (!session) {
      return res.status(404).json({ error: 'PT session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching PT session:', error);
    res.status(500).json({ error: 'Failed to fetch PT session' });
  }
});

// Create PT session
router.post('/', authenticateToken, requirePermission('staff:write'), (req, res) => {
  try {
    const { member_id, coach_id, scheduled_date, scheduled_time } = req.body;

    if (!member_id || !coach_id || !scheduled_date || !scheduled_time) {
      return res.status(400).json({
        error: 'member_id, coach_id, scheduled_date, and scheduled_time required'
      });
    }

    const session = ptSessionsData.createSession(req.body);
    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating PT session:', error);
    res.status(500).json({ error: 'Failed to create PT session' });
  }
});

// Update PT session
router.put('/:id', authenticateToken, requirePermission('staff:write'), (req, res) => {
  try {
    const session = ptSessionsData.getSessionById(req.params.id);

    if (!session) {
      return res.status(404).json({ error: 'PT session not found' });
    }

    const updated = ptSessionsData.updateSession(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    console.error('Error updating PT session:', error);
    res.status(500).json({ error: 'Failed to update PT session' });
  }
});

// Complete PT session
router.post('/:id/complete', authenticateToken, requirePermission('staff:write'), (req, res) => {
  try {
    const session = ptSessionsData.getSessionById(req.params.id);

    if (!session) {
      return res.status(404).json({ error: 'PT session not found' });
    }

    if (session.status === 'completed') {
      return res.status(400).json({ error: 'Session already completed' });
    }

    const completed = ptSessionsData.completeSession(req.params.id);
    res.json(completed);
  } catch (error) {
    console.error('Error completing PT session:', error);
    res.status(500).json({ error: 'Failed to complete PT session' });
  }
});

// Cancel PT session
router.post('/:id/cancel', authenticateToken, requirePermission('staff:write'), (req, res) => {
  try {
    const session = ptSessionsData.getSessionById(req.params.id);

    if (!session) {
      return res.status(404).json({ error: 'PT session not found' });
    }

    const { reason } = req.body;
    const cancelled = ptSessionsData.cancelSession(req.params.id, reason);
    res.json(cancelled);
  } catch (error) {
    console.error('Error cancelling PT session:', error);
    res.status(500).json({ error: 'Failed to cancel PT session' });
  }
});

module.exports = router;
