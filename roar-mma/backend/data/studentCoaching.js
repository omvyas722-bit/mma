const { getDatabase } = require('../db/connection');

const ALLOWED_RATING_FIELDS = ['defense', 'stance', 'offense', 'practice_quality', 'notes'];

function getRatings(memberId, limit = 50) {
  const db = getDatabase();
  const ratings = db.prepare(`
    SELECT sr.*, s.name AS coach_name
    FROM student_ratings sr
    LEFT JOIN staff s ON s.id = sr.coach_id
    WHERE sr.member_id = ?
    ORDER BY sr.rating_date DESC, sr.created_at DESC
    LIMIT ?
  `).all(memberId, limit);

  const latest = db.prepare(`
    SELECT AVG(defense) as avg_defense, AVG(stance) as avg_stance,
           AVG(offense) as avg_offense, AVG(practice_quality) as avg_practice,
           COUNT(*) as total_ratings
    FROM student_ratings WHERE member_id = ?
  `).get(memberId);

  return { ratings, averages: latest };
}

function createRating(memberId, coachId, data) {
  const db = getDatabase();
  const ratingDate = data.rating_date || new Date().toISOString().split('T')[0];

  const result = db.prepare(`
    INSERT INTO student_ratings (member_id, coach_id, rating_date, defense, stance, offense, practice_quality, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    memberId, coachId, ratingDate,
    data.defense || null, data.stance || null,
    data.offense || null, data.practice_quality || null,
    data.notes || null
  );

  return db.prepare(`
    SELECT sr.*, s.name AS coach_name
    FROM student_ratings sr
    LEFT JOIN staff s ON s.id = sr.coach_id
    WHERE sr.id = ?
  `).get(result.lastInsertRowid);
}

function getInsights(memberId, limit = 20) {
  const db = getDatabase();
  const insights = db.prepare(`
    SELECT * FROM student_ai_insights
    WHERE member_id = ?
    ORDER BY insight_date DESC, created_at DESC
    LIMIT ?
  `).all(memberId, limit);

  for (const insight of insights) {
    if (insight.details) {
      try { insight.details = JSON.parse(insight.details); } catch {}
    }
    insight.drills = db.prepare(`
      SELECT * FROM student_drill_recommendations
      WHERE insight_id = ?
      ORDER BY created_at DESC
    `).all(insight.id);
  }

  const latest = insights.length > 0 ? insights[0] : null;
  return { insights, latest };
}

function createInsight(memberId, data) {
  const db = getDatabase();

  const result = db.prepare(`
    INSERT INTO student_ai_insights
      (member_id, insight_date, skill_level, fight_readiness, recommended_weight_class,
       weight_advice, diet_recommendation, strengths, weaknesses, summary, details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    memberId,
    data.insight_date || new Date().toISOString().split('T')[0],
    data.skill_level || null,
    data.fight_readiness || null,
    data.recommended_weight_class || null,
    data.weight_advice || null,
    data.diet_recommendation || null,
    data.strengths || null,
    data.weaknesses || null,
    data.summary || null,
    data.details ? JSON.stringify(data.details) : null
  );

  const insightId = result.lastInsertRowid;

  if (data.drills && Array.isArray(data.drills)) {
    const insertDrill = db.prepare(`
      INSERT INTO student_drill_recommendations
        (member_id, insight_id, drill_name, drill_description, focus_area, difficulty)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const drill of data.drills) {
      insertDrill.run(memberId, insightId, drill.drill_name, drill.drill_description || null, drill.focus_area || null, drill.difficulty || 'intermediate');
    }
  }

  return getInsights(memberId, 1);
}

function getDrills(memberId, limit = 20) {
  const db = getDatabase();
  return db.prepare(`
    SELECT d.*, i.insight_date, i.summary AS insight_summary
    FROM student_drill_recommendations d
    LEFT JOIN student_ai_insights i ON i.id = d.insight_id
    WHERE d.member_id = ?
    ORDER BY d.created_at DESC
    LIMIT ?
  `).all(memberId, limit);
}

function getAllMembersWithRecentRatings(limitDays = 7) {
  const db = getDatabase();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - limitDays);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  return db.prepare(`
    SELECT m.id, m.first_name, m.last_name, m.email, m.experience_level, m.goals,
           COUNT(sr.id) as rating_count,
           AVG(sr.defense) as avg_defense,
           AVG(sr.stance) as avg_stance,
           AVG(sr.offense) as avg_offense,
           AVG(sr.practice_quality) as avg_practice,
           MAX(sr.rating_date) as last_rating_date
    FROM members m
    LEFT JOIN student_ratings sr ON sr.member_id = m.id AND sr.rating_date >= ?
    WHERE m.status NOT IN ('cancelled', 'inactive')
    GROUP BY m.id
    ORDER BY m.status ASC, m.last_name ASC
  `).all(cutoffStr);
}

function getAllMemberRatingSummaries() {
  const db = getDatabase();
  return db.prepare(`
    SELECT m.id, m.first_name, m.last_name, m.status, m.experience_level,
           COUNT(sr.id) as total_ratings,
           AVG(sr.defense) as avg_defense,
           AVG(sr.stance) as avg_stance,
           AVG(sr.offense) as avg_offense,
           AVG(sr.practice_quality) as avg_practice,
           MAX(sr.rating_date) as last_rating_date,
           (SELECT insight_date FROM student_ai_insights WHERE member_id = m.id ORDER BY insight_date DESC LIMIT 1) as last_insight_date
    FROM members m
    LEFT JOIN student_ratings sr ON sr.member_id = m.id
    WHERE m.status NOT IN ('cancelled')
    GROUP BY m.id
    ORDER BY total_ratings DESC
  `).all();
}

module.exports = {
  getRatings,
  createRating,
  getInsights,
  createInsight,
  getDrills,
  getAllMembersWithRecentRatings,
  getAllMemberRatingSummaries
};
