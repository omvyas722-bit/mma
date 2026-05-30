const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const aiState = require('../services/ai/aiState');
const aiDaemon = require('../services/ai/aiDaemon');
const providerChain = require('../services/ai/providerChain');
const chatEngine = require('../services/ai/chatEngine');
const openRouterClient = require('../services/ai/openRouterClient');

const router = express.Router();

router.post('/chat', authenticateToken, requirePermission('ai:manage'), async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required' });
    }
    if (query.length > 2000) {
      return res.status(400).json({ error: 'Query too long (max 2000 characters)' });
    }

    const userContext = {
      userId: req.user.id,
      name: req.user.name,
      role: req.user.role
    };

    const result = await chatEngine.processQuery(query.trim(), userContext);

    await aiState.logActivity({
      agentName: 'chat',
      actionType: 'user_query',
      summary: query.length > 100 ? query.slice(0, 97) + '...' : query,
      status: result.confidence > 0.5 ? 'completed' : 'partial'
    });

    res.json({
      response: result.response,
      actions: result.action ? [result.action] : [],
      confidence: result.confidence
    });
  } catch (error) {
    console.error('[AI-CHAT] Error:', error);
    res.status(500).json({ error: 'Failed to process chat query' });
  }
});

router.get('/status', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const daemon = aiDaemon.getStatus();
    const providerStatus = providerChain.getStatus();
    const providerStats = providerChain.getUsageStats();

    res.json({
      daemon,
      providers: { ...providerStatus, ...providerStats },
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Error fetching AI status:', error);
    res.status(500).json({ error: 'Failed to fetch AI status' });
  }
});

router.get('/history', authenticateToken, requirePermission('reports:read'), async (req, res) => {
  try {
    const history = await aiState.getActivityHistory({
      agentName: req.query.agent,
      limit: parseInt(req.query.limit, 10) || 50,
      offset: parseInt(req.query.offset, 10) || 0,
      status: req.query.status,
      actionType: req.query.action_type
    });

    res.json(history);
  } catch (error) {
    console.error('Error fetching AI history:', error);
    res.status(500).json({ error: 'Failed to fetch AI history' });
  }
});

router.post('/agents/:name/toggle', authenticateToken, requirePermission('staff:update'), async (req, res) => {
  try {
    const { name } = req.params;
    const config = await aiState.getAgentConfig(name);

    if (!config) {
      return res.status(404).json({ error: `Agent "${name}" not found` });
    }

    const updated = await aiState.updateAgentConfig(name, { enabled: !config.enabled });
    res.json(updated);
  } catch (error) {
    console.error('Error toggling agent:', error);
    res.status(500).json({ error: 'Failed to toggle agent' });
  }
});

router.get('/agents', authenticateToken, requirePermission('reports:read'), async (req, res) => {
  try {
    const agents = await aiState.getAllAgentConfigs();
    res.json(agents);
  } catch (error) {
    console.error('Error fetching agent configs:', error);
    res.status(500).json({ error: 'Failed to fetch agent configs' });
  }
});

router.put('/config', authenticateToken, requirePermission('staff:update'), async (req, res) => {
  try {
    const { agent_name, enabled, interval_ms, model_override, config_json } = req.body;

    if (!agent_name) {
      return res.status(400).json({ error: 'agent_name is required' });
    }

    const updated = await aiState.updateAgentConfig(agent_name, {
      enabled,
      interval_ms,
      model_override,
      config_json
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating AI config:', error);
    res.status(500).json({ error: 'Failed to update AI config' });
  }
});

router.post('/task', authenticateToken, requirePermission('staff:update'), async (req, res) => {
  try {
    const { agent_name, task_type, priority, payload, scheduled_for } = req.body;

    if (!task_type) {
      return res.status(400).json({ error: 'task_type is required' });
    }

    const task = await aiState.createTask({
      agentName: agent_name,
      taskType: task_type,
      priority: priority || 0,
      payload: payload || null,
      scheduledFor: scheduled_for || null
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating AI task:', error);
    res.status(500).json({ error: 'Failed to create AI task' });
  }
});

router.get('/stats', authenticateToken, requirePermission('reports:read'), async (req, res) => {
  try {
    const stats = await aiState.getStats();
    const usage = openRouterClient.getUsageStats();

    res.json({
      ...stats,
      openRouter: usage
    });
  } catch (error) {
    console.error('Error fetching AI stats:', error);
    res.status(500).json({ error: 'Failed to fetch AI stats' });
  }
});

module.exports = router;
