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
      converted: db.prepare("SELECT COUNT(*) as count FROM leads WHERE stage = 'converted' AND DATE(updated_at) >= date('now', '-30 days')").get().count,
      hot: db.prepare("SELECT COUNT(*) as count FROM leads WHERE stage NOT IN ('converted','lost') AND interest_level IN ('hot','high')").get().count,
      open: db.prepare("SELECT COUNT(*) as count FROM leads WHERE stage NOT IN ('converted','lost')").get().count
    };

    // Class fill % for today
    const classFillRow = db.prepare(`
      SELECT AVG(CAST(bc AS REAL) / CAST(c.capacity AS REAL)) * 100 as fill_pct FROM (
        SELECT ci.id, ci.class_id, ci.capacity, (SELECT COUNT(*) FROM bookings WHERE class_instance_id = ci.id AND status = 'booked') as bc
        FROM class_instances ci WHERE ci.date = ? AND ci.status = 'scheduled'
      ) sub JOIN classes c ON sub.class_id = c.id WHERE c.capacity > 0
    `).get(today);
    const classFillPct = classFillRow?.fill_pct != null ? Math.round(classFillRow.fill_pct) : null;

    // Goal sub-metrics
    const trialsThisMonth = db.prepare("SELECT COUNT(*) as c FROM members WHERE status = 'trial'").get().c;
    const referralsThisMonth = db.prepare("SELECT COUNT(*) as c FROM members WHERE referred_by IS NOT NULL AND DATE(joined_date) >= ?").get(monthStartStr).c;
    const totalLeadsContacted = db.prepare("SELECT COUNT(*) as c FROM leads WHERE stage != 'new'").get().c;
    const conversionRate = totalLeadsContacted > 0 ? ((leadsStats.converted / totalLeadsContacted) * 100).toFixed(1) : 0;

    // MIDAS chase note (latest billing chase)
    const midasChase = db.prepare(`
      SELECT description, timestamp FROM activity_log
      WHERE type = 'midas_chase' OR description LIKE '%MIDAS%'
      ORDER BY timestamp DESC LIMIT 1
    `).get();

    // Expiring staff certifications
    const expiringCerts = db.prepare(`
      SELECT sc.id, sc.cert_name, sc.expiry_date, s.first_name, s.last_name
      FROM staff_certifications sc
      JOIN staff s ON sc.staff_id = s.id
      WHERE sc.expiry_date >= date('now') AND sc.expiry_date <= date('now', '+60 days')
      ORDER BY sc.expiry_date
    `).all();

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

    // trial_members delta
    const previousPeriodTrial = db.prepare(`
      SELECT COUNT(*) as count
      FROM members
      WHERE status = 'trial'
        AND DATE(joined_date) BETWEEN ? AND ?
    `).get(sixtyDaysAgoStr, thirtyDaysAgoStr).count;

    const currentPeriodTrial = db.prepare(`
      SELECT COUNT(*) as count
      FROM members
      WHERE status = 'trial'
        AND DATE(joined_date) >= ?
    `).get(thirtyDaysAgoStr).count;

    const trialDelta = previousPeriodTrial > 0
      ? ((currentPeriodTrial - previousPeriodTrial) / previousPeriodTrial * 100).toFixed(1)
      : 0;

    // today_bookings delta (compare vs same day last week)
    const previousWeekBookings = db.prepare(`
      SELECT COUNT(*) as count
      FROM bookings b
      JOIN class_instances ci ON b.class_instance_id = ci.id
      WHERE ci.date = date('now', '-7 days') AND b.status = 'booked'
    `).get().count;

    const bookingsDelta = previousWeekBookings > 0
      ? (((bookingStats.today - previousWeekBookings) / previousWeekBookings) * 100).toFixed(1)
      : 0;

    // trial_conversions delta (compare vs previous month)
    const prevMonthStart = new Date(monthStart);
    prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
    const prevMonthStartStr = prevMonthStart.toISOString().split('T')[0];

    const previousConversions = db.prepare(`
      SELECT COUNT(*) as count
      FROM members
      WHERE status = 'active'
        AND DATE(joined_date) < ?
        AND DATE(updated_at) >= ?
        AND DATE(updated_at) < ?
    `).get(monthStartStr, prevMonthStartStr, monthStartStr).count;

    const conversionDelta = previousConversions > 0
      ? (((trialConversions - previousConversions) / previousConversions) * 100).toFixed(1)
      : 0;

    // new_leads delta
    const previousPeriodLeads = db.prepare(`
      SELECT COUNT(*) as count
      FROM leads
      WHERE stage = 'new'
        AND DATE(created_at) BETWEEN ? AND ?
    `).get(sixtyDaysAgoStr, thirtyDaysAgoStr).count;

    const currentPeriodLeads = db.prepare(`
      SELECT COUNT(*) as count
      FROM leads
      WHERE stage = 'new'
        AND DATE(created_at) >= ?
    `).get(thirtyDaysAgoStr).count;

    const leadsDelta = previousPeriodLeads > 0
      ? ((currentPeriodLeads - previousPeriodLeads) / previousPeriodLeads * 100).toFixed(1)
      : 0;

    res.json({
      kpis: {
        active_members: {
          value: memberStats.active,
          delta: parseFloat(memberDelta)
        },
        trial_members: {
          value: memberStats.trial,
          delta: parseFloat(trialDelta)
        },
        monthly_revenue: {
          value: monthlyRevenue,
          delta: parseFloat(revenueDelta)
        },
        today_bookings: {
          value: bookingStats.today,
          delta: parseFloat(bookingsDelta)
        },
        trial_conversions: {
          value: trialConversions,
          delta: parseFloat(conversionDelta)
        },
        new_leads: {
          value: leadsStats.new,
          delta: parseFloat(leadsDelta)
        },
        open_leads: {
          value: leadsStats.open,
          delta: null
        },
        class_fill: {
          value: classFillPct != null ? `${classFillPct}%` : '—',
          delta: null
        },
        hot_leads: {
          value: leadsStats.hot,
          delta: null
        }
      },
      goal_sub_metrics: {
        trials: trialsThisMonth,
        conversion_rate: conversionRate,
        referrals: referralsThisMonth
      },
      midas_chase: midasChase || null,
      expiring_certs: expiringCerts,
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
    const days = parseInt(req.query.days, 10) || 30;

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
    const days = parseInt(req.query.days, 10) || 30;

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

// Dashboard sparklines (30-day trends)
router.get('/sparklines', authenticateToken, requirePermission('dashboard:read'), (req, res) => {
  try {
    const db = getDatabase();
    const sparklines = db.prepare('SELECT * FROM dashboard_sparklines').all();

    const dailyData = {};
    const days = 30;

    const newMembers = db.prepare(`
      SELECT DATE(joined_date) as date, COUNT(*) as count
      FROM members WHERE joined_date >= date('now', '-' || ? || ' days')
      GROUP BY DATE(joined_date) ORDER BY date
    `).all(days);
    dailyData.new_members = newMembers;

    const revenue = db.prepare(`
      SELECT DATE(created_at) as date, COALESCE(SUM(amount), 0) as count
      FROM transactions WHERE created_at >= date('now', '-' || ? || ' days') AND status = 'completed'
      GROUP BY DATE(created_at) ORDER BY date
    `).all(days);
    dailyData.revenue = revenue;

    const attendance = db.prepare(`
      SELECT ci.date, COUNT(b.id) as count
      FROM class_instances ci
      LEFT JOIN bookings b ON ci.id = b.class_instance_id AND b.status = 'attended'
      WHERE ci.date >= date('now', '-' || ? || ' days')
      GROUP BY ci.date ORDER BY ci.date
    `).all(days);
    dailyData.attendance = attendance;

    const leads = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM leads WHERE created_at >= date('now', '-' || ? || ' days')
      GROUP BY DATE(created_at) ORDER BY date
    `).all(days);
    dailyData.leads = leads;

    const enriched = sparklines.map(s => {
      const raw = dailyData[s.metric_key] || [];
      const points = Array.from({ length: days }, (_, i) => {
        const d = new Date(Date.now() - (days - 1 - i) * 86400000);
        const ds = d.toISOString().split('T')[0];
        const match = raw.find(r => r.date === ds);
        return match ? parseFloat(match.count) || 0 : 0;
      });
      return { ...s, data: JSON.stringify(points) };
    });

    // Update stored sparklines
    const upsert = db.prepare("UPDATE dashboard_sparklines SET data = ?, updated_at = datetime('now') WHERE metric_key = ?");
    for (const s of enriched) upsert.run(s.data, s.metric_key);

    res.json({ sparklines: enriched });
  } catch (error) {
    console.error('Error fetching sparklines:', error);
    res.status(500).json({ error: 'Failed to fetch sparklines' });
  }
});

// Revenue forecast (simple linear based on last 90 days)
router.get('/revenue-forecast', authenticateToken, requirePermission('dashboard:read'), (req, res) => {
  try {
    const db = getDatabase();
    const daily = db.prepare(`
      SELECT DATE(created_at) as date, COALESCE(SUM(amount), 0) as revenue
      FROM transactions WHERE created_at >= date('now', '-90 days') AND status = 'completed'
      GROUP BY DATE(created_at) ORDER BY date
    `).all();

    const values = daily.map(d => d.revenue);
    const n = values.length;
    const avg = n > 0 ? values.reduce((a, b) => a + b, 0) / n : 0;
    const variance = n > 1 ? values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (n - 1) : 0;
    const stddev = Math.sqrt(variance);

    const activeMembers = db.prepare("SELECT COUNT(*) as c FROM members WHERE status = 'active'").get().c;
    const churnRate = db.prepare(`
      SELECT CAST(COUNT(*) AS REAL) / MAX(?, 1) as rate
      FROM members WHERE status = 'cancelled' AND cancellation_date >= date('now', '-30 days')
    `).get(activeMembers).rate || 0;

    const projectedGrowth = activeMembers * (1 - churnRate);
    const projectedRevenue = projectedGrowth * avg * 30;

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();
    const forecast = Array.from({ length: 6 }, (_, i) => {
      const m = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const members = activeMembers * Math.pow(1 - churnRate, i + 1);
      return { month: `${monthNames[m.getMonth()]} ${m.getFullYear()}`, projectedRevenue: Math.round(members * avg * 30), projectedMembers: Math.round(members) };
    });

    res.json({
      currentDailyAvg: Math.round(avg * 100) / 100,
      dailyStdDev: Math.round(stddev * 100) / 100,
      monthlyProjection: Math.round(avg * 30),
      projectedNextMonth: Math.round(projectedRevenue),
      churnRate: Math.round(churnRate * 10000) / 100,
      forecast,
    });
  } catch (error) {
    console.error('Error forecasting revenue:', error);
    res.status(500).json({ error: 'Failed to forecast revenue' });
  }
});

module.exports = router;
