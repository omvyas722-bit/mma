const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const agenticData = require('../data/agentic');
const membersData = require('../data/members');
const leadsData = require('../data/leads');
const { getDatabase } = require('../db/connection');

const router = express.Router();

router.get('/ceo', authenticateToken, requirePermission('dashboard:read'), (req, res) => {
  try {
    const status = agenticData.getCEOStatus();
    res.json(status);
  } catch (error) {
    console.error('[AGENTIC-CEO] Error:', error);
    res.status(500).json({ error: 'Failed to fetch CEO status' });
  }
});

router.get('/researcher', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const feed = agenticData.getIntelligenceFeed();
    res.json(feed);
  } catch (error) {
    console.error('[AGENTIC-RESEARCHER] Error:', error);
    res.status(500).json({ error: 'Failed to fetch intelligence feed' });
  }
});

router.get('/cmo', authenticateToken, requirePermission('social:manage'), (req, res) => {
  try {
    const pipeline = agenticData.getContentPipeline();
    res.json(pipeline);
  } catch (error) {
    console.error('[AGENTIC-CMO] Error:', error);
    res.status(500).json({ error: 'Failed to fetch content pipeline' });
  }
});

router.get('/leads', authenticateToken, requirePermission('leads:read'), (req, res) => {
  try {
    const db = getDatabase();
    const allLeads = leadsData.getAllLeads();
    const salesAgent = agenticData.getCEOStatus().agents.find(a => a.name === 'Sales Rep');
    const recentOutreach = db.prepare(`
      SELECT summary, created_at FROM ai_activity_log
      WHERE agent_name = 'sales_team' AND DATE(created_at) >= date('now', '-1 days')
      ORDER BY created_at DESC LIMIT 20
    `).all();

    res.json({
      agent: salesAgent,
      leads: allLeads,
      recentOutreach,
    });
  } catch (error) {
    console.error('[AGENTIC-LEADS] Error:', error);
    res.status(500).json({ error: 'Failed to fetch lead pipeline' });
  }
});

router.get('/system', authenticateToken, requirePermission('settings:read'), (req, res) => {
  try {
    const health = agenticData.getSystemHealth();
    res.json(health);
  } catch (error) {
    console.error('[AGENTIC-SYSTEM] Error:', error);
    res.status(500).json({ error: 'Failed to fetch system health' });
  }
});

router.get('/reports', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const db = getDatabase();
    const period = req.query.period || 'week';

    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
    const dateFrom = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const classRetention = db.prepare(`
      SELECT c.class_type, c.name,
        COUNT(DISTINCT b.member_id) as total_bookers,
        AVG(CAST(att.attended AS REAL)) as retention_rate
      FROM classes c
      JOIN class_instances ci ON c.id = ci.class_id
      LEFT JOIN bookings b ON ci.id = b.class_instance_id AND b.status = 'booked'
      LEFT JOIN (
        SELECT class_instance_id, COUNT(*) as attended
        FROM bookings WHERE status = 'attended'
        GROUP BY class_instance_id
      ) att ON ci.id = att.class_instance_id
      WHERE ci.date >= ?
      GROUP BY c.id
      ORDER BY retention_rate DESC
    `).all(dateFrom);

    const revenueTrend = db.prepare(`
      SELECT DATE(created_at) as date, COALESCE(SUM(amount), 0) as revenue
      FROM transactions WHERE status = 'completed' AND DATE(created_at) >= ?
      GROUP BY DATE(created_at) ORDER BY date
    `).all(dateFrom);

    const trialConversions = db.prepare(`
      SELECT
        COUNT(*) as total_trials,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as converted
      FROM members WHERE DATE(joined_date) >= ? AND status IN ('trial', 'active')
    `).get(dateFrom);

    const atRiskMembers = db.prepare(`
      SELECT m.id, m.first_name || ' ' || m.last_name as name, m.status,
        MAX(b.booked_at) as last_booking
      FROM members m
      LEFT JOIN bookings b ON m.id = b.member_id
      WHERE m.status = 'active'
      GROUP BY m.id
      HAVING last_booking IS NULL OR last_booking <= date('now', '-14 days')
      ORDER BY last_booking ASC NULLS FIRST
      LIMIT 10
    `).all();

    res.json({
      period,
      classRetention,
      revenueTrend,
      trialConversions,
      atRiskMembers,
      agent: {
        name: 'Data Analyst',
        model: 'Gemini 2.5 Pro',
        status: 'waiting',
      },
    });
  } catch (error) {
    console.error('[AGENTIC-REPORTS] Error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics reports' });
  }
});

router.get('/network', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const insights = agenticData.getSharedInsights();
    res.json(insights);
  } catch (error) {
    console.error('[AGENTIC-NETWORK] Error:', error);
    res.status(500).json({ error: 'Failed to fetch agent network' });
  }
});

module.exports = router;
