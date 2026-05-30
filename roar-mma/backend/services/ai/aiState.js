const { getDatabase } = require('../../db/connection');

const DEFAULT_AGENTS = [
  { name: 'leads', enabled: 1 },
  { name: 'trials', enabled: 1 },
  { name: 'retention', enabled: 1 },
  { name: 'tasks', enabled: 1 },
  { name: 'analytics', enabled: 1 },
  { name: 'billing', enabled: 1 },
  { name: 'grading', enabled: 0 },
  { name: 'stock', enabled: 0 },
  { name: 'staff', enabled: 1 },
  { name: 'messaging', enabled: 1 }
];

let startupTime = Date.now();
let actionsCount = 0;

function ensureTables() {
  try {
    const db = getDatabase();

    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_name TEXT NOT NULL,
        action_type TEXT NOT NULL,
        summary TEXT NOT NULL,
        details TEXT,
        status TEXT DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ai_agent_config (
        agent_name TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 1,
        interval_ms INTEGER DEFAULT 60000,
        model_override TEXT,
        config_json TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ai_task_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_name TEXT,
        task_type TEXT NOT NULL,
        priority INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        payload TEXT,
        result TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        scheduled_for DATETIME,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (error) {
    console.error('[AI-STATE] Table initialization error:', error.message);
  }
}

function seedDefaults() {
  try {
    const db = getDatabase();

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO ai_agent_config (agent_name, enabled, interval_ms, updated_at)
      VALUES (?, ?, ?, datetime('now'))
    `);

    const seedMany = db.transaction((agents) => {
      for (const agent of agents) {
        insertStmt.run(agent.name, agent.enabled, 60000);
      }
    });

    seedMany(DEFAULT_AGENTS);
    console.log('[AI-STATE] Default agent configs seeded');
  } catch (error) {
    console.error('[AI-STATE] Seed error:', error.message);
  }
}

let _initialized = false;

function ensureInitialized() {
  if (!_initialized) {
    _initialized = true;
    ensureTables();
    seedDefaults();
  }
}

function logActivity({ agentName, actionType, summary, details, status }) {
  try {
    ensureInitialized();
    const db = getDatabase();

    const stmt = db.prepare(`
      INSERT INTO ai_activity_log (agent_name, action_type, summary, details, status)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      agentName || 'system',
      actionType || 'unknown',
      summary || '',
      details ? JSON.stringify(details) : null,
      status || 'completed'
    );

    actionsCount++;
    console.log(`[AI-STATE] Activity logged: ${agentName}/${actionType} — ${summary}`);

    return { id: result.lastInsertRowid, status: status || 'completed' };
  } catch (error) {
    console.error('[AI-STATE] logActivity error:', error.message);
    return { error: error.message };
  }
}

function getActivityHistory({ agentName, limit, offset, status, actionType } = {}) {
  try {
    ensureInitialized();
    const db = getDatabase();

    let query = 'SELECT * FROM ai_activity_log WHERE 1=1';
    const params = [];

    if (agentName) {
      query += ' AND agent_name = ?';
      params.push(agentName);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (actionType) {
      query += ' AND action_type = ?';
      params.push(actionType);
    }

    query += ' ORDER BY created_at DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
    }

    if (offset) {
      query += ' OFFSET ?';
      params.push(offset);
    }

    const rows = db.prepare(query).all(...params);
    return rows.map(row => ({
      ...row,
      details: row.details ? tryParse(row.details) : null
    }));
  } catch (error) {
    console.error('[AI-STATE] getActivityHistory error:', error.message);
    return [];
  }
}

function getAgentConfig(agentName) {
  try {
    ensureInitialized();
    const db = getDatabase();

    const row = db.prepare('SELECT * FROM ai_agent_config WHERE agent_name = ?').get(agentName);
    if (!row) return null;

    return {
      ...row,
      enabled: !!row.enabled,
      config_json: row.config_json ? tryParse(row.config_json) : null
    };
  } catch (error) {
    console.error('[AI-STATE] getAgentConfig error:', error.message);
    return null;
  }
}

function updateAgentConfig(agentName, config) {
  try {
    ensureInitialized();
    const db = getDatabase();

    const existing = db.prepare('SELECT * FROM ai_agent_config WHERE agent_name = ?').get(agentName);

    const enabled = config.enabled !== undefined ? (config.enabled ? 1 : 0) : (existing?.enabled ?? 1);
    const intervalMs = config.intervalMs || config.interval_ms || existing?.interval_ms || 60000;
    const modelOverride = config.modelOverride || config.model_override || existing?.model_override || null;
    const configJson = config.configJson || config.config_json
      ? JSON.stringify(config.configJson || config.config_json)
      : (existing?.config_json || null);

    if (existing) {
      db.prepare(`
        UPDATE ai_agent_config
        SET enabled = ?, interval_ms = ?, model_override = ?, config_json = ?, updated_at = datetime('now')
        WHERE agent_name = ?
      `).run(enabled, intervalMs, modelOverride, configJson, agentName);
    } else {
      db.prepare(`
        INSERT INTO ai_agent_config (agent_name, enabled, interval_ms, model_override, config_json, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(agentName, enabled, intervalMs, modelOverride, configJson);
    }

    console.log(`[AI-STATE] Agent config updated: ${agentName}`);
    return await getAgentConfig(agentName);
  } catch (error) {
    console.error('[AI-STATE] updateAgentConfig error:', error.message);
    return { error: error.message };
  }
}

function getAllAgentConfigs() {
  try {
    ensureInitialized();
    const db = getDatabase();

    const rows = db.prepare('SELECT * FROM ai_agent_config ORDER BY agent_name').all();
    return rows.map(row => ({
      ...row,
      enabled: !!row.enabled,
      config_json: row.config_json ? tryParse(row.config_json) : null
    }));
  } catch (error) {
    console.error('[AI-STATE] getAllAgentConfigs error:', error.message);
    return [];
  }
}

function getTaskQueue({ status, agentName, limit } = {}) {
  try {
    ensureInitialized();
    const db = getDatabase();

    let query = 'SELECT * FROM ai_task_queue WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (agentName) {
      query += ' AND agent_name = ?';
      params.push(agentName);
    }

    query += ' ORDER BY priority DESC, created_at ASC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
    }

    const rows = db.prepare(query).all(...params);
    return rows.map(row => ({
      ...row,
      payload: row.payload ? tryParse(row.payload) : null,
      result: row.result ? tryParse(row.result) : null
    }));
  } catch (error) {
    console.error('[AI-STATE] getTaskQueue error:', error.message);
    return [];
  }
}

function createTask({ agentName, taskType, priority, payload, scheduledFor }) {
  try {
    const db = getDatabase();

    const stmt = db.prepare(`
      INSERT INTO ai_task_queue (agent_name, task_type, priority, payload, scheduled_for)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      agentName || null,
      taskType || 'general',
      priority || 0,
      payload ? JSON.stringify(payload) : null,
      scheduledFor || null
    );

    console.log(`[AI-STATE] Task created: ${taskType} (id=${result.lastInsertRowid})`);
    return { id: result.lastInsertRowid, status: 'pending' };
  } catch (error) {
    console.error('[AI-STATE] createTask error:', error.message);
    return { error: error.message };
  }
}

function updateTaskStatus(taskId, status, result) {
  try {
    const db = getDatabase();

    const fields = ['status = ?'];
    const params = [status];

    if (result !== undefined) {
      fields.push('result = ?');
      params.push(typeof result === 'string' ? result : JSON.stringify(result));
    }

    if (status === 'completed' || status === 'failed') {
      fields.push('completed_at = datetime(\'now\')');
    }

    if (status === 'failed') {
      fields.push('retry_count = retry_count + 1');
    }

    params.push(taskId);

    db.prepare(`UPDATE ai_task_queue SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    console.log(`[AI-STATE] Task ${taskId} updated to status: ${status}`);
    return { id: taskId, status };
  } catch (error) {
    console.error('[AI-STATE] updateTaskStatus error:', error.message);
    return { error: error.message };
  }
}

function getStats() {
  try {
    const db = getDatabase();

    const totalActions = db.prepare('SELECT COUNT(*) as count FROM ai_activity_log').get().count;
    const actionsToday = db.prepare(
      "SELECT COUNT(*) as count FROM ai_activity_log WHERE date(created_at) = date('now')"
    ).get().count;

    const actionsByAgent = db.prepare(`
      SELECT agent_name, COUNT(*) as count
      FROM ai_activity_log
      GROUP BY agent_name
      ORDER BY count DESC
    `).all();

    const actionsByType = db.prepare(`
      SELECT action_type, COUNT(*) as count
      FROM ai_activity_log
      GROUP BY action_type
      ORDER BY count DESC
    `).all();

    const pendingTasks = db.prepare("SELECT COUNT(*) as count FROM ai_task_queue WHERE status = 'pending'").get().count;

    return {
      totalActions,
      actionsToday,
      actionsByAgent,
      actionsByType,
      pendingTasks,
      uptime: Math.floor((Date.now() - startupTime) / 1000)
    };
  } catch (error) {
    console.error('[AI-STATE] getStats error:', error.message);
    return {
      totalActions: 0,
      actionsToday: 0,
      actionsByAgent: [],
      actionsByType: [],
      pendingTasks: 0,
      uptime: 0,
      error: error.message
    };
  }
}

function updateActivityStatus(id, status) {
  try {
    const db = getDatabase();
    db.prepare('UPDATE ai_activity_log SET status = ? WHERE id = ?').run(status, id);
    return { id, status };
  } catch (error) {
    console.error('[AI-STATE] updateActivityStatus error:', error.message);
    return { error: error.message };
  }
}

function getFilteredLogCount({ agentName, status, actionType } = {}) {
  try {
    const db = getDatabase();
    let query = 'SELECT COUNT(*) as count FROM ai_activity_log WHERE 1=1';
    const params = [];

    if (agentName) {
      query += ' AND agent_name = ?';
      params.push(agentName);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (actionType) {
      query += ' AND action_type = ?';
      params.push(actionType);
    }

    return db.prepare(query).get(...params).count;
  } catch (error) {
    console.error('[AI-STATE] getFilteredLogCount error:', error.message);
    return 0;
  }
}

function tryParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

module.exports = {
  logActivity,
  getActivityHistory,
  getAgentConfig,
  updateAgentConfig,
  getAllAgentConfigs,
  getTaskQueue,
  createTask,
  updateTaskStatus,
  getStats,
  updateActivityStatus,
  getFilteredLogCount
};
