const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const workflowsData = require('../data/workflows');

const router = express.Router();

router.get('/', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try { res.json(workflowsData.getAllRules()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/trigger-types', authenticateToken, requirePermission('reports:read'), (req, res) => {
  res.json(workflowsData.getTriggerTypes());
});

router.get('/action-types', authenticateToken, requirePermission('reports:read'), (req, res) => {
  res.json(workflowsData.getActionTypes());
});

router.get('/:id', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const rule = workflowsData.getRule(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json(rule);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticateToken, requirePermission('staff:update'), (req, res) => {
  try {
    const { name, description, trigger_type, trigger_config, condition_type, conditions, action_type, action_config } = req.body;
    if (!name || !trigger_type || !action_type) return res.status(400).json({ error: 'name, trigger_type, action_type required' });
    const rule = workflowsData.createRule({ name, description, trigger_type, trigger_config, condition_type, conditions, action_type, action_config, created_by: req.user.id });
    res.status(201).json(rule);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticateToken, requirePermission('staff:update'), (req, res) => {
  try {
    const rule = workflowsData.getRule(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    const updated = workflowsData.updateRule(req.params.id, req.body);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticateToken, requirePermission('staff:update'), (req, res) => {
  try {
    workflowsData.deleteRule(req.params.id);
    res.json({ message: 'Rule deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/executions', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try { res.json(workflowsData.getExecutions(req.params.id, parseInt(req.query.limit) || 50)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/toggle', authenticateToken, requirePermission('staff:update'), (req, res) => {
  try {
    const rule = workflowsData.getRule(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    const updated = workflowsData.updateRule(req.params.id, { enabled: rule.enabled ? 0 : 1 });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;