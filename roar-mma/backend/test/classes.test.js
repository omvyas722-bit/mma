const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_PATH = ':memory:';

delete require.cache[require.resolve('../db/connection')];

const { getDatabase, closeDatabase } = require('../db/connection');
const classes = require('../data/classes');

before(() => {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      class_type TEXT NOT NULL,
      instructor_id INTEGER,
      day_of_week INTEGER,
      start_time TIME NOT NULL,
      end_time TIME,
      max_capacity INTEGER DEFAULT 20,
      location TEXT,
      active INTEGER DEFAULT 1,
      min_belt TEXT,
      fighter_only INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT,
      active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS class_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      date DATE NOT NULL,
      start_time TIME NOT NULL,
      coach_id INTEGER,
      capacity INTEGER DEFAULT 20,
      status TEXT DEFAULT 'scheduled',
      cancellation_reason TEXT,
      class_notes TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      class_instance_id INTEGER,
      booking_date DATE NOT NULL,
      status TEXT DEFAULT 'booked',
      attended_at DATETIME,
      waitlist INTEGER DEFAULT 0,
      waitlist_position INTEGER,
      booked_at DATETIME DEFAULT (datetime('now')),
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS belt_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT,
      color_code TEXT,
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS makeup_classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      original_date DATE NOT NULL,
      original_class_id INTEGER,
      granted_by INTEGER,
      expires_at DATETIME,
      used_at DATETIME,
      used_for_class_id INTEGER,
      class_instance_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    INSERT INTO belt_levels (name, color, color_code) VALUES ('white', '#FFFFFF', '#FFFFFF');
    INSERT INTO staff (id, name, email, password_hash, role) VALUES (1, 'Coach A', 'coach@test.com', 'hash', 'coach');
  `);
});

after(() => {
  closeDatabase();
});

describe('Classes Data Layer', () => {
  it('createClass inserts and returns a class', () => {
    const cls = classes.createClass({
      name: 'Morning BJJ', description: 'Morning Brazilian Jiu-Jitsu',
      location: 'rockingham', day_of_week: 1, start_time: '06:00',
      duration_minutes: 60, capacity: 20, class_type: 'bjj', coach_id: 1, active: 1
    });
    assert.ok(cls.id);
    assert.equal(cls.name, 'Morning BJJ');
    assert.equal(cls.class_type, 'bjj');
    assert.equal(cls.location, 'rockingham');
  });

  it('getClassById returns the correct class', () => {
    const cls = classes.getClassById(1);
    assert.ok(cls);
    assert.equal(cls.name, 'Morning BJJ');
    assert.equal(cls.coach_name, 'Coach A');
  });

  it('getAllClasses returns all classes', () => {
    classes.createClass({
      name: 'Evening Muay Thai', location: 'bibra_lake', day_of_week: 2,
      start_time: '18:00', duration_minutes: 60, capacity: 25, class_type: 'muay_thai', active: 1
    });
    const all = classes.getAllClasses({});
    assert.equal(all.length, 2);
  });

  it('getAllClasses filters by location', () => {
    const result = classes.getAllClasses({ location: 'rockingham' });
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Morning BJJ');
  });

  it('getAllClasses filters by class_type', () => {
    const result = classes.getAllClasses({ class_type: 'muay_thai' });
    assert.equal(result.length, 1);
  });

  it('getAllClasses filters by active status', () => {
    const result = classes.getAllClasses({ active: true });
    assert.equal(result.length, 2);
  });

  it('getAllClasses returns empty for no-match filters', () => {
    const result = classes.getAllClasses({ location: 'nowhere' });
    assert.equal(result.length, 0);
  });

  describe('updateClass', () => {
    it('modifies fields', () => {
      const updated = classes.updateClass(1, { max_capacity: 30 });
      assert.equal(updated.capacity, 30);
    });

    it('throws on empty updates object', () => {
      assert.throws(() => classes.updateClass(1, {}), /No valid fields to update/);
    });

    it('throws when only invalid fields provided', () => {
      assert.throws(() => classes.updateClass(1, { nonexistent: 'x' }), /No valid fields to update/);
    });
  });

  it('deleteClass removes class', () => {
    const result = classes.deleteClass(2);
    assert.equal(result, true);
    const cls = classes.getClassById(2);
    assert.equal(cls, undefined);
  });

  describe('getClassInstances', () => {
    it('filters by date', () => {
      const db = getDatabase();
      db.prepare(`INSERT INTO class_instances (class_id, date, start_time) VALUES (1, '2024-06-01', '06:00')`).run();
      db.prepare(`INSERT INTO class_instances (class_id, date, start_time) VALUES (1, '2024-06-02', '06:00')`).run();
      const instances = classes.getClassInstances({ date: '2024-06-01' });
      assert.equal(instances.length, 1);
      assert.equal(instances[0].class_name, 'Morning BJJ');
    });

    it('returns all when no filter', () => {
      const instances = classes.getClassInstances({});
      assert.equal(instances.length, 2);
    });

    it('filters by week_start and week_end', () => {
      const db = getDatabase();
      db.prepare(`INSERT INTO class_instances (class_id, date, start_time) VALUES (1, '2024-06-10', '06:00')`).run();
      db.prepare(`INSERT INTO class_instances (class_id, date, start_time) VALUES (1, '2024-06-12', '06:00')`).run();
      db.prepare(`INSERT INTO class_instances (class_id, date, start_time) VALUES (1, '2024-06-17', '06:00')`).run();
      const result = classes.getClassInstances({ week_start: '2024-06-10', week_end: '2024-06-16' });
      assert.equal(result.length, 2);
      result.forEach(r => {
        assert.ok(r.date >= '2024-06-10' && r.date <= '2024-06-16');
      });
    });

    it('filters by location', () => {
      const db = getDatabase();
      const newClass = classes.createClass({
        name: 'Mandurah Class', location: 'mandurah', day_of_week: 3,
        start_time: '10:00', duration_minutes: 60, capacity: 20, class_type: 'bjj', active: 1
      });
      db.prepare(`INSERT INTO class_instances (class_id, date, start_time) VALUES (?, '2024-06-15', '10:00')`).run(newClass.id);
      const result = classes.getClassInstances({ location: 'mandurah' });
      assert.equal(result.length, 1);
      assert.equal(result[0].location, 'mandurah');
    });

    it('filters by status', () => {
      const db = getDatabase();
      const row = db.prepare(`SELECT id FROM classes LIMIT 1`).get();
      db.prepare(`INSERT INTO class_instances (class_id, date, start_time, status) VALUES (?, '2024-06-20', '06:00', 'cancelled')`).run(row.id);
      db.prepare(`INSERT INTO class_instances (class_id, date, start_time, status) VALUES (?, '2024-06-21', '06:00', 'scheduled')`).run(row.id);
      const result = classes.getClassInstances({ status: 'cancelled' });
      assert.equal(result.length, 1);
      assert.equal(result[0].status, 'cancelled');
    });

    it('filters by active class', () => {
      const db = getDatabase();
      classes.createClass({
        name: 'Inactive Class', location: 'rockingham', day_of_week: 4,
        start_time: '07:00', duration_minutes: 60, capacity: 20, class_type: 'bjj', active: 0
      });
      const inactive = db.prepare(`SELECT id FROM classes WHERE active = 0 LIMIT 1`).get();
      db.prepare(`INSERT INTO class_instances (class_id, date, start_time) VALUES (?, '2024-06-25', '07:00')`).run(inactive.id);
      const resultActive = classes.getClassInstances({ active: true });
      const resultInactive = classes.getClassInstances({ active: false });
      assert.ok(resultActive.length > 0);
      assert.ok(resultInactive.length > 0);
    });
  });

  it('getClassInstanceById returns correct instance', () => {
    const instance = classes.getClassInstanceById(1);
    assert.ok(instance);
    assert.equal(instance.date, '2024-06-01');
  });

  it('createClassInstance inserts instance', () => {
    const instance = classes.createClassInstance({ class_id: 1, date: '2024-06-03', start_time: '06:00', capacity: 20 });
    assert.ok(instance.id);
    assert.equal(instance.date, '2024-06-03');
  });

  describe('updateClassInstance', () => {
    it('modifies fields', () => {
      const updated = classes.updateClassInstance(3, { capacity: 25 });
      assert.equal(updated.capacity, 25);
    });

    it('throws on empty updates object', () => {
      const db = getDatabase();
      const inst = db.prepare(`SELECT id FROM class_instances LIMIT 1`).get();
      assert.throws(() => classes.updateClassInstance(inst.id, {}), /No valid fields to update/);
    });

    it('throws when only invalid fields provided', () => {
      const db = getDatabase();
      const inst = db.prepare(`SELECT id FROM class_instances LIMIT 1`).get();
      assert.throws(() => classes.updateClassInstance(inst.id, { bogus: 'x' }), /No valid fields to update/);
    });
  });

  describe('generateClassInstances', () => {
    it('creates instances for date range', () => {
      const instances = classes.generateClassInstances(1, '2024-07-01', '2024-07-07');
      assert.ok(instances.length >= 1);
      assert.equal(instances[0].class_id, 1);
    });

    it('throws for non-existent class id', () => {
      assert.throws(() => classes.generateClassInstances(99999, '2024-07-01', '2024-07-07'), /Class not found/);
    });
  });

  it('getClassRoster returns roster for instance', () => {
    const db = getDatabase();
    db.exec(`CREATE TABLE IF NOT EXISTS members (id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT, last_name TEXT, email TEXT, phone TEXT, status TEXT)`);
    db.prepare(`INSERT INTO members (id, first_name, last_name) VALUES (1, 'John', 'Doe')`).run();
    db.prepare(`INSERT INTO bookings (member_id, class_id, class_instance_id, booking_date, status) VALUES (1, 1, 1, '2024-06-01', 'booked')`).run();
    const roster = classes.getClassRoster(1);
    assert.equal(roster.length, 1);
    assert.equal(roster[0].first_name, 'John');
  });

  describe('Coverage improvements', () => {
    it('createClass defaults end_time and capacity', () => {
      const cls = classes.createClass({
        name: 'Default Duration', location: 'rockingham', day_of_week: 2,
        start_time: '07:00', class_type: 'bjj', active: 1
      });
      assert.equal(cls.end_time, null);
      assert.equal(cls.capacity, 20);
    });

    it('generateClassInstances with no matching weekdays returns []', () => {
      const result = classes.generateClassInstances(1, '2024-07-02', '2024-07-06');
      assert.equal(result.length, 0);
    });

    it('generateClassInstances when all dates have instances returns []', () => {
      classes.generateClassInstances(1, '2024-08-05', '2024-08-11');
      const result = classes.generateClassInstances(1, '2024-08-05', '2024-08-11');
      assert.equal(result.length, 0);
    });
  });
});
