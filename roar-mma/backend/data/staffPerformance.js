// Staff performance metrics aggregation
const { getDatabase } = require('../db/connection');

function getStaffPerformanceMetrics(staffId, dateFrom = null, dateTo = null) {
  const db = getDatabase();

  // Default to current month if no dates provided
  if (!dateFrom) {
    const now = new Date();
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  }
  if (!dateTo) {
    dateTo = new Date().toISOString().split('T')[0];
  }

  const metrics = {};

  // Trials booked (leads moved to trial_booked stage)
  metrics.trials_booked = db.prepare(`
    SELECT COUNT(*) as count
    FROM leads
    WHERE assigned_to = ?
      AND stage IN ('trial_booked', 'trial_completed', 'converted')
      AND DATE(created_at) BETWEEN ? AND ?
  `).get(staffId, dateFrom, dateTo).count;

  // Signups (leads converted to members)
  metrics.signups = db.prepare(`
    SELECT COUNT(*) as count
    FROM leads
    WHERE assigned_to = ?
      AND stage = 'converted'
      AND DATE(updated_at) BETWEEN ? AND ?
  `).get(staffId, dateFrom, dateTo).count;

  // PT sessions sold
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

  // Tasks completed
  metrics.tasks_completed = db.prepare(`
    SELECT COUNT(*) as count
    FROM staff_tasks
    WHERE completed_by = ?
      AND status = 'completed'
      AND DATE(completed_at) BETWEEN ? AND ?
  `).get(staffId, dateFrom, dateTo).count;

  // Lead response time (average hours to first contact)
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

  // Trial conversion rate
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

module.exports = {
  getStaffPerformanceMetrics,
  getAllStaffPerformance,
  getLeaderboard,
  getStaffAchievements
};
