const aiState = require('./aiState');
const providerChain = require('./providerChain');
const { emit: agentStep } = require('./agentSteps');
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

async function processScheduledTasks(db) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const tasks = db.prepare("SELECT * FROM scheduled_agent_tasks WHERE enabled = 1").all();
  let fired = 0;

  for (const task of tasks) {
    const lastRun = task.last_triggered_at ? new Date(task.last_triggered_at) : null;
    let shouldFire = false;

    if (task.frequency === 'daily' && task.time_of_day) {
      const [h, m] = task.time_of_day.split(':').map(Number);
      const taskMinutes = h * 60 + m;
      if (!lastRun || (currentMinutes >= taskMinutes && currentMinutes < taskMinutes + 5 && now - lastRun > 3600000)) {
        shouldFire = true;
      }
    } else if (task.frequency === 'weekly' && task.day_of_week !== null && task.time_of_day) {
      if (currentDay === task.day_of_week) {
        const [h, m] = task.time_of_day.split(':').map(Number);
        const taskMinutes = h * 60 + m;
        if (!lastRun || (currentMinutes >= taskMinutes && currentMinutes < taskMinutes + 5 && now - lastRun > 3600000)) {
          shouldFire = true;
        }
      }
    } else if (task.frequency === 'monthly' && task.day_of_month !== null && task.time_of_day) {
      const dayOfMonth = now.getDate();
      if (dayOfMonth === task.day_of_month) {
        const [h, m] = task.time_of_day.split(':').map(Number);
        const taskMinutes = h * 60 + m;
        if (!lastRun || (currentMinutes >= taskMinutes && currentMinutes < taskMinutes + 5 && now - lastRun > 3600000)) {
          shouldFire = true;
        }
      }
    } else if (task.frequency === 'hours' && task.interval_hours) {
      if (!lastRun || (now - lastRun) >= task.interval_hours * 3600000) {
        shouldFire = true;
      }
    }

    if (shouldFire) {
      try {
        db.prepare(`INSERT INTO ai_task_queue (agent_name, task_type, priority, status, payload) VALUES (?, ?, ?, 'pending', ?)`)
          .run(task.agent_name, 'scheduled', 3, task.payload || '{}');
        db.prepare("UPDATE scheduled_agent_tasks SET last_triggered_at = datetime('now') WHERE id = ?").run(task.id);
        fired++;
      } catch (err) {
        console.error(`[AI-DAEMON] Failed to fire scheduled task #${task.id}:`, err.message);
      }
    }
  }
  return fired;
}

async function processTaskQueue(db, broadcast) {
  const pending = db.prepare("SELECT * FROM ai_task_queue WHERE status = 'pending' ORDER BY priority DESC, created_at ASC LIMIT 10").all();
  let executed = 0;

  for (const task of pending) {
    try {
      db.prepare("UPDATE ai_task_queue SET status = 'in_progress' WHERE id = ?").run(task.id);
      const handler = agentHandlers.get(task.agent_name);
      if (handler) {
        const config = await aiState.getAgentConfig(task.agent_name);
        await Promise.race([
          handler({ db, aiState, openRouter: providerChain, broadcast, config, agentName: task.agent_name, taskId: task.id }),
          new Promise((_, reject) => setTimeout(() => reject(new Error(`Task ${task.id} timed out`)), 120000))
        ]);
      }
      db.prepare("UPDATE ai_task_queue SET status = 'completed', updated_at = datetime('now') WHERE id = ?").run(task.id);
      executed++;
    } catch (err) {
      console.error(`[AI-DAEMON] Task #${task.id} failed:`, err.message);
      const retries = (db.prepare("SELECT retry_count FROM ai_task_queue WHERE id = ?").get(task.id)?.retry_count || 0) + 1;
      if (retries >= 3) {
        db.prepare("UPDATE ai_task_queue SET status = 'failed', retry_count = ?, updated_at = datetime('now') WHERE id = ?").run(retries, task.id);
      } else {
        db.prepare("UPDATE ai_task_queue SET status = 'pending', retry_count = ?, updated_at = datetime('now') WHERE id = ?").run(retries, task.id);
      }
    }
  }
  return executed;
}

async function tick() {
  if (!isRunning) return;

  const tickStart = Date.now();
  ticksExecuted++;
  lastTick = new Date().toISOString();

  console.log(`[AI-DAEMON] Tick #${ticksExecuted} starting — ${agentHandlers.size} agents registered`);

  const db = getDatabase();

  const broadcast = typeof global.wsBroadcast === 'function' ? global.wsBroadcast : null;

  // Process scheduled tasks
  try {
    const fired = await processScheduledTasks(db);
    if (fired > 0) console.log(`[AI-DAEMON] Fired ${fired} scheduled tasks`);
  } catch (err) {
    console.error('[AI-DAEMON] Error processing scheduled tasks:', err.message);
  }

  // Process task queue
  try {
    const executed = await processTaskQueue(db, broadcast);
    if (executed > 0) console.log(`[AI-DAEMON] Executed ${executed} queued tasks`);
  } catch (err) {
    console.error('[AI-DAEMON] Error processing task queue:', err.message);
  }

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

      agentStep(broadcast, name, 'starting', config?.config_json?.description || '');
      console.log(`[AI-DAEMON] Executing agent: ${name}`);
      const agentTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Agent ${name} timed out after 120s`)), 120000);
      });
      const result = await Promise.race([
        handler({ db, aiState, openRouter: providerChain, broadcast, config, agentName: name }),
        agentTimeout
      ]);
      agentStep(broadcast, name, 'complete', result?.summary || result?.executedCount !== undefined ? `${result.executedCount} actions, ${result.failedCount} failed` : 'done');

      failureTracker.delete(name);

      results.push({ agent: name, status: 'ok', result });

      await aiState.logActivity({
        agentName: name,
        actionType: 'tick',
        summary: `Agent ${name} executed successfully`,
        status: 'completed'
      });
    } catch (error) {
      agentStep(broadcast, name, 'error', error.message);
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
