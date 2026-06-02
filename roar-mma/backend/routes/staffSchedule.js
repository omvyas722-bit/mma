const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const scheduleData = require('../data/staffSchedule');
const router = express.Router();

router.get('/', authenticateToken, requirePermission('staff:read'), (req, res) => {
  try {
    const { staff_id } = req.query;
    res.json({ schedule: scheduleData.getWeeklySchedule() });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch schedule' }); }
});

router.get('/shifts', authenticateToken, requirePermission('staff:read'), (req, res) => {
  try {
    const { staff_id } = req.query;
    res.json({ shifts: scheduleData.getShifts(staff_id || null) });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch shifts' }); }
});

router.post('/shifts', authenticateToken, requirePermission('staff:update'), (req, res) => {
  try {
    const { staff_id, day_of_week, start_time, end_time, location, role, notes } = req.body;
    if (!staff_id || day_of_week === undefined || !start_time || !end_time) return res.status(400).json({ error: 'staff_id, day_of_week, start_time, end_time required' });
    const shift = scheduleData.createShift({ staff_id, day_of_week, start_time, end_time, location, role, notes });
    res.status(201).json(shift);
  } catch (error) { res.status(500).json({ error: 'Failed to create shift' }); }
});

router.put('/shifts/:id', authenticateToken, requirePermission('staff:update'), (req, res) => {
  try {
    const shift = scheduleData.updateShift(parseInt(req.params.id), req.body);
    if (!shift) return res.status(404).json({ error: 'Shift not found' });
    res.json(shift);
  } catch (error) { res.status(500).json({ error: 'Failed to update shift' }); }
});

router.delete('/shifts/:id', authenticateToken, requirePermission('staff:update'), (req, res) => {
  try {
    scheduleData.deleteShift(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Failed to delete shift' }); }
});

router.get('/time-off', authenticateToken, requirePermission('staff:read'), (req, res) => {
  try {
    const { staff_id } = req.query;
    res.json({ timeOff: scheduleData.getTimeOff(staff_id || null) });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch time off' }); }
});

router.post('/time-off', authenticateToken, requirePermission('staff:update'), (req, res) => {
  try {
    const { staff_id, date_from, date_to, reason, type } = req.body;
    if (!staff_id || !date_from || !date_to) return res.status(400).json({ error: 'staff_id, date_from, date_to required' });
    const to = scheduleData.createTimeOff({ staff_id, date_from, date_to, reason, type });
    res.status(201).json(to);
  } catch (error) { res.status(500).json({ error: 'Failed to create time off' }); }
});

router.post('/time-off/:id/approve', authenticateToken, requirePermission('staff:update'), (req, res) => {
  try {
    const to = scheduleData.approveTimeOff(parseInt(req.params.id), req.user?.id);
    res.json(to);
  } catch (error) { res.status(500).json({ error: 'Failed to approve time off' }); }
});

router.delete('/time-off/:id', authenticateToken, requirePermission('staff:update'), (req, res) => {
  try {
    scheduleData.deleteTimeOff(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Failed to delete time off' }); }
});

module.exports = router;
