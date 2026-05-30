const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const chatEngine = require('../services/ai/chatEngine');

const router = express.Router();

let aiStatus = {
  running: true,
  uptime: 0,
  lastTick: new Date().toISOString(),
  ticksExecuted: 0,
  actionsToday: 0,
  dailyApiCalls: 0,
  dailyApiLimit: 50,
  startedAt: new Date().toISOString()
};

setInterval(() => {
  aiStatus.uptime = Math.floor((Date.now() - new Date(aiStatus.startedAt).getTime()) / 1000);
}, 60000);

const activityLog = [];
const AGENTS = [
  { agent_name: 'lead_agent', enabled: true, interval_ms: 300000, description: 'Lead processing & scoring' },
  { agent_name: 'member_agent', enabled: true, interval_ms: 600000, description: 'Member engagement monitoring' },
  { agent_name: 'revenue_agent', enabled: true, interval_ms: 3600000, description: 'Revenue & billing checks' },
  { agent_name: 'class_agent', enabled: true, interval_ms: 300000, description: 'Class capacity optimization' },
  { agent_name: 'task_agent', enabled: true, interval_ms: 600000, description: 'Task automation & reminders' },
  { agent_name: 'retention_agent', enabled: true, interval_ms: 86400000, description: 'Member retention analysis' },
  { agent_name: 'nurture_agent', enabled: true, interval_ms: 3600000, description: 'Lead nurturing sequences' },
  { agent_name: 'winback_agent', enabled: true, interval_ms: 86400000, description: 'Win-back campaigns' },
  { agent_name: 'report_agent', enabled: true, interval_ms: 86400000, description: 'Daily report generation' },
  { agent_name: 'cleanup_agent', enabled: true, interval_ms: 43200000, description: 'Data cleanup & maintenance' }
];

router.post('/chat', authenticateToken, async (req, res) => {
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

    aiStatus.actionsToday++;
    aiStatus.dailyApiCalls++;
    aiStatus.lastTick = new Date().toISOString();

    const logEntry = {
      id: Date.now(),
      agent_name: 'chat',
      action_type: 'user_query',
      summary: query.length > 100 ? query.slice(0, 97) + '...' : query,
      created_at: new Date().toISOString(),
      status: result.confidence > 0.5 ? 'success' : 'partial'
    };
    activityLog.unshift(logEntry);
    if (activityLog.length > 200) activityLog.length = 200;

    res.json({
      response: result.response,
      actions: result.action ? [result.action] : [],
      confidence: result.confidence
    });
  } catch (error) {
    console.error('[AI-CHAT] Error:', error.message);
    res.status(500).json({
      response: 'Sorry, I encountered an error. Please try again.',
      actions: [],
      confidence: 0
    });
  }
});

router.get('/status', authenticateToken, (req, res) => {
  res.json(aiStatus);
});

router.get('/history', authenticateToken, (req, res) => {
  const { agent } = req.query;
  let logs = activityLog;
  if (agent) {
    logs = logs.filter(l => l.agent_name === agent);
  }
  res.json(logs.slice(0, 100));
});

router.get('/agents', authenticateToken, (req, res) => {
  res.json(AGENTS);
});

router.post('/agents/:name/toggle', authenticateToken, (req, res) => {
  const { name } = req.params;
  const agent = AGENTS.find(a => a.agent_name === name);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  agent.enabled = !agent.enabled;
  const entry = {
    id: Date.now(),
    agent_name: name,
    action_type: 'toggle',
    summary: `${name} ${agent.enabled ? 'enabled' : 'disabled'}`,
    created_at: new Date().toISOString(),
    status: 'success'
  };
  activityLog.unshift(entry);
  if (activityLog.length > 200) activityLog.length = 200;
  res.json({ success: true, enabled: agent.enabled });
});

module.exports = router;
