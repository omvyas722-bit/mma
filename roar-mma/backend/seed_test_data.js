require('dotenv').config();
const { getDatabase } = require('./db/connection');
const db = getDatabase();

// ─── CLEAR EXISTING DATA (child tables first for FK) ───
db.exec("PRAGMA foreign_keys = OFF");
db.exec("DELETE FROM staff_tasks");
db.exec("DELETE FROM transactions");
db.exec("DELETE FROM attendance");
db.exec("DELETE FROM bookings");
db.exec("DELETE FROM leads");
db.exec("DELETE FROM classes");
db.exec("DELETE FROM members WHERE id > 1");
db.exec("PRAGMA foreign_keys = ON");

console.log('Cleared existing data');

const MEMBER_IDS = [];
const LEAD_IDS = [];
const CLASS_IDS = [];

function insert(table, data) {
  const cols = Object.keys(data);
  const vals = Object.values(data);
  const placeholders = vals.map(() => '?').join(',');
  const result = db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`).run(...vals);
  return result.lastInsertRowid;
}

// ─── MEMBERS ───
const members = [
  { first_name: 'John', last_name: 'Smith', email: 'john@example.com', phone: '0400111111', status: 'active', plan: 'unlimited', joined_date: '2025-11-15', experience_level: 'intermediate', location: 'rockingham' },
  { first_name: 'Sarah', last_name: 'Jones', email: 'sarah@example.com', phone: '0400222222', status: 'active', plan: '2x_week', joined_date: '2026-05-10', trial_end_date: '2026-06-07', experience_level: 'beginner', location: 'rockingham' },
  { first_name: 'Mike', last_name: 'Wilson', email: 'mike@example.com', phone: '0400333333', status: 'active', plan: '3x_week', joined_date: '2026-05-20', trial_end_date: '2026-06-03', experience_level: 'advanced', location: 'bibra_lake' },
  { first_name: 'Emma', last_name: 'Brown', email: 'emma@example.com', phone: '0400444444', status: 'active', plan: 'unlimited', joined_date: '2025-08-01', experience_level: 'advanced', location: 'rockingham' },
  { first_name: 'James', last_name: 'Davis', email: 'james@example.com', phone: '0400555555', status: 'paused', plan: '2x_week', joined_date: '2025-06-01', pause_start: '2026-05-01', pause_end: '2026-07-01', experience_level: 'intermediate', location: 'bibra_lake' },
  { first_name: 'Lisa', last_name: 'Taylor', email: 'lisa@example.com', phone: '0400666666', status: 'cancelled', plan: 'unlimited', joined_date: '2024-12-01', cancellation_date: '2026-04-15', experience_level: 'beginner', location: 'rockingham' },
  { first_name: 'Tom', last_name: 'Anderson', email: 'tom@example.com', phone: '0400777777', status: 'active', plan: 'fighter', joined_date: '2026-01-10', experience_level: 'advanced', location: 'rockingham' },
  { first_name: 'Kate', last_name: 'White', email: 'kate@example.com', phone: '0400888888', status: 'active', plan: 'pt_only', joined_date: '2026-03-05', experience_level: 'beginner', location: 'bibra_lake' },
];

for (const m of members) {
  MEMBER_IDS.push(insert('members', m));
}

// ─── LEADS ───
const leads = [
  { first_name: 'Alex', last_name: 'Green', email: 'alex@example.com', phone: '0411111111', source: 'website', stage: 'new', location: 'rockingham', interest_level: 'high' },
  { first_name: 'Ben', last_name: 'Clark', email: 'ben@example.com', phone: '0411222222', source: 'instagram', stage: 'contacted', location: 'bibra_lake', interest_level: 'medium', assigned_to: 1, last_contact_date: '2026-05-28' },
  { first_name: 'Chloe', last_name: 'Hall', email: 'chloe@example.com', phone: '0411333333', source: 'referral', stage: 'trial_booked', location: 'rockingham', interest_level: 'high', assigned_to: 1, trial_date: '2026-06-01', next_follow_up_date: '2026-06-03' },
  { first_name: 'David', last_name: 'Lee', email: 'david@example.com', phone: '0411444444', source: 'facebook', stage: 'trial_completed', location: 'rockingham', trial_experience_rating: 4, trial_interest_level: 'hot', follow_up_status: 'pending' },
  { first_name: 'Ella', last_name: 'Wright', email: 'ella@example.com', phone: '0411555555', source: 'walk_in', stage: 'converted', location: 'bibra_lake', converted_member_id: MEMBER_IDS[3] },
  { first_name: 'Finn', last_name: 'Martin', email: 'finn@example.com', phone: '0411666666', source: 'website', stage: 'lost', location: 'rockingham', lost_reason: 'cost', follow_up_status: 'completed' },
  { first_name: 'Grace', last_name: 'Adams', email: 'grace@example.com', phone: '0411777777', source: 'referral', stage: 'new', location: 'bibra_lake', interest_level: 'medium' },
  { first_name: 'Henry', last_name: 'Baker', email: 'henry@example.com', phone: '0411888888', source: 'website', stage: 'contacted', location: 'rockingham', interest_level: 'low', assigned_to: 1, last_contact_date: '2026-05-25' },
];

for (const l of leads) {
  LEAD_IDS.push(insert('leads', l));
}

// ─── CLASSES ───
const classes = [
  { name: 'Morning BJJ', description: 'Brazilian Jiu-Jitsu fundamentals', class_type: 'bjj', day_of_week: 1, start_time: '06:00', end_time: '07:00', max_capacity: 30, location: 'rockingham', instructor_id: 1 },
  { name: 'Morning Muay Thai', description: 'Muay Thai striking', class_type: 'muay_thai', day_of_week: 1, start_time: '07:00', end_time: '08:00', max_capacity: 25, location: 'rockingham', instructor_id: 1 },
  { name: 'BJJ', description: 'Brazilian Jiu-Jitsu all levels', class_type: 'bjj', day_of_week: 2, start_time: '09:00', end_time: '10:00', max_capacity: 30, location: 'rockingham', instructor_id: 1 },
  { name: 'Muay Thai', description: 'Muay Thai all levels', class_type: 'muay_thai', day_of_week: 2, start_time: '17:00', end_time: '18:00', max_capacity: 25, location: 'bibra_lake', instructor_id: 1 },
  { name: 'MMA', description: 'Mixed Martial Arts', class_type: 'mma', day_of_week: 3, start_time: '18:00', end_time: '19:30', max_capacity: 20, location: 'rockingham', instructor_id: 1 },
  { name: 'Kids BJJ', description: 'BJJ for kids ages 6-14', class_type: 'kids', day_of_week: 4, start_time: '16:00', end_time: '17:00', max_capacity: 20, location: 'rockingham', instructor_id: 1 },
  { name: 'Muay Thai', description: 'Muay Thai advanced', class_type: 'muay_thai', day_of_week: 5, start_time: '06:00', end_time: '07:00', max_capacity: 20, location: 'rockingham', instructor_id: 1 },
  { name: 'Open Mat', description: 'Open mat session', class_type: 'bjj', day_of_week: 5, start_time: '12:00', end_time: '13:00', max_capacity: 30, location: 'rockingham', instructor_id: 1 },
];

for (const c of classes) {
  CLASS_IDS.push(insert('classes', c));
}

// ─── BOOKINGS ───
const bookingData = [
  { member_id: MEMBER_IDS[0], class_id: CLASS_IDS[0], booking_date: '2026-05-25', status: 'confirmed' },
  { member_id: MEMBER_IDS[3], class_id: CLASS_IDS[0], booking_date: '2026-05-25', status: 'confirmed' },
  { member_id: MEMBER_IDS[6], class_id: CLASS_IDS[1], booking_date: '2026-05-25', status: 'confirmed' },
  { member_id: MEMBER_IDS[0], class_id: CLASS_IDS[2], booking_date: '2026-05-26', status: 'confirmed' },
  { member_id: MEMBER_IDS[3], class_id: CLASS_IDS[2], booking_date: '2026-05-26', status: 'confirmed' },
  { member_id: MEMBER_IDS[6], class_id: CLASS_IDS[2], booking_date: '2026-05-26', status: 'confirmed' },
  { member_id: MEMBER_IDS[0], class_id: CLASS_IDS[4], booking_date: '2026-05-27', status: 'confirmed' },
  { member_id: MEMBER_IDS[6], class_id: CLASS_IDS[4], booking_date: '2026-05-27', status: 'confirmed' },
  { member_id: MEMBER_IDS[1], class_id: CLASS_IDS[5], booking_date: '2026-05-28', status: 'confirmed' },
  { member_id: MEMBER_IDS[0], class_id: CLASS_IDS[7], booking_date: '2026-05-29', status: 'confirmed' },
  { member_id: MEMBER_IDS[3], class_id: CLASS_IDS[7], booking_date: '2026-05-29', status: 'confirmed' },
  { member_id: MEMBER_IDS[6], class_id: CLASS_IDS[7], booking_date: '2026-05-29', status: 'confirmed' },
  { member_id: MEMBER_IDS[0], class_id: CLASS_IDS[0], booking_date: '2026-06-01', status: 'confirmed' },
  { member_id: MEMBER_IDS[3], class_id: CLASS_IDS[0], booking_date: '2026-06-01', status: 'confirmed' },
  { member_id: MEMBER_IDS[2], class_id: CLASS_IDS[0], booking_date: '2026-06-01', status: 'confirmed' },
  { member_id: MEMBER_IDS[0], class_id: CLASS_IDS[2], booking_date: '2026-06-02', status: 'confirmed' },
  { member_id: MEMBER_IDS[6], class_id: CLASS_IDS[4], booking_date: '2026-06-03', status: 'confirmed' },
];

for (const b of bookingData) {
  insert('bookings', b);
}

// ─── ATTENDANCE ───
const attendanceData = [
  { member_id: MEMBER_IDS[0], class_id: CLASS_IDS[0], check_in_time: '2026-05-25 06:02:00' },
  { member_id: MEMBER_IDS[3], class_id: CLASS_IDS[0], check_in_time: '2026-05-25 06:05:00' },
  { member_id: MEMBER_IDS[6], class_id: CLASS_IDS[2], check_in_time: '2026-05-26 09:01:00' },
  { member_id: MEMBER_IDS[0], class_id: CLASS_IDS[2], check_in_time: '2026-05-26 09:00:00' },
  { member_id: MEMBER_IDS[3], class_id: CLASS_IDS[2], check_in_time: '2026-05-26 08:59:00' },
  { member_id: MEMBER_IDS[0], class_id: CLASS_IDS[4], check_in_time: '2026-05-27 18:05:00' },
  { member_id: MEMBER_IDS[6], class_id: CLASS_IDS[4], check_in_time: '2026-05-27 18:02:00' },
  { member_id: MEMBER_IDS[3], class_id: CLASS_IDS[7], check_in_time: '2026-05-29 12:00:00' },
];

for (const a of attendanceData) {
  insert('attendance', a);
}

// ─── TRANSACTIONS ───
const transactions = [
  { member_id: MEMBER_IDS[0], type: 'membership', amount: 89.00, description: 'Monthly membership - May 2026', status: 'completed', payment_method: 'card', created_at: '2026-05-01 08:00:00' },
  { member_id: MEMBER_IDS[3], type: 'membership', amount: 89.00, description: 'Monthly membership - May 2026', status: 'completed', payment_method: 'card', created_at: '2026-05-01 08:05:00' },
  { member_id: MEMBER_IDS[6], type: 'membership', amount: 149.00, description: 'Fighter plan - May 2026', status: 'completed', payment_method: 'card', created_at: '2026-05-01 09:00:00' },
  { member_id: MEMBER_IDS[7], type: 'pt', amount: 80.00, description: 'Single PT session', status: 'completed', payment_method: 'card', created_at: '2026-05-15 14:00:00' },
  { member_id: MEMBER_IDS[1], type: 'membership', amount: 69.00, description: '2x week - trial month', status: 'completed', payment_method: 'bank_transfer', created_at: '2026-05-10 10:00:00' },
  { member_id: MEMBER_IDS[5], type: 'membership', amount: 89.00, description: 'Final month - Apr 2026', status: 'failed', payment_method: 'card', created_at: '2026-04-01 08:00:00' },
  { member_id: MEMBER_IDS[3], type: 'product', amount: 120.00, description: 'ROAR MMA T-Shirt + Hand Wraps', status: 'completed', payment_method: 'card', created_at: '2026-05-30 09:15:00' },
  { member_id: MEMBER_IDS[0], type: 'membership', amount: 89.00, description: 'Monthly membership - June 2026', status: 'completed', payment_method: 'card', created_at: '2026-05-30 10:00:00' },
];

for (const t of transactions) {
  insert('transactions', t);
}

// ─── STAFF TASKS ───
const tasks = [
  { assigned_to: 1, task_type: 'call_hot_lead', priority: 'high', title: 'Call Alex Green - hot lead', description: 'New website lead, showed high interest', due_date: '2026-06-01', status: 'pending' },
  { assigned_to: 1, task_type: 'follow_up_trial', priority: 'high', title: 'Follow up with Sarah Jones trial', description: 'Trial ending June 7, check interest', due_date: '2026-06-03', status: 'pending' },
  { assigned_to: 1, task_type: 'follow_up_trial', priority: 'high', title: 'Follow up with Mike Wilson trial', description: 'Trial ending June 3 - check conversion', due_date: '2026-06-01', status: 'pending' },
  { assigned_to: 1, task_type: 'check_no_show', priority: 'medium', title: 'Check no-show: Tom Anderson', description: "Hasn't attended since May 27", due_date: '2026-06-02', status: 'pending' },
  { assigned_to: 1, task_type: 'warm_lead_checkin', priority: 'medium', title: 'Check in with Ben Clark', description: 'Instagram lead, contacted but no response', due_date: '2026-06-01', status: 'pending' },
  { assigned_to: 1, task_type: 'reengagement', priority: 'low', title: 'Re-engagement for Lisa Taylor', description: 'Cancelled April 15, winback campaign', due_date: '2026-06-15', status: 'pending' },
  { assigned_to: 1, task_type: 'conversion_push', priority: 'high', title: 'Follow up Chloe Hall trial booking', description: 'Trial booked for June 1', due_date: '2026-06-02', status: 'pending' },
  { assigned_to: 1, task_type: 'call_hot_lead', priority: 'high', title: 'Call Grace Adams - referral lead', description: 'Referred by existing member', due_date: '2026-05-28', status: 'pending' },
];

for (const t of tasks) {
  insert('staff_tasks', t);
}

console.log('=== SEED COMPLETE ===');
console.log('Members:', members.length, '(IDs:', MEMBER_IDS.join(','), ')');
console.log('Leads:', leads.length);
console.log('Classes:', classes.length);
console.log('Bookings:', bookingData.length);
console.log('Attendance:', attendanceData.length);
console.log('Transactions:', transactions.length);
console.log('Tasks:', tasks.length);
