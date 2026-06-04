const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db/connection');
const aiState = require('../services/ai/aiState');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const teamAgents = new Map();

function registerTeamAgent(name, handlerFn) {
  teamAgents.set(name, handlerFn);
}

function agentLabel(name) {
  const labels = {
    sales_team: 'Sales & Marketing',
    member_success_team: 'Member Success',
    operations_team: 'Operations',
    finance_team: 'Finance & Billing'
  };
  return labels[name] || name;
}

// Run all team agents
router.post('/run', authenticateToken, requirePermission('ai:manage'), async (req, res) => {
  const agentName = req.body.agent;
  const db = getDatabase();
  const broadcast = typeof global.wsBroadcast === 'function' ? global.wsBroadcast : null;
  const openRouter = require('../services/ai/openRouterClient');

  try {
    if (agentName) {
      const handler = teamAgents.get(agentName);
      if (!handler) return res.status(404).json({ error: `Agent "${agentName}" not found` });
      const logEntry = await aiState.logActivity({ agentName, actionType: 'manual_run', summary: `Manual run triggered for ${agentLabel(agentName)}`, status: 'in_progress' });
      try {
        const result = await handler({ db, aiState, openRouter, broadcast, config: {} });
        if (logEntry && logEntry.id) await aiState.updateActivityStatus(logEntry.id, 'completed');
        res.json({ agent: agentName, ...result });
      } catch (handlerError) {
        if (logEntry && logEntry.id) await aiState.updateActivityStatus(logEntry.id, 'failed');
        throw handlerError;
      }
    } else {
      const results = [];
      for (const [name, handler] of teamAgents) {
        const logEntry = await aiState.logActivity({ agentName: name, actionType: 'manual_run', summary: `Manual run triggered for ${agentLabel(name)}`, status: 'in_progress' });
        try {
          const result = await handler({ db, aiState, openRouter, broadcast, config: {} });
          if (logEntry && logEntry.id) await aiState.updateActivityStatus(logEntry.id, 'completed');
          results.push({ agent: name, ...result });
        } catch (handlerError) {
          if (logEntry && logEntry.id) await aiState.updateActivityStatus(logEntry.id, 'failed');
          results.push({ agent: name, error: handlerError.message });
        }
      }
      res.json({ agents: results });
    }
  } catch (error) {
    console.error('[AGENTS-API] Run error:', error);
    res.status(500).json({ error: 'Failed to run agents' });
  }
});

// Get activity logs
router.get('/logs', authenticateToken, requirePermission('reports:read'), async (req, res) => {
  try {
    const { agent, limit, offset, status, action_type } = req.query;
    const logs = await aiState.getActivityHistory({
      agentName: agent,
      limit: parseInt(limit, 10) || 50,
      offset: parseInt(offset, 10) || 0,
      status,
      actionType: action_type
    });

    const count = await aiState.getFilteredLogCount({ agentName: agent, status, actionType: action_type });

    res.json({ logs, total: count });
  } catch (error) {
    console.error('[AGENTS-API] Logs error:', error);
    res.status(500).json({ error: 'Failed to fetch agent logs' });
  }
});

// Get agent stats
router.get('/stats', authenticateToken, requirePermission('reports:read'), async (req, res) => {
  try {
    const stats = await aiState.getStats();
    const db = getDatabase();

    const agents = [];
    for (const [name] of teamAgents) {
      const config = await aiState.getAgentConfig(name);
      const recentLogs = await aiState.getActivityHistory({ agentName: name, limit: 5 });
      agents.push({
        name,
        label: agentLabel(name),
        enabled: config ? config.enabled : true,
        interval_ms: config ? config.interval_ms : 60000,
        recentActions: recentLogs
      });
    }

    res.json({ ...stats, agents });
  } catch (error) {
    console.error('[AGENTS-API] Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch agent stats' });
  }
});

// Get agent configs
router.get('/config', authenticateToken, requirePermission('ai:manage'), async (req, res) => {
  try {
    const configs = await aiState.getAllAgentConfigs();
    res.json({ configs });
  } catch (error) {
    console.error('[AGENTS-API] Configs error:', error);
    res.status(500).json({ error: 'Failed to fetch agent configs' });
  }
});

// Update agent config
router.put('/config/:agent', authenticateToken, requirePermission('ai:manage'), async (req, res) => {
  try {
    const config = await aiState.updateAgentConfig(req.params.agent, req.body);
    res.json({ config });
  } catch (error) {
    console.error('[AGENTS-API] Config update error:', error);
    res.status(500).json({ error: 'Failed to update agent config' });
  }
});

// Get daemon status
router.get('/daemon', authenticateToken, requirePermission('reports:read'), async (req, res) => {
  try {
    const aiDaemon = require('../services/ai/aiDaemon');
    res.json(aiDaemon.getStatus());
  } catch (error) {
    console.error('[AGENTS-API] Daemon error:', error);
    res.status(500).json({ error: 'Failed to fetch daemon status' });
  }
});

// Token usage
router.get('/token-usage', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const { agent, days = 7 } = req.query;
    const db = require('../db/connection').getDatabase();
    let query = `SELECT agent_name, SUM(prompt_tokens) as prompt_tokens, SUM(completion_tokens) as completion_tokens, SUM(total_tokens) as total_tokens, SUM(cost) as cost, COUNT(*) as calls FROM ai_token_usage WHERE created_at >= datetime('now', '-' || ? || ' days')`;
    const params = [days];
    if (agent) { query += ' AND agent_name = ?'; params.push(agent); }
    query += ' GROUP BY agent_name ORDER BY total_tokens DESC';
    const byAgent = db.prepare(query).all(...params);
    const total = byAgent.reduce((s, a) => ({ prompt_tokens: s.prompt_tokens + a.prompt_tokens, completion_tokens: s.completion_tokens + a.completion_tokens, total_tokens: s.total_tokens + a.total_tokens, cost: s.cost + a.cost, calls: s.calls + a.calls }), { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cost: 0, calls: 0 });
    const daily = db.prepare(`SELECT DATE(created_at) as date, SUM(total_tokens) as tokens, SUM(cost) as cost FROM ai_token_usage WHERE created_at >= datetime('now', '-' || ? || ' days') GROUP BY DATE(created_at) ORDER BY date`).all(days);
    res.json({ byAgent, total, daily });
  } catch (error) { console.error('Token usage error:', error); res.status(500).json({ error: 'Failed to fetch token usage' }); }
});

// Log token usage (internal)
router.post('/token-usage', (req, res) => {
  try {
    const { agent_name, model, prompt_tokens, completion_tokens, total_tokens, cost, endpoint, user_id } = req.body;
    if (!agent_name) return res.status(400).json({ error: 'agent_name required' });
    const db = require('../db/connection').getDatabase();
    const r = db.prepare('INSERT INTO ai_token_usage (agent_name, model, prompt_tokens, completion_tokens, total_tokens, cost, endpoint, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(agent_name, model || null, prompt_tokens || 0, completion_tokens || 0, total_tokens || 0, cost || 0, endpoint || null, user_id || null);
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (error) { res.status(500).json({ error: 'Failed to log tokens' }); }
});

// Natural language scheduling endpoint
router.post('/schedule-class', authenticateToken, requirePermission('classes:create'), async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'query is required' });
    const llm = require('../services/ai/llm');
    const classesData = require('../data/classes');
    const db = require('../db/connection').getDatabase();
    const coaches = db.prepare("SELECT id, name FROM staff WHERE role IN ('coach', 'gm', 'owner') AND active = 1").all();
    const locations = [...new Set(db.prepare("SELECT DISTINCT location FROM class_instances WHERE location IS NOT NULL").all().map(r => r.location))];
    const classTypes = db.prepare("SELECT DISTINCT class_type FROM classes WHERE active = 1").all().map(r => r.class_type);

    const prompt = `Parse this scheduling request into JSON: "${query}".
Available coaches: ${coaches.map(c => c.name).join(', ')}
Available locations: ${locations.join(', ')}
Available class types: ${classTypes.join(', ')}
Respond with valid JSON only: { "class_name": "...", "class_type": "...", "coach_name": "...", "location": "...", "date": "YYYY-MM-DD", "start_time": "HH:MM", "end_time": "HH:MM", "capacity": number, "recurrence": "none|weekly|biweekly" }`;

    const response = await llm.chat([{ role: 'user', content: prompt }], { model: 'gpt-4o-mini', temperature: 0.1 });
    const parsed = JSON.parse(response.content);
    const classId = classesData.createClass({ name: parsed.class_name, class_type: parsed.class_type || 'bjj', description: `AI scheduled: ${query}`, active: 1 });
    const coach = coaches.find(c => parsed.coach_name?.toLowerCase().includes(c.name.toLowerCase()));
    classesData.createClassInstance({
      class_id: classId.id || classId, date: parsed.date, start_time: parsed.start_time, end_time: parsed.end_time,
      location: parsed.location || locations[0], coach_id: coach?.id || null, capacity: parsed.capacity || 30, recurrence: parsed.recurrence || 'none',
    });
    res.status(201).json({ message: 'Class scheduled', class: parsed });
  } catch (error) {
    console.error('NL scheduling error:', error);
    res.status(400).json({ error: 'Failed to parse scheduling request: ' + error.message });
  }
});

module.exports = { router, registerTeamAgent, teamAgents };
