// Reports routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { getDatabase } = require('../db/connection');
const reportsData = require('../data/reports');

const router = express.Router();

const DEFAULT_DATE_FROM = '2020-01-01';
function getDefaultDateTo() { return new Date().toISOString().split('T')[0]; }

// Get membership report
router.get('/membership', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const filters = {
      date_from: req.query.date_from,
      date_to: req.query.date_to
    };

    const report = reportsData.getMembershipReport(filters);
    res.json(report);
  } catch (error) {
    console.error('Error generating membership report:', error);
    res.status(500).json({ error: 'Failed to generate membership report' });
  }
});

// Get revenue report
router.get('/revenue', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const filters = {
      date_from: req.query.date_from,
      date_to: req.query.date_to
    };

    const report = reportsData.getRevenueReport(filters);
    res.json(report);
  } catch (error) {
    console.error('Error generating revenue report:', error);
    res.status(500).json({ error: 'Failed to generate revenue report' });
  }
});

// Get attendance report
router.get('/attendance', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const filters = {
      date_from: req.query.date_from,
      date_to: req.query.date_to
    };

    const report = reportsData.getAttendanceReport(filters);
    res.json(report);
  } catch (error) {
    console.error('Error generating attendance report:', error);
    res.status(500).json({ error: 'Failed to generate attendance report' });
  }
});

// Get leads report
router.get('/leads', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const filters = {
      date_from: req.query.date_from,
      date_to: req.query.date_to
    };

    const report = reportsData.getLeadsReport(filters);

    // Calculate conversion rate
    if (report && report.summary) {
      const total = report.summary.total_leads || 0;
      const converted = report.summary.converted || 0;
      report.summary.conversion_rate = total > 0 ? ((converted / total) * 100).toFixed(1) : 0;
    }

    res.json(report);
  } catch (error) {
    console.error('Error generating leads report:', error);
    res.status(500).json({ error: 'Failed to generate leads report' });
  }
});

// Staff Performance report
router.get('/staff_performance', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const staffPerf = require('../data/staffPerformance');
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;
    const staff = staffPerf.getAllStaffPerformance(dateFrom, dateTo);
    res.json({ staff });
  } catch (error) {
    console.error('Error generating staff performance report:', error);
    res.status(500).json({ error: 'Failed to generate staff performance report' });
  }
});

// PT Revenue report
router.get('/pt_revenue', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const db = getDatabase();
    const dateFrom = req.query.date_from || DEFAULT_DATE_FROM;
    const dateTo = req.query.date_to || getDefaultDateTo();
    const ptData = db.prepare(`
      SELECT COUNT(*) as total_sessions, COALESCE(SUM(amount), 0) as total_revenue
      FROM pt_sessions
      WHERE status IN ('scheduled', 'completed')
        AND DATE(created_at) BETWEEN ? AND ?
    `).get(dateFrom, dateTo);
    res.json({
      summary: {
        total_sessions: ptData.total_sessions,
        total_revenue: ptData.total_revenue,
        avg_per_session: ptData.total_sessions > 0 ? (ptData.total_revenue / ptData.total_sessions) : 0,
      }
    });
  } catch (error) {
    console.error('Error generating PT revenue report:', error);
    res.status(500).json({ error: 'Failed to generate PT revenue report' });
  }
});

// Grading Stats report
router.get('/grading_stats', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const db = getDatabase();
    const dateFrom = req.query.date_from || DEFAULT_DATE_FROM;
    const dateTo = req.query.date_to || getDefaultDateTo();
    const sessions = db.prepare(`
      SELECT COUNT(*) as total_sessions,
             COALESCE(SUM(CASE WHEN gp.result = 'passed' THEN 1 ELSE 0 END), 0) as passed,
             COALESCE(SUM(CASE WHEN gp.result = 'failed' THEN 1 ELSE 0 END), 0) as failed,
             COUNT(DISTINCT gp.member_id) as total_participants
      FROM grading_sessions gs
      LEFT JOIN grading_participants gp ON gs.id = gp.session_id
      WHERE DATE(gs.session_date) BETWEEN ? AND ?
    `).get(dateFrom, dateTo);
    res.json(sessions);
  } catch (error) {
    console.error('Error generating grading stats report:', error);
    res.status(500).json({ error: 'Failed to generate grading stats' });
  }
});

// Retention report
router.get('/retention', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const retentionData = require('../data/retention');
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;
    const analytics = retentionData.getRetentionAnalytics(dateFrom, dateTo) || {};
    res.json(analytics);
  } catch (error) {
    console.error('Error generating retention report:', error);
    res.status(500).json({ error: 'Failed to generate retention report' });
  }
});

// Social Media report
router.get('/social_media', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const db = getDatabase();
    const byPlatform = db.prepare(`SELECT platform, SUM(impressions) as impressions, SUM(reach) as reach, SUM(engagement) as engagement, SUM(likes) as likes, SUM(comments) as comments, SUM(shares) as shares, SUM(clicks) as clicks FROM social_analytics GROUP BY platform`).all();
    const total = {
      impressions: byPlatform.reduce((s, p) => s + (p.impressions || 0), 0),
      reach: byPlatform.reduce((s, p) => s + (p.reach || 0), 0),
      engagement: byPlatform.reduce((s, p) => s + (p.engagement || 0), 0),
      likes: byPlatform.reduce((s, p) => s + (p.likes || 0), 0),
      comments: byPlatform.reduce((s, p) => s + (p.comments || 0), 0),
      shares: byPlatform.reduce((s, p) => s + (p.shares || 0), 0),
      clicks: byPlatform.reduce((s, p) => s + (p.clicks || 0), 0),
    };
    res.json({ byPlatform, total });
  } catch (error) {
    console.error('Error generating social media report:', error);
    res.status(500).json({ error: 'Failed to generate social media report' });
  }
});

// EOD History report
router.get('/eod_history', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const db = getDatabase();
    const dateFrom = req.query.date_from || DEFAULT_DATE_FROM;
    const dateTo = req.query.date_to || getDefaultDateTo();
    const reports = db.prepare(`
      SELECT id, action_type, notes, created_at as date,
             json_extract(details, '$.leads_count') as leads_count,
             json_extract(details, '$.revenue') as revenue,
             json_extract(details, '$.summary') as summary
      FROM ai_activity_log
      WHERE action_type = 'daily_analytics_briefing'
        AND DATE(created_at) BETWEEN ? AND ?
      ORDER BY created_at DESC
    `).all(dateFrom, dateTo);
    res.json({ reports });
  } catch (error) {
    console.error('Error fetching EOD history:', error);
    res.status(500).json({ error: 'Failed to fetch EOD history' });
  }
});

// Weekly digest endpoint
router.get('/weekly-digest', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const db = getDatabase();
    const digests = db.prepare(`
      SELECT id, date, content, created_at FROM eod_reports
      WHERE type = 'weekly' ORDER BY date DESC LIMIT 4
    `).all();
    res.json(digests.map(d => ({
      ...d,
      content: d.content ? JSON.parse(d.content) : null
    })));
  } catch (error) {
    console.error('Error fetching weekly digests:', error);
    res.status(500).json({ error: 'Failed to fetch weekly digests' });
  }
});

// Staff Compliance report
router.get('/staff_compliance', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const db = getDatabase();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const in30DaysStr = in30Days.toISOString().split('T')[0];

    const rows = db.prepare(`
      SELECT s.id as staff_id, s.name, s.role, s.email, s.active,
             sc.id as cert_id, sc.cert_name, sc.issuing_body,
             sc.issued_date, sc.expiry_date, sc.verified
      FROM staff s
      LEFT JOIN staff_certifications sc ON s.id = sc.staff_id
      WHERE s.active = 1
      ORDER BY s.name, sc.expiry_date
    `).all();

    const staffMap = {};
    rows.forEach(row => {
      if (!staffMap[row.staff_id]) {
        staffMap[row.staff_id] = { id: row.staff_id, name: row.name, role: row.role, email: row.email, certifications: [] };
      }
      if (row.cert_id) {
        staffMap[row.staff_id].certifications.push({
          id: row.cert_id, name: row.cert_name, issuing_body: row.issuing_body,
          issued_date: row.issued_date, expiry_date: row.expiry_date, verified: !!row.verified
        });
      }
    });

    const staffList = Object.values(staffMap);
    let totalStaff = 0, certified = 0, expiringSoon = 0, expired = 0;

    staffList.forEach(s => {
      totalStaff++;
      const hasExpired = s.certifications.some(c => c.expiry_date && c.expiry_date < todayStr);
      const hasExpiring = s.certifications.some(c => c.expiry_date && c.expiry_date >= todayStr && c.expiry_date <= in30DaysStr);
      const allValid = s.certifications.length > 0 && s.certifications.every(c => !c.expiry_date || c.expiry_date > in30DaysStr);
      if (hasExpired) expired++;
      if (hasExpiring) expiringSoon++;
      if (allValid) certified++;
    });

    res.json({
      summary: { total_staff: totalStaff, certified, expiring_soon: expiringSoon, expired },
      staff: staffList.map(s => ({
        ...s,
        compliance_status: s.certifications.some(c => c.expiry_date && c.expiry_date < todayStr) ? 'expired'
          : s.certifications.some(c => c.expiry_date && c.expiry_date >= todayStr && c.expiry_date <= in30DaysStr) ? 'expiring'
          : s.certifications.length > 0 ? 'valid' : 'no_certs'
      }))
    });
  } catch (error) {
    console.error('Error generating staff compliance report:', error);
    res.status(500).json({ error: 'Failed to generate staff compliance report' });
  }
});

module.exports = router;
