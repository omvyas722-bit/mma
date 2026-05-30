// Members routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const membersData = require('../data/members');
const { isUniqueConstraintError } = require('../db/connection');

const router = express.Router();
const HOLD_FEE_PER_DAY = parseFloat(process.env.HOLD_FEE_PER_DAY) || 0.71;
const MAX_HOLD_DAYS = parseInt(process.env.MAX_HOLD_DAYS) || 84;

// Get all members (with filters and pagination)
router.get('/', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      location: req.query.location,
      query: req.query.query,
      limit: Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100),
      offset: Math.max(parseInt(req.query.offset) || 0, 0)
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
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
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
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
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

    const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'location', 'plan', 'emergency_contact_name', 'emergency_contact_phone', 'medical_conditions', 'injuries', 'goals', 'experience_level', 'source', 'notes'];
    const memberData = { trial_end_date: trialEndDate.toISOString().split('T')[0] };
    allowedFields.forEach(f => { if (req.body[f] !== undefined) memberData[f] = req.body[f]; });

    const member = membersData.createMember(memberData);

    res.status(201).json(member);
  } catch (error) {
    console.error('Error creating member:', error);

    if (isUniqueConstraintError(error)) {
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

    const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'location', 'status', 'plan', 'trial_end_date', 'pause_start', 'pause_end', 'cancellation_date', 'emergency_contact_name', 'emergency_contact_phone', 'medical_conditions', 'injuries', 'goals', 'experience_level', 'lightspeed_customer_id', 'notes'];
    const updateData = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });
    const updatedMember = membersData.updateMember(req.params.id, updateData);

    res.json(updatedMember);
  } catch (error) {
    console.error('Error updating member:', error);

    if (isUniqueConstraintError(error)) {
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

    // Validate pause period
    const startDate = new Date(pause_start);
    const endDate = new Date(pause_end);

    if (endDate <= startDate) {
      return res.status(400).json({ error: 'Pause end date must be after start date' });
    }

    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    if (days > MAX_HOLD_DAYS) {
      return res.status(400).json({ error: `Maximum hold period is ${MAX_HOLD_DAYS} days` });
    }

    const holdFee = +(days * HOLD_FEE_PER_DAY).toFixed(2);

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

module.exports = router;
