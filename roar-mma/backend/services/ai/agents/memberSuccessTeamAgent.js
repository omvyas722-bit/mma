const TeamAgent = require('./teamAgentBase');
const { getDatabase } = require('../../../db/connection');

class MemberSuccessTeamAgent extends TeamAgent {
  constructor() {
    super('member_success_team', 'Member Success', `You are the Member Success Department Head at ROAR MMA. Your job is to keep members happy, engaged, and retained.

You have access to:
- Members with their status, goals, injuries, attendance patterns
- Bookings and attendance records (no-shows, check-ins)
- Cancellation requests and retention offers
- PT sessions and belt progress
- Paused/cancelled members

Your responsibilities:
1. DETECT at-risk members — low attendance, no-shows, missed payments
2. ENGAGE members personally — reference their goals, belt progress, recent achievements
3. FOLLOW UP on no-shows — check in and rebook
4. MANAGE cancellations — offer retention options, create winback campaigns
5. CELEBRATE milestones — belt stripes, attendance streaks, goal achievements
6. CHECK on paused members — invite them back with personalized messages
7. REFER leads to Sales when members mention friends

Rules:
- Be caring and personal — reference their goals, injuries, progress
- Be proactive — catch issues before members get frustrated
- Be retention-focused — always try to save at-risk members
- Respond with ONLY a valid JSON array of actions. No markdown, no explanation, no code blocks.
- Each action has a "type" and parameters. Available action types: create_task, draft_message, update_member_notes, flag_attendance_risk, suggest_retention, log_report
- Execute MAX 8 actions per tick. Pick the most impactful ones.`);
  }

  buildDepartmentContext(db) {
    const members = db.prepare(`SELECT * FROM members ORDER BY status, joined_date DESC LIMIT 15`).all();

    const attendanceCounts = db.prepare(`
      SELECT m.id, m.first_name || ' ' || m.last_name as name, m.status, m.goals, m.injuries,
        (SELECT COUNT(*) FROM attendance a WHERE a.member_id = m.id AND a.check_in_time >= datetime('now', '-30 days')) as attend_30d,
        (SELECT COUNT(*) FROM bookings b WHERE b.member_id = m.id AND b.status = 'no_show' AND b.booking_date >= date('now', '-30 days')) as noshow_30d
      FROM members m WHERE m.status IN ('active', 'paused', 'trial')`).all();

    const noActivity = db.prepare(`
      SELECT * FROM (
        SELECT m.id, m.first_name || ' ' || m.last_name as name, m.status, m.joined_date,
          (SELECT MAX(a.check_in_time) FROM attendance a WHERE a.member_id = m.id) as last_checkin,
          (SELECT MAX(b.booking_date) FROM bookings b WHERE b.member_id = m.id) as last_booking
        FROM members m
        WHERE m.status IN ('active', 'trial')
      )
      WHERE (last_checkin IS NULL OR last_checkin < datetime('now', '-14 days'))
        AND (last_booking IS NULL OR last_booking < date('now', '-14 days'))
    `).all();

    const cancellations = db.prepare(`SELECT cr.*, m.first_name || ' ' || m.last_name as member_name, m.status
      FROM cancellation_requests cr JOIN members m ON cr.member_id = m.id WHERE cr.status = 'pending'`).all();

    const pauses = db.prepare(`SELECT * FROM members WHERE status = 'paused'`).all();

    const beltProgress = db.prepare(`
      SELECT mbp.*, m.first_name || ' ' || m.last_name as name, bl.name as belt_name
      FROM member_belt_progress mbp
      JOIN members m ON mbp.member_id = m.id
      JOIN belt_levels bl ON mbp.current_belt_id = bl.id
      WHERE mbp.next_grading_eligible_date <= date('now', '+30 days')
        AND m.status = 'active'`).all();

    const upcomingPt = db.prepare(`
      SELECT ps.*, m.first_name || ' ' || m.last_name as member_name, s.name as coach_name
      FROM pt_sessions ps JOIN members m ON ps.member_id = m.id JOIN staff s ON ps.coach_id = s.id
      WHERE ps.status = 'scheduled' AND ps.scheduled_date <= date('now', '+3 days')`).all();

    return [
      `=== ALL MEMBERS (${members.length}) ===`,
      members.map(m => `[#${m.id}] ${m.first_name} ${m.last_name} | Status: ${m.status} | Plan: ${m.plan || 'N/A'} | Joined: ${m.joined_date} | Goals: ${m.goals || 'None'} | Injuries: ${m.injuries || 'None'} | Location: ${m.location || 'N/A'}`).join('\n'),
      `\n=== ATTENDANCE (30 days) ===`,
      attendanceCounts.map(a => `${a.name} | Status: ${a.status} | Attended: ${a.attend_30d || 0}x | No-shows: ${a.noshow_30d || 0} | Goals: ${a.goals || 'N/A'} | Injuries: ${a.injuries || 'None'}`).join('\n'),
      `\n=== NO ACTIVITY >14 DAYS (${noActivity.length}) ===`,
      noActivity.map(n => `${n.name} (#${n.id}) | Status: ${n.status} | Last check-in: ${n.last_checkin || 'Never'} | Last booking: ${n.last_booking || 'Never'}`).join('\n'),
      `\n=== PENDING CANCELLATIONS (${cancellations.length}) ===`,
      cancellations.map(c => `${c.member_name} (#${c.member_id}) | Reason: ${c.cancellation_reason || 'N/A'} | Category: ${c.reason_category || 'N/A'}`).join('\n'),
      `\n=== PAUSED MEMBERS (${pauses.length}) ===`,
      pauses.map(p => `${p.first_name} ${p.last_name} (#${p.id}) | Paused: ${p.pause_start || 'N/A'} → ${p.pause_end || 'N/A'}`).join('\n'),
      `\n=== UPCOMING BELT GRADINGS (within 30 days) ===`,
      beltProgress.map(b => `${b.name} | Belt: ${b.belt_name} | Stripes: ${b.current_stripes} | Eligible: ${b.next_grading_eligible_date} | Classes since belt: ${b.classes_attended_since_belt}`).join('\n'),
      `\n=== UPCOMING PT SESSIONS (${upcomingPt.length}) ===`,
      upcomingPt.map(p => `${p.member_name} with ${p.coach_name} on ${p.scheduled_date} at ${p.scheduled_time}`).join('\n')
    ].join('\n');
  }
}

const instance = new MemberSuccessTeamAgent();
module.exports = { handler: ({ db, openRouter, broadcast, config }) => instance.run(db, openRouter, broadcast, config) };
