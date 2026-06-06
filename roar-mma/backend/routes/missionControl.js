const express = require('express');
const router = express.Router();
const { authenticateToken, requirePermission } = require('../middleware/auth');
const aiState = require('../services/ai/aiState');
const aiDaemon = require('../services/ai/aiDaemon');
const { getDatabase } = require('../db/connection');

router.get('/overview', authenticateToken, requirePermission('reports:read'), async (req, res) => {
  try {
    const daemon = aiDaemon.getStatus();
    const allConfigs = await aiState.getAllAgentConfigs();
    const stats = await aiState.getStats();
    const db = getDatabase();

    const pendingApprovals = db.prepare(`
      SELECT COUNT(*) as count FROM event_queue
      WHERE status = 'pending' AND assigned_agent IS NOT NULL
    `).get().count;

    const circuitBreakers = aiDaemon.getCircuitBreakerStatus();

    const agents = allConfigs.map(config => {
      const daemonError = (daemon.errors || []).find(e => e.agent === config.agent_name);
      return {
        agent_name: config.agent_name,
        enabled: config.enabled,
        interval_ms: config.interval_ms,
        lastError: daemonError?.error || null,
        lastErrorTime: daemonError?.time || null,
      };
    });

    res.json({
      daemon: {
        running: daemon.running,
        uptime: daemon.uptime,
        lastTick: daemon.lastTick,
        ticksExecuted: daemon.ticksExecuted,
        agentsRegistered: daemon.agentsRegistered,
        errors: daemon.errors || [],
      },
      agents,
      circuitBreakers,
      pendingApprovals,
      stats: {
        totalActions: stats.totalActions,
        actionsToday: stats.actionsToday,
        pendingTasks: stats.pendingTasks,
      },
    });
  } catch (error) {
    console.error('[MISSION-CONTROL] Overview error:', error);
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

router.post('/reset-circuit-breakers', authenticateToken, requirePermission('ai:manage'), async (req, res) => {
  try {
    aiDaemon.resetCircuitBreakers();
    res.json({ success: true });
  } catch (error) {
    console.error('[MISSION-CONTROL] Reset circuit breakers error:', error);
    res.status(500).json({ error: 'Failed to reset circuit breakers' });
  }
});

module.exports = router;
