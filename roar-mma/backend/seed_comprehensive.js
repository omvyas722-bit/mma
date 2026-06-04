require('dotenv').config();
const { getDatabase } = require('./db/connection');

const db = getDatabase();

console.log('Clearing existing data...');
db.exec('PRAGMA foreign_keys = OFF');
try {
  // Delete in dependency order (child tables first)
  db.exec("DELETE FROM staff_tasks");
  db.exec("DELETE FROM grading_participants");
  db.exec("DELETE FROM grading_history");
  db.exec("DELETE FROM member_techniques");
  db.exec("DELETE FROM member_belt_progress");
  db.exec("DELETE FROM grading_sessions");
  db.exec("DELETE FROM grading_requirements");
  db.exec("DELETE FROM belt_levels");
  db.exec("DELETE FROM pt_session_notes");
  db.exec("DELETE FROM pt_sessions");
  db.exec("DELETE FROM member_pt_packages");
  db.exec("DELETE FROM pt_packages");
  db.exec("DELETE FROM coach_commissions");
  db.exec("DELETE FROM scheduled_messages");
  db.exec("DELETE FROM message_templates");
  db.exec("DELETE FROM stock_movements");
  db.exec("DELETE FROM stock_alerts");
  db.exec("DELETE FROM purchase_order_items");
  db.exec("DELETE FROM purchase_orders");
  db.exec("DELETE FROM product_sales");
  db.exec("DELETE FROM products");
  db.exec("DELETE FROM suppliers");
  db.exec("DELETE FROM retention_events");
  db.exec("DELETE FROM winback_campaigns");
  db.exec("DELETE FROM retention_offers");
  db.exec("DELETE FROM cancellation_requests");
  db.exec("DELETE FROM attendance");
  db.exec("DELETE FROM bookings");
  db.exec("DELETE FROM transactions");
  db.exec("DELETE FROM leads");
  db.exec("DELETE FROM classes");
  db.exec("DELETE FROM members WHERE id > 1");
  db.exec("DELETE FROM stock_adjustments");
  db.exec("DELETE FROM sqlite_sequence");
} finally {
  db.exec('PRAGMA foreign_keys = ON');
}
console.log('Cleared.');

// ─── STAFF ───
const realHash = require('bcrypt').hashSync('password123', 10);
const staffSeed = [
  { name: 'Mike "The Hammer" Johnson', email: 'mike.johnson@roarmma.com', password_hash: realHash, role: 'coach', phone: '555-0123' },
  { name: 'Sarah Connor', email: 'sarah.connor@roarmma.com', password_hash: realHash, role: 'coach', phone: '555-0124' },
  { name: 'Jake Perez', email: 'jake.perez@roarmma.com', password_hash: realHash, role: 'coach', phone: '555-0125' },
  { name: 'Lisa Rodriguez', email: 'lisa.rodriguez@roarmma.com', password_hash: realHash, role: 'front_desk', phone: '555-0126' },
  { name: 'Tom Chen', email: 'tom.chen@roarmma.com', password_hash: realHash, role: 'sales', phone: '555-0127' },
  { name: 'Rachel Green', email: 'rachel.green@roarmma.com', password_hash: realHash, role: 'gm', phone: '555-0128' },
  { name: 'Diego Silva', email: 'diego.silva@roarmma.com', password_hash: realHash, role: 'coach', phone: '555-0129' },
];
const insertStaff = db.prepare(`INSERT OR IGNORE INTO staff (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)`);
for (const s of staffSeed) insertStaff.run(s.name, s.email, s.password_hash, s.role, s.phone);

// Map emails to actual DB IDs (don't hardcode IDs)
const staffEmailToId = {};
for (const s of staffSeed) {
  const row = db.prepare('SELECT id FROM staff WHERE email = ?').get(s.email);
  staffEmailToId[s.email] = row.id;
}
const S_MIKE = staffEmailToId['mike.johnson@roarmma.com'];
const S_SARAH = staffEmailToId['sarah.connor@roarmma.com'];
const S_JAKE = staffEmailToId['jake.perez@roarmma.com'];
const S_TOM = staffEmailToId['tom.chen@roarmma.com'];
const S_LISA = staffEmailToId['lisa.rodriguez@roarmma.com'];
const S_DIEGO = staffEmailToId['diego.silva@roarmma.com'];

// Ensure admin user exists for cancellation requests
let adminUserId = null;
const adminRow = db.prepare("SELECT id FROM staff WHERE role = 'owner' LIMIT 1").get();
if (adminRow) {
  adminUserId = adminRow.id;
} else {
  const bcrypt = require('bcrypt');
  const adminHash = bcrypt.hashSync('changeme123', 10);
  db.prepare("INSERT OR IGNORE INTO staff (name, email, password_hash, role, active) VALUES (?, ?, ?, ?, 1)")
    .run('Admin User', 'admin@roarmma.com.au', adminHash, 'owner');
  const newAdmin = db.prepare("SELECT id FROM staff WHERE email = 'admin@roarmma.com.au'").get();
  adminUserId = newAdmin ? newAdmin.id : null;
}

console.log(`Staff: ${staffSeed.length}`);

// ─── PT PACKAGES ───
const ptPackages = [
  { id: 1, name: 'Starter Pack', sessions_count: 5, price: 299, validity_days: 90 },
  { id: 2, name: 'Standard Pack', sessions_count: 10, price: 549, validity_days: 180 },
  { id: 3, name: 'Premium Pack', sessions_count: 20, price: 999, validity_days: 365 },
  { id: 4, name: 'Trial Session', sessions_count: 1, price: 49, validity_days: 30 },
];
const insertPtPkg = db.prepare(`INSERT OR IGNORE INTO pt_packages (id, name, sessions_count, price, validity_days) VALUES (?, ?, ?, ?, ?)`);
for (const p of ptPackages) insertPtPkg.run(p.id, p.name, p.sessions_count, p.price, p.validity_days);
console.log(`PT Packages: ${ptPackages.length}`);

// ─── BELT LEVELS ───
const beltLevels = [
  { id: 1, name: 'White', rank_order: 1, stripe_count: 4, color_code: '#FFFFFF', min_time_months: 0, min_classes_attended: 0 },
  { id: 2, name: 'Blue', rank_order: 2, stripe_count: 4, color_code: '#0066CC', min_time_months: 6, min_classes_attended: 48 },
  { id: 3, name: 'Purple', rank_order: 3, stripe_count: 4, color_code: '#6600CC', min_time_months: 18, min_classes_attended: 144 },
  { id: 4, name: 'Brown', rank_order: 4, stripe_count: 4, color_code: '#663300', min_time_months: 24, min_classes_attended: 192 },
  { id: 5, name: 'Black', rank_order: 5, stripe_count: 0, color_code: '#000000', min_time_months: 36, min_classes_attended: 288 },
];
const insertBelt = db.prepare(`INSERT OR IGNORE INTO belt_levels (id, name, rank_order, stripe_count, color_code, min_time_months, min_classes_attended) VALUES (?, ?, ?, ?, ?, ?, ?)`);
for (const b of beltLevels) insertBelt.run(b.id, b.name, b.rank_order, b.stripe_count, b.color_code, b.min_time_months, b.min_classes_attended);
console.log(`Belt Levels: ${beltLevels.length}`);

// ─── SUPPLIERS ───
const suppliers = [
  { name: 'MMA Gear Pro', contact_person: 'Dave Miller', email: 'dave@mmagearpro.com', phone: '555-1001' },
  { name: 'Fight Supply Co', contact_person: 'Anna Smith', email: 'anna@fightsupply.com', phone: '555-1002' },
  { name: 'Premium Mats Ltd', contact_person: 'John Walker', email: 'john@premiummats.com', phone: '555-1003' },
];
const insertSupplier = db.prepare(`INSERT INTO suppliers (name, contact_person, email, phone) VALUES (?, ?, ?, ?)`);
for (const s of suppliers) insertSupplier.run(s.name, s.contact_person, s.email, s.phone);
console.log(`Suppliers: ${suppliers.length}`);

// ─── MEMBERS ───
const members = [
  { id: 20, first_name: 'John', last_name: 'Smith', email: 'john.smith@email.com', phone: '555-0101', status: 'active', plan: 'unlimited', joined_date: '2025-11-15', goals: 'Compete in BJJ tournament within 12 months', experience_level: 'intermediate', injuries: 'None', medical_conditions: 'Asthma (controlled)', location: 'rockingham' },
  { id: 21, first_name: 'Sarah', last_name: 'Jones', email: 'sarah.jones@email.com', phone: '555-0102', status: 'active', plan: 'unlimited', joined_date: '2026-01-10', goals: 'Lose weight and build confidence', experience_level: 'beginner', injuries: 'Old ankle sprain (healed)', medical_conditions: 'None', location: 'rockingham' },
  { id: 22, first_name: 'Mike', last_name: 'Wilson', email: 'mike.wilson@email.com', phone: '555-0103', status: 'active', plan: '3x_week', joined_date: '2026-02-20', goals: 'Get MMA fight-ready', experience_level: 'advanced', injuries: 'Shoulder tendinitis', medical_conditions: 'None', location: 'bibra_lake' },
  { id: 23, first_name: 'Emma', last_name: 'Brown', email: 'emma.brown@email.com', phone: '555-0104', status: 'active', plan: 'unlimited', joined_date: '2026-03-01', goals: 'Self-defense skills and fitness', experience_level: 'beginner', injuries: 'None', medical_conditions: 'None', location: 'rockingham' },
  { id: 24, first_name: 'James', last_name: 'Davis', email: 'james.davis@email.com', phone: '555-0105', status: 'paused', plan: 'unlimited', joined_date: '2025-09-01', goals: 'Stress relief and conditioning', experience_level: 'intermediate', injuries: 'Lower back pain', medical_conditions: 'None', pause_start: '2026-05-01', pause_end: '2026-06-15', location: 'rockingham' },
  { id: 25, first_name: 'Lisa', last_name: 'Taylor', email: 'lisa.taylor@email.com', phone: '555-0106', status: 'cancelled', plan: '3x_week', joined_date: '2025-07-15', goals: 'General fitness', experience_level: 'beginner', injuries: 'None', medical_conditions: 'None', cancellation_date: '2026-04-28', location: 'rockingham' },
  { id: 26, first_name: 'Tom', last_name: 'Anderson', email: 'tom.anderson@email.com', phone: '555-0107', status: 'active', plan: 'pt_only', joined_date: '2026-04-01', goals: 'Compete in Muay Thai', experience_level: 'intermediate', injuries: 'None', medical_conditions: 'None', location: 'rockingham' },
  { id: 27, first_name: 'Kate', last_name: 'White', email: 'kate.white@email.com', phone: '555-0108', status: 'active', plan: '3x_week', joined_date: '2026-04-15', goals: 'Post-pregnancy fitness', experience_level: 'beginner', injuries: 'Diastasis recti (managed)', medical_conditions: 'None', location: 'bibra_lake' },
  { id: 28, first_name: 'Marcus', last_name: 'Lee', email: 'marcus.lee@email.com', phone: '555-0109', status: 'active', plan: 'unlimited', joined_date: '2026-05-01', goals: 'Cross-train for rugby season', experience_level: 'intermediate', injuries: 'Knee rehab (ACL recovery)', medical_conditions: 'None', location: 'bibra_lake' },
  { id: 29, first_name: 'Diana', last_name: 'Martinez', email: 'diana.m@email.com', phone: '555-0110', status: 'trial', plan: null, joined_date: '2026-05-25', trial_end_date: '2026-06-01', goals: 'Trying something new, nervous about starting', experience_level: 'beginner', injuries: 'None', medical_conditions: 'None', location: 'rockingham' },
  { id: 30, first_name: 'Chris', last_name: 'Patel', email: 'chris.p@email.com', phone: '555-0111', status: 'trial', plan: null, joined_date: '2026-05-28', trial_end_date: '2026-06-04', goals: 'Wants to get in shape for wedding in August', experience_level: 'beginner', injuries: 'None', medical_conditions: 'None', location: 'bibra_lake' },
];
const insertMember = db.prepare(`INSERT OR IGNORE INTO members (id, first_name, last_name, email, phone, status, plan, joined_date, trial_end_date, pause_start, pause_end, cancellation_date, goals, experience_level, injuries, medical_conditions, location) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
for (const m of members) insertMember.run(m.id, m.first_name, m.last_name, m.email, m.phone, m.status, m.plan, m.joined_date, m.trial_end_date || null, m.pause_start || null, m.pause_end || null, m.cancellation_date || null, m.goals, m.experience_level, m.injuries || null, m.medical_conditions || null, m.location);
console.log(`Members: ${members.length}`);

// ─── MEMBER BELT PROGRESS ───
const beltProgress = [
  { member_id: 20, current_belt_id: 2, current_stripes: 2, belt_awarded_date: '2026-03-15', next_grading_eligible_date: '2026-09-15', classes_attended_since_belt: 45, months_at_current_belt: 3 },
  { member_id: 22, current_belt_id: 3, current_stripes: 1, belt_awarded_date: '2025-12-01', next_grading_eligible_date: '2026-06-01', classes_attended_since_belt: 60, months_at_current_belt: 6 },
  { member_id: 26, current_belt_id: 2, current_stripes: 0, belt_awarded_date: '2026-05-01', next_grading_eligible_date: '2026-11-01', classes_attended_since_belt: 12, months_at_current_belt: 1 },
  { member_id: 24, current_belt_id: 2, current_stripes: 3, belt_awarded_date: '2026-02-01', next_grading_eligible_date: '2026-08-01', classes_attended_since_belt: 30, months_at_current_belt: 4 },
  { member_id: 21, current_belt_id: 1, current_stripes: 1, belt_awarded_date: '2026-01-10', next_grading_eligible_date: '2027-01-10', classes_attended_since_belt: 20, months_at_current_belt: 5 },
  { member_id: 28, current_belt_id: 2, current_stripes: 1, belt_awarded_date: '2026-04-20', next_grading_eligible_date: '2026-10-20', classes_attended_since_belt: 10, months_at_current_belt: 1 },
];
const insertBeltProgress = db.prepare(`INSERT INTO member_belt_progress (member_id, current_belt_id, current_stripes, belt_awarded_date, next_grading_eligible_date, classes_attended_since_belt, months_at_current_belt) VALUES (?,?,?,?,?,?,?)`);
for (const b of beltProgress) insertBeltProgress.run(b.member_id, b.current_belt_id, b.current_stripes, b.belt_awarded_date, b.next_grading_eligible_date, b.classes_attended_since_belt, b.months_at_current_belt);
console.log(`Belt Progress: ${beltProgress.length}`);

// ─── MEMBER PT PACKAGES ───
const memberPtPkgs = [
  { member_id: 26, package_id: 2, sessions_total: 10, sessions_used: 3, sessions_remaining: 7, purchase_date: '2026-04-01', amount_paid: 549 },
  { member_id: 20, package_id: 3, sessions_total: 20, sessions_used: 8, sessions_remaining: 12, purchase_date: '2026-01-15', amount_paid: 999 },
  { member_id: 22, package_id: 4, sessions_total: 1, sessions_used: 1, sessions_remaining: 0, purchase_date: '2026-03-01', amount_paid: 49 },
  { member_id: 24, package_id: 1, sessions_total: 5, sessions_used: 0, sessions_remaining: 5, purchase_date: '2026-05-01', amount_paid: 299 },
];
const insertMemberPt = db.prepare(`INSERT INTO member_pt_packages (member_id, package_id, sessions_total, sessions_used, sessions_remaining, purchase_date, amount_paid) VALUES (?,?,?,?,?,?,?)`);
for (const p of memberPtPkgs) insertMemberPt.run(p.member_id, p.package_id, p.sessions_total, p.sessions_used, p.sessions_remaining, p.purchase_date, p.amount_paid);
console.log(`Member PT Packages: ${memberPtPkgs.length}`);

// ─── LEADS ───
const leads = [
  { first_name: 'Alex', last_name: 'Green', email: 'alex.green@email.com', phone: '555-0201', source: 'website', stage: 'new', interest_level: 'high', location: 'rockingham', notes: 'Found us via Google search for "BJJ gyms near me". Very keen, asked about beginner classes.', follow_up_status: 'pending' },
  { first_name: 'Grace', last_name: 'Adams', email: 'grace.adams@email.com', phone: '555-0202', source: 'referral', stage: 'new', interest_level: 'medium', location: 'Bondi', referrer_member_id: 20, notes: 'Referred by John Smith (member). Interested in Muay Thai. Works shifts so schedule flexibility important.', follow_up_status: 'pending' },
  { first_name: 'Ryan', last_name: 'Baker', email: 'ryan.baker@email.com', phone: '555-0203', source: 'instagram', stage: 'contacted', interest_level: 'medium', location: 'Parramatta', assigned_to: S_TOM, notes: 'Replied to our DM, said he\'s "thinking about it". Has trained jiu-jitsu before in college. Follow up with trial offer.', follow_up_status: 'in_progress', last_contact_date: '2026-05-28' },
  { first_name: 'Mia', last_name: 'Chang', email: 'mia.chang@email.com', phone: '555-0204', source: 'facebook', stage: 'contacted', interest_level: 'high', location: 'Sydney', assigned_to: S_TOM, notes: 'Signed up for free trial link but hasnt booked her session yet. Works in CBD, evenings only.', follow_up_status: 'in_progress', last_contact_date: '2026-05-27' },
  { first_name: 'Jake', last_name: 'Miller', email: 'jake.m@email.com', phone: '555-0205', source: 'walk_in', stage: 'trial_booked', interest_level: 'high', location: 'Newtown', assigned_to: S_SARAH, trial_date: '2026-05-31', trial_class_type: 'bjj', trial_coach_id: S_SARAH, notes: 'Walked past, saw sparring through window, came in immediately. Has wrestling background in high school.', follow_up_status: 'pending' },
  { first_name: 'Noah', last_name: 'Williams', email: 'noah.w@email.com', phone: '555-0207', source: 'referral', stage: 'trial_completed', interest_level: 'medium', location: 'Chatswood', referrer_member_id: 26, assigned_to: S_TOM, notes: 'Had trial BJJ session with Tom Anderson (member). Liked it but said "price is a bit steep". Follow up with pricing options.', follow_up_status: 'in_progress', last_contact_date: '2026-05-26' },
  { first_name: 'Sophie', last_name: 'Clark', email: 'sophie.c@email.com', phone: '555-0208', source: 'instagram', stage: 'trial_completed', interest_level: 'medium', location: 'Bondi', assigned_to: S_TOM, trial_experience_rating: 4, trial_interest_level: 'warm', trial_notes: 'Loved the Muay Thai class with Sarah. Shes a yoga teacher so flexibility is good, concerned about injury risk.', follow_up_status: 'pending', last_contact_date: '2026-05-25' },
  { first_name: 'Ethan', last_name: 'Harris', email: 'ethan.h@email.com', phone: '555-0209', source: 'google', stage: 'converted', interest_level: null, location: 'Sydney', converted_member_id: 29, notes: 'Converted to trial membership. Started May 25. Referred by friend who trains at another gym.', follow_up_status: 'completed', last_contact_date: '2026-05-25' },
  { first_name: 'Liam', last_name: 'Roberts', email: 'liam.r@email.com', phone: '555-0210', source: 'facebook', stage: 'lost', interest_level: 'low', location: 'Parramatta', lost_reason: 'Chose a different gym closer to home', notes: 'Was interested in Muay Thai but found a gym in Parramatta closer to his work.', follow_up_status: 'completed' },
  { first_name: 'Zoe', last_name: 'Martin', email: 'zoe.martin@email.com', phone: '555-0211', source: 'referral', stage: 'contacted', interest_level: 'medium', location: 'Sydney', referrer_member_id: 22, assigned_to: S_TOM, notes: 'Friend of Mike Wilson. Asked about womens-only sessions. Does NOT want to spar initially.', follow_up_status: 'in_progress', last_contact_date: '2026-05-24' },
];
const insertLead = db.prepare(`INSERT INTO leads (first_name, last_name, email, phone, source, stage, interest_level, location, referrer_member_id, assigned_to, notes, follow_up_status, last_contact_date, converted_member_id, lost_reason, trial_date, trial_class_type, trial_coach_id, trial_experience_rating, trial_interest_level, trial_notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
for (const l of leads) insertLead.run(l.first_name, l.last_name, l.email || null, l.phone, l.source, l.stage, l.interest_level || null, l.location || null, l.referrer_member_id || null, l.assigned_to || null, l.notes || null, l.follow_up_status || 'pending', l.last_contact_date || null, l.converted_member_id || null, l.lost_reason || null, l.trial_date || null, l.trial_class_type || null, l.trial_coach_id || null, l.trial_experience_rating || null, l.trial_interest_level || null, l.trial_notes || null);
console.log(`Leads: ${leads.length}`);

// ─── CLASSES ───
const classes = [
  { id: 1, name: 'Morning BJJ', description: 'Early morning Brazilian Jiu-Jitsu for all levels', class_type: 'bjj', instructor_id: S_SARAH, day_of_week: 0, start_time: '06:00', end_time: '07:30', max_capacity: 25, location: 'Main Mat' },
  { id: 2, name: 'Muay Thai Fundamentals', description: 'Beginner-friendly Muay Thai', class_type: 'muay_thai', instructor_id: S_MIKE, day_of_week: 0, start_time: '09:00', end_time: '10:30', max_capacity: 20, location: 'Heavy Bag Room' },
  { id: 3, name: 'MMA Advanced', description: 'Advanced mixed martial arts sparring and drills', class_type: 'mma', instructor_id: S_JAKE, day_of_week: 1, start_time: '06:00', end_time: '08:00', max_capacity: 15, location: 'Cage Area' },
  { id: 4, name: 'BJJ Gi', description: 'Gi Brazilian Jiu-Jitsu technique and rolling', class_type: 'bjj', instructor_id: S_SARAH, day_of_week: 1, start_time: '17:00', end_time: '18:30', max_capacity: 25, location: 'Main Mat' },
  { id: 5, name: 'Muay Thai Intermediate', description: 'Intermediate Muay Thai with pad work and sparring', class_type: 'muay_thai', instructor_id: S_MIKE, day_of_week: 2, start_time: '17:00', end_time: '18:30', max_capacity: 20, location: 'Heavy Bag Room' },
  { id: 6, name: 'Wrestling for BJJ', description: 'Wrestling fundamentals applied to BJJ', class_type: 'bjj', instructor_id: S_JAKE, day_of_week: 2, start_time: '18:30', end_time: '20:00', max_capacity: 20, location: 'Main Mat' },
  { id: 7, name: 'Boxing Conditioning', description: 'Boxing fitness and technique', class_type: 'boxing', instructor_id: S_DIEGO, day_of_week: 3, start_time: '06:00', end_time: '07:00', max_capacity: 20, location: 'Heavy Bag Room' },
  { id: 8, name: 'Open Mat', description: 'Supervised open training session', class_type: 'bjj', instructor_id: S_SARAH, day_of_week: 3, start_time: '12:00', end_time: '14:00', max_capacity: 30, location: 'Main Mat' },
  { id: 9, name: 'Muay Thai Advanced', description: 'Advanced Muay Thai for experienced students', class_type: 'muay_thai', instructor_id: S_MIKE, day_of_week: 4, start_time: '06:00', end_time: '07:30', max_capacity: 15, location: 'Heavy Bag Room' },
  { id: 10, name: 'BJJ No-Gi', description: 'No-gi Brazilian Jiu-Jitsu', class_type: 'bjj', instructor_id: S_SARAH, day_of_week: 4, start_time: '17:00', end_time: '18:30', max_capacity: 25, location: 'Main Mat' },
  { id: 11, name: 'Weekend Open Mat', description: 'Saturday open mat for all members', class_type: 'bjj', instructor_id: S_MIKE, day_of_week: 5, start_time: '09:00', end_time: '11:00', max_capacity: 30, location: 'Main Mat' },
  { id: 12, name: 'Kids BJJ', description: 'BJJ for ages 8-14', class_type: 'bjj', instructor_id: S_DIEGO, day_of_week: 5, start_time: '11:00', end_time: '12:00', max_capacity: 15, location: 'Side Mat' },
];
const insertClass = db.prepare(`INSERT OR IGNORE INTO classes (id, name, description, class_type, instructor_id, day_of_week, start_time, end_time, max_capacity, location) VALUES (?,?,?,?,?,?,?,?,?,?)`);
for (const c of classes) insertClass.run(c.id, c.name, c.description, c.class_type, c.instructor_id, c.day_of_week, c.start_time, c.end_time, c.max_capacity, c.location);
console.log(`Classes: ${classes.length}`);

// ─── BOOKINGS ───
const today = '2026-05-30';
const yesterday = '2026-05-29';
const tomorrow = '2026-05-31';
const bookings = [
  { member_id: 20, class_id: 1, booking_date: today, status: 'confirmed' },
  { member_id: 21, class_id: 2, booking_date: today, status: 'confirmed' },
  { member_id: 22, class_id: 3, booking_date: yesterday, status: 'attended' },
  { member_id: 20, class_id: 4, booking_date: yesterday, status: 'attended' },
  { member_id: 23, class_id: 4, booking_date: yesterday, status: 'attended' },
  { member_id: 26, class_id: 5, booking_date: yesterday, status: 'no_show' },
  { member_id: 27, class_id: 2, booking_date: yesterday, status: 'attended' },
  { member_id: 26, class_id: 1, booking_date: today, status: 'confirmed' },
  { member_id: 22, class_id: 3, booking_date: today, status: 'confirmed' },
  { member_id: 20, class_id: 4, booking_date: today, status: 'confirmed' },
  { member_id: 23, class_id: 4, booking_date: today, status: 'confirmed' },
  { member_id: 28, class_id: 3, booking_date: today, status: 'confirmed' },
  { member_id: 21, class_id: 4, booking_date: today, status: 'confirmed' },
  { member_id: 29, class_id: 2, booking_date: tomorrow, status: 'confirmed' },
  { member_id: 30, class_id: 5, booking_date: tomorrow, status: 'confirmed' },
  { member_id: 25, class_id: 2, booking_date: yesterday, status: 'cancelled' },
  { member_id: 24, class_id: 4, booking_date: yesterday, status: 'cancelled' },
  { member_id: 20, class_id: 1, booking_date: yesterday, status: 'attended' },
  { member_id: 22, class_id: 6, booking_date: yesterday, status: 'attended' },
  { member_id: 26, class_id: 9, booking_date: tomorrow, status: 'confirmed' },
  { member_id: 28, class_id: 6, booking_date: today, status: 'confirmed' },
  { member_id: 27, class_id: 4, booking_date: tomorrow, status: 'confirmed' },
  { member_id: 20, class_id: 4, booking_date: tomorrow, status: 'confirmed' },
  { member_id: 29, class_id: 2, booking_date: today, status: 'confirmed' },
  { member_id: 30, class_id: 11, booking_date: tomorrow, status: 'confirmed' },
];
const insertBooking = db.prepare(`INSERT INTO bookings (member_id, class_id, booking_date, status) VALUES (?, ?, ?, ?)`);
for (const b of bookings) insertBooking.run(b.member_id, b.class_id, b.booking_date, b.status);
console.log(`Bookings: ${bookings.length}`);

// ─── ATTENDANCE ───
const attendance = [
  { member_id: 20, class_id: 1, check_in_time: `${today} 06:00:00` },
  { member_id: 21, class_id: 2, check_in_time: `${today} 09:00:00` },
  { member_id: 22, class_id: 3, check_in_time: `${yesterday} 06:00:00` },
  { member_id: 20, class_id: 4, check_in_time: `${yesterday} 17:00:00` },
  { member_id: 23, class_id: 4, check_in_time: `${yesterday} 17:00:00` },
  { member_id: 27, class_id: 2, check_in_time: `${yesterday} 09:00:00` },
  { member_id: 22, class_id: 6, check_in_time: `${yesterday} 18:30:00` },
  { member_id: 20, class_id: 1, check_in_time: `${yesterday} 06:00:00` },
  { member_id: 22, class_id: 3, check_in_time: `${today} 06:00:00` },
  { member_id: 28, class_id: 3, check_in_time: `${today} 06:00:00` },
  { member_id: 21, class_id: 2, check_in_time: `${yesterday} 09:00:00` },
  { member_id: 26, class_id: 1, check_in_time: `${today} 06:00:00` },
  { member_id: 28, class_id: 6, check_in_time: `${today} 18:30:00` },
  { member_id: 23, class_id: 4, check_in_time: `${today} 17:00:00` },
  { member_id: 20, class_id: 4, check_in_time: `${today} 17:00:00` },
  { member_id: 21, class_id: 4, check_in_time: `${today} 17:00:00` },
];
const insertAttendance = db.prepare(`INSERT INTO attendance (member_id, class_id, check_in_time) VALUES (?, ?, ?)`);
for (const a of attendance) insertAttendance.run(a.member_id, a.class_id, a.check_in_time);
console.log(`Attendance: ${attendance.length}`);

// ─── TRANSACTIONS ───
const currentMonthLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
const transactions = [
  { member_id: 20, type: 'membership', amount: 199.00, status: 'completed', payment_method: 'card', description: `Monthly unlimited membership - ${currentMonthLabel}` },
  { member_id: 21, type: 'membership', amount: 199.00, status: 'completed', payment_method: 'card', description: `Monthly unlimited membership - ${currentMonthLabel}` },
  { member_id: 22, type: 'membership', amount: 149.00, status: 'completed', payment_method: 'card', description: `3x/week membership - ${currentMonthLabel}` },
  { member_id: 23, type: 'membership', amount: 199.00, status: 'completed', payment_method: 'card', description: `Monthly unlimited membership - ${currentMonthLabel}` },
  { member_id: 26, type: 'membership', amount: 249.00, status: 'completed', payment_method: 'card', description: `PT Plus membership - ${currentMonthLabel}` },
  { member_id: 27, type: 'membership', amount: 149.00, status: 'completed', payment_method: 'card', description: `3x/week membership - ${currentMonthLabel}` },
  { member_id: 28, type: 'membership', amount: 199.00, status: 'completed', payment_method: 'card', description: `Monthly unlimited membership - ${currentMonthLabel}` },
  { member_id: 20, type: 'product', amount: 120.00, status: 'completed', payment_method: 'card', description: 'Rash guard + shorts set' },
  { member_id: 26, type: 'pt', amount: 80.00, status: 'completed', payment_method: 'card', description: 'PT session - Muay Thai with Mike' },
  { member_id: 22, type: 'product', amount: 59.00, status: 'completed', payment_method: 'cash', description: 'Hand wraps + mouthguard' },
  { member_id: 24, type: 'membership', amount: 199.00, status: 'failed', payment_method: 'card', description: 'Monthly unlimited - payment declined (expired card)' },
  { member_id: 25, type: 'membership', amount: 149.00, status: 'failed', payment_method: 'card', description: 'Final charge attempt before cancellation' },
  { member_id: 21, type: 'product', amount: 89.00, status: 'completed', payment_method: 'card', description: 'BJJ Gi - white, size A2' },
  { member_id: 23, type: 'product', amount: 35.00, status: 'completed', payment_method: 'card', description: 'ROAR MMA t-shirt' },
  { member_id: 28, type: 'other', amount: 25.00, status: 'pending', payment_method: 'transfer', description: 'Guest pass fee - friend of Marcus' },
];
const insertTx = db.prepare(`INSERT INTO transactions (member_id, type, amount, status, payment_method, description) VALUES (?, ?, ?, ?, ?, ?)`);
for (const t of transactions) insertTx.run(t.member_id, t.type, t.amount, t.status, t.payment_method, t.description);
console.log(`Transactions: ${transactions.length}`);

// ─── PT SESSIONS ───
const ptSessions = [
  { member_id: 26, coach_id: S_MIKE, scheduled_date: today, scheduled_time: '07:30', duration_minutes: 60, status: 'scheduled', session_type: 'pt' },
  { member_id: 26, coach_id: S_MIKE, scheduled_date: yesterday, scheduled_time: '07:30', duration_minutes: 60, status: 'completed', session_type: 'pt', completed_at: `${yesterday} 08:30:00` },
  { member_id: 26, coach_id: S_MIKE, scheduled_date: '2026-05-27', scheduled_time: '07:30', duration_minutes: 60, status: 'completed', session_type: 'pt', completed_at: '2026-05-27 08:30:00' },
  { member_id: 20, coach_id: S_SARAH, scheduled_date: yesterday, scheduled_time: '15:00', duration_minutes: 60, status: 'completed', session_type: 'pt', completed_at: `${yesterday} 16:00:00` },
  { member_id: 20, coach_id: S_SARAH, scheduled_date: '2026-05-27', scheduled_time: '15:00', duration_minutes: 60, status: 'completed', session_type: 'pt', completed_at: '2026-05-27 16:00:00' },
  { member_id: 22, coach_id: S_JAKE, scheduled_date: '2026-05-27', scheduled_time: '16:00', duration_minutes: 60, status: 'completed', session_type: 'pt', completed_at: '2026-05-27 17:00:00' },
];
const insertPt = db.prepare(`INSERT INTO pt_sessions (member_id, coach_id, scheduled_date, scheduled_time, duration_minutes, status, session_type, completed_at) VALUES (?,?,?,?,?,?,?,?)`);
for (const s of ptSessions) insertPt.run(s.member_id, s.coach_id, s.scheduled_date, s.scheduled_time, s.duration_minutes, s.status, s.session_type, s.completed_at || null);
console.log(`PT Sessions: ${ptSessions.length}`);

// ─── PRODUCTS ───
const products = [
  { name: 'ROAR MMA Rash Guard', category: 'apparel', sku: 'RG-001', cost_price: 25.00, sell_price: 59.95, stock_quantity: 45, min_stock_level: 10, size: 'M/L/XL', brand: 'ROAR MMA' },
  { name: 'BJJ Gi - White', category: 'apparel', sku: 'GI-W-001', cost_price: 45.00, sell_price: 99.95, stock_quantity: 12, min_stock_level: 5, size: 'A1/A2/A3', brand: 'ROAR MMA' },
  { name: 'Muay Thai Shorts', category: 'apparel', sku: 'MT-001', cost_price: 20.00, sell_price: 49.95, stock_quantity: 2, min_stock_level: 8, size: 'S/M/L', brand: 'ROAR MMA' },
  { name: 'Hand Wraps (pair)', category: 'accessories', sku: 'HW-001', cost_price: 3.50, sell_price: 12.00, stock_quantity: 80, min_stock_level: 20, brand: 'Fight Supply Co' },
  { name: 'Mouthguard', category: 'accessories', sku: 'MG-001', cost_price: 5.00, sell_price: 19.95, stock_quantity: 30, min_stock_level: 10, brand: 'Shock Doctor' },
  { name: 'MMA Gloves', category: 'equipment', sku: 'GL-001', cost_price: 30.00, sell_price: 79.95, stock_quantity: 3, min_stock_level: 5, size: 'S/M/L', brand: 'MMA Gear Pro' },
  { name: 'Shin Guards', category: 'equipment', sku: 'SG-001', cost_price: 35.00, sell_price: 89.95, stock_quantity: 8, min_stock_level: 5, size: 'S/M/L', brand: 'MMA Gear Pro' },
  { name: 'ROAR MMA T-Shirt', category: 'apparel', sku: 'TS-001', cost_price: 12.00, sell_price: 34.95, stock_quantity: 60, min_stock_level: 15, size: 'S/M/L/XL', brand: 'ROAR MMA' },
];
const insertProduct = db.prepare(`INSERT INTO products (name, category, sku, cost_price, sell_price, stock_quantity, min_stock_level, size, brand) VALUES (?,?,?,?,?,?,?,?,?)`);
for (const p of products) insertProduct.run(p.name, p.category, p.sku, p.cost_price, p.sell_price, p.stock_quantity, p.min_stock_level, p.size || null, p.brand || null);
console.log(`Products: ${products.length}`);

// ─── STAFF TASKS ───
const staffTasks = [
  { lead_id: 1, assigned_to: S_TOM, task_type: 'call_hot_lead', priority: 'critical', title: 'Call Alex Green - hot website lead', description: 'Alex Green came in via website 4 hours ago, high interest in BJJ beginners. Call immediately.', due_date: today, status: 'pending' },
  { lead_id: 6, assigned_to: S_TOM, task_type: 'follow_up_trial', priority: 'high', title: 'Follow up with Noah Williams - trial completed', description: 'Noah had trial on 26th. Liked it but concerned about price. Send pricing options and offer first month discount.', due_date: today, status: 'in_progress' },
  { lead_id: 5, assigned_to: S_SARAH, task_type: 'trial_reminder', priority: 'high', title: 'Confirm Jake Miller trial session tomorrow', description: 'Jake has BJJ trial booked 31st with Coach Jake Perez. Call to confirm and ask about any injuries.', due_date: today, status: 'pending' },
  { lead_id: 7, assigned_to: S_TOM, task_type: 'warm_lead_checkin', priority: 'medium', title: 'Sophie Clark - warm lead check-in', description: 'Sophie completed trial 25th, rated 4/5. Interest shown but concerned about injury. Share injury prevention info.', due_date: tomorrow, status: 'pending' },
  { lead_id: 4, assigned_to: S_TOM, task_type: 'warm_lead_checkin', priority: 'medium', title: 'Mia Chang - contacted but no trial booked', description: 'Mia replied to FB ad, high interest but hasnt booked trial. Works CBD evenings.', due_date: tomorrow, status: 'pending' },
  { member_id: 24, assigned_to: S_TOM, task_type: 'reengagement', priority: 'medium', title: 'James Davis - paused membership check-in', description: 'James paused on 1st May due to back pain. Check if hes ready to return. Offer physio referral if needed.', due_date: tomorrow, status: 'pending' },
  { lead_id: 10, assigned_to: S_TOM, task_type: 'warm_lead_checkin', priority: 'medium', title: 'Zoe Martin - womens training inquiry', description: 'Zoe (friend of Mike Wilson) asked about womens-only sessions. Share womens class schedule and reassure about no-sparring option.', due_date: tomorrow, status: 'pending' },
  { member_id: 20, assigned_to: S_SARAH, task_type: 'check_no_show', priority: 'medium', title: 'John Smith - no PT session booked this week', description: 'John hasnt booked his weekly PT session. He has 12 remaining sessions in his Premium pack. Check in.', due_date: today, status: 'pending' },
  { lead_id: 2, assigned_to: S_TOM, task_type: 'call_hot_lead', priority: 'high', title: 'Call Grace Adams - referral from John Smith', description: 'Grace was referred by John Smith 4 hours ago. Interested in Muay Thai but works shifts. Find flexible schedule options.', due_date: today, status: 'pending' },
];
const insertTask = db.prepare(`INSERT INTO staff_tasks (lead_id, member_id, assigned_to, task_type, priority, title, description, due_date, status) VALUES (?,?,?,?,?,?,?,?,?)`);
for (const t of staffTasks) insertTask.run(t.lead_id || null, t.member_id || null, t.assigned_to || null, t.task_type, t.priority, t.title, t.description, t.due_date, t.status);
console.log(`Staff Tasks: ${staffTasks.length}`);

// ─── SCHEDULED MESSAGES ───
const scheduledMessages = [
  { lead_id: 5, message_type: 'sms', status: 'pending', recipient_phone: '555-0205', body: 'Hey Jake! Just confirming your BJJ trial session tomorrow at 9am with Coach Jake. Wear shorts and a t-shirt, we\'ve got everything else covered! See you soon - ROAR MMA 🥋', scheduled_for: `${today} 18:00:00` },
  { lead_id: 7, message_type: 'email', status: 'pending', recipient_email: 'sophie.c@email.com', subject: 'Special offer just for you, Sophie!', body: 'Hey Sophie, thanks for coming in for your trial session! We know you had concerns about injury, so we wanted to let you know our coaches are experts at scaling training to your comfort level. No pressure to spar! Want to come for another session this week? - ROAR MMA', scheduled_for: `${today} 10:00:00` },
  { lead_id: 8, message_type: 'sms', status: 'pending', recipient_phone: '555-0209', body: 'Hey Ethan! Glad you converted to trial membership. Your skills would fit perfectly in our evening classes. Want to come for another session this week? - ROAR MMA', scheduled_for: `${today} 14:00:00` },
  { lead_id: 10, message_type: 'email', status: 'pending', recipient_email: 'zoe.martin@email.com', subject: 'Women at ROAR MMA - your questions answered', body: 'Hi Zoe! Mike mentioned you were interested in training but had some questions about womens sessions. We have several women who train in our co-ed classes, and Sarah Connor runs a womens technique session every Saturday at 10am. No sparring required - you train at YOUR pace. Want to come watch a class? - Rachel, ROAR MMA Management', scheduled_for: `${today} 11:00:00` },
  { lead_id: 4, message_type: 'sms', status: 'pending', recipient_phone: '555-0204', body: 'Hi Mia! Still thinking about giving MMA a try? We have evening classes that finish by 8pm - perfect for CBD workers! Want to book a free trial session? Just reply YES and we\'ll set it up. - ROAR MMA', scheduled_for: `${today} 12:00:00` },
];
db.exec('PRAGMA foreign_keys = OFF');
const insertMsg = db.prepare(`INSERT INTO scheduled_messages (lead_id, message_type, status, recipient_phone, recipient_email, subject, body, scheduled_for) VALUES (?,?,?,?,?,?,?,?)`);
for (const m of scheduledMessages) insertMsg.run(m.lead_id || null, m.message_type, m.status, m.recipient_phone || null, m.recipient_email || null, m.subject || null, m.body, m.scheduled_for);
db.exec('PRAGMA foreign_keys = ON');
console.log(`Scheduled Messages: ${scheduledMessages.length}`);

// ─── CANCELLATION REQUESTS ───
const cancellations = [
  { member_id: 25, requested_by: adminUserId, cancellation_reason: 'Moving interstate for work', reason_category: 'moving', status: 'pending' },
  { member_id: 24, requested_by: 24, cancellation_reason: 'Back injury making training difficult', reason_category: 'injury', status: 'pending' },
];
const insertCancellation = db.prepare(`INSERT INTO cancellation_requests (member_id, requested_by, cancellation_reason, reason_category, status) VALUES (?,?,?,?,?)`);
for (const c of cancellations) insertCancellation.run(c.member_id, c.requested_by, c.cancellation_reason, c.reason_category, c.status);
console.log(`Cancellation Requests: ${cancellations.length}`);

// ─── RETENTION OFFERS ───
const retentionOffers = [
  { cancellation_request_id: 2, offer_type: 'pause', pause_months: 2, status: 'pending', notes: 'Member has back pain. Offer 2-month pause with physio partnership referral.' },
];
const insertRetention = db.prepare(`INSERT INTO retention_offers (cancellation_request_id, offer_type, pause_months, status, notes) VALUES (?,?,?,?,?)`);
for (const r of retentionOffers) insertRetention.run(r.cancellation_request_id, r.offer_type, r.pause_months, r.status, r.notes);
console.log(`Retention Offers: ${retentionOffers.length}`);

// ─── PRODUCT SALES ───
const productSales = [
  { product_id: 1, quantity: 1, unit_price: 59.95, total_amount: 59.95, member_id: 20, sold_by: S_LISA, payment_method: 'card', sale_date: '2026-05-15' },
  { product_id: 8, quantity: 2, unit_price: 34.95, total_amount: 69.90, member_id: 23, sold_by: S_LISA, payment_method: 'card', sale_date: '2026-05-20' },
  { product_id: 4, quantity: 1, unit_price: 12.00, total_amount: 12.00, member_id: 22, sold_by: S_LISA, payment_method: 'cash', sale_date: '2026-05-25' },
  { product_id: 5, quantity: 1, unit_price: 19.95, total_amount: 19.95, member_id: 22, sold_by: S_LISA, payment_method: 'cash', sale_date: '2026-05-25' },
  { product_id: 2, quantity: 1, unit_price: 99.95, total_amount: 99.95, member_id: 21, sold_by: S_LISA, payment_method: 'card', sale_date: '2026-05-10' },
  { product_id: 6, quantity: 1, unit_price: 79.95, total_amount: 79.95, member_id: 28, sold_by: S_LISA, payment_method: 'card', sale_date: '2026-05-22' },
];
const insertProductSale = db.prepare(`INSERT INTO product_sales (product_id, quantity, unit_price, total_amount, member_id, sold_by, payment_method, sale_date) VALUES (?,?,?,?,?,?,?,?)`);
for (const s of productSales) insertProductSale.run(s.product_id, s.quantity, s.unit_price, s.total_amount, s.member_id || null, s.sold_by, s.payment_method, s.sale_date);
console.log(`Product Sales: ${productSales.length}`);

// ─── COACH COMMISSIONS ───
const commissions = [
  { coach_id: S_MIKE, period_start: '2026-05-01', period_end: '2026-05-31', sessions_count: 12, total_revenue: 960, total_commission: 240, status: 'pending' },
  { coach_id: S_SARAH, period_start: '2026-05-01', period_end: '2026-05-31', sessions_count: 8, total_revenue: 640, total_commission: 160, status: 'pending' },
  { coach_id: S_JAKE, period_start: '2026-05-01', period_end: '2026-05-31', sessions_count: 6, total_revenue: 360, total_commission: 90, status: 'pending' },
];
const insertCommission = db.prepare(`INSERT INTO coach_commissions (coach_id, period_start, period_end, sessions_count, total_revenue, total_commission, status) VALUES (?,?,?,?,?,?,?)`);
for (const c of commissions) insertCommission.run(c.coach_id, c.period_start, c.period_end, c.sessions_count, c.total_revenue, c.total_commission, c.status);
console.log(`Coach Commissions: ${commissions.length}`);

console.log('\n✅ SEED COMPLETE');
console.log('=' .repeat(40));
console.log(`Staff:          ${staffSeed.length}`);
console.log(`PT Packages:    ${ptPackages.length}`);
console.log(`Belt Levels:    ${beltLevels.length}`);
console.log(`Suppliers:      ${suppliers.length}`);
console.log(`Members:        ${members.length}`);
console.log(`Belt Progress:  ${beltProgress.length}`);
console.log(`Member PT Pkgs: ${memberPtPkgs.length}`);
console.log(`Leads:          ${leads.length}`);
console.log(`Classes:        ${classes.length}`);
console.log(`Bookings:       ${bookings.length}`);
console.log(`Attendance:     ${attendance.length}`);
console.log(`Transactions:   ${transactions.length}`);
console.log(`PT Sessions:    ${ptSessions.length}`);
console.log(`Products:       ${products.length}`);
console.log(`Staff Tasks:    ${staffTasks.length}`);
console.log(`Sched Messages: ${scheduledMessages.length}`);
console.log(`Cancellations:  ${cancellations.length}`);
console.log(`Retention:      ${retentionOffers.length}`);
console.log(`Product Sales:  ${productSales.length}`);
console.log(`Commissions:    ${commissions.length}`);
