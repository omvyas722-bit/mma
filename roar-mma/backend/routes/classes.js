// Classes routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const classesData = require('../data/classes');

const router = express.Router();

// Get all classes (recurring definitions)
router.get('/', authenticateToken, requirePermission('classes:read'), (req, res) => {
  try {
    const filters = {
      location: req.query.location,
      class_type: req.query.class_type,
      active: req.query.active
    };

    const classes = classesData.getAllClasses(filters);
    res.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// Get class instances (specific occurrences)
router.get('/instances', authenticateToken, requirePermission('classes:read'), (req, res) => {
  try {
    const filters = {
      date: req.query.date,
      week_start: req.query.week_start,
      week_end: req.query.week_end,
      location: req.query.location,
      status: req.query.status
    };

    const instances = classesData.getClassInstances(filters);
    res.json(instances);
  } catch (error) {
    console.error('Error fetching class instances:', error);
    res.status(500).json({ error: 'Failed to fetch class instances' });
  }
});

// Get single class by ID
router.get('/:id', authenticateToken, requirePermission('classes:read'), (req, res) => {
  try {
    const classInfo = classesData.getClassById(req.params.id);

    if (!classInfo) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json(classInfo);
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

// Get class instance by ID
router.get('/instances/:id', authenticateToken, requirePermission('classes:read'), (req, res) => {
  try {
    const instance = classesData.getClassInstanceById(req.params.id);

    if (!instance) {
      return res.status(404).json({ error: 'Class instance not found' });
    }

    res.json(instance);
  } catch (error) {
    console.error('Error fetching class instance:', error);
    res.status(500).json({ error: 'Failed to fetch class instance' });
  }
});

// Get class roster (members booked)
router.get('/instances/:id/roster', authenticateToken, requirePermission('classes:read'), (req, res) => {
  try {
    const roster = classesData.getClassRoster(req.params.id);
    res.json(roster);
  } catch (error) {
    console.error('Error fetching class roster:', error);
    res.status(500).json({ error: 'Failed to fetch class roster' });
  }
});

// Create new class
router.post('/', authenticateToken, requirePermission('classes:create'), (req, res) => {
  try {
    const { name, location, day_of_week, start_time, class_type } = req.body;

    if (!name || !location || day_of_week === undefined || !start_time || !class_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (day_of_week < 0 || day_of_week > 6) {
      return res.status(400).json({ error: 'day_of_week must be between 0 (Sunday) and 6 (Saturday)' });
    }

    const classInfo = classesData.createClass(req.body);

    res.status(201).json(classInfo);
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// Update class
router.put('/:id', authenticateToken, requirePermission('classes:update'), (req, res) => {
  try {
    const classInfo = classesData.getClassById(req.params.id);

    if (!classInfo) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const updatedClass = classesData.updateClass(req.params.id, req.body);

    res.json(updatedClass);
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

// Delete class
router.delete('/:id', authenticateToken, requirePermission('classes:delete'), (req, res) => {
  try {
    const classInfo = classesData.getClassById(req.params.id);

    if (!classInfo) {
      return res.status(404).json({ error: 'Class not found' });
    }

    classesData.deleteClass(req.params.id);

    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

// Generate class instances for a date range
router.post('/:id/generate-instances', authenticateToken, requirePermission('classes:create'), (req, res) => {
  try {
    const { start_date, end_date } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date required' });
    }

    const instances = classesData.generateClassInstances(req.params.id, start_date, end_date);

    res.json({
      message: `Generated ${instances.length} class instances`,
      instances
    });
  } catch (error) {
    console.error('Error generating class instances:', error);
    res.status(500).json({ error: 'Failed to generate class instances' });
  }
});

// Cancel class instance
router.post('/instances/:id/cancel', authenticateToken, requirePermission('classes:update'), (req, res) => {
  try {
    const { cancellation_reason } = req.body;

    const instance = classesData.getClassInstanceById(req.params.id);

    if (!instance) {
      return res.status(404).json({ error: 'Class instance not found' });
    }

    if (instance.status === 'cancelled') {
      return res.status(400).json({ error: 'Class instance already cancelled' });
    }

    const updatedInstance = classesData.updateClassInstance(req.params.id, {
      status: 'cancelled',
      cancellation_reason: cancellation_reason || 'No reason provided'
    });

    res.json(updatedInstance);
  } catch (error) {
    console.error('Error cancelling class instance:', error);
    res.status(500).json({ error: 'Failed to cancel class instance' });
  }
});

// Get class attendees
router.get('/:id/attendees', authenticateToken, requirePermission('classes:read'), (req, res) => {
  try {
    const db = require('../db/connection').getDatabase();

    const attendees = db.prepare(`
      SELECT
        b.id as attendance_id,
        b.member_id,
        m.first_name,
        m.last_name,
        m.email,
        b.attended_at,
        b.booked_at
      FROM bookings b
      JOIN members m ON b.member_id = m.id
      WHERE b.class_instance_id = ? AND b.status = 'booked'
      ORDER BY b.booked_at DESC
    `).all(req.params.id);

    res.json(attendees);
  } catch (error) {
    console.error('Error fetching attendees:', error);
    res.status(500).json({ error: 'Failed to fetch attendees' });
  }
});

// Check in members to class
router.post('/:id/check-in', authenticateToken, requirePermission('attendance:update'), (req, res) => {
  try {
    const { member_ids } = req.body;

    if (!member_ids || !Array.isArray(member_ids) || member_ids.length === 0) {
      return res.status(400).json({ error: 'member_ids array required' });
    }

    const db = require('../db/connection').getDatabase();
    const bookingsData = require('../data/bookings');
    const results = [];

    for (const memberId of member_ids) {
      try {
        // Check if booking exists
        const existingBooking = db.prepare(`
          SELECT id FROM bookings
          WHERE member_id = ? AND class_instance_id = ? AND status = 'booked'
        `).get(memberId, req.params.id);

        if (existingBooking) {
          // Mark as attended
          bookingsData.markAttendance(existingBooking.id, true);
          results.push({ member_id: memberId, status: 'checked_in' });
        } else {
          // Create booking and mark as attended
          const booking = bookingsData.createBooking({
            member_id: memberId,
            class_instance_id: req.params.id
          });
          bookingsData.markAttendance(booking.id, true);
          results.push({ member_id: memberId, status: 'checked_in' });
        }
      } catch (error) {
        results.push({ member_id: memberId, status: 'error', error: error.message });
      }
    }

    res.json({ results });
  } catch (error) {
    console.error('Error checking in members:', error);
    res.status(500).json({ error: 'Failed to check in members' });
  }
});

module.exports = router;
