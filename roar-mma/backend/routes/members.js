// Members routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const membersData = require('../data/members');

const router = express.Router();

// Get all members (with filters and pagination)
router.get('/', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      location: req.query.location,
      query: req.query.query,
      limit: req.query.limit,
      offset: req.query.offset
    };

    const result = membersData.getAllMembers(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Get member stats
router.get('/stats', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const stats = membersData.getMemberStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching member stats:', error);
    res.status(500).json({ error: 'Failed to fetch member stats' });
  }
});

// Get single member by ID
router.get('/:id', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const member = membersData.getMemberById(req.params.id);

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json(member);
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({ error: 'Failed to fetch member' });
  }
});

// Get member attendance history
router.get('/:id/attendance', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const attendance = membersData.getMemberAttendance(req.params.id, limit);
    res.json(attendance);
  } catch (error) {
    console.error('Error fetching member attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// Get member transaction history
router.get('/:id/transactions', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const transactions = membersData.getMemberTransactions(req.params.id, limit);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching member transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Create new member
router.post('/', authenticateToken, requirePermission('members:create'), (req, res) => {
  try {
    const { first_name, last_name, email, phone, location, joined_date } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email || !phone || !location || !joined_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if email already exists
    const existingMember = membersData.getMemberByEmail(email);
    if (existingMember) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Calculate trial end date (next Monday after 7 days from joined_date)
    const joinedDate = new Date(joined_date);
    const trialEndDate = new Date(joinedDate);
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    // Find next Monday
    while (trialEndDate.getDay() !== 1) {
      trialEndDate.setDate(trialEndDate.getDate() + 1);
    }

    const memberData = {
      ...req.body,
      trial_end_date: trialEndDate.toISOString().split('T')[0]
    };

    const member = membersData.createMember(memberData);

    res.status(201).json(member);
  } catch (error) {
    console.error('Error creating member:', error);

    if (error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    res.status(500).json({ error: 'Failed to create member' });
  }
});

// Update member
router.put('/:id', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const member = membersData.getMemberById(req.params.id);

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // If updating email, check for duplicates
    if (req.body.email && req.body.email !== member.email) {
      const existingMember = membersData.getMemberByEmail(req.body.email);
      if (existingMember) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }

    const updatedMember = membersData.updateMember(req.params.id, req.body);

    res.json(updatedMember);
  } catch (error) {
    console.error('Error updating member:', error);

    if (error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    res.status(500).json({ error: 'Failed to update member' });
  }
});

// Pause membership
router.post('/:id/pause', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const { pause_start, pause_end } = req.body;

    if (!pause_start || !pause_end) {
      return res.status(400).json({ error: 'Pause start and end dates required' });
    }

    const member = membersData.getMemberById(req.params.id);

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (member.status !== 'active') {
      return res.status(400).json({ error: 'Only active members can be paused' });
    }

    // Calculate hold fee ($0.71 per day)
    const startDate = new Date(pause_start);
    const endDate = new Date(pause_end);
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    if (days > 84) {
      return res.status(400).json({ error: 'Maximum hold period is 84 days' });
    }

    const holdFee = days * 0.71;

    const updatedMember = membersData.updateMember(req.params.id, {
      status: 'paused',
      pause_start,
      pause_end
    });

    res.json({
      member: updatedMember,
      hold_fee: holdFee,
      days: days
    });
  } catch (error) {
    console.error('Error pausing membership:', error);
    res.status(500).json({ error: 'Failed to pause membership' });
  }
});

// Resume membership
router.post('/:id/resume', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const member = membersData.getMemberById(req.params.id);

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (member.status !== 'paused') {
      return res.status(400).json({ error: 'Member is not paused' });
    }

    const updatedMember = membersData.updateMember(req.params.id, {
      status: 'active',
      pause_start: null,
      pause_end: null
    });

    res.json(updatedMember);
  } catch (error) {
    console.error('Error resuming membership:', error);
    res.status(500).json({ error: 'Failed to resume membership' });
  }
});

// Cancel membership
router.post('/:id/cancel', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const member = membersData.getMemberById(req.params.id);

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const updatedMember = membersData.updateMember(req.params.id, {
      status: 'cancelled',
      cancellation_date: new Date().toISOString().split('T')[0]
    });

    res.json(updatedMember);
  } catch (error) {
    console.error('Error cancelling membership:', error);
    res.status(500).json({ error: 'Failed to cancel membership' });
  }
});

// Delete member (soft delete by cancelling)
router.delete('/:id', authenticateToken, requirePermission('members:delete'), (req, res) => {
  try {
    const member = membersData.getMemberById(req.params.id);

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Soft delete by cancelling
    membersData.updateMember(req.params.id, {
      status: 'cancelled',
      cancellation_date: new Date().toISOString().split('T')[0]
    });

    res.json({ message: 'Member cancelled successfully' });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

module.exports = router;
