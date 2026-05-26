// Analytics routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const unifiedAnalytics = require('../services/unifiedAnalytics');

const router = express.Router();

// Get complete dashboard overview
router.get('/dashboard', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;

    const overview = unifiedAnalytics.getDashboardOverview(dateFrom, dateTo);
    res.json(overview);
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard overview' });
  }
});

// Get revenue metrics
router.get('/revenue', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;

    const revenue = unifiedAnalytics.getRevenueMetrics(dateFrom, dateTo);
    res.json(revenue);
  } catch (error) {
    console.error('Error fetching revenue metrics:', error);
    res.status(500).json({ error: 'Failed to fetch revenue metrics' });
  }
});

// Get lead metrics
router.get('/leads', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;

    const leads = unifiedAnalytics.getLeadMetrics(dateFrom, dateTo);
    res.json(leads);
  } catch (error) {
    console.error('Error fetching lead metrics:', error);
    res.status(500).json({ error: 'Failed to fetch lead metrics' });
  }
});

// Get trial metrics
router.get('/trials', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;

    const trials = unifiedAnalytics.getTrialMetrics(dateFrom, dateTo);
    res.json(trials);
  } catch (error) {
    console.error('Error fetching trial metrics:', error);
    res.status(500).json({ error: 'Failed to fetch trial metrics' });
  }
});

// Get retention metrics
router.get('/retention', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;

    const retention = unifiedAnalytics.getRetentionMetrics(dateFrom, dateTo);
    res.json(retention);
  } catch (error) {
    console.error('Error fetching retention metrics:', error);
    res.status(500).json({ error: 'Failed to fetch retention metrics' });
  }
});

// Get staff metrics
router.get('/staff', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;

    const staff = unifiedAnalytics.getStaffMetrics(dateFrom, dateTo);
    res.json(staff);
  } catch (error) {
    console.error('Error fetching staff metrics:', error);
    res.status(500).json({ error: 'Failed to fetch staff metrics' });
  }
});

// Get phone metrics
router.get('/phone', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;

    const phone = unifiedAnalytics.getPhoneMetrics(dateFrom, dateTo);
    res.json(phone);
  } catch (error) {
    console.error('Error fetching phone metrics:', error);
    res.status(500).json({ error: 'Failed to fetch phone metrics' });
  }
});

// Get messaging metrics
router.get('/messaging', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;

    const messaging = unifiedAnalytics.getMessagingMetrics(dateFrom, dateTo);
    res.json(messaging);
  } catch (error) {
    console.error('Error fetching messaging metrics:', error);
    res.status(500).json({ error: 'Failed to fetch messaging metrics' });
  }
});

// Get revenue forecast
router.get('/forecast', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const forecast = unifiedAnalytics.getRevenueForecast();
    res.json(forecast);
  } catch (error) {
    console.error('Error fetching forecast:', error);
    res.status(500).json({ error: 'Failed to fetch forecast' });
  }
});

// Get conversion funnel
router.get('/funnel', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;

    const funnel = unifiedAnalytics.getConversionFunnel(dateFrom, dateTo);
    res.json(funnel);
  } catch (error) {
    console.error('Error fetching conversion funnel:', error);
    res.status(500).json({ error: 'Failed to fetch conversion funnel' });
  }
});

// Get time series data
router.get('/timeseries/:metric', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const metric = req.params.metric;
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;
    const interval = req.query.interval || 'day';

    const timeseries = unifiedAnalytics.getTimeSeries(metric, dateFrom, dateTo, interval);
    res.json(timeseries);
  } catch (error) {
    console.error('Error fetching time series:', error);
    res.status(500).json({ error: 'Failed to fetch time series' });
  }
});

module.exports = router;
