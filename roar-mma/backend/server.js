// Main server file
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const { getDatabase, closeDatabase } = require('./db/connection');

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

// Import services
const messageScheduler = require('./services/messageScheduler');
const aiDaemon = require('./services/ai/aiDaemon');

// Import AI agents
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

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow all localhost origins for development
    if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('file://')) {
      callback(null, true);
    } else {
      callback(null, origin);
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  try {
    const db = getDatabase();

    // Test database connection
    db.prepare('SELECT 1').get();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      websocket: wss.clients.size + ' clients connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// WebSocket connection handling
const wsClients = new Map();

wss.on('connection', (ws, req) => {
  const clientId = Math.random().toString(36).substr(2, 9);
  wsClients.set(clientId, ws);

  console.log(`WebSocket client connected: ${clientId} (${wsClients.size} total)`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('WebSocket message received:', data);

      // Handle different message types
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    wsClients.delete(clientId);
    console.log(`WebSocket client disconnected: ${clientId} (${wsClients.size} remaining)`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    clientId,
    timestamp: new Date().toISOString()
  }));
});

// Broadcast function for real-time updates
function broadcast(message) {
  const data = JSON.stringify(message);

  wsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Make broadcast available globally
global.wsBroadcast = broadcast;

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');

  // Stop message scheduler
  messageScheduler.stop();
  aiDaemon.stop();

  server.close(() => {
    console.log('HTTP server closed');

    // Close all WebSocket connections
    wsClients.forEach((client) => {
      client.close();
    });

    // Close database connection
    closeDatabase();

    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');

  // Stop message scheduler
  messageScheduler.stop();
  aiDaemon.stop();

  server.close(() => {
    console.log('HTTP server closed');

    wsClients.forEach((client) => {
      client.close();
    });

    closeDatabase();

    process.exit(0);
  });
});

// Start server
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
  aiDaemon.start();
  console.log('AI daemon started');
});

module.exports = { app, server, broadcast };
