const TeamAgent = require('./teamAgentBase');
const { getDatabase } = require('../../../db/connection');

class SalesTeamAgent extends TeamAgent {
  constructor() {
    super('sales_team', 'Sales', `You are the Sales & Marketing Department Head at ROAR MMA, a combat sports gym. Your job is to manage the entire sales pipeline autonomously.

You have access to:
- Leads with their stages, interest levels, sources, notes, trial info
- Staff available to assign tasks to
- Scheduled messages queue
- Referral data

Your responsibilities:
1. FOLLOW UP with new leads immediately — draft personalized messages that reference their specific situation
2. NURTURE contacted leads — move them through the pipeline with timely follow-ups
3. PREPARE trial bookings — send reminders, confirm details, address specific concerns
4. RE-ENGAGE trial completers — convert them to members with personalized offers
5. SCORE leads automatically based on behavior patterns
6. ASSIGN leads to the right sales staff
7. LOG all activities for tracking

Rules:
- Be personalized — reference the lead's specific notes, source, interests
- Be proactive — identify leads that need attention before they go cold
- Be strategic — prioritize high-interest leads, nurture medium ones, don't waste time on cold ones
- Respond with ONLY a valid JSON array of actions. No markdown, no explanation, no code blocks.
- Each action has a "type" and parameters. Available action types: create_task, draft_message, update_lead_stage, update_lead_notes, assign_lead, schedule_follow_up, log_report
- Execute MAX 8 actions per tick. Pick the most impactful ones.`);
  }

  buildDepartmentContext(db) {
    const leads = db.prepare(`SELECT l.*, s.name as assigned_staff_name
      FROM leads l LEFT JOIN staff s ON l.assigned_to = s.id
      ORDER BY CASE l.stage
        WHEN 'new' THEN 1 WHEN 'contacted' THEN 2 WHEN 'trial_booked' THEN 3
        WHEN 'trial_completed' THEN 4 WHEN 'converted' THEN 5 WHEN 'lost' THEN 6
      END, l.created_at DESC LIMIT 20`).all();

    const staff = db.prepare(`SELECT id, name, role FROM staff WHERE active = 1 AND role IN ('sales', 'coach', 'front_desk')`).all();

    const pendingMsgs = db.prepare(`SELECT sm.*, l.first_name || ' ' || l.last_name as lead_name
      FROM scheduled_messages sm LEFT JOIN leads l ON sm.lead_id = l.id
      WHERE sm.status = 'pending' AND sm.scheduled_for <= datetime('now', '+1 day')`).all();

    const conversions = db.prepare(`SELECT COUNT(*) as count, ROUND(AVG(julianday(coalesce(trial_end_date, datetime('now'))) - julianday(joined_date)), 0) as avg_days
      FROM members WHERE status = 'active' AND joined_date >= date('now', '-90 days')`).get();

    const memberReferrers = db.prepare(`SELECT m.first_name || ' ' || m.last_name as name, m.id FROM members m
      WHERE m.id IN (SELECT DISTINCT referrer_member_id FROM leads WHERE referrer_member_id IS NOT NULL AND stage NOT IN ('lost'))`).all();

    return [
      `=== CURRENT LEADS (${leads.length}) ===`,
      leads.map(l =>
        `[#${l.id}] ${l.first_name} ${l.last_name} | Stage: ${l.stage} | Interest: ${l.interest_level || 'N/A'} | Source: ${l.source || 'N/A'} | Created: ${l.created_at || 'N/A'} | Assignee: ${l.assigned_staff_name || 'Unassigned'} | Follow-up: ${l.follow_up_status || 'N/A'} | Last contact: ${l.last_contact_date || 'Never'}
 Notes: ${l.notes || 'None'}
 ${l.trial_date ? `Trial: ${l.trial_date} (${l.trial_class_type || 'unknown'})` : ''}`
      ).join('\n'),
      `\n=== SALES STAFF (${staff.length}) ===`,
      staff.map(s => `[#${s.id}] ${s.name} (${s.role})`).join('\n'),
      `\n=== PENDING SCHEDULED MESSAGES (${pendingMsgs.length}) ===`,
      pendingMsgs.map(m => `To: ${m.lead_name || m.recipient_phone || m.recipient_email} | Type: ${m.message_type} | Body: ${(m.body || '').substring(0, 120)}`).join('\n'),
      `\n=== RECENT CONVERSIONS (90 days) ===`,
      `Total: ${conversions.count} | Avg conversion time: ${conversions.avg_days || 0} days`,
      `\n=== MEMBER REFERRERS ===`,
      memberReferrers.map(r => `${r.name} (#${r.id})`).join(', ')
    ].join('\n');
  }
}

const instance = new SalesTeamAgent();
module.exports = { handler: ({ db, aiState, openRouter, broadcast, config }) => instance.run(db, aiState, openRouter, broadcast, config) };
