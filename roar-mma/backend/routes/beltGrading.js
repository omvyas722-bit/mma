// Belt grading routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const beltGradingData = require('../data/beltGrading');

const router = express.Router();

// Belt levels
router.get('/belts', authenticateToken, requirePermission('grading:read'), (req, res) => {
  try {
    const belts = beltGradingData.getAllBeltLevels();
    res.json(belts);
  } catch (error) {
    console.error('Error fetching belt levels:', error);
    res.status(500).json({ error: 'Failed to fetch belt levels' });
  }
});

router.get('/belts/:id/requirements', authenticateToken, requirePermission('grading:read'), (req, res) => {
  try {
    const requirements = beltGradingData.getRequirementsForBelt(req.params.id);
    res.json(requirements);
  } catch (error) {
    console.error('Error fetching requirements:', error);
    res.status(500).json({ error: 'Failed to fetch requirements' });
  }
});

// Member belt progress
router.get('/members/:memberId/progress', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const progress = beltGradingData.getMemberBeltProgress(req.params.memberId);
    if (!progress) {
      return res.status(404).json({ error: 'No belt progress found and white belt level is not configured' });
    }
    res.json(progress);
  } catch (error) {
    console.error('Error fetching member progress:', error);
    res.status(500).json({ error: 'Failed to fetch member progress' });
  }
});

router.post('/members/:memberId/assign-belt', authenticateToken, requirePermission('grading:write'), (req, res) => {
  try {
    const progress = beltGradingData.assignBelt(
      req.params.memberId,
      req.body.belt_level_id,
      req.body.stripes || 0,
      req.body.awarded_date || null,
      req.user.id,
      req.body.grading_session_id || null
    );

    if (global.wsBroadcast) {
      global.wsBroadcast({
        type: 'belt_awarded',
        data: progress
      });
    }

    res.json(progress);
  } catch (error) {
    console.error('Error assigning belt:', error);
    res.status(500).json({ error: 'Failed to assign belt' });
  }
});

router.post('/members/:memberId/award-stripe', authenticateToken, requirePermission('grading:write'), (req, res) => {
  try {
    const progress = beltGradingData.awardStripe(req.params.memberId, req.user.id);

    if (global.wsBroadcast) {
      global.wsBroadcast({
        type: 'stripe_awarded',
        data: progress
      });
    }

    res.json(progress);
  } catch (error) {
    console.error('Error awarding stripe:', error);
    res.status(500).json({ error: 'Failed to award stripe' });
  }
});

router.get('/members/:memberId/eligibility', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const eligibility = beltGradingData.checkGradingEligibility(req.params.memberId);
    res.json(eligibility);
  } catch (error) {
    console.error('Error checking eligibility:', error);
    res.status(500).json({ error: 'Failed to check eligibility' });
  }
});

// Member techniques
router.get('/members/:memberId/techniques', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const beltLevelId = req.query.belt_level_id ? parseInt(req.query.belt_level_id, 10) : null;
    const techniques = beltGradingData.getMemberTechniques(req.params.memberId, beltLevelId);
    res.json(techniques);
  } catch (error) {
    console.error('Error fetching member techniques:', error);
    res.status(500).json({ error: 'Failed to fetch member techniques' });
  }
});

router.post('/members/:memberId/techniques', authenticateToken, requirePermission('grading:write'), (req, res) => {
  try {
    const technique = beltGradingData.updateMemberTechnique(
      req.params.memberId,
      req.body.requirement_id,
      req.body.proficiency_level,
      req.user.id,
      req.body.notes || null
    );

    res.json(technique);
  } catch (error) {
    console.error('Error updating technique:', error);
    res.status(500).json({ error: 'Failed to update technique' });
  }
});

// Grading sessions
router.get('/sessions', authenticateToken, requirePermission('grading:read'), (req, res) => {
  try {
    const filters = {
      status: req.query.status
    };

    const sessions = beltGradingData.getGradingSessions(filters);
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching grading sessions:', error);
    res.status(500).json({ error: 'Failed to fetch grading sessions' });
  }
});

router.post('/sessions', authenticateToken, requirePermission('grading:write'), (req, res) => {
  try {
    const allowedFields = ['session_date', 'session_time', 'location', 'grading_coach_id', 'notes'];
    const sessionData = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) sessionData[f] = req.body[f]; });
    sessionData.grading_coach_id = sessionData.grading_coach_id || req.user.id;
    const session = beltGradingData.createGradingSession(sessionData);

    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating grading session:', error);
    res.status(500).json({ error: 'Failed to create grading session' });
  }
});

router.put('/sessions/:id', authenticateToken, requirePermission('grading:write'), (req, res) => {
  try {
    const allowedFields = ['session_date', 'session_time', 'location', 'grading_coach_id', 'status', 'notes'];
    const updateData = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });

    const session = beltGradingData.updateGradingSession(req.params.id, updateData);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (error) {
    console.error('Error updating grading session:', error);
    res.status(500).json({ error: 'Failed to update grading session' });
  }
});

router.delete('/sessions/:id', authenticateToken, requirePermission('grading:write'), (req, res) => {
  try {
    const ok = beltGradingData.deleteGradingSession(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Session not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting grading session:', error);
    res.status(500).json({ error: 'Failed to delete grading session' });
  }
});

router.post('/sessions/:sessionId/participants', authenticateToken, requirePermission('grading:write'), (req, res) => {
  try {
    const participant = beltGradingData.addGradingParticipant(
      req.params.sessionId,
      req.body.member_id,
      req.body.testing_for_belt_id
    );

    res.status(201).json(participant);
  } catch (error) {
    console.error('Error adding participant:', error);
    res.status(500).json({ error: 'Failed to add participant' });
  }
});

router.post('/participants/:participantId/result', authenticateToken, requirePermission('grading:write'), (req, res) => {
  try {
    const participant = beltGradingData.recordGradingResult(
      req.params.participantId,
      req.body.result,
      req.body.score || null,
      req.body.feedback || null,
      req.body.awarded_stripes || 0
    );

    if (req.body.result === 'passed' && global.wsBroadcast) {
      global.wsBroadcast({
        type: 'grading_passed',
        data: participant
      });
    }

    res.json(participant);
  } catch (error) {
    console.error('Error recording result:', error);
    res.status(500).json({ error: 'Failed to record result' });
  }
});

// Grading history
router.get('/members/:memberId/history', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const history = beltGradingData.getMemberGradingHistory(req.params.memberId);
    res.json(history);
  } catch (error) {
    console.error('Error fetching grading history:', error);
    res.status(500).json({ error: 'Failed to fetch grading history' });
  }
});

module.exports = router;
