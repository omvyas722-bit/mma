// Bookings routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const bookingsData = require('../data/bookings');
const membersData = require('../data/members');
const classesData = require('../data/classes');

const router = express.Router();

// Get all bookings (with filters)
router.get('/', authenticateToken, requirePermission('bookings:read'), (req, res) => {
  try {
    const filters = {
      member_id: req.query.member_id,
      class_instance_id: req.query.class_instance_id,
      status: req.query.status,
      date: req.query.date
    };

    const bookings = bookingsData.getAllBookings(filters);
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get booking stats
router.get('/stats', authenticateToken, requirePermission('bookings:read'), (req, res) => {
  try {
    const stats = bookingsData.getBookingStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching booking stats:', error);
    res.status(500).json({ error: 'Failed to fetch booking stats' });
  }
});

// Get single booking by ID
router.get('/:id', authenticateToken, requirePermission('bookings:read'), (req, res) => {
  try {
    const booking = bookingsData.getBookingById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Create new booking
router.post('/', authenticateToken, requirePermission('bookings:create'), (req, res) => {
  try {
    const { member_id, class_instance_id } = req.body;

    if (!member_id || !class_instance_id) {
      return res.status(400).json({ error: 'member_id and class_instance_id required' });
    }

    // Verify member exists and is eligible
    const member = membersData.getMemberById(member_id);

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Check member status
    if (member.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot book for cancelled member' });
    }

    if (member.status === 'paused') {
      return res.status(400).json({ error: 'Cannot book for paused member' });
    }

    if (member.status === 'trial') {
      // Check if trial has expired
      if (member.trial_end_date) {
        const trialEnd = new Date(member.trial_end_date);
        const today = new Date();
        if (today > trialEnd) {
          return res.status(400).json({ error: 'Trial period has expired' });
        }
      }
    }

    // Verify class instance exists
    const instance = classesData.getClassInstanceById(class_instance_id);

    if (!instance) {
      return res.status(404).json({ error: 'Class instance not found' });
    }

    if (instance.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot book cancelled class' });
    }

    if (instance.status === 'completed') {
      return res.status(400).json({ error: 'Cannot book completed class' });
    }

    // Create booking
    const booking = bookingsData.createBooking({ member_id, class_instance_id });

    res.status(201).json(booking);
  } catch (error) {
    console.error('Error creating booking:', error);

    if (error.message.includes('already has a booking')) {
      return res.status(409).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Cancel booking
router.post('/:id/cancel', authenticateToken, requirePermission('bookings:update'), (req, res) => {
  try {
    const result = bookingsData.cancelBooking(req.params.id);

    res.json(result);
  } catch (error) {
    console.error('Error cancelling booking:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('already cancelled')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// Mark attendance
router.post('/:id/attendance', authenticateToken, requirePermission('attendance:update'), (req, res) => {
  try {
    const { attended } = req.body;

    if (attended === undefined) {
      return res.status(400).json({ error: 'attended field required (true/false)' });
    }

    const booking = bookingsData.markAttendance(req.params.id, attended);

    res.json(booking);
  } catch (error) {
    console.error('Error marking attendance:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('cancelled')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

// Get upcoming bookings for a member
router.get('/member/:memberId/upcoming', authenticateToken, requirePermission('bookings:read'), (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const bookings = bookingsData.getUpcomingBookings(req.params.memberId, limit);

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching upcoming bookings:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming bookings' });
  }
});

module.exports = router;
