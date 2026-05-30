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
        const result = await handler(db, aiState, openRouter, broadcast, {});
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
          const result = await handler(db, aiState, openRouter, broadcast, {});
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

module.exports = { router, registerTeamAgent, teamAgents };
