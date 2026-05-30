// Attendance routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const bookingsData = require('../data/bookings');
const { getDatabase } = require('../db/connection');

const router = express.Router();

// Delete attendance (remove member from class)
router.delete('/:id', authenticateToken, requirePermission('attendance:update'), (req, res) => {
  try {
    const db = getDatabase();

    // Check if attendance exists
    const attendance = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);

    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    // Delete the booking/attendance record
    db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);

    res.json({ message: 'Attendance removed successfully' });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({ error: 'Failed to delete attendance' });
  }
});

module.exports = router;
