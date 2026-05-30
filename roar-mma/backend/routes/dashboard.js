// Dashboard routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { getDatabase } = require('../db/connection');
const membersData = require('../data/members');
const bookingsData = require('../data/bookings');

const router = express.Router();

// Get dashboard overview
router.get('/', authenticateToken, requirePermission('dashboard:read'), (req, res) => {
  try {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];

    // Get member stats
    const memberStats = membersData.getMemberStats();

    // Get booking stats
    const bookingStats = bookingsData.getBookingStats();

    // Get today's revenue
    const todayRevenue = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE DATE(created_at) = ? AND status = 'completed'
    `).get(today).total;

    // Get monthly revenue
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    const monthlyRevenue = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE DATE(created_at) >= ? AND status = 'completed'
    `).get(monthStartStr).total;

    // Get trial conversions this month
    const trialConversions = db.prepare(`
      SELECT COUNT(*) as count
      FROM members
      WHERE status = 'active'
        AND DATE(joined_date) < ?
        AND DATE(updated_at) >= ?
    `).get(monthStartStr, monthStartStr).count;

    // Get today's classes
    const todaysClasses = db.prepare(`
      SELECT
        ci.id,
        ci.date,
        ci.start_time,
        ci.status,
        c.name,
        c.class_type,
        c.location,
        c.capacity,
        s.name as coach_name,
        (SELECT COUNT(*) FROM bookings WHERE class_instance_id = ci.id AND status = 'booked') as booked_count
      FROM class_instances ci
      JOIN classes c ON ci.class_id = c.id
      LEFT JOIN staff s ON ci.coach_id = s.id
      WHERE ci.date = ? AND ci.status = 'scheduled'
      ORDER BY ci.start_time
    `).all(today);

    // Get recent activity (last 10 events)
    const recentActivity = db.prepare(`
      SELECT 'member_joined' as type, first_name || ' ' || last_name as description, created_at as timestamp
      FROM members
      WHERE DATE(created_at) >= date('now', '-7 days')
      UNION ALL
      SELECT 'booking_created' as type, 'New class booking' as description, booked_at as timestamp
      FROM bookings
      WHERE DATE(booked_at) >= date('now', '-7 days')
      UNION ALL
      SELECT 'payment_completed' as type, 'Payment received: $' || amount as description, created_at as timestamp
      FROM transactions
      WHERE status = 'completed' AND DATE(created_at) >= date('now', '-7 days')
      ORDER BY timestamp DESC
      LIMIT 10
    `).all();

    // Get leads stats
    const leadsStats = {
      new: db.prepare("SELECT COUNT(*) as count FROM leads WHERE stage = 'new'").get().count,
      contacted: db.prepare("SELECT COUNT(*) as count FROM leads WHERE stage = 'contacted'").get().count,
      trial_booked: db.prepare("SELECT COUNT(*) as count FROM leads WHERE stage = 'trial_booked'").get().count,
      converted: db.prepare("SELECT COUNT(*) as count FROM leads WHERE stage = 'converted' AND DATE(updated_at) >= date('now', '-30 days')").get().count
    };

    // Calculate deltas (vs last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0];

    const previousPeriodMembers = db.prepare(`
      SELECT COUNT(*) as count
      FROM members
      WHERE status = 'active'
        AND DATE(joined_date) BETWEEN ? AND ?
    `).get(sixtyDaysAgoStr, thirtyDaysAgoStr).count;

    const currentPeriodMembers = db.prepare(`
      SELECT COUNT(*) as count
      FROM members
      WHERE status = 'active'
        AND DATE(joined_date) >= ?
    `).get(thirtyDaysAgoStr).count;

    const memberDelta = previousPeriodMembers > 0
      ? ((currentPeriodMembers - previousPeriodMembers) / previousPeriodMembers * 100).toFixed(1)
      : 0;

    const previousPeriodRevenue = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE status = 'completed'
        AND DATE(created_at) BETWEEN ? AND ?
    `).get(sixtyDaysAgoStr, thirtyDaysAgoStr).total;

    const currentPeriodRevenue = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE status = 'completed'
        AND DATE(created_at) >= ?
    `).get(thirtyDaysAgoStr).total;

    const revenueDelta = previousPeriodRevenue > 0
      ? ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue * 100).toFixed(1)
      : 0;

    res.json({
      kpis: {
        active_members: {
          value: memberStats.active,
          delta: parseFloat(memberDelta)
        },
        trial_members: {
          value: memberStats.trial,
          delta: 0 // TODO: Calculate delta
        },
        monthly_revenue: {
          value: monthlyRevenue,
          delta: parseFloat(revenueDelta)
        },
        today_bookings: {
          value: bookingStats.today,
          delta: 0 // TODO: Calculate delta
        },
        trial_conversions: {
          value: trialConversions,
          delta: 0 // TODO: Calculate delta
        },
        new_leads: {
          value: leadsStats.new,
          delta: 0 // TODO: Calculate delta
        }
      },
      todays_classes: todaysClasses,
      recent_activity: recentActivity,
      member_stats: memberStats,
      booking_stats: bookingStats,
      leads_stats: leadsStats
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get revenue chart data
router.get('/revenue-chart', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const db = getDatabase();
    const days = parseInt(req.query.days) || 30;

    const chartData = db.prepare(`
      SELECT
        DATE(created_at) as date,
        SUM(amount) as revenue
      FROM transactions
      WHERE status = 'completed'
        AND DATE(created_at) >= date('now', '-' || ? || ' days')
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all(days);

    res.json(chartData);
  } catch (error) {
    console.error('Error fetching revenue chart:', error);
    res.status(500).json({ error: 'Failed to fetch revenue chart' });
  }
});

// Get attendance chart data
router.get('/attendance-chart', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const db = getDatabase();
    const days = parseInt(req.query.days) || 30;

    const chartData = db.prepare(`
      SELECT
        ci.date,
        COUNT(b.id) as attendance
      FROM class_instances ci
      LEFT JOIN bookings b ON ci.id = b.class_instance_id AND b.status = 'attended'
      WHERE ci.date >= date('now', '-' || ? || ' days')
      GROUP BY ci.date
      ORDER BY ci.date
    `).all(days);

    res.json(chartData);
  } catch (error) {
    console.error('Error fetching attendance chart:', error);
    res.status(500).json({ error: 'Failed to fetch attendance chart' });
  }
});

module.exports = router;
