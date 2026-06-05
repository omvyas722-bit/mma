const aiState = require('../aiState');
const openRouter = require('../openRouterClient');

class TeamAgent {
  constructor(name, department, systemPrompt) {
    this.name = name;
    this.department = department;
    this.systemPrompt = systemPrompt;
  }

  buildDepartmentContext() {
    return '';
  }

  async run(db, openRouterClient, broadcast, _config) {
    const client = openRouterClient;
    try {
      const context = this.buildDepartmentContext(db);
      const messages = [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: `Here is the current state of my department data:\n\n${context}\n\nAnalyze this data and decide what actions to take. Return a JSON array of actions.` }
      ];

      const controller = new AbortController();
      const llmTimeout = setTimeout(() => controller.abort(), 30000);
      let response;
      try {
        response = await client.completeChat(messages, {
          model: process.env.AI_MODEL || 'meta-llama/llama-3.1-8b-instruct',
          maxTokens: 512,
          signal: controller.signal
        });
      } finally {
        clearTimeout(llmTimeout);
      }

      const rawContent = response?.content || '[]';
      let actions;
      try {
        const cleaned = rawContent.replace(/```(?:json)?\s*[\s\S]*?```/gi, '').replace(/^[^{[]+|[}\]]+$/g, '').trim();
        const parsed = JSON.parse(cleaned);
        actions = Array.isArray(parsed) ? parsed : (parsed.actions || []);
      } catch (logErr) { console.error('[TEAM] Log activity error:', logErr.message); }
      }

      let executedCount = 0;
      let failedCount = 0;
      const results = [];

      for (const action of actions.slice(0, 8)) {
        try {
          const result = await this.executeAction(db, action);
          results.push({ action: action.type, status: 'ok', result });
          executedCount++;
        } catch (err) {
          results.push({ action: action.type, status: 'error', error: err.message });
          failedCount++;
        }
      }

      const summary = `${this.name}: ${executedCount} actions executed, ${failedCount} failed`;
      console.log(`[${this.name}] ${summary}`);

      await aiState.logActivity({
        agentName: this.name,
        actionType: 'department_tick',
        summary,
        details: { context_summary: context.length > 200 ? context.substring(0, 200) + '...' : context, actions_decided: actions.length, actions_taken: actions.slice(0, 8), results },
        status: failedCount > executedCount ? 'failed' : 'completed'
      });

      if (broadcast) {
        broadcast({ type: 'agent_update', agent: this.name, summary, timestamp: new Date().toISOString() });
      }

      return { executedCount, failedCount, results };
    } catch (err) {
      console.error(`[${this.name}] Error:`, err.stack || err.message);
      await aiState.logActivity({
        agentName: this.name,
        actionType: 'department_tick',
        summary: `Failed: ${err.message}`,
        details: { error: err.message },
        status: 'failed'
      });
      return { executedCount: 0, failedCount: 1, error: err.message };
    }
  }

  async executeAction(db, action) {
    const { type, ...params } = action;
    const validActions = ['create_task', 'draft_message', 'update_lead_stage', 'update_lead_notes', 'assign_lead', 'schedule_follow_up', 'flag_stock_alert', 'log_report', 'update_member_notes', 'flag_attendance_risk', 'suggest_retention', 'flag_failed_payment', 'celebrate_milestone', 'create_follow_up_task'];
    if (!type || !validActions.includes(type)) {
      console.log(`[${this.name}] Invalid action type: ${type}`);
      return { error: `Unknown action type: ${type}` };
    }
    switch (type) {
      case 'create_task': return this.actionCreateTask(db, params);
      case 'draft_message': return this.actionDraftMessage(db, params);
      case 'update_lead_stage': return this.actionUpdateLeadStage(db, params);
      case 'update_lead_notes': return this.actionUpdateLeadNotes(db, params);
      case 'assign_lead': return this.actionAssignLead(db, params);
      case 'schedule_follow_up': return this.actionScheduleFollowUp(db, params);
      case 'flag_stock_alert': return this.actionFlagStockAlert(db, params);
      case 'log_report': return this.actionLogReport(db, params);
      case 'update_member_notes': return this.actionUpdateMemberNotes(db, params);
      case 'flag_attendance_risk': return this.actionFlagAttendanceRisk(db, params);
      case 'suggest_retention': return this.actionSuggestRetention(db, params);
      case 'flag_failed_payment': return this.actionFlagFailedPayment(db, params);
      case 'celebrate_milestone': return this.actionCelebrateMilestone(db, params);
      case 'create_follow_up_task': return this.actionCreateTask(db, { ...params, task_type: params.task_type || 'follow_up' });
      default:
        console.log(`[${this.name}] Unknown action type: ${type}`, params);
        await aiState.logActivity({
          agentName: this.name,
          actionType: `unknown_action:${type}`,
          summary: `Unknown action: ${type} — ${JSON.stringify(params)}`,
          status: 'completed'
        });
    }
  }

  _resolveLead(db, lead_id) {
    if (lead_id && db.prepare('SELECT id FROM leads WHERE id = ?').get(lead_id)) return lead_id;
    return null;
  }

  _resolveMember(db, member_id) {
    if (member_id && db.prepare('SELECT id FROM members WHERE id = ?').get(member_id)) return member_id;
    return null;
  }

  _resolveProduct(db, product_id) {
    if (product_id && db.prepare('SELECT id FROM products WHERE id = ?').get(product_id)) return product_id;
    return null;
  }

  async actionCreateTask(db, { lead_id, member_id, assigned_to, task_type, priority, title, description, due_date }) {
    lead_id = this._resolveLead(db, lead_id);
    member_id = this._resolveMember(db, member_id);
    const validTaskTypes = ['call_hot_lead', 'follow_up_trial', 'check_no_show', 'warm_lead_checkin', 'trial_reminder', 'conversion_push', 'reengagement', 'retention_check_in', 'failed_payment', 'celebration'];
    const safeTaskType = validTaskTypes.includes(task_type) ? task_type : 'follow_up_trial';
    const result = db.prepare(`INSERT INTO staff_tasks (lead_id, member_id, assigned_to, task_type, priority, title, description, due_date, status, created_at) VALUES (?,?,?,?,?,?,?,?,'pending',datetime('now'))`).run(
      lead_id || null, member_id || null, assigned_to || null, safeTaskType, priority || 'medium', title || 'Untitled task', description || null, due_date || null
    );
    console.log(`[${this.name}] Created task: ${title}`);
    await aiState.logActivity({
      agentName: this.name, actionType: 'created_task',
      summary: `Task created: ${title}`,
      details: { lead_id, member_id, assigned_to, task_type, priority, due_date }
    });
    return { id: result.lastInsertRowid };
  }

  async actionDraftMessage(db, { lead_id, member_id, channel, recipient, subject, body, scheduled_for, ...extra }) {
    lead_id = this._resolveLead(db, lead_id);
    member_id = this._resolveMember(db, member_id);
    const allowedChannels = ['sms', 'email'];
    const safeChannel = allowedChannels.includes((channel || 'sms').toLowerCase()) ? channel.toLowerCase() : 'sms';
    const safeRecipient = recipient || (extra.phone || extra.email || null);
    const safeBody = body || subject || '';
    if (!safeBody && !subject) {
      return { error: 'Message body is required' };
    }
    const result = db.prepare(`INSERT INTO scheduled_messages (lead_id, member_id, message_type, status, recipient_phone, recipient_email, subject, body, scheduled_for, created_at) VALUES (?,?,?, 'pending',?,?,?,?,COALESCE(?, datetime('now', '+1 hour')),datetime('now'))`).run(
      lead_id || null, member_id || null, safeChannel, safeChannel === 'email' ? null : safeRecipient, safeChannel === 'email' ? safeRecipient : null, subject || null, safeBody, scheduled_for || null
    );
    console.log(`[${this.name}] Drafted ${safeChannel} message for ${safeRecipient}`);
    await aiState.logActivity({
      agentName: this.name, actionType: `drafted_${safeChannel}`,
      summary: `${safeChannel.toUpperCase()} drafted for ${safeRecipient}: ${(safeBody || '').substring(0, 80)}`,
      details: { lead_id, member_id, channel, recipient, subject, body, scheduled_for: scheduled_for || null }
    });
    return { id: result.lastInsertRowid };
  }

  async actionUpdateLeadStage(db, { lead_id, stage, notes }) {
    lead_id = this._resolveLead(db, lead_id);
    stage = stage || 'contacted';
    db.prepare(`UPDATE leads SET stage = ?, updated_at = datetime('now'), notes = CASE WHEN ? IS NOT NULL THEN COALESCE(notes || '\n---\n', '') || ? ELSE notes END WHERE id = ?`).run(stage, notes, notes, lead_id);
    console.log(`[${this.name}] Updated lead #${lead_id} stage → ${stage}`);
    await aiState.logActivity({
      agentName: this.name, actionType: 'updated_lead_stage',
      summary: `Lead #${lead_id} moved to ${stage}`,
      details: { lead_id, stage, notes }
    });
    return { lead_id, stage };
  }

  async actionUpdateLeadNotes(db, { lead_id, notes }) {
    lead_id = this._resolveLead(db, lead_id);
    db.prepare(`UPDATE leads SET notes = COALESCE(notes || '\n---\n', '') || ?, updated_at = datetime('now') WHERE id = ?`).run(notes, lead_id);
    return { lead_id };
  }

  async actionAssignLead(db, { lead_id, assigned_to }) {
    lead_id = this._resolveLead(db, lead_id);
    assigned_to = assigned_to || null;
    db.prepare(`UPDATE leads SET assigned_to = ?, updated_at = datetime('now') WHERE id = ?`).run(assigned_to, lead_id);
    await aiState.logActivity({
      agentName: this.name, actionType: 'assigned_lead',
      summary: `Lead #${lead_id} assigned to staff #${assigned_to}`,
      details: { lead_id, assigned_to }
    });
    return { lead_id, assigned_to };
  }

  async actionScheduleFollowUp(db, { lead_id, follow_up_date, notes }) {
    lead_id = this._resolveLead(db, lead_id);
    db.prepare(`UPDATE leads SET next_follow_up_date = ?, follow_up_count = follow_up_count + 1, updated_at = datetime('now'), notes = COALESCE(notes || '\n---\n', '') || ? WHERE id = ?`).run(follow_up_date, notes, lead_id);
    return { lead_id, follow_up_date };
  }

  async actionFlagStockAlert(db, { product_id, alert_type, current_quantity, min_quantity }) {
    product_id = this._resolveProduct(db, product_id);
    if (!product_id) return { error: 'No products exist to flag alert' };
    db.prepare(`INSERT INTO stock_alerts (product_id, alert_type, current_quantity, min_quantity) VALUES (?,?,?,?)`).run(product_id, alert_type || 'low_stock', current_quantity || 0, min_quantity ?? 5);
    return { product_id };
  }

  async actionLogReport(db, { type, summary, details, ...extra }) {
    await aiState.logActivity({
      agentName: this.name, actionType: type || 'report',
      summary: summary || 'Report generated',
      details: { ...extra, details }
    });
    return { logged: true };
  }

  async actionUpdateMemberNotes(db, { member_id, notes }) {
    member_id = this._resolveMember(db, member_id);
    db.prepare(`UPDATE members SET notes = COALESCE(notes || '\n---\n', '') || ?, updated_at = datetime('now') WHERE id = ?`).run(notes, member_id);
    return { member_id };
  }

  async actionFlagAttendanceRisk(db, { member_id, days_since_last_visit, ...extra }) {
    member_id = this._resolveMember(db, member_id);
    const member = member_id ? db.prepare('SELECT first_name, last_name FROM members WHERE id = ?').get(member_id) : null;
    const memberName = member ? `${member.first_name} ${member.last_name}` : `Member #${member_id}`;
    const result = db.prepare(`INSERT INTO staff_tasks (member_id, task_type, priority, title, description, due_date, status, created_at) VALUES (?,?,?,?,?,datetime('now', '+1 day'),'pending',datetime('now'))`).run(
      member_id || null, 'retention_check_in', 'high',
      `Attendance risk: ${memberName}`,
      `${memberName} hasn't attended in ${days_since_last_visit || 'many'} days. Reach out to re-engage.`
    );
    console.log(`[${this.name}] Flagged attendance risk for ${memberName}`);
    return { id: result.lastInsertRowid, member_id, type: 'attendance_risk' };
  }

  async actionSuggestRetention(db, { member_id, reason, offer_details, ...extra }) {
    member_id = this._resolveMember(db, member_id);
    const member = member_id ? db.prepare('SELECT first_name, last_name FROM members WHERE id = ?').get(member_id) : null;
    const memberName = member ? `${member.first_name} ${member.last_name}` : `Member #${member_id}`;
    const result = db.prepare(`INSERT INTO staff_tasks (member_id, task_type, priority, title, description, due_date, status, created_at) VALUES (?,?,?,?,?,datetime('now', '+1 day'),'pending',datetime('now'))`).run(
      member_id || null, 'retention_check_in', 'high',
      `Retention opportunity: ${memberName}`,
      `Offer: ${offer_details || 'Retention offer'}. Reason: ${reason || 'At risk member'}.`
    );
    console.log(`[${this.name}] Suggested retention for ${memberName}`);
    return { id: result.lastInsertRowid, member_id, type: 'retention_suggestion' };
  }

  async actionFlagFailedPayment(db, { member_id, amount, failure_reason, transaction_id, ...extra }) {
    member_id = this._resolveMember(db, member_id);
    const member = member_id ? db.prepare('SELECT first_name, last_name FROM members WHERE id = ?').get(member_id) : null;
    const memberName = member ? `${member.first_name} ${member.last_name}` : `Member #${member_id}`;
    const result = db.prepare(`INSERT INTO staff_tasks (member_id, task_type, priority, title, description, due_date, status, created_at) VALUES (?,?,?,?,?,datetime('now', '+1 day'),'pending',datetime('now'))`).run(
      member_id || null, 'failed_payment', 'high',
      `Failed payment: ${memberName}`,
      `Payment of $${amount || '?'} failed. ${failure_reason ? `Reason: ${failure_reason}` : ''}${transaction_id ? ` Transaction #${transaction_id}` : ''}`
    );
    console.log(`[${this.name}] Flagged failed payment for ${memberName}`);
    return { id: result.lastInsertRowid, member_id, type: 'payment_flag' };
  }

  async actionCelebrateMilestone(db, { member_id, milestone_type, description, ...extra }) {
    member_id = this._resolveMember(db, member_id);
    const member = member_id ? db.prepare('SELECT first_name, last_name FROM members WHERE id = ?').get(member_id) : null;
    const memberName = member ? `${member.first_name} ${member.last_name}` : `Member #${member_id}`;
    const result = db.prepare(`INSERT INTO staff_tasks (member_id, task_type, priority, title, description, due_date, status, created_at) VALUES (?,?,?,?,?,datetime('now'),'pending',datetime('now'))`).run(
      member_id || null, 'check_in', 'low',
      `Celebrate: ${memberName} - ${milestone_type || 'Milestone'}`,
      description || `${memberName} achieved a milestone: ${milestone_type || 'Unknown'}`
    );
    console.log(`[${this.name}] Celebrated milestone for ${memberName}`);
    return { id: result.lastInsertRowid, member_id, type: 'milestone' };
  }
}

module.exports = TeamAgent;

function extractJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch (e) { /* empty */ }

  let match = text.match(/\[[\s\S]*?\]\s*(?=\n|$|,)/);
  if (!match) match = text.match(/\[[\s\S]*\]/);
  if (match) {
    try { return JSON.parse(match[0]); } catch (e) { /* empty */ }
  }

  match = text.match(/\{[\s\S]*?\}\s*(?=\n|$|,)/);
  if (!match) match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch (e) { /* empty */ }
  }

  return null;
}
