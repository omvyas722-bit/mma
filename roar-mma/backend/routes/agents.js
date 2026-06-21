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
  const providerChain = require('../services/ai/providerChain');

  try {
    if (agentName) {
      const handler = teamAgents.get(agentName);
      if (!handler) return res.status(404).json({ error: `Agent "${agentName}" not found` });
      const logEntry = await aiState.logActivity({ agentName, actionType: 'manual_run', summary: `Manual run triggered for ${agentLabel(agentName)}`, status: 'running' });
      try {
        const result = await handler({ db, aiState, openRouter: providerChain, broadcast, config: {} });
        if (logEntry && logEntry.id) await aiState.updateActivityStatus(logEntry.id, 'completed');
        res.json({ agent: agentName, ...result });
      } catch (handlerError) {
        if (logEntry && logEntry.id) await aiState.updateActivityStatus(logEntry.id, 'failed');
        throw handlerError;
      }
    } else {
      const results = [];
      for (const [name, handler] of teamAgents) {
        const logEntry = await aiState.logActivity({ agentName: name, actionType: 'manual_run', summary: `Manual run triggered for ${agentLabel(name)}`, status: 'running' });
        try {
        const result = await handler({ db, aiState, openRouter: providerChain, broadcast, config: {} });
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

    const response = await llm.chat([{ role: 'user', content: prompt }], { model: 'llama-3.3-70b-versatile', temperature: 0.1 });
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

// HEALER proposal endpoints
router.get('/healer/proposals', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const db = require('../db/connection').getDatabase();
    const proposals = db.prepare(`
      SELECT * FROM ai_activity_log
      WHERE agent_name = 'healer' AND action_type = 'healer_proposal'
      ORDER BY created_at DESC LIMIT 50
    `).all();
    const mapped = proposals.map(p => ({
      id: p.id,
      suggestion: p.summary,
      details: (() => { try { return JSON.parse(p.details); } catch { return p.details; } })(),
      status: p.status,
      created_at: p.created_at
    }));
    res.json({ proposals: mapped });
  } catch (error) { console.error('HEALER proposals error:', error); res.status(500).json({ error: 'Failed to fetch proposals' }); }
});

router.post('/healer/proposals/:id/approve', authenticateToken, requirePermission('ai:manage'), (req, res) => {
  try {
    const db = require('../db/connection').getDatabase();
    const proposal = db.prepare("SELECT * FROM ai_activity_log WHERE id = ? AND agent_name = 'healer' AND action_type = 'healer_proposal'").get(req.params.id);
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    db.prepare("UPDATE ai_activity_log SET status = 'approved' WHERE id = ?").run(req.params.id);
    res.json({ success: true, message: 'Proposal approved. Will be applied on next agent restart.' });
  } catch (error) { console.error('HEALER approve error:', error); res.status(500).json({ error: 'Failed to approve proposal' }); }
});

router.post('/healer/proposals/:id/reject', authenticateToken, requirePermission('ai:manage'), (req, res) => {
  try {
    const db = require('../db/connection').getDatabase();
    const proposal = db.prepare("SELECT * FROM ai_activity_log WHERE id = ? AND agent_name = 'healer' AND action_type = 'healer_proposal'").get(req.params.id);
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    db.prepare("UPDATE ai_activity_log SET status = 'rejected' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (error) { console.error('HEALER reject error:', error); res.status(500).json({ error: 'Failed to reject proposal' }); }
});

// Natural Language Scheduling
router.post('/nl-schedule', authenticateToken, requirePermission('ai:manage'), async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'query is required' });
    }

    const parsed = parseNlSchedule(query.trim());
    if (!parsed) {
      return res.status(400).json({ error: 'Could not parse scheduling request. Try: "Every Monday at 7am, have ORACLE send me membership count"' });
    }

    const db = require('../db/connection').getDatabase();
    const aiState = require('../services/ai/aiState');

    const now = new Date();
    const scheduleDate = parsed.nextOccurrence || now.toISOString().split('T')[0];
    const scheduleTime = parsed.time || '09:00';
    const scheduledFor = `${scheduleDate}T${scheduleTime}:00`;

    const payload = JSON.stringify({
      task_description: parsed.taskDescription,
      agent: parsed.agentName,
      frequency: parsed.frequency,
      day: parsed.day || null,
      time: parsed.time,
      original_query: query
    });

    const insertStmt = db.prepare(`
      INSERT INTO scheduled_agent_tasks (agent_name, task_description, frequency, day_of_week, day_of_month, time_of_day, interval_hours, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      parsed.agentName || 'system',
      parsed.taskDescription,
      parsed.frequency,
      parsed.day || null,
      parsed.dayNum || null,
      parsed.time || '09:00',
      parsed.hours || null,
      payload
    );

    await aiState.logActivity({
      agentName: 'nl_scheduler',
      actionType: 'schedule_created',
      summary: `Scheduled: ${parsed.frequency} — ${parsed.agentName} — ${parsed.taskDescription}`,
      status: 'completed',
      details: { parsed, query, schedule_id: result.lastInsertRowid }
    });

    res.status(201).json({
      message: 'Schedule created',
      parsed,
      schedule_id: result.lastInsertRowid
    });
  } catch (error) {
    console.error('NL scheduling error:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const FREQ_PATTERNS = [
  { pattern: /every\s+(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i, freq: 'weekly', dayIndex: 1, timeIndex: 2 },
  { pattern: /daily\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i, freq: 'daily', timeIndex: 1 },
  { pattern: /every\s+(\d+)\s+hours?/i, freq: 'hours', hoursIndex: 1 },
  { pattern: /every\s+(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i, freq: 'weekly', dayIndex: 1 },
  { pattern: /every\s+week\s+on\s+(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i, freq: 'weekly', dayIndex: 1 },
  { pattern: /weekly\s+on\s+(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i, freq: 'weekly', dayIndex: 1 },
  { pattern: /monthly\s+on\s+(?:day\s+)?(\d+)/i, freq: 'monthly', dayNumIndex: 1 },
];

const AGENTS = ['oracle', 'scout', 'healer', 'pixel', 'leads', 'trials', 'retention', 'tasks', 'analytics', 'billing', 'grading', 'stock', 'staff', 'messaging', 'sales_team', 'member_success_team', 'operations_team', 'finance_team', 'student_coaching'];

function parseNlSchedule(text) {
  const lower = text.toLowerCase();
  let scheduleDate = null;

  let agentName = 'system';
  for (const agent of AGENTS) {
    if (lower.includes(agent.replace(/_/g, ' ')) || lower.includes(agent)) {
      agentName = agent;
      break;
    }
  }

  let taskDescription = text;
  let frequency = null;
  let day = null;
  let time = null;
  let hours = null;
  let dayNum = null;

  for (const fp of FREQ_PATTERNS) {
    const m = text.match(fp.pattern);
    if (!m) continue;

    frequency = fp.freq;

    if (fp.dayIndex) {
      const dayStr = m[fp.dayIndex].toLowerCase();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const dayAbbr = dayStr.substring(0, 3);
      const idx = dayNames.indexOf(dayStr.length === 3 ? dayAbbr : dayStr);
      if (idx >= 0) {
        day = idx <= 6 ? ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][idx <= 6 ? idx : idx - 7] : dayStr;
      } else {
        day = dayStr;
      }

      const dayIdx = DAY_NAMES.indexOf(day);
      const now = new Date();
      const currentDay = now.getDay();
      let daysUntil = (dayIdx - currentDay + 7) % 7;
      if (daysUntil === 0) daysUntil = 7;
      const nextDate = new Date(now);
      nextDate.setDate(now.getDate() + daysUntil);
      scheduleDate = nextDate.toISOString().split('T')[0];
    }

    if (fp.timeIndex) {
      let hour = parseInt(m[fp.timeIndex]);
      const minute = fp.timeIndex + 1 < m.length && m[fp.timeIndex + 1] !== undefined ? parseInt(m[fp.timeIndex + 1] || '0') : 0;
      const ampm = fp.timeIndex + 2 < m.length ? (m[fp.timeIndex + 2] || '').toLowerCase() : '';

      if (ampm === 'pm' && hour < 12) hour += 12;
      if (ampm === 'am' && hour === 12) hour = 0;

      time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }

    if (fp.hoursIndex) {
      hours = parseInt(m[fp.hoursIndex]);
    }

    if (fp.dayNumIndex) {
      dayNum = parseInt(m[fp.dayNumIndex]);
    }

    const agentMatch = text.match(/\b(have|tell|ask|make|let)\s+(\w+)/i);
    if (agentMatch) {
      const found = agentMatch[2].toLowerCase();
      for (const agent of AGENTS) {
        if (agent.includes(found) || found.includes(agent)) {
          agentName = agent;
          break;
        }
      }
    }

    const taskMatch = text.match(/(?:send|get|give|show|tell|create|run|generate|check|update)\s+me\s+(.+?)(?:$|,\s*every|,\s*daily|,\s*at\s|\.)/i);
    if (taskMatch) {
      taskDescription = taskMatch[1].trim();
    } else {
      const parts = text.split(/\b(every|daily|weekly|monthly)\b/i);
      taskDescription = (parts[0] || text).replace(new RegExp(`\\b${agentName}\\b`, 'i'), '').replace(/\b(have|tell|ask|make|let)\b/i, '').trim();
    }

    return {
      agentName,
      taskDescription: taskDescription || text,
      frequency,
      day,
      time: time || (m[fp.timeIndex] ? `${parseInt(m[fp.timeIndex]).toString().padStart(2, '0')}:00` : '09:00'),
      hours,
      dayNum,
      nextOccurrence: scheduleDate,
      raw: text
    };
  }

  return null;
}

// Scheduled tasks management
router.get('/scheduled-tasks', authenticateToken, requirePermission('agents:manage'), (req, res) => {
  try {
    const db = getDatabase();
    const tasks = db.prepare("SELECT * FROM scheduled_agent_tasks ORDER BY created_at DESC").all();
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scheduled tasks' });
  }
});

router.delete('/scheduled-tasks/:id', authenticateToken, requirePermission('agents:manage'), (req, res) => {
  try {
    const db = getDatabase();
    const result = db.prepare("DELETE FROM scheduled_agent_tasks WHERE id = ?").run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete scheduled task' });
  }
});

router.put('/scheduled-tasks/:id/toggle', authenticateToken, requirePermission('agents:manage'), (req, res) => {
  try {
    const db = getDatabase();
    const task = db.prepare("SELECT * FROM scheduled_agent_tasks WHERE id = ?").get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    db.prepare("UPDATE scheduled_agent_tasks SET enabled = ?, updated_at = datetime('now') WHERE id = ?").run(task.enabled ? 0 : 1, req.params.id);
    res.json({ success: true, enabled: !task.enabled });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle scheduled task' });
  }
});

module.exports = { router, registerTeamAgent, teamAgents };
