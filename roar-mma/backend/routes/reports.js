// Reports routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const reportsData = require('../data/reports');

const router = express.Router();

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
    const total = report.summary.total_leads;
    const converted = report.summary.converted;
    report.summary.conversion_rate = total > 0 ? ((converted / total) * 100).toFixed(1) : 0;

    res.json(report);
  } catch (error) {
    console.error('Error generating leads report:', error);
    res.status(500).json({ error: 'Failed to generate leads report' });
  }
});

module.exports = router;
