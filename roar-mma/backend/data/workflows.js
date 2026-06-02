const { getDatabase } = require('../db/connection');

function getAllRules() {
  return getDatabase().prepare(`
    SELECT w.*, s.name as created_by_name
    FROM workflow_rules w LEFT JOIN staff s ON w.created_by = s.id
    ORDER BY w.created_at DESC
  `).all();
}

function getRule(id) {
  return getDatabase().prepare(`
    SELECT w.*, s.name as created_by_name
    FROM workflow_rules w LEFT JOIN staff s ON w.created_by = s.id
    WHERE w.id = ?
  `).get(id);
}

function createRule(data) {
  const db = getDatabase();
  const r = db.prepare(`
    INSERT INTO workflow_rules (name, description, trigger_type, trigger_config, condition_type, conditions, action_type, action_config, enabled, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(data.name, data.description, data.trigger_type, JSON.stringify(data.trigger_config || {}),
    data.condition_type || 'all', JSON.stringify(data.conditions || []),
    data.action_type, JSON.stringify(data.action_config || {}),
    data.enabled ?? 1, data.created_by);
  return getRule(r.lastInsertRowid);
}

function updateRule(id, data) {
  const db = getDatabase();
  const fields = [];
  const vals = [];
  for (const k of ['name','description','trigger_type','condition_type','action_type','enabled']) {
    if (data[k] !== undefined) { fields.push(`${k}=?`); vals.push(data[k]); }
  }
  if (data.trigger_config) { fields.push('trigger_config=?'); vals.push(JSON.stringify(data.trigger_config)); }
  if (data.conditions) { fields.push('conditions=?'); vals.push(JSON.stringify(data.conditions)); }
  if (data.action_config) { fields.push('action_config=?'); vals.push(JSON.stringify(data.action_config)); }
  if (fields.length === 0) throw new Error('No fields to update');
  fields.push("updated_at=datetime('now')");
  vals.push(id);
  db.prepare(`UPDATE workflow_rules SET ${fields.join(',')} WHERE id=?`).run(...vals);
  return getRule(id);
}

function deleteRule(id) {
  const db = getDatabase();
  db.prepare('DELETE FROM workflow_rules WHERE id=?').run(id);
}

function logExecution(data) {
  const db = getDatabase();
  return db.prepare(`
    INSERT INTO workflow_executions (rule_id, trigger_type, trigger_entity_type, trigger_entity_id, conditions_met, action_results, status, error_message)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(data.rule_id, data.trigger_type, data.trigger_entity_type, data.trigger_entity_id,
    data.conditions_met ?? 1, JSON.stringify(data.action_results || []), data.status || 'completed', data.error_message || null);
}

function getExecutions(ruleId, limit = 50) {
  const db = getDatabase();
  const q = ruleId ? 'WHERE rule_id=? ORDER BY executed_at DESC LIMIT ?' : 'ORDER BY executed_at DESC LIMIT ?';
  const p = ruleId ? [ruleId, limit] : [limit];
  return db.prepare(`SELECT * FROM workflow_executions ${q}`).all(...p);
}

function getTriggerTypes() {
  return [
    { value: 'lead_created', label: 'Lead Created' },
    { value: 'lead_stage_changed', label: 'Lead Stage Changed' },
    { value: 'trial_booked', label: 'Trial Booked' },
    { value: 'trial_completed', label: 'Trial Completed' },
    { value: 'member_created', label: 'Member Created' },
    { value: 'member_status_changed', label: 'Member Status Changed' },
    { value: 'attendance_dropped', label: 'Attendance Dropped' },
    { value: 'booking_made', label: 'Booking Made' },
    { value: 'booking_cancelled', label: 'Booking Cancelled' },
    { value: 'payment_succeeded', label: 'Payment Succeeded' },
    { value: 'payment_failed', label: 'Payment Failed' },
    { value: 'subscription_created', label: 'Subscription Created' },
    { value: 'subscription_cancelled', label: 'Subscription Cancelled' },
    { value: 'task_created', label: 'Task Created' },
    { value: 'task_completed', label: 'Task Completed' },
    { value: 'scheduled_time', label: 'Scheduled Time' },
    { value: 'scheduled_interval', label: 'Scheduled Interval' },
  ];
}

function getActionTypes() {
  return [
    { value: 'create_task', label: 'Create Staff Task', config: { title: '', description: '', priority: 'medium', due_hours: 24 } },
    { value: 'send_sms', label: 'Send SMS', config: { to: '', message: '' } },
    { value: 'send_email', label: 'Send Email', config: { to: '', subject: '', body: '' } },
    { value: 'update_lead_stage', label: 'Update Lead Stage', config: { stage: 'contacted' } },
    { value: 'assign_lead', label: 'Assign Lead', config: { staff_id: '' } },
    { value: 'create_follow_up', label: 'Create Follow-up', config: { days: 3 } },
    { value: 'flag_member', label: 'Flag Member', config: { reason: '' } },
    { value: 'add_note', label: 'Add Note', config: { note: '' } },
    { value: 'webhook', label: 'Webhook Call', config: { url: '', method: 'POST', body: '' } },
  ];
}

module.exports = { getAllRules, getRule, createRule, updateRule, deleteRule, logExecution, getExecutions, getTriggerTypes, getActionTypes };