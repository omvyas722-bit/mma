// Main server file
require('dotenv').config();
const { initMonitoring, getRequestHandler, getErrorHandler, Sentry } = require('./monitoring');
initMonitoring();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { getDatabase, closeDatabase } = require('./db/connection');
const { getHealth } = require('./monitoring');
const { authenticateToken, requirePermission } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const membersRoutes = require('./routes/members');
const classesRoutes = require('./routes/classes');
const bookingsRoutes = require('./routes/bookings');
const dashboardRoutes = require('./routes/dashboard');
const leadsRoutes = require('./routes/leads');
const transactionsRoutes = require('./routes/transactions');
const staffRoutes = require('./routes/staff');
const webhooksRoutes = require('./routes/webhooks');
const reportsRoutes = require('./routes/reports');
const attendanceRoutes = require('./routes/attendance');
const messageTemplatesRoutes = require('./routes/messageTemplates');
const scheduledMessagesRoutes = require('./routes/scheduledMessages');
const trialAnalyticsRoutes = require('./routes/trialAnalytics');
const leadScoringRoutes = require('./routes/leadScoring');
const staffTasksRoutes = require('./routes/staffTasks');
const ptSessionsRoutes = require('./routes/ptSessions');
const staffPerformanceRoutes = require('./routes/staffPerformance');
const retentionRoutes = require('./routes/retention');
const phoneRoutes = require('./routes/phone');
const messagingRoutes = require('./routes/messaging');
const analyticsRoutes = require('./routes/analytics');
const stockRoutes = require('./routes/stock');
const beltGradingRoutes = require('./routes/beltGrading');
const aiRoutes = require('./routes/ai');
const agentsRoutes = require('./routes/agents');
const studentCoachingRoutes = require('./routes/studentCoaching');
const notificationsRoutes = require('./routes/notifications');
const socialMediaRoutes = require('./routes/socialMedia');
const certificationsRoutes = require('./routes/certifications');
const approvalQueueRoutes = require('./routes/approvalQueue');
const makeupClassesRoutes = require('./routes/makeupClasses');
const automatedMessagesRoutes = require('./routes/automatedMessages');
const familyDiscountsRoutes = require('./routes/familyDiscounts');
const staffScheduleRoutes = require('./routes/staffSchedule');
const privacyRoutes = require('./routes/privacy');
const missionControlRoutes = require('./routes/missionControl');
const documentsRoutes = require('./routes/documents');
const agenticRoutes = require('./routes/agentic');
const pixelRoutes = require('./routes/pixel');
const memberPortalRoutes = require('./routes/memberPortal');
const workflowsRoutes = require('./routes/workflows');
const settingsRoutes = require('./routes/settings');
const waiverPdfRoutes = require('./routes/waiverPdf');

// Import services
const messageScheduler = require('./services/messageScheduler');
const aiDaemon = require('./services/ai/aiDaemon');

// Import AI agents
const scoutAgent = require('./services/ai/agents/scoutAgent');
const healerAgent = require('./services/ai/agents/healerAgent');
const pixelAgent = require('./services/ai/agents/pixelAgent');
const leadAgent = require('./services/ai/agents/leadAgent');
const trialAgent = require('./services/ai/agents/trialAgent');
const retentionAgent = require('./services/ai/agents/retentionAgent');
const taskAgent = require('./services/ai/agents/taskAgent');
const analyticsAgent = require('./services/ai/agents/analyticsAgent');
const billingAgent = require('./services/ai/agents/billingAgent');
const beltGradingAgent = require('./services/ai/agents/beltGradingAgent');
const stockAgent = require('./services/ai/agents/stockAgent');
const staffAgent = require('./services/ai/agents/staffAgent');
const messagingAgent = require('./services/ai/agents/messagingAgent');

// Import LLM-powered team agents
const salesTeamAgent = require('./services/ai/agents/salesTeamAgent');
const memberSuccessTeamAgent = require('./services/ai/agents/memberSuccessTeamAgent');
const operationsTeamAgent = require('./services/ai/agents/operationsTeamAgent');
const financeTeamAgent = require('./services/ai/agents/financeTeamAgent');
const studentCoachingAgent = require('./services/ai/agents/studentCoachingAgent');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket keepalive — ping all clients every 30s
const wsKeepalive = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  });
}, 30000);

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws://localhost:*", "https://api.openrouter.ai", "https://openrouter.ai"],
      fontSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  }
}));

// General rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', limiter);

// CORS — auto-detect any localhost or LAN origin
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    try {
      const u = new URL(origin);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '::1') return callback(null, true);
    } catch {}
    const allowed = (process.env.ALLOWED_ORIGINS || '').split(',');
    if (allowed.some(o => { try { return new URL(origin).origin === o.trim(); } catch { return false; } })) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request body field validation middleware
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string' && value.length > 10000) {
        return res.status(413).json({ error: `Field "${key}" exceeds maximum length of 10000 characters` });
      }
    }
  }
  next();
});

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Sentry request handler — must be before routes
app.use(getRequestHandler());

// Request logging middleware — logs method, path, status, duration
app.use((req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  res.on('finish', () => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[${timestamp}] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
    }
  });

  next();
});

// Health check rate limiter — 60 requests per minute
const healthLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many health check requests, please try again later' }
});

// Health check endpoint
app.get('/api/health', healthLimiter, (req, res) => {
  try {
    const db = getDatabase();

    // Test database connection
    db.prepare('SELECT 1').get();

    const monitoring = getHealth();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      websocket: wss.clients.size + ' clients connected',
      sentry_initialized: monitoring.sentry_initialized,
      sentry_dsn_configured: monitoring.sentry_dsn_configured,
      memory_usage: process.memoryUsage(),
      node_version: process.version
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/message-templates', messageTemplatesRoutes);
app.use('/api/scheduled-messages', scheduledMessagesRoutes);
app.use('/api/trial-analytics', trialAnalyticsRoutes);
app.use('/api/lead-scoring', leadScoringRoutes);
app.use('/api/staff-tasks', staffTasksRoutes);
app.use('/api/pt-sessions', ptSessionsRoutes);
app.use('/api/staff-performance', staffPerformanceRoutes);
app.use('/api/retention', retentionRoutes);
app.use('/api/phone', phoneRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/grading', beltGradingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/agents', agentsRoutes.router);
app.use('/api/coaching', studentCoachingRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/waivers', require('./routes/waivers'));
app.use('/api/waivers', waiverPdfRoutes);
app.use('/api/social-media', socialMediaRoutes);
app.use('/api/certifications', certificationsRoutes);
app.use('/api/approval-queue', approvalQueueRoutes);
app.use('/api/makeup-classes', makeupClassesRoutes);
app.use('/api/automated-messages', automatedMessagesRoutes);
app.use('/api/family-discounts', familyDiscountsRoutes);
app.use('/api/staff-schedule', staffScheduleRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/pixel', pixelRoutes);
app.use('/api/portal', memberPortalRoutes);
app.use('/api/workflows', workflowsRoutes);
app.use('/api/agentic', agenticRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/mission-control', missionControlRoutes);

// Settings routes (inline — no dedicated module yet)
const defaultSettings = {
  general: { gym_name: 'ROAR MMA', contact_email: 'info@roarmma.com.au', contact_phone: '0400 000 000', website: 'https://roarmma.com.au', timezone: 'Australia/Perth', currency: 'AUD', business_hours: 'Mon-Fri: 6AM-9PM\nSat: 8AM-6PM\nSun: 9AM-5PM' },
  locations: [],
  membership: { trial_period_days: 7, auto_renewal: true, require_waiver: true, grace_period_days: 7 },
  notifications: { email: true, sms: true, class_reminders: true, payment_reminders: true, marketing: false },
  integrations: { stripe_publishable_key: '' },
  grading: { bjj: { enabled: true, min_classes_between: 10, min_months_between: 3, stripe_count: 4, stripe_attendance: 80, coach_approval: true }, muay_thai: { enabled: true, min_classes_between: 8, min_months_between: 3, stripe_count: 4, stripe_attendance: 75, coach_approval: true }, mma: { enabled: true, min_classes_between: 12, min_months_between: 4, stripe_count: 3, stripe_attendance: 80, coach_approval: true }, boxing: { enabled: true, min_classes_between: 8, min_months_between: 3, stripe_count: 3, stripe_attendance: 75, coach_approval: true }, kids: { enabled: true, min_classes_between: 6, min_months_between: 2, stripe_count: 2, stripe_attendance: 70, coach_approval: true } }
};
app.get('/api/settings', authenticateToken, requirePermission('settings:read'), (req, res) => {
  try {
    const db = getDatabase();
    const dbSettings = db.prepare('SELECT key, value FROM system_settings').all();
    if (dbSettings && dbSettings.length) {
      const overrides = {};
      dbSettings.forEach(s => { overrides[s.key] = s.value; });
      return res.json({ ...defaultSettings, system: overrides });
    }
    res.json(defaultSettings);
  } catch { res.json(defaultSettings); }
});
app.put('/api/settings', authenticateToken, requirePermission('settings:write'), (req, res) => res.json({ success: true }));

// Calendar events — query class_instances
app.get('/api/calendar/events', authenticateToken, requirePermission('classes:read'), (req, res) => {
  try {
    const db = getDatabase();
    const { start_date, end_date } = req.query;
    if (!start_date || !end_date) return res.json([]);
    const events = db.prepare(`
      SELECT ci.id, ci.date, ci.start_time, ci.end_time, c.name as title, c.class_type as type, c.location, s.name as instructor_name, ci.capacity
      FROM class_instances ci
      JOIN classes c ON ci.class_id = c.id
      LEFT JOIN staff s ON ci.coach_id = s.id
      WHERE ci.date BETWEEN ? AND ?
      ORDER BY ci.date, ci.start_time
    `).all(start_date, end_date);
    res.json(events);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

app.post('/api/calendar/events', authenticateToken, requirePermission('classes:create'), (req, res) => {
  try {
    const db = getDatabase();
    const { title, name, type, date, start_time, end_time, description, capacity } = req.body;
    const eventTitle = title || name || '';
    if (!eventTitle || !date || !start_time) return res.status(400).json({ error: 'title, date, and start_time required' });
    const result = db.prepare(`INSERT INTO class_instances (class_id, date, start_time, end_time, capacity, status, class_notes) VALUES (?, ?, ?, ?, ?, 'scheduled', ?)`)
      .run(0, date, start_time, end_time || null, capacity || 0, description || null);
    res.status(201).json({ id: result.lastInsertRowid, title: eventTitle, date, start_time, end_time });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// EOD reports — last 30 entries from ai_activity_log for oracle agent
app.get('/api/eod-reports', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const db = getDatabase();
    const reports = db.prepare(`
      SELECT * FROM ai_activity_log
      WHERE agent_name = 'oracle' AND action_type LIKE '%eod%'
      ORDER BY created_at DESC LIMIT 30
    `).all();
    res.json(reports);
  } catch (error) {
    console.error('Error fetching EOD reports:', error);
    res.status(500).json({ error: 'Failed to fetch EOD reports' });
  }
});

// Approval resubmit — reset to pending with new payload
app.post('/api/approval/:id/resubmit', authenticateToken, requirePermission('ai:manage'), (req, res) => {
  try {
    const db = getDatabase();
    const item = db.prepare('SELECT * FROM approval_queue WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const { payload, reason } = req.body;
    db.prepare(`UPDATE approval_queue SET status = 'pending', payload = ?, reason = ?, reviewed_by = NULL, reviewed_at = NULL, updated_at = datetime('now') WHERE id = ?`)
      .run(payload ? JSON.stringify(payload) : item.payload, reason || item.reason, req.params.id);
    const updated = db.prepare('SELECT * FROM approval_queue WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    console.error('Error resubmitting approval:', error);
    res.status(500).json({ error: 'Failed to resubmit approval' });
  }
});

// Staff performance — class instances grouped by coach for date range
app.get('/api/reports/staff-performance', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const db = getDatabase();
    const { start_date, end_date, location } = req.query;
    let query = `
      SELECT s.id as staff_id, s.name as staff_name, COUNT(ci.id) as class_count
      FROM class_instances ci
      JOIN staff s ON ci.coach_id = s.id
      LEFT JOIN classes c ON ci.class_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (start_date) { query += ' AND ci.date >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND ci.date <= ?'; params.push(end_date); }
    if (location) { query += ' AND c.location = ?'; params.push(location); }
    query += ' GROUP BY ci.coach_id ORDER BY class_count DESC';
    res.json(db.prepare(query).all(...params));
  } catch (error) {
    console.error('Error fetching staff performance report:', error);
    res.status(500).json({ error: 'Failed to fetch staff performance report' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Sentry error handler — must be before the app-level error handler
app.use(getErrorHandler());

// Error handler — never leak stack traces in responses
app.use(errorHandler);

// Global unhandled promise rejection handler (don't crash on recoverable errors)
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED PROMISE REJECTION:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  // Give time for logging before exit
  setTimeout(() => process.exit(1), 1000);
});

// WebSocket connection handling
const wsClients = new Map();
const wsMessageLimits = new Map();

wss.on('connection', (ws, req) => {
  // Validate origin (same logic as CORS)
  try {
    const origin = req.headers.origin;
    if (origin) {
      const u = new URL(origin);
      const allowed = u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '::1';
      if (!allowed) {
        ws.send(JSON.stringify({ type: 'error', message: 'Origin not allowed' }));
        ws.close();
        return;
      }
    }
  } catch (err) {
    console.error('WebSocket origin validation error:', err.message);
  }

  let authenticated = false;
  let clientId = null;

  const authTimer = setTimeout(() => {
    if (!authenticated) {
      ws.send(JSON.stringify({ type: 'error', message: 'Authentication timeout' }));
      ws.close();
    }
  }, 10000);

  ws.on('message', (message) => {
    // Handle authentication via auth message (not query string)
    if (!authenticated) {
      clearTimeout(authTimer);
      try {
        const data = JSON.parse(message);
        if (data.type === 'auth' && data.token) {
          jwt.verify(data.token, process.env.JWT_SECRET);
          authenticated = true;
          clientId = require('crypto').randomUUID();
          wsClients.set(clientId, ws);
          console.log(`WebSocket client authenticated: ${clientId} (${wsClients.size} total)`);
          ws.send(JSON.stringify({
            type: 'connected',
            clientId,
            timestamp: new Date().toISOString()
          }));
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Authentication required' }));
          ws.close();
        }
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid authentication' }));
        ws.close();
      }
      return;
    }

    const now = Date.now();
    if (!wsMessageLimits.has(clientId)) {
      wsMessageLimits.set(clientId, { count: 0, resetAt: now + 60000 });
    }
    const limit = wsMessageLimits.get(clientId);
    if (now > limit.resetAt) {
      limit.count = 0;
      limit.resetAt = now + 60000;
    }
    limit.count++;
    if (limit.count > 60) {
      ws.send(JSON.stringify({ type: 'error', message: 'Rate limit exceeded' }));
      ws.close();
      return;
    }

    try {
      const data = JSON.parse(message);
      const safeData = data.type === 'auth' ? { ...data, token: '[REDACTED]' } : data;
      console.log('WebSocket message received:', safeData);
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    clearTimeout(authTimer);
    if (clientId) {
      wsClients.delete(clientId);
      wsMessageLimits.delete(clientId);
    }
    if (clientId) {
      console.log(`WebSocket client disconnected: ${clientId} (${wsClients.size} remaining)`);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Broadcast function for real-time updates
function broadcast(message) {
  const data = JSON.stringify(message);

  wsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(data);
      } catch (err) {
        console.error('Broadcast error:', err);
      }
    }
  });
}

// Make broadcast accessible to AI daemon
global.wsBroadcast = broadcast;

// Graceful shutdown
function shutdownServer(signal) {
  console.log(`${signal} received, shutting down...`);

  clearInterval(wsKeepalive);

  if (messageScheduler && typeof messageScheduler.stop === 'function') messageScheduler.stop();
  if (aiDaemon && typeof aiDaemon.stop === 'function') aiDaemon.stop();

  server.close(() => {
    console.log('HTTP server closed');

    wsClients.forEach((client) => {
      client.close();
    });

    closeDatabase();

    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdownServer('SIGTERM'));
process.on('SIGINT', () => shutdownServer('SIGINT'));

// Start server
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log('=================================');
  console.log('ROAR MMA Management System');
  console.log('=================================');
  console.log(`Server running at http://${HOST}:${PORT}`);
  console.log(`WebSocket server running at ws://${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/api/health`);
  console.log('=================================');

  // Start message scheduler
  messageScheduler.start();
  console.log('Message scheduler started');

  // Start AI daemon heartbeat
  aiDaemon.registerAgent('scout', scoutAgent.handler);
  aiDaemon.registerAgent('healer', healerAgent.handler);
  aiDaemon.registerAgent('pixel', pixelAgent.handler);
  aiDaemon.registerAgent('leads', leadAgent.handler);
  aiDaemon.registerAgent('trials', trialAgent.handler);
  aiDaemon.registerAgent('retention', retentionAgent.handler);
  aiDaemon.registerAgent('tasks', taskAgent.handler);
  aiDaemon.registerAgent('analytics', analyticsAgent.handler);
  aiDaemon.registerAgent('billing', billingAgent.handler);
  aiDaemon.registerAgent('grading', beltGradingAgent.handler);
  aiDaemon.registerAgent('stock', stockAgent.handler);
  aiDaemon.registerAgent('staff', staffAgent.handler);
  aiDaemon.registerAgent('messaging', messagingAgent.handler);
  aiDaemon.registerAgent('student_coaching', studentCoachingAgent.handler);

  // Register LLM-powered team agents
  aiDaemon.registerAgent('sales_team', salesTeamAgent.handler);
  aiDaemon.registerAgent('member_success_team', memberSuccessTeamAgent.handler);
  aiDaemon.registerAgent('operations_team', operationsTeamAgent.handler);
  aiDaemon.registerAgent('finance_team', financeTeamAgent.handler);

  // Register with agents route for manual runs
  agentsRoutes.registerTeamAgent('sales_team', salesTeamAgent.handler);
  agentsRoutes.registerTeamAgent('member_success_team', memberSuccessTeamAgent.handler);
  agentsRoutes.registerTeamAgent('operations_team', operationsTeamAgent.handler);
  agentsRoutes.registerTeamAgent('finance_team', financeTeamAgent.handler);

  aiDaemon.start();
  console.log('AI daemon started');
});

module.exports = { broadcast };
