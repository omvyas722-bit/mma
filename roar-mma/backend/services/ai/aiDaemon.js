const aiState = require('./aiState');
const openRouter = require('./openRouterClient');
const { getDatabase } = require('../../db/connection');
const weeklyDigest = require('../weeklyDigest');

const agentHandlers = new Map();
const failureTracker = new Map();
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_TIMEOUT_MS = 60000;
let intervalMs = 60000;
let isRunning = false;
let startupTime = null;
let lastTick = null;
let ticksExecuted = 0;
let daemonErrors = [];

function registerAgent(name, handlerFn) {
  if (typeof handlerFn !== 'function') {
    console.error(`[AI-DAEMON] Handler for agent "${name}" is not a function`);
    return;
  }
  agentHandlers.set(name, handlerFn);
  console.log(`[AI-DAEMON] Agent registered: ${name}`);
}

async function tick() {
  if (!isRunning) return;

  const tickStart = Date.now();
  ticksExecuted++;
  lastTick = new Date().toISOString();

  console.log(`[AI-DAEMON] Tick #${ticksExecuted} starting — ${agentHandlers.size} agents registered`);

  const db = getDatabase();

  const broadcast = typeof global.wsBroadcast === 'function' ? global.wsBroadcast : null;

  const results = [];

  for (const [name, handler] of agentHandlers) {
    const circuit = failureTracker.get(name);
    if (circuit && circuit.count >= CIRCUIT_BREAKER_THRESHOLD && Date.now() < circuit.openUntil) {
      console.log(`[AI-DAEMON] Circuit breaker open for "${name}", skipping (retry in ${Math.ceil((circuit.openUntil - Date.now()) / 1000)}s)`);
      results.push({ agent: name, status: 'skipped', reason: 'circuit_breaker_open' });
      continue;
    }

    try {
      const config = await aiState.getAgentConfig(name);
      if (!config || !config.enabled) {
        console.log(`[AI-DAEMON] Agent "${name}" is disabled, skipping`);
        continue;
      }

      console.log(`[AI-DAEMON] Executing agent: ${name}`);
      const agentTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Agent ${name} timed out after 120s`)), 120000);
      });
      const result = await Promise.race([
        handler({ db, aiState, openRouter, broadcast, config, agentName: name }),
        agentTimeout
      ]);

      failureTracker.delete(name);

      results.push({ agent: name, status: 'ok', result });

      await aiState.logActivity({
        agentName: name,
        actionType: 'tick',
        summary: `Agent ${name} executed successfully`,
        status: 'completed'
      });
    } catch (error) {
      console.error(`[AI-DAEMON] Agent "${name}" failed:`, error.message);
      daemonErrors.push({ agent: name, error: error.message, time: new Date().toISOString() });
      if (daemonErrors.length > 200) {
        daemonErrors.splice(0, daemonErrors.length - 200);
      }

      const entry = failureTracker.get(name) || { count: 0 };
      entry.count++;
      if (entry.count >= CIRCUIT_BREAKER_THRESHOLD) {
        entry.openUntil = Date.now() + CIRCUIT_BREAKER_TIMEOUT_MS;
        console.log(`[AI-DAEMON] Circuit breaker opened for "${name}" — ${entry.count} consecutive failures, skipping for 60s`);
      }
      failureTracker.set(name, entry);

      try {
        await aiState.logActivity({
          agentName: name,
          actionType: 'tick',
          summary: `Agent ${name} failed: ${error.message}`,
          status: 'failed',
          details: { error: error.message }
        });
      } catch (logErr) {
        console.error(`[AI-DAEMON] Failed to log activity for "${name}":`, logErr.message);
      }

      results.push({ agent: name, status: 'error', error: error.message });
    }
  }

  const elapsed = Date.now() - tickStart;
  console.log(`[AI-DAEMON] Tick #${ticksExecuted} completed in ${elapsed}ms — ${results.filter(r => r.status === 'ok').length}/${results.length} ok`);

  if (broadcast) {
    try {
      broadcast({
        type: 'ai_daemon_tick',
        data: {
          tick: ticksExecuted,
          timestamp: lastTick,
          elapsed,
          results
        }
      });
    } catch (broadcastError) {
      console.error('[AI-DAEMON] Broadcast error:', broadcastError.message);
    }
  }
}

async function runLoop() {
  if (!isRunning) return;
  try {
    await tick();
  } catch (err) {
    console.error('[AI-DAEMON] Unhandled error in tick:', err);
    daemonErrors.push({ agent: 'daemon', error: err.message, time: new Date().toISOString() });
  }
  if (isRunning) {
    setTimeout(runLoop, intervalMs);
  }
}

function start() {
  if (isRunning) {
    console.log('[AI-DAEMON] Already running');
    return;
  }

  console.log('[AI-DAEMON] Starting daemon...');
  isRunning = true;
  startupTime = Date.now();
  lastTick = new Date().toISOString();
  daemonErrors = [];

  intervalMs = parseInt(process.env.AI_DAEMON_INTERVAL_MS || '60000', 10);

  runLoop();

  // Weekly digest check — every hour, check if Monday and digest not yet generated
  setInterval(async () => {
    try {
      const now = new Date();
      if (now.getDay() !== 1) return;
      const todayStr = now.toISOString().split('T')[0];
      const db = getDatabase();
      const existing = db.prepare("SELECT id FROM eod_reports WHERE type = 'weekly' AND date = ?").get(todayStr);
      if (existing) return;
      console.log('[AI-DAEMON] Monday detected — generating weekly digest...');
      await weeklyDigest.generateWeeklyDigest(aiState);
    } catch (err) {
      console.error('[AI-DAEMON] Weekly digest check failed:', err.message);
    }
  }, 3600000);

  console.log(`[AI-DAEMON] Daemon started — interval=${intervalMs}ms`);
}

function stop() {
  if (!isRunning) {
    return;
  }

  console.log('[AI-DAEMON] Stopping daemon...');
  isRunning = false;

  console.log('[AI-DAEMON] Daemon stopped');
}

function getStatus() {
  return {
    running: isRunning,
    uptime: isRunning ? Math.floor((Date.now() - startupTime) / 1000) : 0,
    lastTick,
    ticksExecuted,
    agentsRegistered: agentHandlers.size,
    agentsActive: agentHandlers.size,
    errors: daemonErrors.slice(-50)
  };
}

function resetCircuitBreakers() {
  failureTracker.clear();
  daemonErrors = [];
  console.log('[AI-DAEMON] All circuit breakers and daemon errors reset');
}

function getCircuitBreakerStatus() {
  const breakers = [];
  for (const [agent, status] of failureTracker) {
    if (status.count >= CIRCUIT_BREAKER_THRESHOLD && Date.now() < status.openUntil) {
      breakers.push({
        agent,
        failures: status.count,
        openUntil: status.openUntil,
        retryInMs: Math.max(0, status.openUntil - Date.now()),
      });
    }
  }
  return breakers;
}

module.exports = {
  start,
  stop,
  getStatus,
  registerAgent,
  resetCircuitBreakers,
  getCircuitBreakerStatus,
};
