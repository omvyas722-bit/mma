const aiState = require('./aiState');
const openRouter = require('./openRouterClient');

const agentHandlers = new Map();
let intervalId = null;
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

  const db = (() => {
    try {
      return require('../../db/connection').getDatabase();
    } catch {
      return null;
    }
  })();

  const broadcast = typeof global.wsBroadcast === 'function' ? global.wsBroadcast : null;

  const results = [];

  for (const [name, handler] of agentHandlers) {
    try {
      const config = await aiState.getAgentConfig(name);
      if (!config || !config.enabled) {
        console.log(`[AI-DAEMON] Agent "${name}" is disabled, skipping`);
        continue;
      }

      console.log(`[AI-DAEMON] Executing agent: ${name}`);
      const result = await handler(db, aiState, openRouter, broadcast);
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

      await aiState.logActivity({
        agentName: name,
        actionType: 'tick',
        summary: `Agent ${name} failed: ${error.message}`,
        status: 'failed',
        details: { error: error.message }
      });

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

  const intervalMs = parseInt(process.env.AI_DAEMON_INTERVAL_MS || '60000', 10);

  tick();

  intervalId = setInterval(() => {
    tick();
  }, intervalMs);

  console.log(`[AI-DAEMON] Daemon started — interval=${intervalMs}ms`);
}

function stop() {
  if (!isRunning) {
    return;
  }

  console.log('[AI-DAEMON] Stopping daemon...');
  isRunning = false;

  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  console.log('[AI-DAEMON] Daemon stopped');
}

function getStatus() {
  return {
    running: isRunning,
    uptime: isRunning ? Math.floor((Date.now() - startupTime) / 1000) : 0,
    lastTick,
    ticksExecuted,
    agentsRegistered: agentHandlers.size,
    agentsActive: (() => {
      let count = 0;
      agentHandlers.forEach((_, name) => {
        count++;
      });
      return count;
    })(),
    errors: daemonErrors.slice(-50)
  };
}

module.exports = {
  start,
  stop,
  getStatus,
  registerAgent
};
