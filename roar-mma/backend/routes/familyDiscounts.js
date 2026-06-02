const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const familyData = require('../data/familyDiscounts');
const router = express.Router();

router.get('/', authenticateToken, requirePermission('members:read'), (req, res) => {
  try { res.json({ groups: familyData.getGroups() }); }
  catch (error) { res.status(500).json({ error: 'Failed to fetch groups' }); }
});

router.get('/:id', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const group = familyData.getGroup(parseInt(req.params.id));
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json(group);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch group' }); }
});

router.post('/', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const { name, discount_percentage } = req.body;
    const group = familyData.createGroup({ name, discount_percentage });
    res.status(201).json(group);
  } catch (error) { res.status(500).json({ error: 'Failed to create group' }); }
});

router.put('/:id', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const { name, discount_percentage } = req.body;
    const group = familyData.updateGroup(parseInt(req.params.id), { name, discount_percentage });
    res.json(group);
  } catch (error) { res.status(500).json({ error: 'Failed to update group' }); }
});

router.delete('/:id', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    familyData.deleteGroup(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Failed to delete group' }); }
});

router.post('/:id/members', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const { member_id } = req.body;
    if (!member_id) return res.status(400).json({ error: 'member_id required' });
    const group = familyData.addMember(parseInt(req.params.id), member_id);
    res.json(group);
  } catch (error) { res.status(500).json({ error: 'Failed to add member' }); }
});

router.delete('/:id/members/:memberId', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const group = familyData.removeMember(parseInt(req.params.id), parseInt(req.params.memberId));
    res.json(group);
  } catch (error) { res.status(500).json({ error: 'Failed to remove member' }); }
});

router.get('/member/:memberId', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const discount = familyData.getFamilyDiscount(parseInt(req.params.memberId));
    const family = familyData.getMemberFamily(parseInt(req.params.memberId));
    res.json({ discount, family });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch family info' }); }
});

module.exports = router;
