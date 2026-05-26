// Seed database with test data
const { getDatabase } = require('../db/connection');
const bcrypt = require('bcrypt');

function seedDatabase() {
  console.log('Seeding database with test data...');
  const db = getDatabase();

  try {
    // Add more staff members
    console.log('Adding staff members...');
    const staffData = [
      { name: 'Sarah Johnson', email: 'gm@roarmma.com.au', role: 'gm', phone: '0400111222' },
      { name: 'Mike Chen', email: 'frontdesk@roarmma.com.au', role: 'front_desk', phone: '0400222333' },
      { name: 'Kane Williams', email: 'kane@roarmma.com.au', role: 'coach', phone: '0400333444' },
      { name: 'Con Martinez', email: 'sales@roarmma.com.au', role: 'sales', phone: '0400444555' },
      { name: 'Min Lee', email: 'social@roarmma.com.au', role: 'social', phone: '0400555666' },
    ];

    const passwordHash = bcrypt.hashSync('password123', 10);

    staffData.forEach(staff => {
      db.prepare(`
        INSERT OR IGNORE INTO staff (name, email, password_hash, role, phone)
        VALUES (?, ?, ?, ?, ?)
      `).run(staff.name, staff.email, passwordHash, staff.role, staff.phone);
    });

    // Add test members
    console.log('Adding members...');
    const members = [
      { first_name: 'Jordan', last_name: 'Smith', email: 'jordan.smith@email.com', phone: '0411111111', location: 'rockingham', status: 'active', plan: 'unlimited', joined_date: '2026-01-15' },
      { first_name: 'Alex', last_name: 'Brown', email: 'alex.brown@email.com', phone: '0422222222', location: 'rockingham', status: 'active', plan: '3x_week', joined_date: '2026-02-01' },
      { first_name: 'Sam', last_name: 'Taylor', email: 'sam.taylor@email.com', phone: '0433333333', location: 'bibra_lake', status: 'trial', plan: null, joined_date: '2026-04-15', trial_end_date: '2026-04-28' },
      { first_name: 'Casey', last_name: 'Wilson', email: 'casey.wilson@email.com', phone: '0444444444', location: 'rockingham', status: 'active', plan: 'fighter', joined_date: '2025-11-10' },
      { first_name: 'Morgan', last_name: 'Davis', email: 'morgan.davis@email.com', phone: '0455555555', location: 'bibra_lake', status: 'paused', plan: 'unlimited', joined_date: '2026-01-20', pause_start: '2026-04-01', pause_end: '2026-05-01' },
      { first_name: 'Riley', last_name: 'Martinez', email: 'riley.martinez@email.com', phone: '0466666666', location: 'rockingham', status: 'active', plan: '2x_week', joined_date: '2026-03-05' },
      { first_name: 'Jamie', last_name: 'Anderson', email: 'jamie.anderson@email.com', phone: '0477777777', location: 'bibra_lake', status: 'trial', plan: null, joined_date: '2026-04-17', trial_end_date: '2026-04-28' },
      { first_name: 'Drew', last_name: 'Thomas', email: 'drew.thomas@email.com', phone: '0488888888', location: 'rockingham', status: 'active', plan: 'unlimited', joined_date: '2025-12-01' },
    ];

    members.forEach(member => {
      db.prepare(`
        INSERT OR IGNORE INTO members (
          first_name, last_name, email, phone, location, status, plan, joined_date, trial_end_date, pause_start, pause_end
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        member.first_name, member.last_name, member.email, member.phone,
        member.location, member.status, member.plan, member.joined_date,
        member.trial_end_date || null, member.pause_start || null, member.pause_end || null
      );
    });

    // Add classes
    console.log('Adding classes...');
    const coachId = db.prepare('SELECT id FROM staff WHERE role = ?').get('coach').id;

    const classes = [
      { name: 'BJJ Fundamentals', location: 'rockingham', day_of_week: 1, start_time: '18:00', class_type: 'bjj', coach_id: coachId, capacity: 20 },
      { name: 'Muay Thai Basics', location: 'rockingham', day_of_week: 2, start_time: '19:00', class_type: 'muay_thai', coach_id: coachId, capacity: 15 },
      { name: 'MMA Training', location: 'rockingham', day_of_week: 3, start_time: '18:30', class_type: 'mma', coach_id: coachId, capacity: 20 },
      { name: 'BJJ Advanced', location: 'bibra_lake', day_of_week: 4, start_time: '19:00', class_type: 'bjj', coach_id: coachId, capacity: 15 },
      { name: 'Kids BJJ', location: 'rockingham', day_of_week: 5, start_time: '16:00', class_type: 'kids', coach_id: coachId, capacity: 25 },
      { name: 'Open Mat', location: 'rockingham', day_of_week: 6, start_time: '10:00', class_type: 'bjj', coach_id: coachId, capacity: 30 },
    ];

    classes.forEach(cls => {
      db.prepare(`
        INSERT OR IGNORE INTO classes (
          name, location, day_of_week, start_time, class_type, coach_id, capacity
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(cls.name, cls.location, cls.day_of_week, cls.start_time, cls.class_type, cls.coach_id, cls.capacity);
    });

    // Generate class instances for this week
    console.log('Generating class instances...');
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday

    const allClasses = db.prepare('SELECT * FROM classes WHERE active = 1').all();

    allClasses.forEach(cls => {
      for (let i = 0; i < 14; i++) { // 2 weeks
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);

        if (date.getDay() === cls.day_of_week) {
          const dateStr = date.toISOString().split('T')[0];

          db.prepare(`
            INSERT OR IGNORE INTO class_instances (
              class_id, date, start_time, coach_id, capacity, status
            ) VALUES (?, ?, ?, ?, ?, ?)
          `).run(cls.id, dateStr, cls.start_time, cls.coach_id, cls.capacity, 'scheduled');
        }
      }
    });

    // Add some bookings
    console.log('Adding bookings...');
    const memberIds = db.prepare('SELECT id FROM members WHERE status IN (?, ?)').all('active', 'trial').map(m => m.id);
    const instanceIds = db.prepare("SELECT id FROM class_instances WHERE date >= date('now') LIMIT 10").all().map(i => i.id);

    // Book some members into classes
    for (let i = 0; i < Math.min(memberIds.length, 15); i++) {
      const memberId = memberIds[i % memberIds.length];
      const instanceId = instanceIds[i % instanceIds.length];

      db.prepare(`
        INSERT OR IGNORE INTO bookings (member_id, class_instance_id, status)
        VALUES (?, ?, ?)
      `).run(memberId, instanceId, 'booked');
    }

    // Add leads
    console.log('Adding leads...');
    const salesId = db.prepare('SELECT id FROM staff WHERE role = ?').get('sales').id;

    const leads = [
      { first_name: 'Emma', last_name: 'Johnson', phone: '0411222333', email: 'emma.j@email.com', source: 'website', stage: 'new', location: 'rockingham', interests: 'BJJ for fitness', assigned_to: salesId },
      { first_name: 'Liam', last_name: 'Brown', phone: '0422333444', email: 'liam.b@email.com', source: 'facebook', stage: 'contacted', location: 'bibra_lake', interests: 'Muay Thai', assigned_to: salesId },
      { first_name: 'Olivia', last_name: 'Davis', phone: '0433444555', email: 'olivia.d@email.com', source: 'referral', stage: 'trial_booked', location: 'rockingham', interests: 'MMA training', assigned_to: salesId },
      { first_name: 'Noah', last_name: 'Wilson', phone: '0444555666', email: 'noah.w@email.com', source: 'instagram', stage: 'trial_completed', location: 'rockingham', interests: 'BJJ and fitness', assigned_to: salesId },
      { first_name: 'Ava', last_name: 'Taylor', phone: '0455666777', email: 'ava.t@email.com', source: 'walk_in', stage: 'new', location: 'bibra_lake', interests: 'Kids classes', assigned_to: salesId },
    ];

    leads.forEach(lead => {
      db.prepare(`
        INSERT OR IGNORE INTO leads (
          first_name, last_name, phone, email, source, stage, location, interests, assigned_to
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        lead.first_name, lead.last_name, lead.phone, lead.email,
        lead.source, lead.stage, lead.location, lead.interests, lead.assigned_to
      );
    });

    // Add some transactions
    console.log('Adding transactions...');
    memberIds.slice(0, 5).forEach(memberId => {
      db.prepare(`
        INSERT INTO transactions (
          member_id, amount, type, status, payment_method, processed_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'))
      `).run(memberId, 200.00, 'membership', 'succeeded', 'card', Math.floor(Math.random() * 30));
    });

    console.log('Database seeded successfully!');
    console.log('\nTest accounts:');
    console.log('Owner: owner@roarmma.com.au / admin123');
    console.log('GM: gm@roarmma.com.au / password123');
    console.log('Front Desk: frontdesk@roarmma.com.au / password123');
    console.log('Coach: kane@roarmma.com.au / password123');
    console.log('Sales: sales@roarmma.com.au / password123');
    console.log('Social: social@roarmma.com.au / password123');

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  try {
    seedDatabase();
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

module.exports = { seedDatabase };
