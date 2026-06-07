// Belt grading system data layer
const { getDatabase } = require('../db/connection');

// Belt levels
function getAllBeltLevels(discipline) {
  const db = getDatabase();
  if (discipline) {
    return db.prepare('SELECT * FROM belt_levels WHERE discipline = ? ORDER BY rank_order').all(discipline);
  }
  return db.prepare('SELECT * FROM belt_levels ORDER BY rank_order').all();
}

function getBeltLevel(id) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM belt_levels WHERE id = ?').get(id);
}

function getBeltLevelByName(name) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM belt_levels WHERE LOWER(name) = LOWER(?) ORDER BY rank_order ASC LIMIT 1').get(name);
}

// Grading requirements
function getRequirementsForBelt(beltLevelId) {
  const db = getDatabase();
  return db.prepare(`
    SELECT * FROM grading_requirements
    WHERE belt_level_id = ?
    ORDER BY category, display_order
  `).all(beltLevelId);
}

// Member belt progress
function getMemberBeltProgress(memberId) {
  const db = getDatabase();

  const current = db.prepare(`
    SELECT mbp.*, bl.name as belt_name, bl.color_code, bl.rank_order
    FROM member_belt_progress mbp
    JOIN belt_levels bl ON mbp.current_belt_id = bl.id
    WHERE mbp.member_id = ? AND mbp.is_current = 1
  `).get(memberId);

  if (!current) {
    const whiteBelt = db.prepare('SELECT id FROM belt_levels WHERE rank_order = 1').get();
    if (!whiteBelt) {
      return null;
    }
    return assignBelt({ memberId, beltLevelId: whiteBelt.id, stripes: 0, awardedDate: new Date().toISOString().split('T')[0] });
  }

  return current;
}

function assignBelt({ memberId, beltLevelId, stripes = 0, awardedDate = null, gradedBy = null, gradingSessionId = null } = {}) {
  const db = getDatabase();

  if (!awardedDate) {
    awardedDate = new Date().toISOString().split('T')[0];
  }

  // Get belt info
  const belt = getBeltLevel(beltLevelId);
  if (!belt) throw new Error('Belt level not found');

  // Calculate next grading eligible date
  const eligibleDate = new Date(awardedDate);
  eligibleDate.setMonth(eligibleDate.getMonth() + belt.min_time_months);
  const nextGradingDate = eligibleDate.toISOString().split('T')[0];

  // Get current belt if exists
  const currentProgress = db.prepare(`
    SELECT * FROM member_belt_progress
    WHERE member_id = ? AND is_current = 1
  `).get(memberId);

  // Mark old belt as not current
  if (currentProgress) {
    db.prepare(`
      UPDATE member_belt_progress
      SET is_current = 0
      WHERE id = ?
    `).run(currentProgress.id);
  }

  // Create new belt progress record
  const result = db.prepare(`
    INSERT INTO member_belt_progress (
      member_id, current_belt_id, current_stripes, belt_awarded_date,
      next_grading_eligible_date, classes_attended_since_belt
    ) VALUES (?, ?, ?, ?, ?, 0)
  `).run(memberId, beltLevelId, stripes, awardedDate, nextGradingDate);

  // Log grading history
  db.prepare(`
    INSERT INTO grading_history (
      member_id, from_belt_id, to_belt_id, stripes_awarded,
      grading_session_id, graded_by, grading_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    memberId,
    currentProgress ? currentProgress.current_belt_id : null,
    beltLevelId,
    stripes,
    gradingSessionId,
    gradedBy,
    awardedDate
  );

  return getMemberBeltProgress(memberId);
}

function awardStripe(memberId, staffId) {
  const db = getDatabase();

  const progress = getMemberBeltProgress(memberId);
  if (!progress) throw new Error('Member has no belt progress');

  const belt = getBeltLevel(progress.current_belt_id);
  if (belt.stripe_count !== null && progress.current_stripes >= belt.stripe_count) {
    throw new Error('Maximum stripes reached for this belt');
  }

  const newStripes = progress.current_stripes + 1;

  db.prepare(`
    UPDATE member_belt_progress
    SET current_stripes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(newStripes, progress.id);

  // Log in grading history
  db.prepare(`
    INSERT INTO grading_history (
      member_id, from_belt_id, to_belt_id, stripes_awarded,
      graded_by, grading_date, notes
    ) VALUES (?, ?, ?, 1, ?, date('now'), 'Stripe awarded')
  `).run(memberId, progress.current_belt_id, progress.current_belt_id, staffId);

  return getMemberBeltProgress(memberId);
}

// Check grading eligibility
function checkGradingEligibility(memberId) {
  const db = getDatabase();

  const progress = getMemberBeltProgress(memberId);
  if (!progress) return { eligible: false, reasons: ['No belt progress found'] };

  const belt = getBeltLevel(progress.current_belt_id);
  const reasons = [];

  // Check if at max belt level
  const maxRank = db.prepare('SELECT MAX(rank_order) as max_order FROM belt_levels').get().max_order;
  if (belt.rank_order === maxRank) {
    return { eligible: false, reasons: ['Already at maximum belt level'] };
  }

  // Check time requirement
  const today = new Date();
  const eligibleDate = new Date(progress.next_grading_eligible_date);
  const timeEligible = today >= eligibleDate;

  if (!timeEligible) {
    const daysRemaining = Math.ceil((eligibleDate - today) / (1000 * 60 * 60 * 24));
    reasons.push(`Time requirement not met (${daysRemaining} days remaining)`);
  }

  // Check attendance requirement
  const attendanceEligible = progress.classes_attended_since_belt >= belt.min_classes_attended;

  if (!attendanceEligible) {
    const classesRemaining = belt.min_classes_attended - progress.classes_attended_since_belt;
    reasons.push(`Attendance requirement not met (${classesRemaining} classes remaining)`);
  }

  // Check technique proficiency
  const nextBelt = db.prepare('SELECT * FROM belt_levels WHERE rank_order = ?').get(belt.rank_order + 1);
  if (!nextBelt) {
    return { eligible: false, reasons: ['Already at maximum belt level'] };
  }
  const requirements = getRequirementsForBelt(nextBelt.id);
  const requiredTechniques = requirements.filter(r => r.required);

  const masteredTechniques = db.prepare(`
    SELECT COUNT(*) as count
    FROM member_techniques mt
    JOIN grading_requirements gr ON mt.requirement_id = gr.id
    WHERE mt.member_id = ?
      AND gr.belt_level_id = ?
      AND gr.required = 1
      AND mt.proficiency_level IN ('proficient', 'mastered')
  `).get(memberId, nextBelt.id).count;

  const techniqueEligible = masteredTechniques >= requiredTechniques.length;

  if (!techniqueEligible) {
    const techniquesRemaining = requiredTechniques.length - masteredTechniques;
    reasons.push(`Technique requirements not met (${techniquesRemaining} techniques remaining)`);
  }

  const eligible = timeEligible && attendanceEligible && techniqueEligible;

  return {
    eligible,
    reasons: eligible ? [] : reasons,
    next_belt: nextBelt,
    current_belt: belt,
    time_eligible: timeEligible,
    attendance_eligible: attendanceEligible,
    technique_eligible: techniqueEligible,
    classes_attended: progress.classes_attended_since_belt,
    classes_required: belt.min_classes_attended,
    techniques_mastered: masteredTechniques,
    techniques_required: requiredTechniques.length
  };
}

// Member techniques
function updateMemberTechnique(memberId, requirementId, proficiencyLevel, assessedBy, notes = null) {
  const db = getDatabase();

  const existing = db.prepare(`
    SELECT * FROM member_techniques
    WHERE member_id = ? AND requirement_id = ?
  `).get(memberId, requirementId);

  if (existing) {
    db.prepare(`
      UPDATE member_techniques
      SET proficiency_level = ?,
          last_practiced_date = date('now'),
          coach_notes = ?,
          assessed_by = ?,
          assessed_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(proficiencyLevel, notes, assessedBy, existing.id);

    return db.prepare('SELECT * FROM member_techniques WHERE id = ?').get(existing.id);
  } else {
    const result = db.prepare(`
      INSERT INTO member_techniques (
        member_id, requirement_id, proficiency_level,
        last_practiced_date, coach_notes, assessed_by, assessed_at
      ) VALUES (?, ?, ?, date('now'), ?, ?, datetime('now'))
    `).run(memberId, requirementId, proficiencyLevel, notes, assessedBy);

    return db.prepare('SELECT * FROM member_techniques WHERE id = ?').get(result.lastInsertRowid);
  }
}

function getMemberTechniques(memberId, beltLevelId = null) {
  const db = getDatabase();

  let query = `
    SELECT mt.*, gr.technique_name, gr.category, gr.description, gr.required,
           bl.name as belt_name, s.name as assessed_by_name
    FROM member_techniques mt
    JOIN grading_requirements gr ON mt.requirement_id = gr.id
    JOIN belt_levels bl ON gr.belt_level_id = bl.id
    LEFT JOIN staff s ON mt.assessed_by = s.id
    WHERE mt.member_id = ?
  `;

  const params = [memberId];

  if (beltLevelId) {
    query += ' AND gr.belt_level_id = ?';
    params.push(beltLevelId);
  }

  query += ' ORDER BY bl.rank_order, gr.category, gr.display_order';

  return db.prepare(query).all(...params);
}

// Grading sessions
function createGradingSession(data) {
  const db = getDatabase();

  const result = db.prepare(`
    INSERT INTO grading_sessions (
      session_date, session_time, location, grading_coach_id, notes
    ) VALUES (?, ?, ?, ?, ?)
  `).run(
    data.session_date,
    data.session_time || null,
    data.location || null,
    data.grading_coach_id,
    data.notes || null
  );

  return db.prepare('SELECT * FROM grading_sessions WHERE id = ?').get(result.lastInsertRowid);
}

function addGradingParticipant(sessionId, memberId, testingForBeltId) {
  const db = getDatabase();

  const progress = getMemberBeltProgress(memberId);
  if (!progress) throw new Error('Member has no belt progress');

  const result = db.prepare(`
    INSERT INTO grading_participants (
      grading_session_id, member_id, current_belt_id, testing_for_belt_id
    ) VALUES (?, ?, ?, ?)
  `).run(sessionId, memberId, progress.current_belt_id, testingForBeltId);

  return db.prepare('SELECT * FROM grading_participants WHERE id = ?').get(result.lastInsertRowid);
}

function recordGradingResult(participantId, result, score, feedback, awardedStripes = 0) {
  const db = getDatabase();

  db.prepare(`
    UPDATE grading_participants
    SET result = ?, score = ?, feedback = ?, awarded_stripes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(result, score, feedback, awardedStripes, participantId);

  // If passed, assign new belt
  if (result === 'passed') {
    const participant = db.prepare('SELECT * FROM grading_participants WHERE id = ?').get(participantId);
    const session = db.prepare('SELECT * FROM grading_sessions WHERE id = ?').get(participant.grading_session_id);

    assignBelt({
      memberId: participant.member_id,
      beltLevelId: participant.testing_for_belt_id,
      stripes: awardedStripes,
      awardedDate: session.session_date,
      gradedBy: session.grading_coach_id,
      gradingSessionId: session.id
    });
  }

  return db.prepare('SELECT * FROM grading_participants WHERE id = ?').get(participantId);
}

function getSessionParticipants(sessionId) {
  const db = getDatabase();
  return db.prepare(`
    SELECT gp.*, m.first_name, m.last_name,
           bl.name AS current_belt, tbl.name AS testing_for_belt_name
    FROM grading_participants gp
    JOIN members m ON gp.member_id = m.id
    LEFT JOIN belt_levels bl ON gp.current_belt_id = bl.id
    LEFT JOIN belt_levels tbl ON gp.testing_for_belt_id = tbl.id
    WHERE gp.grading_session_id = ?
    ORDER BY m.last_name, m.first_name
  `).all(sessionId);
}

function getGradingSessions(filters = {}) {
  const db = getDatabase();

  let query = `
    SELECT gs.*, s.name as coach_name,
           COUNT(gp.id) as participant_count
    FROM grading_sessions gs
    JOIN staff s ON gs.grading_coach_id = s.id
    LEFT JOIN grading_participants gp ON gs.id = gp.grading_session_id
  `;

  const conditions = [];
  const params = [];

  if (filters.status) {
    conditions.push('gs.status = ?');
    params.push(filters.status);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' GROUP BY gs.id ORDER BY gs.session_date DESC';

  return db.prepare(query).all(...params);
}

function updateGradingSession(id, data) {
  const db = getDatabase();

  const existing = db.prepare('SELECT * FROM grading_sessions WHERE id = ?').get(id);
  if (!existing) return null;

  const updates = [];
  const values = [];
  const fields = ['session_date', 'session_time', 'location', 'grading_coach_id', 'status', 'notes'];

  fields.forEach(f => {
    if (data[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(data[f]);
    }
  });

  if (updates.length === 0) return existing;

  values.push(id);
  db.prepare(`UPDATE grading_sessions SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return db.prepare('SELECT * FROM grading_sessions WHERE id = ?').get(id);
}

function deleteGradingSession(id) {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM grading_sessions WHERE id = ?').run(id);
  return result.changes > 0;
}

// Grading history
function getMemberGradingHistory(memberId) {
  const db = getDatabase();

  return db.prepare(`
    SELECT gh.*,
           fb.name as from_belt_name, fb.color_code as from_color,
           tb.name as to_belt_name, tb.color_code as to_color,
           s.name as graded_by_name
    FROM grading_history gh
    LEFT JOIN belt_levels fb ON gh.from_belt_id = fb.id
    JOIN belt_levels tb ON gh.to_belt_id = tb.id
    LEFT JOIN staff s ON gh.graded_by = s.id
    WHERE gh.member_id = ?
    ORDER BY gh.grading_date DESC
  `).all(memberId);
}

// Belt registry — all members with current belt per discipline
function getBeltRegistry() {
  const db = getDatabase();
  return db.prepare(`
    SELECT
      m.id AS member_id, m.first_name, m.last_name,
      mbp.discipline,
      bl.name AS current_belt, bl.id AS current_belt_id,
      mbp.belt_awarded_date AS last_graded,
      COALESCE(mbp.classes_attended_since_belt, 0) AS classes_since,
      next_bl.min_classes_attended AS min_required,
      next_bl.id AS next_belt_id,
      next_bl.name AS next_belt_name,
      CASE WHEN COALESCE(mbp.classes_attended_since_belt, 0) >= next_bl.min_classes_attended THEN 1 ELSE 0 END AS eligible
    FROM member_belt_progress mbp
    JOIN members m ON mbp.member_id = m.id
    JOIN belt_levels bl ON mbp.current_belt_id = bl.id
    LEFT JOIN belt_levels next_bl ON next_bl.rank_order = (
      SELECT MIN(b2.rank_order) FROM belt_levels b2
      WHERE b2.rank_order > bl.rank_order AND b2.discipline = mbp.discipline
    )
    WHERE mbp.is_current = 1 AND m.status = 'active'
    ORDER BY m.last_name, m.first_name, mbp.discipline
  `).all();
}

// CRUD for belt levels
function createBeltLevel({ name, rank_order, discipline, stripe_count, color_code, min_time_months, min_classes_attended, description }) {
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO belt_levels (name, rank_order, discipline, stripe_count, color_code, min_time_months, min_classes_attended, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, rank_order, discipline, stripe_count || 0, color_code || null, min_time_months || 0, min_classes_attended || 0, description || null);
  return db.prepare('SELECT * FROM belt_levels WHERE id = ?').get(result.lastInsertRowid);
}

function updateBeltLevel(id, data) {
  const db = getDatabase();
  const existing = db.prepare('SELECT * FROM belt_levels WHERE id = ?').get(id);
  if (!existing) return null;
  const fields = ['name', 'rank_order', 'discipline', 'stripe_count', 'color_code', 'min_time_months', 'min_classes_attended', 'description'];
  const updates = [];
  const values = [];
  fields.forEach(f => {
    if (data[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(data[f]);
    }
  });
  if (updates.length === 0) return existing;
  values.push(id);
  db.prepare(`UPDATE belt_levels SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  return db.prepare('SELECT * FROM belt_levels WHERE id = ?').get(id);
}

function deleteBeltLevel(id) {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM belt_levels WHERE id = ?').run(id);
  return result.changes > 0;
}

function getFighterLeaderboard() {
  const db = getDatabase();

  const fighters = db.prepare(`
    SELECT
      m.id, m.first_name, m.last_name, m.location,
      COALESCE(fc.weight_class, '—') AS weight_class,
      COALESCE(fc_wins.wins, 0) AS wins,
      COALESCE(fc_losses.losses, 0) AS losses,
      COALESCE(fc_draws.draws, 0) AS draws,
      CASE WHEN (COALESCE(fc_wins.wins, 0) + COALESCE(fc_losses.losses, 0) + COALESCE(fc_draws.draws, 0)) > 0
        THEN ROUND(CAST(COALESCE(fc_wins.wins, 0) AS REAL) /
          (COALESCE(fc_wins.wins, 0) + COALESCE(fc_losses.losses, 0) + COALESCE(fc_draws.draws, 0)) * 100, 1)
        ELSE 0
      END AS win_rate,
      fc_last.event_date AS last_fight_date
    FROM members m
    LEFT JOIN fighter_competitions fc ON fc.member_id = m.id AND fc.id = (
      SELECT fcs.id FROM fighter_competitions fcs WHERE fcs.member_id = m.id ORDER BY fcs.event_date DESC LIMIT 1
    )
    LEFT JOIN (
      SELECT member_id, COUNT(*) AS wins FROM fighter_competitions WHERE result = 'win' GROUP BY member_id
    ) fc_wins ON fc_wins.member_id = m.id
    LEFT JOIN (
      SELECT member_id, COUNT(*) AS losses FROM fighter_competitions WHERE result = 'loss' GROUP BY member_id
    ) fc_losses ON fc_losses.member_id = m.id
    LEFT JOIN (
      SELECT member_id, COUNT(*) AS draws FROM fighter_competitions WHERE result IN ('draw','nc') GROUP BY member_id
    ) fc_draws ON fc_draws.member_id = m.id
    LEFT JOIN (
      SELECT member_id, MAX(event_date) AS event_date FROM fighter_competitions GROUP BY member_id
    ) fc_last ON fc_last.member_id = m.id
    WHERE m.is_fighter = 1 AND m.status = 'active'
    ORDER BY win_rate DESC, wins DESC
  `).all();

  return fighters;
}

module.exports = {
  getAllBeltLevels,
  getBeltLevel,
  getBeltLevelByName,
  getRequirementsForBelt,
  getMemberBeltProgress,
  assignBelt,
  awardStripe,
  checkGradingEligibility,
  updateMemberTechnique,
  getMemberTechniques,
  createGradingSession,
  updateGradingSession,
  deleteGradingSession,
  addGradingParticipant,
  recordGradingResult,
  getGradingSessions,
  getSessionParticipants,
  getMemberGradingHistory,
  getBeltRegistry,
  getFighterLeaderboard,
  createBeltLevel,
  updateBeltLevel,
  deleteBeltLevel
};
