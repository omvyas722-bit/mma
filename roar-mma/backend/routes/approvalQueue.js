const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const queueData = require('../data/approvalQueue');
const router = express.Router();

router.get('/', authenticateToken, requirePermission('ai:manage'), (req, res) => {
  try {
    const { status, agent_name } = req.query;
    res.json({ queue: queueData.getQueue({ status, agent_name }) });
  } catch (error) {
    console.error('Error fetching approval queue:', error);
    res.status(500).json({ error: 'Failed to fetch approval queue' });
  }
});

router.get('/count', authenticateToken, (req, res) => {
  try {
    res.json({ count: queueData.getPendingCount() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get count' });
  }
});

router.post('/', authenticateToken, requirePermission('ai:manage'), (req, res) => {
  try {
    const { agent_name, action_type, entity_type, entity_id, payload, reason } = req.body;
    if (!agent_name || !action_type || !payload) return res.status(400).json({ error: 'agent_name, action_type, and payload are required' });
    const item = queueData.enqueue({ agent_name, action_type, entity_type, entity_id, payload, reason, requested_by: req.user?.id });
    res.status(201).json(item);
  } catch (error) {
    console.error('Error enqueueing approval:', error);
    res.status(500).json({ error: 'Failed to enqueue approval' });
  }
});

router.post('/:id/approve', authenticateToken, requirePermission('ai:manage'), (req, res) => {
  try {
    const item = queueData.getQueueItem(parseInt(req.params.id));
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.status !== 'pending') return res.status(400).json({ error: 'Item already processed' });
    const approved = queueData.approve(parseInt(req.params.id), req.user?.id);
    res.json(approved);
  } catch (error) {
    console.error('Error approving item:', error);
    res.status(500).json({ error: 'Failed to approve item' });
  }
});

router.post('/:id/reject', authenticateToken, requirePermission('ai:manage'), (req, res) => {
  try {
    const item = queueData.getQueueItem(parseInt(req.params.id));
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.status !== 'pending') return res.status(400).json({ error: 'Item already processed' });
    const rejected = queueData.reject(parseInt(req.params.id), req.user?.id);
    res.json(rejected);
  } catch (error) {
    console.error('Error rejecting item:', error);
    res.status(500).json({ error: 'Failed to reject item' });
  }
});

module.exports = router;
