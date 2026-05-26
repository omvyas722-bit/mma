// Staff tasks routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const staffTasksData = require('../data/staffTasks');

const router = express.Router();

// Get all tasks
router.get('/', authenticateToken, requirePermission('staff:read'), (req, res) => {
  try {
    const filters = {
      assigned_to: req.query.assigned_to,
      status: req.query.status,
      priority: req.query.priority,
      task_type: req.query.task_type
    };

    const tasks = staffTasksData.getAllTasks(filters);
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get task stats
router.get('/stats', authenticateToken, requirePermission('staff:read'), (req, res) => {
  try {
    const staffId = req.query.staff_id;
    const stats = staffTasksData.getTaskStats(staffId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching task stats:', error);
    res.status(500).json({ error: 'Failed to fetch task stats' });
  }
});

// Get single task
router.get('/:id', authenticateToken, requirePermission('staff:read'), (req, res) => {
  try {
    const task = staffTasksData.getTaskById(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create task
router.post('/', authenticateToken, requirePermission('staff:write'), (req, res) => {
  try {
    const { task_type, title } = req.body;

    if (!task_type || !title) {
      return res.status(400).json({ error: 'task_type and title required' });
    }

    const task = staffTasksData.createTask(req.body);
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', authenticateToken, requirePermission('staff:write'), (req, res) => {
  try {
    const task = staffTasksData.getTaskById(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updated = staffTasksData.updateTask(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Complete task
router.post('/:id/complete', authenticateToken, requirePermission('staff:write'), (req, res) => {
  try {
    const task = staffTasksData.getTaskById(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { notes } = req.body;
    const completed = staffTasksData.completeTask(req.params.id, req.user.id, notes);
    res.json(completed);
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

// Delete task
router.delete('/:id', authenticateToken, requirePermission('staff:write'), (req, res) => {
  try {
    const deleted = staffTasksData.deleteTask(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
