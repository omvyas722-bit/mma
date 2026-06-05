const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const aiState = require('../services/ai/aiState');
const aiDaemon = require('../services/ai/aiDaemon');
const providerChain = require('../services/ai/providerChain');
const chatEngine = require('../services/ai/chatEngine');
const openRouterClient = require('../services/ai/openRouterClient');
const dbConn = require('../db/connection');

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

router.get('/pending-approval', authenticateToken, requirePermission('reports:read'), async (req, res) => {
  try {
    const db = dbConn.getDatabase();
    const pending = db.prepare(`
      SELECT eq.id, eq.assigned_agent as agent, eq.payload, eq.created_at,
             COALESCE(l.first_name || ' ' || l.last_name, 'Unknown') as recipient_name
      FROM event_queue eq
      LEFT JOIN leads l ON l.id = json_extract(eq.payload, '$.lead_id')
      WHERE eq.status = 'pending' AND eq.assigned_agent IS NOT NULL
      ORDER BY eq.created_at DESC
      LIMIT 50
    `).all();

    const mapped = pending.map(eq => {
      let payload = {};
      try { payload = typeof eq.payload === 'string' ? JSON.parse(eq.payload) : (eq.payload || {}); } catch {}
      return {
        id: eq.id,
        agent: eq.agent,
        channel: payload.channel || 'sms',
        recipient_name: eq.recipient_name,
        subject: payload.subject || null,
        body: payload.body || payload.message || '',
        created_at: eq.created_at,
      };
    });

    res.json({ pending: mapped, total: mapped.length });
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
});

router.post('/approve/:id', authenticateToken, requirePermission('staff:update'), async (req, res) => {
  try {
    const db = dbConn.getDatabase();
    const result = db.prepare(`UPDATE event_queue SET status = 'approved', processed_at = datetime('now'), processed_by = ? WHERE id = ? AND status = 'pending'`)
      .run(req.user.id, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Pending item not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error approving item:', error);
    res.status(500).json({ error: 'Failed to approve' });
  }
});

router.post('/reject/:id', authenticateToken, requirePermission('staff:update'), async (req, res) => {
  try {
    const db = dbConn.getDatabase();
    const result = db.prepare(`UPDATE event_queue SET status = 'rejected', processed_at = datetime('now'), processed_by = ? WHERE id = ? AND status = 'pending'`)
      .run(req.user.id, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Pending item not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error rejecting item:', error);
    res.status(500).json({ error: 'Failed to reject' });
  }
});

router.post('/resubmit/:id', authenticateToken, requirePermission('staff:update'), async (req, res) => {
  try {
    const db = dbConn.getDatabase();
    const { body } = req.body;
    if (!body || !body.trim()) return res.status(400).json({ error: 'Body is required' });
    const existing = db.prepare(`SELECT * FROM event_queue WHERE id = ? AND status = 'pending'`).get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Pending item not found' });
    let payload = {};
    try { payload = typeof existing.payload === 'string' ? JSON.parse(existing.payload) : (existing.payload || {}); } catch { payload = {}; }
    payload.body = body;
    if (payload.message) payload.message = body;
    db.prepare(`UPDATE event_queue SET payload = ? WHERE id = ?`).run(JSON.stringify(payload), req.params.id);
    res.json({ success: true, message: 'Resubmitted' });
  } catch (error) {
    console.error('Error resubmitting item:', error);
    res.status(500).json({ error: 'Failed to resubmit' });
  }
});

module.exports = router;
