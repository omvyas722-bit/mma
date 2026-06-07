// Staff performance metrics aggregation
const { getDatabase } = require('../db/connection');

function getStaffPerformanceMetrics(staffId, dateFrom = null, dateTo = null) {
  const db = getDatabase();

  if (!dateFrom) {
    const now = new Date();
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  }
  if (!dateTo) {
    dateTo = new Date().toISOString().split('T')[0];
  }

  const metrics = {};

  metrics.trials_booked = db.prepare(`
    SELECT COUNT(*) as count
    FROM leads
    WHERE assigned_to = ?
      AND stage IN ('trial_booked', 'trial_completed', 'converted')
      AND DATE(created_at) BETWEEN ? AND ?
  `).get(staffId, dateFrom, dateTo).count;

  metrics.signups = db.prepare(`
    SELECT COUNT(*) as count
    FROM leads
    WHERE assigned_to = ?
      AND stage = 'converted'
      AND DATE(updated_at) BETWEEN ? AND ?
  `).get(staffId, dateFrom, dateTo).count;

  const ptStats = db.prepare(`
    SELECT
      COUNT(*) as sessions_sold,
      COALESCE(SUM(amount), 0) as pt_revenue
    FROM pt_sessions
    WHERE coach_id = ?
      AND status IN ('scheduled', 'completed')
      AND DATE(created_at) BETWEEN ? AND ?
  `).get(staffId, dateFrom, dateTo);

  metrics.pt_sessions_sold = ptStats.sessions_sold;
  metrics.pt_revenue = ptStats.pt_revenue;

  metrics.tasks_completed = db.prepare(`
    SELECT COUNT(*) as count
    FROM staff_tasks
    WHERE completed_by = ?
      AND status = 'completed'
      AND DATE(completed_at) BETWEEN ? AND ?
  `).get(staffId, dateFrom, dateTo).count;

  const responseTime = db.prepare(`
    SELECT AVG(
      (JULIANDAY(last_contact_date) - JULIANDAY(created_at)) * 24
    ) as avg_hours
    FROM leads
    WHERE assigned_to = ?
      AND last_contact_date IS NOT NULL
      AND DATE(created_at) BETWEEN ? AND ?
  `).get(staffId, dateFrom, dateTo);

  metrics.avg_response_time_hours = responseTime.avg_hours || 0;

  const trialConversion = db.prepare(`
    SELECT
      COUNT(CASE WHEN stage IN ('trial_completed', 'converted') THEN 1 END) as trials_completed,
      COUNT(CASE WHEN stage = 'converted' THEN 1 END) as converted
    FROM leads
    WHERE assigned_to = ?
      AND stage IN ('trial_completed', 'converted', 'lost')
      AND DATE(trial_date) BETWEEN ? AND ?
  `).get(staffId, dateFrom, dateTo);

  metrics.trial_conversion_rate = trialConversion.trials_completed > 0
    ? Math.round((trialConversion.converted / trialConversion.trials_completed) * 100)
    : 0;

  // Coach-specific metrics
  metrics.classes_taught = db.prepare(`
    SELECT COUNT(*) as count FROM class_instances
    WHERE coach_id = ? AND date BETWEEN ? AND ? AND status != 'cancelled'
  `).get(staffId, dateFrom, dateTo).count;

  const fillRate = db.prepare(`
    SELECT COALESCE(ROUND(AVG(fill_rate), 1), 0) as avg_fill FROM (
      SELECT CAST(COALESCE(b.cnt, 0) AS REAL) / CAST(ci.capacity AS REAL) * 100 as fill_rate
      FROM class_instances ci
      LEFT JOIN (
        SELECT class_instance_id, COUNT(*) as cnt FROM bookings
        WHERE status IN ('booked', 'attended', 'no_show')
        GROUP BY class_instance_id
      ) b ON b.class_instance_id = ci.id
      WHERE ci.coach_id = ? AND ci.date BETWEEN ? AND ? AND ci.status != 'cancelled' AND ci.capacity > 0
    )
  `).get(staffId, dateFrom, dateTo);
  metrics.avg_fill_rate = fillRate.avg_fill || 0;

  metrics.pt_sessions = db.prepare(`
    SELECT COUNT(*) as count FROM pt_sessions
    WHERE coach_id = ? AND DATE(scheduled_date) BETWEEN ? AND ?
    AND status IN ('scheduled', 'completed')
  `).get(staffId, dateFrom, dateTo).count;

  const attRate = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN b.status = 'attended' THEN 1 ELSE 0 END), 0) as attended,
      COUNT(*) as total
    FROM bookings b
    JOIN class_instances ci ON b.class_instance_id = ci.id
    WHERE ci.coach_id = ? AND ci.date BETWEEN ? AND ?
    AND b.status IN ('booked', 'attended', 'no_show')
  `).get(staffId, dateFrom, dateTo);
  metrics.attendance_rate = attRate.total > 0 ? Math.round((attRate.attended / attRate.total) * 100) : 0;

  const retention = db.prepare(`
    SELECT
      (SELECT COUNT(DISTINCT member_id) FROM bookings b
       JOIN class_instances ci ON b.class_instance_id = ci.id
       WHERE ci.coach_id = ? AND ci.date BETWEEN ? AND ? AND b.status = 'attended'
      ) as total,
      COUNT(DISTINCT member_id) as returning
    FROM (
      SELECT b.member_id
      FROM bookings b
      JOIN class_instances ci ON b.class_instance_id = ci.id
      WHERE ci.coach_id = ? AND ci.date BETWEEN ? AND ? AND b.status = 'attended'
      GROUP BY b.member_id
      HAVING COUNT(DISTINCT ci.date) >= 2
    )
  `).get(staffId, dateFrom, dateTo, staffId, dateFrom, dateTo);
  metrics.student_retention_rate = retention.total > 0 ? Math.round((retention.returning / retention.total) * 100) : 0;

  return metrics;
}

function getAllStaffPerformance(dateFrom = null, dateTo = null) {
  const db = getDatabase();

  const staff = db.prepare('SELECT id, name, role FROM staff WHERE active = 1').all();

  return staff.map(s => ({
    staff_id: s.id,
    staff_name: s.name,
    staff_role: s.role,
    metrics: getStaffPerformanceMetrics(s.id, dateFrom, dateTo)
  }));
}

function getLeaderboard(metric = 'signups', dateFrom = null, dateTo = null) {
  const allPerformance = getAllStaffPerformance(dateFrom, dateTo);

  // Sort by specified metric
  const sorted = allPerformance.sort((a, b) => {
    const aValue = a.metrics[metric] || 0;
    const bValue = b.metrics[metric] || 0;
    return bValue - aValue;
  });

  // Add rank
  return sorted.map((item, index) => ({
    rank: index + 1,
    ...item
  }));
}

function getStaffAchievements(staffId, dateFrom = null, dateTo = null) {
  const metrics = getStaffPerformanceMetrics(staffId, dateFrom, dateTo);
  const achievements = [];

  // Define achievement thresholds
  if (metrics.signups >= 10) {
    achievements.push({
      badge: '🏆',
      title: 'Signup Champion',
      description: `${metrics.signups} signups this period`
    });
  }

  if (metrics.signups >= 5) {
    achievements.push({
      badge: '⭐',
      title: 'Top Closer',
      description: `${metrics.signups} signups this period`
    });
  }

  if (metrics.pt_sessions_sold >= 20) {
    achievements.push({
      badge: '💪',
      title: 'PT Sales Master',
      description: `${metrics.pt_sessions_sold} PT sessions sold`
    });
  }

  if (metrics.trial_conversion_rate >= 70) {
    achievements.push({
      badge: '🎯',
      title: 'Conversion Expert',
      description: `${metrics.trial_conversion_rate}% trial conversion rate`
    });
  }

  if (metrics.avg_response_time_hours <= 1) {
    achievements.push({
      badge: '⚡',
      title: 'Speed Demon',
      description: `${Math.round(metrics.avg_response_time_hours * 60)}min avg response time`
    });
  }

  if (metrics.tasks_completed >= 50) {
    achievements.push({
      badge: '✅',
      title: 'Task Master',
      description: `${metrics.tasks_completed} tasks completed`
    });
  }

  return achievements;
}

function getWeeklyClassesForCoach(staffId) {
  const db = getDatabase();
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const fmt = d => d.toISOString().split('T')[0];

  return db.prepare(`
    SELECT ci.id, ci.date, ci.start_time, ci.capacity, c.name as class_name, c.class_type,
      (SELECT COUNT(*) FROM bookings WHERE class_instance_id = ci.id AND status IN ('booked', 'attended', 'no_show')) as booked_count
    FROM class_instances ci
    JOIN classes c ON ci.class_id = c.id
    WHERE ci.coach_id = ? AND ci.date BETWEEN ? AND ? AND ci.status != 'cancelled'
    ORDER BY ci.date, ci.start_time
  `).all(staffId, fmt(weekStart), fmt(weekEnd));
}

function getPTClientsForCoach(staffId) {
  const db = getDatabase();
  return db.prepare(`
    SELECT DISTINCT
      m.id as member_id, m.first_name, m.last_name,
      mpp.sessions_remaining, mpp.sessions_total,
      pp.name as package_name, mpp.purchase_date, mpp.expiry_date
    FROM pt_sessions ps
    JOIN member_pt_packages mpp ON ps.member_package_id = mpp.id
    JOIN members m ON mpp.member_id = m.id
    JOIN pt_packages pp ON mpp.package_id = pp.id
    WHERE ps.coach_id = ? AND mpp.status = 'active' AND mpp.sessions_remaining > 0
    ORDER BY m.first_name
  `).all(staffId);
}

function getTrendData(staffId) {
  const now = new Date();
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const currentEnd = new Date().toISOString().split('T')[0];

  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevStart = prevMonth.toISOString().split('T')[0];
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

  const current = getStaffPerformanceMetrics(staffId, currentStart, currentEnd);
  const previous = getStaffPerformanceMetrics(staffId, prevStart, prevEnd);

  const keys = ['classes_taught', 'avg_fill_rate', 'pt_sessions', 'pt_revenue', 'attendance_rate', 'student_retention_rate'];
  const trends = {};
  for (const k of keys) {
    const c = current[k] || 0;
    const p = previous[k] || 0;
    trends[k] = c - p;
  }
  return trends;
}

function getCoachPTEarnings(staffId, dateFrom = null, dateTo = null) {
  const db = getDatabase();
  if (!dateFrom) {
    const now = new Date();
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  }
  if (!dateTo) {
    dateTo = new Date().toISOString().split('T')[0];
  }

  const staff = db.prepare('SELECT pt_split_pct FROM staff WHERE id = ?').get(staffId);
  const splitPct = staff?.pt_split_pct || 0;

  const data = db.prepare(`
    SELECT
      COUNT(*) as total_sessions,
      COALESCE(SUM(amount), 0) as total_revenue
    FROM pt_sessions
    WHERE coach_id = ? AND DATE(scheduled_date) BETWEEN ? AND ?
    AND status IN ('completed')
  `).get(staffId, dateFrom, dateTo);

  const totalRevenue = data.total_revenue || 0;
  const coachCut = Math.round(totalRevenue * (splitPct / 100) * 100) / 100;
  const gymCut = Math.round((totalRevenue - coachCut) * 100) / 100;

  return {
    total_sessions: data.total_sessions || 0,
    total_revenue: totalRevenue,
    coach_cut: coachCut,
    gym_cut: gymCut,
    split_pct: splitPct
  };
}

function getStaffPerformanceWithExtras(staffId, dateFrom = null, dateTo = null) {
  const metrics = getStaffPerformanceMetrics(staffId, dateFrom, dateTo);
  if (dateFrom || dateTo) return metrics;
  return {
    ...metrics,
    trends: getTrendData(staffId),
    weekly_classes: getWeeklyClassesForCoach(staffId),
    pt_clients: getPTClientsForCoach(staffId),
    pt_earnings: getCoachPTEarnings(staffId, dateFrom, dateTo)
  };
}

module.exports = {
  getStaffPerformanceMetrics,
  getAllStaffPerformance,
  getLeaderboard,
  getStaffAchievements,
  getWeeklyClassesForCoach,
  getPTClientsForCoach,
  getTrendData,
  getCoachPTEarnings,
  getStaffPerformanceWithExtras
};
