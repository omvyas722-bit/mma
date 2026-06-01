const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const autoMsgData = require('../data/automatedMessages');
const router = express.Router();

router.get('/', authenticateToken, requirePermission('communications:read'), (req, res) => {
  try { res.json({ messages: autoMsgData.getAll() }); }
  catch (error) { res.status(500).json({ error: 'Failed to fetch' }); }
});

router.get('/:id', authenticateToken, requirePermission('communications:read'), (req, res) => {
  try {
    const msg = autoMsgData.getById(parseInt(req.params.id));
    if (!msg) return res.status(404).json({ error: 'Not found' });
    res.json(msg);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch' }); }
});

router.post('/', authenticateToken, requirePermission('communications:write'), (req, res) => {
  try {
    const { trigger_event, template_id, title, body, channel, audience_filter, enabled } = req.body;
    if (!trigger_event || !title || !body) return res.status(400).json({ error: 'trigger_event, title, and body required' });
    const msg = autoMsgData.create({ trigger_event, template_id, title, body, channel, audience_filter, enabled });
    res.status(201).json(msg);
  } catch (error) { res.status(500).json({ error: 'Failed to create' }); }
});

router.put('/:id', authenticateToken, requirePermission('communications:write'), (req, res) => {
  try {
    const existing = autoMsgData.getById(parseInt(req.params.id));
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const msg = autoMsgData.update(parseInt(req.params.id), req.body);
    res.json(msg);
  } catch (error) { res.status(500).json({ error: 'Failed to update' }); }
});

router.delete('/:id', authenticateToken, requirePermission('communications:write'), (req, res) => {
  try {
    autoMsgData.remove(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Failed to delete' }); }
});

module.exports = router;
