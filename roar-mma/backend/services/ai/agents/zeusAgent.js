const { getDatabase } = require('../../../db/connection');

const AGENT_ROUTES = {
  'PUBLISH_SOCIAL_POST': 'social_media',
  'DELIVER_SIGNED_WAIVER': 'messaging',
  'SEND_MESSAGE': 'messaging',
  'SEND_EMAIL': 'messaging',
  'FOLLOW_UP_LEAD': 'leads',
  'CHECK_MEMBER_HEALTH': 'healer',
  'HEALER_INTERVENTION': 'healer',
  'GENERATE_REPORT': 'analytics',
  'SCHEDULE_CLASS': 'operations_team',
  'BILLING_TASK': 'billing',
  'INVENTORY_CHECK': 'stock',
  'STAFF_TASK': 'staff',
  'GRADE_STUDENT': 'grading',
  'TRIAL_FOLLOW_UP': 'trials',
  'RETENTION_CHECK': 'retention',
  'PIXEL_EVENT': 'pixel',
  'ORACLE_QUERY': 'oracle',
  'MEMBER_COUNT': 'oracle',
  'SALES_TASK': 'sales_team',
  'MEMBER_SUCCESS_TASK': 'member_success_team',
  'FINANCE_TASK': 'finance_team',
  'SEND_PARENT_WAIVER': 'messaging'
};

const EVENT_TYPE_PRIORITY = {
  'HEALER_INTERVENTION': 10,
  'BILLING_TASK': 8,
  'FOLLOW_UP_LEAD': 7,
  'TRIAL_FOLLOW_UP': 7,
  'RETENTION_CHECK': 6,
  'STAFF_TASK': 5,
  'GENERATE_REPORT': 4,
  'SCHEDULE_CLASS': 4,
  'PUBLISH_SOCIAL_POST': 3,
  'PIXEL_EVENT': 2,
  'ORACLE_QUERY': 1
};

async function handler({ db, aiState, broadcast, config, agentName }) {
  const dbConn = db || getDatabase();
  const now = new Date().toISOString();

  await processSchedules(dbConn, aiState, now);

  const pendingEvents = dbConn.prepare(`
    SELECT * FROM event_queue
    WHERE status = 'pending' AND attempts < max_attempts
    ORDER BY created_at ASC
    LIMIT 20
  `).all();

  if (pendingEvents.length === 0) {
    const summary = '[ZEUS] No pending events in queue';
    await aiState.logActivity({ agentName: 'zeus', actionType: 'queue_check', summary, status: 'completed' });
    return { eventsProcessed: 0 };
  }

  let processed = 0;
  let approved = 0;
  let failed = 0;

  for (const event of pendingEvents) {
    try {
      if (event.requires_approval) {
        dbConn.prepare(`UPDATE event_queue SET status = 'processing', updated_at = ? WHERE id = ?`).run(now, event.id);

        const existingApproval = dbConn.prepare(
          "SELECT id FROM approval_queue WHERE status = 'pending' AND agent_name = ? AND action_type = ? AND entity_id = ?"
        ).get(event.assigned_agent || 'system', event.event_type, event.id);

        if (!existingApproval) {
          dbConn.prepare(`
            INSERT INTO approval_queue (agent_name, action_type, entity_type, entity_id, payload, reason)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            event.assigned_agent || 'zeus',
            event.event_type,
            event.entity_type || null,
            event.entity_id || null,
            event.payload || '{}',
            `Event #${event.id} requires human approval before processing`
          );

          dbConn.prepare(`UPDATE event_queue SET status = 'pending', updated_at = ? WHERE id = ?`).run(now, event.id);
          await aiState.logActivity({
            agentName: 'zeus',
            actionType: 'routed_to_approval',
            summary: `Event #${event.id} (${event.event_type}) sent to approval queue`,
            status: 'completed',
            details: { event_id: event.id, event_type: event.event_type, entity_type: event.entity_type, entity_id: event.entity_id }
          });
          approved++;
          continue;
        }

        dbConn.prepare(`UPDATE event_queue SET status = 'pending', updated_at = ? WHERE id = ?`).run(now, event.id);
        continue;
      }

      const targetAgent = AGENT_ROUTES[event.event_type] || event.assigned_agent || 'system';

      dbConn.prepare(`UPDATE event_queue SET status = 'processing', assigned_agent = ?, updated_at = ? WHERE id = ?`).run(targetAgent, now, event.id);

      const priority = EVENT_TYPE_PRIORITY[event.event_type] || 0;

      const taskResult = aiState.createTask({
        agentName: targetAgent,
        taskType: event.event_type,
        priority,
        payload: event.payload ? JSON.parse(event.payload) : {},
        scheduledFor: null
      });

      if (taskResult.error) {
        throw new Error(`Failed to create task: ${taskResult.error}`);
      }

      dbConn.prepare(`
        UPDATE event_queue SET status = 'completed', attempts = attempts + 1, processed_at = ?, updated_at = ? WHERE id = ?
      `).run(now, now, event.id);

      await aiState.logActivity({
        agentName: 'zeus',
        actionType: 'event_dispatched',
        summary: `Routed event #${event.id} (${event.event_type}) → ${targetAgent} (task #${taskResult.id})`,
        status: 'completed',
        details: { event_id: event.id, event_type: event.event_type, target_agent: targetAgent, task_id: taskResult.id, priority }
      });

      processed++;
    } catch (error) {
      console.error(`[ZEUS] Failed to process event #${event.id}:`, error.message);

      const newAttempts = (event.attempts || 0) + 1;
      if (newAttempts >= event.max_attempts) {
        dbConn.prepare(`
          UPDATE event_queue SET status = 'failed', attempts = ?, error_message = ?, updated_at = ? WHERE id = ?
        `).run(newAttempts, error.message, now, event.id);
      } else {
        dbConn.prepare(`
          UPDATE event_queue SET status = 'pending', attempts = ?, error_message = ?, updated_at = ? WHERE id = ?
        `).run(newAttempts, error.message, now, event.id);
      }

      await aiState.logActivity({
        agentName: 'zeus',
        actionType: 'event_failed',
        summary: `Event #${event.id} (${event.event_type}) failed: ${error.message}`,
        status: 'failed',
        details: { event_id: event.id, event_type: event.event_type, attempts: newAttempts, error: error.message }
      });

      failed++;
    }
  }

  const summary = `Processed ${processed} events, ${approved} sent to approval, ${failed} failed`;
  console.log(`[ZEUS] ${summary}`);

  await aiState.logActivity({
    agentName: 'zeus',
    actionType: 'orchestration_tick',
    summary,
    details: { processed, approved, failed, total_in_queue: pendingEvents.length }
  });

  if (broadcast) {
    broadcast({ type: 'zeus_tick', data: { processed, approved, failed, timestamp: now } });
  }

  return { eventsProcessed: processed, sentToApproval: approved, failed };
}

async function processSchedules(dbConn, aiState, now) {
  try {
    const dueSchedules = dbConn.prepare(`
      SELECT * FROM scheduled_agent_tasks
      WHERE enabled = 1
      ORDER BY created_at ASC
    `).all();

    const nowDate = new Date();
    let triggered = 0;

    for (const s of dueSchedules) {
      let shouldTrigger = false;

      if (s.frequency === 'daily') {
        const lastTrig = s.last_triggered_at ? new Date(s.last_triggered_at) : null;
        const todayStr = nowDate.toISOString().split('T')[0];
        const lastTrigStr = lastTrig ? lastTrig.toISOString().split('T')[0] : null;
        shouldTrigger = lastTrigStr !== todayStr;
      } else if (s.frequency === 'weekly' && s.day_of_week) {
        const dayMap = { 'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6 };
        const targetDay = dayMap[s.day_of_week.toLowerCase()];
        const lastTrig = s.last_triggered_at ? new Date(s.last_triggered_at) : null;
        const thisWeekStart = new Date(nowDate);
        thisWeekStart.setDate(nowDate.getDate() - nowDate.getDay());
        shouldTrigger = nowDate.getDay() === targetDay && (!lastTrig || lastTrig < thisWeekStart);
      } else if (s.frequency === 'hours' && s.interval_hours) {
        const lastTrig = s.last_triggered_at ? new Date(s.last_triggered_at) : null;
        shouldTrigger = !lastTrig || (nowDate - lastTrig) >= s.interval_hours * 3600000;
      } else if (s.frequency === 'monthly' && s.day_of_month) {
        const lastTrig = s.last_triggered_at ? new Date(s.last_triggered_at) : null;
        const thisMonthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
        shouldTrigger = nowDate.getDate() === s.day_of_month && (!lastTrig || lastTrig < thisMonthStart);
      }

      if (shouldTrigger) {
        const eventType = 'SCHEDULED_TASK';
        const payload = JSON.stringify({
          task_description: s.task_description,
          agent: s.agent_name,
          schedule_id: s.id,
          frequency: s.frequency
        });

        const existing = dbConn.prepare(`
          SELECT id FROM event_queue
          WHERE event_type = ? AND status = 'pending' AND payload = ?
        `).get(eventType, payload);

        if (!existing) {
          dbConn.prepare(`
            INSERT INTO event_queue (event_type, entity_type, payload, status, assigned_agent, requires_approval)
            VALUES (?, 'scheduled_task', ?, 'pending', ?, 0)
          `).run(eventType, payload, s.agent_name);

          dbConn.prepare(`UPDATE scheduled_agent_tasks SET last_triggered_at = ? WHERE id = ?`).run(now, s.id);

          triggered++;
        }
      }
    }

    if (triggered > 0) {
      console.log(`[ZEUS] Triggered ${triggered} scheduled tasks`);
    }
  } catch (err) {
    console.error('[ZEUS] processSchedules error:', err.message);
  }
}

module.exports = { handler };
