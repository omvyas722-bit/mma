// Unified Analytics Service - Aggregates metrics from all systems
const { getDatabase } = require('../db/connection');
const trialAnalyticsData = require('../data/trialAnalytics');
const leadScoringData = require('../data/leadScoring');
const staffPerformanceData = require('../data/staffPerformance');
const retentionData = require('../data/retention');
const phoneCallsData = require('../data/phoneCalls');
const messagingProviders = require('./messagingProviders');

const CACHE_TTL_MS = 60000;
const queryCache = new Map();

function cachedQuery(methodName, args, fn) {
  const key = methodName + ':' + JSON.stringify(args);
  const entry = queryCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data;
  }
  const data = fn();
  queryCache.set(key, { data, timestamp: Date.now() });
  return data;
}

class UnifiedAnalytics {
  // Get complete dashboard overview
  getDashboardOverview(dateFrom = null, dateTo = null) {
    if (!dateFrom) {
      const now = new Date();
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }
    if (!dateTo) {
      dateTo = new Date().toISOString().split('T')[0];
    }

    return cachedQuery('getDashboardOverview', [dateFrom, dateTo], () => ({
      revenue: this.getRevenueMetrics(dateFrom, dateTo),
      leads: this.getLeadMetrics(dateFrom, dateTo),
      trials: this.getTrialMetrics(dateFrom, dateTo),
      retention: this.getRetentionMetrics(dateFrom, dateTo),
      staff: this.getStaffMetrics(dateFrom, dateTo),
      phone: this.getPhoneMetrics(dateFrom, dateTo),
      messaging: this.getMessagingMetrics(dateFrom, dateTo),
      forecast: this.getRevenueForecast()
    }));
  }

  // Revenue metrics across all sources
  getRevenueMetrics(dateFrom, dateTo) {
    return cachedQuery('getRevenueMetrics', [dateFrom, dateTo], () => {
      const db = getDatabase();

      // Membership revenue
      const membershipRevenue = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE type = 'membership'
          AND status = 'completed'
          AND DATE(created_at) BETWEEN ? AND ?
      `).get(dateFrom, dateTo).total;

      // PT revenue
      const ptRevenue = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM pt_sessions
        WHERE status = 'completed'
          AND DATE(created_at) BETWEEN ? AND ?
      `).get(dateFrom, dateTo).total;

      // New member signups
      const newSignups = db.prepare(`
        SELECT COUNT(*) as count
        FROM members
        WHERE DATE(joined_date) BETWEEN ? AND ?
      `).get(dateFrom, dateTo).count;

      // Trial conversions
      const trialConversions = db.prepare(`
        SELECT COUNT(*) as count
        FROM leads
        WHERE stage = 'converted'
          AND DATE(updated_at) BETWEEN ? AND ?
      `).get(dateFrom, dateTo).count;

      // Average member value
      const avgRecord = db.prepare(`
        SELECT AVG(amount) as avg
        FROM transactions
        WHERE type = 'membership'
          AND status = 'completed'
          AND DATE(created_at) BETWEEN ? AND ?
      `).get(dateFrom, dateTo);
      const avgMemberValue = avgRecord && avgRecord.avg != null ? avgRecord.avg : 0;

      return {
        total_revenue: membershipRevenue + ptRevenue,
        membership_revenue: membershipRevenue,
        pt_revenue: ptRevenue,
        new_signups: newSignups,
        trial_conversions: trialConversions,
        avg_member_value: Math.round(avgMemberValue),
        mrr: Math.round((membershipRevenue / Math.max(this.getDaysBetween(dateFrom, dateTo), 1)) * 30)
      };
    });
  }

  // Lead pipeline metrics
  getLeadMetrics(dateFrom, dateTo) {
    return cachedQuery('getLeadMetrics', [dateFrom, dateTo], () => {
      const db = getDatabase();

      // Total leads
      const totalLeads = db.prepare(`
        SELECT COUNT(*) as count
        FROM leads
        WHERE DATE(created_at) BETWEEN ? AND ?
      `).get(dateFrom, dateTo).count;

      // By stage
      const byStage = db.prepare(`
        SELECT stage, COUNT(*) as count
        FROM leads
        WHERE DATE(created_at) BETWEEN ? AND ?
        GROUP BY stage
      `).all(dateFrom, dateTo);

      // By source
      const bySource = db.prepare(`
        SELECT source, COUNT(*) as count
        FROM leads
        WHERE DATE(created_at) BETWEEN ? AND ?
        GROUP BY source
        ORDER BY count DESC
      `).all(dateFrom, dateTo);

      // High priority leads (score 70+)
      const leadsInRange = db.prepare(`
        SELECT * FROM leads
        WHERE DATE(created_at) BETWEEN ? AND ?
      `).all(dateFrom, dateTo);
      const highPriority = leadsInRange.filter(l => leadScoringData.calculateLeadScore(l) >= 70).length;

      // Conversion rate (query by updated_at for converted leads matching the period)
      const converted = db.prepare(`
        SELECT COUNT(*) as count FROM leads
        WHERE stage = 'converted'
          AND DATE(updated_at) BETWEEN ? AND ?
      `).get(dateFrom, dateTo).count || 0;
      const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;

      // Average response time
      const avgResponseTime = db.prepare(`
        SELECT AVG(
          (JULIANDAY(last_contact_date) - JULIANDAY(created_at)) * 24
        ) as avg_hours
        FROM leads
        WHERE last_contact_date IS NOT NULL
          AND DATE(created_at) BETWEEN ? AND ?
      `).get(dateFrom, dateTo).avg_hours || 0;

      return {
        total_leads: totalLeads,
        by_stage: byStage,
        by_source: bySource,
        high_priority: highPriority,
        conversion_rate: conversionRate,
        avg_response_time_hours: Math.round(avgResponseTime * 10) / 10
      };
    });
  }

  // Trial metrics
  getTrialMetrics(dateFrom, dateTo) {
    return cachedQuery('getTrialMetrics', [dateFrom, dateTo], () => {
      const db = getDatabase();

      // Trials booked
      const trialsBooked = db.prepare(`
        SELECT COUNT(*) as count
        FROM leads
        WHERE stage IN ('trial_booked', 'trial_completed', 'converted')
          AND DATE(trial_date) BETWEEN ? AND ?
      `).get(dateFrom, dateTo).count;

      // Trials completed
      const trialsCompleted = db.prepare(`
        SELECT COUNT(*) as count
        FROM leads
        WHERE stage IN ('trial_completed', 'converted')
          AND DATE(trial_date) BETWEEN ? AND ?
      `).get(dateFrom, dateTo).count;

      // Trial conversion rate
      const trialConversions = db.prepare(`
        SELECT COUNT(*) as count
        FROM leads
        WHERE stage = 'converted'
          AND trial_date IS NOT NULL
          AND DATE(trial_date) BETWEEN ? AND ?
      `).get(dateFrom, dateTo).count;

      const trialConversionRate = trialsCompleted > 0
        ? Math.round((trialConversions / trialsCompleted) * 100)
        : 0;

      // By interest level
      const byInterest = db.prepare(`
        SELECT trial_interest_level, COUNT(*) as count
        FROM leads
        WHERE trial_date IS NOT NULL
          AND DATE(trial_date) BETWEEN ? AND ?
        GROUP BY trial_interest_level
      `).all(dateFrom, dateTo);

      // By experience rating
      const byExperience = db.prepare(`
        SELECT trial_experience_rating, COUNT(*) as count
        FROM leads
        WHERE trial_date IS NOT NULL
          AND DATE(trial_date) BETWEEN ? AND ?
        GROUP BY trial_experience_rating
      `).all(dateFrom, dateTo);

      return {
        trials_booked: trialsBooked,
        trials_completed: trialsCompleted,
        trial_conversions: trialConversions,
        trial_conversion_rate: trialConversionRate,
        by_interest: byInterest,
        by_experience: byExperience
      };
    });
  }

  // Retention metrics
  getRetentionMetrics(dateFrom, dateTo) {
    const analytics = retentionData.getRetentionAnalytics(dateFrom, dateTo);
    return analytics;
  }

  // Staff performance metrics
  getStaffMetrics(dateFrom, dateTo) {
    const allPerformance = staffPerformanceData.getAllStaffPerformance(dateFrom, dateTo);

    // Calculate totals
    const totals = {
      total_trials_booked: 0,
      total_signups: 0,
      total_pt_revenue: 0,
      total_tasks_completed: 0
    };

    allPerformance.forEach(staff => {
      totals.total_trials_booked += staff.metrics.trials_booked;
      totals.total_signups += staff.metrics.signups;
      totals.total_pt_revenue += staff.metrics.pt_revenue;
      totals.total_tasks_completed += staff.metrics.tasks_completed;
    });

    // Top performers
    const topBySignups = [...allPerformance].sort((a, b) => b.metrics.signups - a.metrics.signups).slice(0, 3);
    const topByPT = [...allPerformance].sort((a, b) => b.metrics.pt_revenue - a.metrics.pt_revenue).slice(0, 3);

    return {
      totals,
      staff_count: allPerformance.length,
      top_by_signups: topBySignups,
      top_by_pt: topByPT,
      all_staff: allPerformance
    };
  }

  // Phone call metrics
  getPhoneMetrics(dateFrom, dateTo) {
    return phoneCallsData.getCallAnalytics(dateFrom, dateTo);
  }

  // Messaging metrics
  getMessagingMetrics(dateFrom, dateTo) {
    return messagingProviders.getMessagingStats(dateFrom, dateTo);
  }

  // Revenue forecast (next 3 months)
  getRevenueForecast() {
    return cachedQuery('getRevenueForecast', [], () => {
      const db = getDatabase();

      // Get last 3 months average
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const dateFrom = threeMonthsAgo.toISOString().split('T')[0];
      const dateTo = new Date().toISOString().split('T')[0];

      const avgMonthlyRevenue = db.prepare(`
        SELECT AVG(monthly_revenue) as avg
        FROM (
          SELECT
            strftime('%Y-%m', created_at) as month,
            SUM(amount) as monthly_revenue
          FROM transactions
          WHERE status = 'completed'
            AND DATE(created_at) BETWEEN ? AND ?
          GROUP BY month
        )
      `).get(dateFrom, dateTo).avg || 0;

      // Active members
      const activeMembers = db.prepare(`
        SELECT COUNT(*) as count
        FROM members
        WHERE status = 'active'
      `).get().count;

      // Growth rate (new members last month)
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString().split('T')[0];
      const lastMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).toISOString().split('T')[0];

      const newMembersLastMonth = db.prepare(`
        SELECT COUNT(*) as count
        FROM members
        WHERE DATE(joined_date) BETWEEN ? AND ?
      `).get(lastMonthStart, lastMonthEnd).count;

      const growthRate = activeMembers > 0 ? (newMembersLastMonth / activeMembers) : 0;

      // Forecast next 3 months
      const forecast = [];
      let projectedMembers = activeMembers;
      let projectedRevenue = avgMonthlyRevenue;

      for (let i = 1; i <= 3; i++) {
        const forecastDate = new Date();
        forecastDate.setMonth(forecastDate.getMonth() + i);

        projectedMembers = Math.round(projectedMembers * (1 + growthRate));
        projectedRevenue = Math.round(projectedRevenue * (1 + growthRate));

        forecast.push({
          month: forecastDate.toISOString().slice(0, 7),
          projected_members: projectedMembers,
          projected_revenue: projectedRevenue
        });
      }

      return {
        current_mrr: Math.round(avgMonthlyRevenue),
        active_members: activeMembers,
        growth_rate: Math.round(growthRate * 100),
        forecast
      };
    });
  }

  // Conversion funnel
  getConversionFunnel(dateFrom, dateTo) {
    return cachedQuery('getConversionFunnel', [dateFrom, dateTo], () => {
      const db = getDatabase();

      const funnel = {
        leads_created: 0,
        trials_booked: 0,
        trials_completed: 0,
        converted: 0
      };

      funnel.leads_created = db.prepare(`
        SELECT COUNT(*) as count
        FROM leads
        WHERE DATE(created_at) BETWEEN ? AND ?
      `).get(dateFrom, dateTo).count;

      funnel.trials_booked = db.prepare(`
        SELECT COUNT(*) as count
        FROM leads
        WHERE stage IN ('trial_booked', 'trial_completed', 'converted')
          AND DATE(created_at) BETWEEN ? AND ?
      `).get(dateFrom, dateTo).count;

      funnel.trials_completed = db.prepare(`
        SELECT COUNT(*) as count
        FROM leads
        WHERE stage IN ('trial_completed', 'converted')
          AND DATE(created_at) BETWEEN ? AND ?
      `).get(dateFrom, dateTo).count;

      funnel.converted = db.prepare(`
        SELECT COUNT(*) as count
        FROM leads
        WHERE stage = 'converted'
          AND DATE(created_at) BETWEEN ? AND ?
      `).get(dateFrom, dateTo).count;

      // Calculate conversion rates
      funnel.lead_to_trial_rate = funnel.leads_created > 0
        ? Math.round((funnel.trials_booked / funnel.leads_created) * 100)
        : 0;

      funnel.trial_to_conversion_rate = funnel.trials_completed > 0
        ? Math.round((funnel.converted / funnel.trials_completed) * 100)
        : 0;

      funnel.overall_conversion_rate = funnel.leads_created > 0
        ? Math.round((funnel.converted / funnel.leads_created) * 100)
        : 0;

      return funnel;
    });
  }

  // Time series data for charts
  getTimeSeries(metric, dateFrom, dateTo, interval = 'day') {
    return cachedQuery('getTimeSeries', [metric, dateFrom, dateTo, interval], () => {
      const db = getDatabase();

      let groupBy;
      if (interval === 'day') {
        groupBy = "DATE(created_at)";
      } else if (interval === 'week') {
        groupBy = "strftime('%Y-W%W', created_at)";
      } else if (interval === 'month') {
        groupBy = "strftime('%Y-%m', created_at)";
      }

      let query;

      switch (metric) {
        case 'leads':
          query = `
            SELECT ${groupBy} as period, COUNT(*) as value
            FROM leads
            WHERE DATE(created_at) BETWEEN ? AND ?
            GROUP BY period
            ORDER BY period
          `;
          break;

        case 'signups':
          query = `
            SELECT ${groupBy} as period, COUNT(*) as value
            FROM members
            WHERE DATE(joined_date) BETWEEN ? AND ?
            GROUP BY period
            ORDER BY period
          `;
          break;

        case 'revenue':
          query = `
            SELECT ${groupBy} as period, SUM(amount) as value
            FROM transactions
            WHERE status = 'completed'
              AND DATE(created_at) BETWEEN ? AND ?
            GROUP BY period
            ORDER BY period
          `;
          break;

        case 'trials':
          query = `
            SELECT ${groupBy} as period, COUNT(*) as value
            FROM leads
            WHERE trial_date IS NOT NULL
              AND DATE(trial_date) BETWEEN ? AND ?
            GROUP BY period
            ORDER BY period
          `;
          break;

        default:
          return [];
      }

      return db.prepare(query).all(dateFrom, dateTo);
    });
  }

  // Helper: days between dates
  getDaysBetween(dateFrom, dateTo) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    return Math.ceil((to - from) / (1000 * 60 * 60 * 24));
  }
}

// Singleton instance
const unifiedAnalytics = new UnifiedAnalytics();

module.exports = unifiedAnalytics;
