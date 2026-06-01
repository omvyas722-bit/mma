// Task Agent - Manages task pipeline: escalates overdue tasks, adjusts priorities, archives old ones
const staffTasksData = require('../../../data/staffTasks');
const { getDatabase } = require('../../../db/connection');

async function handler({ db, aiState, broadcast, config, agentName }) {
  try {
    console.log('[TASK-AGENT] Starting task pipeline check...');

    const dbConn = db || getDatabase();
    const now = new Date().toISOString();

    // 1. Find overdue tasks (past due_date, not completed)
    const allPendingTasks = (staffTasksData.getAllTasks({ status: 'pending' }) || []).slice(0, 500);
    const overdueTasks = allPendingTasks.filter(t => {
      if (!t || !t.due_date) return false;
      return t.due_date < now;
    });

    let escalatedCount = 0;
    for (const task of overdueTasks) {
      if (!task || !task.id) continue;
      try {
        if (task.priority !== 'critical') {
          staffTasksData.updateTask(task.id, { priority: 'high', notes: `[AUTO] Escalated - overdue past ${task.due_date}` });
          escalatedCount++;
        }
      } catch (loopErr) {
        console.error(`[TASK-AGENT] Error escalating task #${task.id}:`, loopErr.message);
      }
    }

    // 2. Update priority based on elapsed time since creation
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;

    for (const task of allPendingTasks) {
      if (!task || !task.id) continue;
      try {
        const created = new Date(task.created_at);
        const elapsed = Date.now() - created.getTime();
        let newPriority = task.priority;

        if (elapsed > fiveDaysMs && task.priority === 'low') {
          newPriority = 'medium';
        }
        if (elapsed > twoDaysMs && task.priority === 'medium') {
          newPriority = 'high';
        }

        if (newPriority !== task.priority) {
          staffTasksData.updateTask(task.id, { priority: newPriority, notes: `[AUTO] Priority escalated from ${task.priority} to ${newPriority} due to age` });
        }
      } catch (loopErr) {
        console.error(`[TASK-AGENT] Error updating priority for task #${task.id}:`, loopErr.message);
      }
    }

    // 3. Complete and archive old completed tasks (> 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const oldCompletedTasks = dbConn.prepare(`
      SELECT id FROM staff_tasks
      WHERE status = 'completed' AND completed_at IS NOT NULL AND completed_at < ?
    `).all(thirtyDaysAgo);

    const archivedCount = oldCompletedTasks.length;
    for (const task of oldCompletedTasks) {
      dbConn.prepare(`
        UPDATE staff_tasks SET status = 'archived', updated_at = datetime('now')
        WHERE id = ?
      `).run(task.id);
    }

    // 4. Task pipeline stats
    const stats = staffTasksData.getTaskStats();

    const summary = `Overdue tasks: ${overdueTasks.length} (${escalatedCount} escalated). Archived ${archivedCount} old completed tasks. Pipeline: ${stats.by_status.pending || 0} pending, ${stats.by_status.completed || 0} completed.`;

    await aiState.logActivity({
      agentName: agentName || 'tasks',
      actionType: 'task_pipeline_check',
      details: {
        overdue_count: overdueTasks.length,
        escalated: escalatedCount,
        archived: archivedCount,
        pending: stats.by_status.pending || 0,
        completed: stats.by_status.completed || 0
      },
      summary
    });

    console.log(`[TASK-AGENT] ${summary}`);

    if (escalatedCount > 0 && broadcast) {
      broadcast({ type: 'task_agent_update', summary, escalatedCount });
    }
  } catch (err) {
    console.error('[TASK-AGENT] Error:', err.stack || err.message);
    try {
      await aiState.logActivity({
        agentName: agentName || 'tasks',
        actionType: 'task_pipeline_error',
        details: { error: err.message },
        summary: `Task agent failed: ${err.message}`
      });
    } catch (logErr) {
      console.error('[TASK-AGENT] Failed to log activity:', logErr.message);
    }
  }
}

module.exports = { handler };
