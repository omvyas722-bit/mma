const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_PATH = ':memory:';

delete require.cache[require.resolve('../db/connection')];

const { getDatabase, closeDatabase } = require('../db/connection');
const tasks = require('../data/staffTasks');

before(() => {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT, last_name TEXT,
      phone TEXT, email TEXT, stage TEXT
    );
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT, last_name TEXT
    );
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, role TEXT
    );
    CREATE TABLE IF NOT EXISTS staff_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, lead_id INTEGER, member_id INTEGER,
      assigned_to INTEGER, task_type TEXT NOT NULL, priority TEXT DEFAULT 'medium',
      title TEXT NOT NULL, description TEXT, due_date TEXT, status TEXT DEFAULT 'pending',
      completed_at TEXT, completed_by INTEGER, notes TEXT,
      created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id),
      FOREIGN KEY (member_id) REFERENCES members(id),
      FOREIGN KEY (assigned_to) REFERENCES staff(id)
    )
  `);
  db.exec(`
    INSERT INTO leads (id, first_name, last_name, stage) VALUES (1, 'John', 'Doe', 'new');
    INSERT INTO members (id, first_name, last_name) VALUES (1, 'Jane', 'Smith');
    INSERT INTO staff (id, name, role) VALUES (1, 'Coach Bob', 'coach');
  `);
});

beforeEach(() => {
  const db = getDatabase();
  db.exec(`DELETE FROM staff_tasks`);
});

after(() => closeDatabase());

describe('Staff Tasks Data Layer', () => {
  it('createTask creates and returns', () => {
    const t = tasks.createTask({ task_type: 'call', title: 'Follow up with John', lead_id: 1 });
    assert.ok(t.id);
    assert.equal(t.title, 'Follow up with John');
    assert.equal(t.status, 'pending');
    assert.equal(t.priority, 'medium');
  });

  it('createTask with all fields', () => {
    const t = tasks.createTask({
      lead_id: 1, assigned_to: 1, task_type: 'email', priority: 'high',
      title: 'Send welcome', description: 'Draft welcome email', due_date: '2026-06-15',
      status: 'in_progress'
    });
    assert.equal(t.assigned_to, 1);
    assert.equal(t.priority, 'high');
    assert.equal(t.description, 'Draft welcome email');
  });

  it('getTaskById returns task', () => {
    const t = tasks.createTask({ task_type: 'call', title: 'Test call', lead_id: 1 });
    const found = tasks.getTaskById(t.id);
    assert.ok(found);
    assert.equal(found.title, 'Test call');
    assert.ok(found.lead_name);
  });

  it('getTaskById returns undefined for missing', () => {
    assert.equal(tasks.getTaskById(999), undefined);
  });

  it('getAllTasks returns all', () => {
    tasks.createTask({ task_type: 'call', title: 'A', lead_id: 1 });
    tasks.createTask({ task_type: 'email', title: 'B', member_id: 1 });
    assert.equal(tasks.getAllTasks({}).length, 2);
  });

  it('getAllTasks filters by assigned_to', () => {
    tasks.createTask({ task_type: 'call', title: 'A', assigned_to: 1 });
    const r = tasks.getAllTasks({ assigned_to: 1 });
    assert.equal(r.length, 1);
  });

  it('getAllTasks filters by status', () => {
    tasks.createTask({ task_type: 'call', title: 'A', status: 'pending' });
    const r = tasks.getAllTasks({ status: 'pending' });
    assert.equal(r.length, 1);
    const r2 = tasks.getAllTasks({ status: 'completed' });
    assert.equal(r2.length, 0);
  });

  it('getAllTasks filters by priority', () => {
    tasks.createTask({ task_type: 'call', title: 'A', priority: 'high' });
    const r = tasks.getAllTasks({ priority: 'high' });
    assert.equal(r.length, 1);
  });

  it('getAllTasks filters by task_type', () => {
    tasks.createTask({ task_type: 'call', title: 'A' });
    tasks.createTask({ task_type: 'email', title: 'B' });
    const r = tasks.getAllTasks({ task_type: 'email' });
    assert.equal(r.length, 1);
  });

  it('updateTask modifies fields', () => {
    const t = tasks.createTask({ task_type: 'call', title: 'Orig' });
    const u = tasks.updateTask(t.id, { title: 'Updated', priority: 'high' });
    assert.equal(u.title, 'Updated');
    assert.equal(u.priority, 'high');
  });

  it('updateTask throws on empty fields', () => {
    const t = tasks.createTask({ task_type: 'call', title: 'T' });
    assert.throws(() => tasks.updateTask(t.id, {}), /No valid fields to update/);
  });

  it('completeTask sets completed status', () => {
    const t = tasks.createTask({ task_type: 'call', title: 'T', assigned_to: 1 });
    const c = tasks.completeTask(t.id, 1, 'Done well');
    assert.equal(c.status, 'completed');
    assert.equal(c.completed_by, 1);
    assert.equal(c.notes, 'Done well');
  });

  it('deleteTask removes and returns true', () => {
    const t = tasks.createTask({ task_type: 'call', title: 'T' });
    assert.equal(tasks.deleteTask(t.id), true);
    assert.equal(tasks.getTaskById(t.id), undefined);
  });

  it('deleteTask returns false for missing', () => {
    assert.equal(tasks.deleteTask(999), false);
  });

  it('getTaskStats returns grouped counts', () => {
    tasks.createTask({ task_type: 'call', title: 'A', priority: 'high', assigned_to: 1 });
    tasks.createTask({ task_type: 'email', title: 'B', priority: 'medium', assigned_to: 1 });
    const stats = tasks.getTaskStats(1);
    assert.equal(stats.by_status.pending, 2);
    assert.equal(stats.by_priority.high, 1);
    assert.equal(stats.by_priority.medium, 1);
  });

  it('getTaskStats works without staff filter', () => {
    tasks.createTask({ task_type: 'call', title: 'A', priority: 'high' });
    const stats = tasks.getTaskStats();
    assert.equal(stats.by_status.pending, 1);
  });
});
