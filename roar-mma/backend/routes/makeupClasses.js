const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const makeupData = require('../data/makeupClasses');
const router = express.Router();

router.get('/member/:memberId', authenticateToken, requirePermission('classes:read'), (req, res) => {
  try {
    res.json({ makeups: makeupData.getMakeupsByMember(parseInt(req.params.memberId)) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch makeups' });
  }
});

router.get('/active', authenticateToken, requirePermission('classes:read'), (req, res) => {
  try {
    res.json({ active: makeupData.getAllActive() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active makeups' });
  }
});

router.post('/', authenticateToken, requirePermission('classes:update'), (req, res) => {
  try {
    const { member_id, original_date, original_class_id, granted_by, expires_in_days, notes } = req.body;
    if (!member_id) return res.status(400).json({ error: 'member_id is required' });
    const makeup = makeupData.grantMakeup({ member_id, original_date, original_class_id, granted_by: granted_by || req.user?.id, expires_in_days, notes });
    res.status(201).json(makeup);
  } catch (error) {
    console.error('Error granting makeup:', error);
    res.status(500).json({ error: 'Failed to grant makeup class' });
  }
});

router.post('/:id/use', authenticateToken, requirePermission('classes:update'), (req, res) => {
  try {
    const existing = makeupData.getMakeupById(parseInt(req.params.id));
    if (!existing) return res.status(404).json({ error: 'Makeup not found' });
    if (existing.used_at) return res.status(400).json({ error: 'Makeup already used' });
    const { class_instance_id } = req.body;
    const makeup = makeupData.useMakeup(parseInt(req.params.id), class_instance_id);
    res.json(makeup);
  } catch (error) {
    res.status(500).json({ error: 'Failed to use makeup' });
  }
});

router.delete('/:id', authenticateToken, requirePermission('classes:update'), (req, res) => {
  try {
    makeupData.deleteMakeup(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete makeup' });
  }
});

module.exports = router;
