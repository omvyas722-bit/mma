// Trial conversion analytics data layer
const { getDatabase } = require('../db/connection');

function getTrialConversionStats(filters = {}) {
  const db = getDatabase();

  // Overall conversion rate
  const conversionRate = db.prepare(`
    SELECT
      COUNT(CASE WHEN stage = 'trial_completed' THEN 1 END) as trials_completed,
      COUNT(CASE WHEN stage = 'converted' THEN 1 END) as converted,
      ROUND(
        CAST(COUNT(CASE WHEN stage = 'converted' THEN 1 END) AS FLOAT) /
        NULLIF(COUNT(CASE WHEN stage IN ('trial_completed', 'converted') THEN 1 END), 0) * 100,
        2
      ) as conversion_rate
    FROM leads
    WHERE stage IN ('trial_completed', 'converted', 'lost')
  `).get();

  // Conversion by interest level
  const byInterestLevel = db.prepare(`
    SELECT
      trial_interest_level,
      COUNT(*) as total,
      COUNT(CASE WHEN stage = 'converted' THEN 1 END) as converted,
      ROUND(
        CAST(COUNT(CASE WHEN stage = 'converted' THEN 1 END) AS FLOAT) /
        NULLIF(COUNT(*), 0) * 100,
        2
      ) as conversion_rate
    FROM leads
    WHERE trial_interest_level IS NOT NULL
      AND stage IN ('trial_completed', 'converted', 'lost')
    GROUP BY trial_interest_level
  `).all();

  // Conversion by experience rating
  const byExperienceRating = db.prepare(`
    SELECT
      trial_experience_rating,
      COUNT(*) as total,
      COUNT(CASE WHEN stage = 'converted' THEN 1 END) as converted,
      ROUND(
        CAST(COUNT(CASE WHEN stage = 'converted' THEN 1 END) AS FLOAT) /
        NULLIF(COUNT(*), 0) * 100,
        2
      ) as conversion_rate
    FROM leads
    WHERE trial_experience_rating IS NOT NULL
      AND stage IN ('trial_completed', 'converted', 'lost')
    GROUP BY trial_experience_rating
    ORDER BY trial_experience_rating
  `).all();

  // Conversion by class type
  const byClassType = db.prepare(`
    SELECT
      trial_class_type,
      COUNT(*) as total,
      COUNT(CASE WHEN stage = 'converted' THEN 1 END) as converted,
      ROUND(
        CAST(COUNT(CASE WHEN stage = 'converted' THEN 1 END) AS FLOAT) /
        NULLIF(COUNT(*), 0) * 100,
        2
      ) as conversion_rate
    FROM leads
    WHERE trial_class_type IS NOT NULL
      AND stage IN ('trial_completed', 'converted', 'lost')
    GROUP BY trial_class_type
  `).all();

  // Average time to conversion
  const avgTimeToConversion = db.prepare(`
    SELECT
      AVG(JULIANDAY(updated_at) - JULIANDAY(trial_date)) as avg_days
    FROM leads
    WHERE stage = 'converted'
      AND trial_date IS NOT NULL
  `).get();

  // Recent trials needing follow-up
  const needsFollowUp = db.prepare(`
    SELECT
      id,
      first_name,
      last_name,
      phone,
      email,
      trial_date,
      trial_interest_level,
      trial_experience_rating,
      follow_up_status,
      JULIANDAY('now') - JULIANDAY(trial_date) as days_since_trial
    FROM leads
    WHERE stage = 'trial_completed'
      AND trial_date IS NOT NULL
      AND follow_up_status != 'completed'
    ORDER BY trial_date DESC
    LIMIT 20
  `).all();

  // Follow-up effectiveness
  const followUpStats = db.prepare(`
    SELECT
      follow_up_status,
      COUNT(*) as count,
      COUNT(CASE WHEN stage = 'converted' THEN 1 END) as converted
    FROM leads
    WHERE trial_date IS NOT NULL
      AND stage IN ('trial_completed', 'converted', 'lost')
    GROUP BY follow_up_status
  `).all();

  return {
    overall: conversionRate,
    by_interest_level: byInterestLevel,
    by_experience_rating: byExperienceRating,
    by_class_type: byClassType,
    avg_time_to_conversion: avgTimeToConversion.avg_days || 0,
    needs_follow_up: needsFollowUp,
    follow_up_effectiveness: followUpStats
  };
}

function getTrialTrends(days = 30) {
  const db = getDatabase();

  const trends = db.prepare(`
    SELECT
      DATE(trial_date) as date,
      COUNT(*) as trials,
      COUNT(CASE WHEN stage = 'converted' THEN 1 END) as conversions,
      ROUND(
        CAST(COUNT(CASE WHEN stage = 'converted' THEN 1 END) AS FLOAT) /
        NULLIF(COUNT(*), 0) * 100,
        2
      ) as conversion_rate
    FROM leads
    WHERE trial_date >= DATE('now', '-' || ? || ' days')
      AND trial_date IS NOT NULL
    GROUP BY DATE(trial_date)
    ORDER BY date DESC
  `).all(days);

  return trends;
}

module.exports = {
  getTrialConversionStats,
  getTrialTrends
};
