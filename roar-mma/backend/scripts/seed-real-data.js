const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, '..', '..', 'data', 'roarmma.db');
const db = new Database(dbPath);
db.pragma('journal_mode = DELETE');
db.pragma('foreign_keys = OFF');

console.log('Seeding real test data...\n');

// Clear existing seed data (keep staff, products, suppliers, belt_levels, pt_packages from init)
db.prepare('DELETE FROM member_belt_progress').run();
db.prepare('DELETE FROM leads').run();
db.prepare('DELETE FROM classes').run();
db.prepare('DELETE FROM bookings').run();
db.prepare('DELETE FROM attendance').run();
db.prepare('DELETE FROM transactions').run();
db.prepare('DELETE FROM member_pt_packages').run();
db.prepare('DELETE FROM pt_sessions').run();
db.prepare('DELETE FROM staff_tasks').run();
db.prepare('DELETE FROM stock_adjustments').run();
db.prepare('DELETE FROM product_sales').run();
db.prepare('DELETE FROM stock_alerts').run();
db.prepare('DELETE FROM cancellation_requests').run();
db.prepare('DELETE FROM retention_events').run();
db.prepare('DELETE FROM retention_offers').run();
db.prepare('DELETE FROM scheduled_messages').run();
db.prepare('DELETE FROM membership_pauses').run();
db.prepare('DELETE FROM winback_campaigns').run();
// Delete extra members (keep the test member id=1)
db.prepare('DELETE FROM members WHERE id > 1').run();

const hash = bcrypt.hashSync('changeme123', 10);

// ── STAFF ──
const staffIns = db.prepare(`INSERT OR IGNORE INTO staff (name, email, password_hash, role, phone, active) VALUES (?,?,?,?,?,1)`);
const staff = [
  ['Alex Silva', 'coach@roarmma.com.au', hash, 'coach', '0401111111'],
  ['Sarah Chen', 'frontdesk@roarmma.com.au', hash, 'front_desk', '0402222222'],
  ['Mike Johnson', 'gm@roarmma.com.au', hash, 'gm', '0403333333'],
  ['Jess Taylor', 'sales@roarmma.com.au', hash, 'sales', '0404444444'],
];
for (const s of staff) staffIns.run(...s);

// map names → IDs
const staffMap = {};
for (const s of db.prepare('SELECT id, name FROM staff').all()) staffMap[s.name] = s.id;

// ── MEMBERS (8) ──
const memberIns = db.prepare(`INSERT OR IGNORE INTO members (first_name, last_name, email, phone, status, plan, joined_date, goals, injuries, experience_level, location) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
const members = [
  ['Tom', 'Wilson', 'tom@example.com', '0411111111', 'active', 'unlimited', '2025-01-15', 'Compete at state level BJJ', 'None', 'intermediate', 'Rockingham'],
  ['Emma', 'Brown', 'emma@example.com', '0412222222', 'active', 'twice_week', '2025-03-01', 'Lose weight, get fit', 'Knee rehab', 'beginner', 'Waikiki'],
  ['Liam', 'Davis', 'liam@example.com', '0413333333', 'trial', 'trial', '2026-05-20', 'Try MMA training', 'None', 'beginner', 'Rockingham'],
  ['Olivia', 'Martinez', 'olivia@example.com', '0414444444', 'active', 'unlimited', '2024-11-01', 'BJJ competition prep', 'Shoulder niggle', 'advanced', 'Safety Bay'],
  ['Noah', 'Garcia', 'noah@example.com', '0415555555', 'paused', 'unlimited', '2025-06-01', 'Return after injury', 'Lower back', 'intermediate', 'Rockingham'],
  ['Ava', 'Thompson', 'ava@example.com', '0416666666', 'cancelled', 'unlimited', '2024-09-01', 'None', 'None', 'beginner', 'Waikiki'],
  ['Ethan', 'Anderson', 'ethan@example.com', '0417777777', 'active', 'kids', '2026-02-10', 'Learn discipline', 'None', 'beginner', 'Secret Harbour'],
  ['Sophia', 'Lee', 'sophia@example.com', '0418888888', 'trial', 'trial', '2026-05-25', 'Muay Thai fitness', 'Asthma', 'beginner', 'Rockingham'],
];
for (const m of members) memberIns.run(...m);

const memberMap = {};
for (const m of db.prepare('SELECT id, first_name, last_name FROM members').all()) memberMap[`${m.first_name} ${m.last_name}`] = m.id;

// ── BELT PROGRESS for existing members ──
const beltIns = db.prepare(`INSERT OR IGNORE INTO member_belt_progress (member_id, current_belt_id, current_stripes, belt_awarded_date, next_grading_eligible_date, classes_attended_since_belt, months_at_current_belt, is_current) VALUES (?,?,?,?,?,?,?,1)`);
const belts = [
  [memberMap['Tom Wilson'], 3, 2, '2025-06-01', '2026-07-01', 45, 12],
  [memberMap['Emma Brown'], 1, 0, '2025-03-01', '2026-08-01', 20, 15],
  [memberMap['Olivia Martinez'], 4, 3, '2025-01-01', '2026-06-15', 80, 17],
  [memberMap['Ethan Anderson'], 1, 0, '2026-02-10', '2026-09-01', 15, 3],
];
for (const b of belts) {
  if (b[0]) beltIns.run(...b);
}

// ── LEADS (10) ──
const leadIns = db.prepare(`INSERT OR IGNORE INTO leads (first_name, last_name, email, phone, source, stage, interest_level, location, notes, assigned_to, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
const leads = [
  ['Jake', 'Miller', 'jake@example.com', '0421111111', 'instagram', 'new', 'high', 'Rockingham', 'Saw ad, keen to try BJJ', staffMap['Jess Taylor'], '2026-05-28 10:00:00'],
  ['Mia', 'Harris', 'mia@example.com', '0422222222', 'website', 'contacted', 'medium', 'Waikiki', 'Called twice, left voicemail', staffMap['Jess Taylor'], '2026-05-25 14:30:00'],
  ['Lucas', 'Clark', 'lucas@example.com', '0423333333', 'referral', 'trial_booked', 'high', 'Rockingham', 'Referred by Tom Wilson. Trial booked 5/6', staffMap['Alex Silva'], '2026-05-20 09:00:00'],
  ['Chloe', 'White', 'chloe@example.com', '0424444444', 'facebook', 'trial_completed', 'hot', 'Safety Bay', 'Loved trial class, ready to sign up', staffMap['Jess Taylor'], '2026-05-15 16:00:00'],
  ['James', 'Taylor', 'james@example.com', '0425555555', 'google', 'new', 'low', 'Secret Harbour', 'Just browsing, no urgency', null, '2026-05-29 08:00:00'],
  ['Zoe', 'Roberts', 'zoe@example.com', '0426666666', 'instagram', 'trial_booked', 'high', 'Rockingham', 'Muay Thai trial booked', staffMap['Alex Silva'], '2026-05-27 11:00:00'],
  ['Owen', 'Walker', 'owen@example.com', '0427777777', 'walk_in', 'converted', 'high', 'Rockingham', 'Signed up for unlimited plan!', staffMap['Jess Taylor'], '2026-05-10 10:00:00'],
  ['Lily', 'Scott', 'lily@example.com', '0428888888', 'referral', 'contacted', 'medium', 'Waikiki', 'Referred by Emma Brown', staffMap['Jess Taylor'], '2026-05-22 13:00:00'],
  ['Mason', 'Green', 'mason@example.com', '0429999999', 'website', 'new', 'high', 'Rockingham', 'Competition BJJ experience', null, '2026-05-30 09:30:00'],
  ['Harper', 'Adams', 'harper@example.com', '0430000000', 'phone', 'lost', 'low', 'Rockingham', 'Too expensive, went elsewhere', null, '2026-04-20 11:00:00'],
];
for (const l of leads) leadIns.run(...l);

const leadMap = {};
for (const l of db.prepare('SELECT id, first_name, last_name FROM leads').all()) leadMap[`${l.first_name} ${l.last_name}`] = l.id;

// ── CLASSES (12) ──
const classIns = db.prepare(`INSERT OR IGNORE INTO classes (name, description, class_type, instructor_id, day_of_week, start_time, end_time, max_capacity, location, active) VALUES (?,?,?,?,?,?,?,?,?,1)`);
const classes = [
  ['Morning BJJ', 'Brazilian Jiu-Jitsu fundamentals', 'bjj', staffMap['Alex Silva'], 1, '06:00', '07:00', 30, 'Main Mat'],
  ['Muay Thai Basics', 'Muay Thai striking fundamentals', 'muay_thai', staffMap['Alex Silva'], 1, '12:00', '13:00', 25, 'Striking Area'],
  ['MMA Conditioning', 'Full MMA workout', 'mma', staffMap['Alex Silva'], 1, '17:30', '19:00', 20, 'Main Mat'],
  ['BJJ Advanced', 'Advanced BJJ techniques and rolling', 'bjj', staffMap['Alex Silva'], 2, '06:00', '07:30', 20, 'Main Mat'],
  ['Kids BJJ', 'BJJ for kids ages 6-12', 'kids', null, 2, '16:00', '17:00', 20, 'Main Mat'],
  ['Muay Thai Advanced', 'Advanced pad work and sparring', 'muay_thai', staffMap['Alex Silva'], 2, '17:30', '19:00', 20, 'Striking Area'],
  ['Morning Muay Thai', 'Morning striking session', 'muay_thai', staffMap['Alex Silva'], 3, '06:00', '07:00', 25, 'Striking Area'],
  ['Boxing Fundamentals', 'Boxing technique and drills', 'boxing', null, 3, '12:00', '13:00', 20, 'Striking Area'],
  ['BJJ No-Gi', 'No-gi BJJ grappling', 'bjj', staffMap['Alex Silva'], 3, '17:30', '19:00', 25, 'Main Mat'],
  ['Wrestling', 'Wrestling takedowns and control', 'wrestling', null, 4, '06:00', '07:00', 20, 'Main Mat'],
  ['Muay Thai Drills', 'Technical drills and combos', 'muay_thai', staffMap['Alex Silva'], 4, '12:00', '13:00', 25, 'Striking Area'],
  ['Open Mat', 'Open training session', 'bjj', null, 5, '18:00', '20:00', 35, 'Main Mat'],
];
for (const c of classes) classIns.run(...c);

const classMap = {};
for (const c of db.prepare('SELECT id, name FROM classes').all()) classMap[c.name] = c.id;

// ── BOOKINGS (for active members) ──
const bookingIns = db.prepare(`INSERT OR IGNORE INTO bookings (member_id, class_id, booking_date, status) VALUES (?,?,?,?)`);
const bookings = [
  [memberMap['Tom Wilson'], classMap['Morning BJJ'], '2026-05-31', 'confirmed'],
  [memberMap['Tom Wilson'], classMap['BJJ Advanced'], '2026-06-01', 'confirmed'],
  [memberMap['Emma Brown'], classMap['Morning Muay Thai'], '2026-05-31', 'confirmed'],
  [memberMap['Olivia Martinez'], classMap['BJJ Advanced'], '2026-06-01', 'confirmed'],
  [memberMap['Olivia Martinez'], classMap['BJJ No-Gi'], '2026-05-29', 'attended'],
  [memberMap['Tom Wilson'], classMap['Morning BJJ'], '2026-05-29', 'attended'],
  [memberMap['Emma Brown'], classMap['Muay Thai Basics'], '2026-05-28', 'no_show'],
  [memberMap['Liam Davis'], classMap['Morning BJJ'], '2026-06-01', 'confirmed'],
  [memberMap['Sophia Lee'], classMap['Muay Thai Basics'], '2026-06-01', 'confirmed'],
  [memberMap['Ethan Anderson'], classMap['Kids BJJ'], '2026-06-01', 'confirmed'],
];
for (const b of bookings) {
  if (b[0] && b[1]) bookingIns.run(...b);
}

// ── ATTENDANCE ──
const attIns = db.prepare(`INSERT OR IGNORE INTO attendance (member_id, class_id, check_in_time) VALUES (?,?,?)`);
const attendance = [
  [memberMap['Tom Wilson'], classMap['Morning BJJ'], '2026-05-29 06:05:00'],
  [memberMap['Tom Wilson'], classMap['BJJ Advanced'], '2026-05-28 06:02:00'],
  [memberMap['Olivia Martinez'], classMap['BJJ No-Gi'], '2026-05-29 17:35:00'],
  [memberMap['Olivia Martinez'], classMap['BJJ Advanced'], '2026-05-27 06:00:00'],
  [memberMap['Emma Brown'], classMap['Morning Muay Thai'], '2026-05-27 06:10:00'],
  [memberMap['Emma Brown'], classMap['Muay Thai Basics'], '2026-05-26 12:05:00'],
];
for (const a of attendance) {
  if (a[0] && a[1]) attIns.run(...a);
}

// ── TRANSACTIONS ──
const txnIns = db.prepare(`INSERT OR IGNORE INTO transactions (member_id, type, amount, description, status, payment_method, created_at) VALUES (?,?,?,?,?,?,?)`);
const txns = [
  [memberMap['Tom Wilson'], 'membership', 89.00, 'Monthly unlimited membership', 'completed', 'card', '2026-05-01 08:00:00'],
  [memberMap['Emma Brown'], 'membership', 59.00, 'Monthly twice-weekly membership', 'completed', 'card', '2026-05-01 08:00:00'],
  [memberMap['Olivia Martinez'], 'membership', 89.00, 'Monthly unlimited membership', 'completed', 'card', '2026-05-01 08:00:00'],
  [memberMap['Olivia Martinez'], 'pt', 60.00, 'PT session: Advanced BJJ drills', 'completed', 'card', '2026-05-15 14:00:00'],
  [memberMap['Tom Wilson'], 'pt', 60.00, 'PT session: Competition prep', 'completed', 'card', '2026-05-20 10:00:00'],
  [memberMap['Ethan Anderson'], 'membership', 49.00, 'Kids BJJ monthly membership', 'completed', 'card', '2026-05-01 08:00:00'],
  [null, 'product', 120.00, 'Rash guard + shorts combo', 'completed', 'card', '2026-05-10 15:00:00'],
  [memberMap['Noah Garcia'], 'membership', 89.00, 'Monthly membership - failed', 'failed', 'card', '2026-05-28 08:00:00'],
  [memberMap['Ava Thompson'], 'membership', 89.00, 'Final month - failed', 'failed', 'card', '2026-04-01 08:00:00'],
  [memberMap['Tom Wilson'], 'other', 200.00, 'Gi purchase', 'completed', 'card', '2026-05-12 11:00:00'],
];
for (const t of txns) {
  if (t[0] || t[2] > 0) txnIns.run(...t);
}

// ── PT PACKAGES (already seeded by init-database) ──
// Create member_pt_packages
const mppIns = db.prepare(`INSERT OR IGNORE INTO member_pt_packages (member_id, package_id, sessions_total, sessions_used, sessions_remaining, purchase_date, expiry_date, amount_paid, status) VALUES (?,?,?,?,?,?,?,?,?)`);
const mpps = [
  [memberMap['Tom Wilson'], 1, 10, 6, 4, '2026-03-01', '2026-09-01', 350.00, 'active'],
  [memberMap['Olivia Martinez'], 2, 5, 4, 1, '2026-05-01', '2026-08-01', 200.00, 'active'],
  [memberMap['Emma Brown'], 1, 10, 2, 8, '2026-04-15', '2026-10-15', 350.00, 'active'],
];
for (const p of mpps) {
  if (p[0]) mppIns.run(...p);
}

const pkgMap = {};
for (const p of db.prepare('SELECT id, member_id FROM member_pt_packages').all()) pkgMap[p.member_id] = p.id;

// ── PT SESSIONS ──
const ptIns = db.prepare(`INSERT OR IGNORE INTO pt_sessions (member_id, coach_id, member_package_id, scheduled_date, scheduled_time, duration_minutes, status, session_type) VALUES (?,?,?,?,?,60,?,?)`);
const pts = [
  [memberMap['Tom Wilson'], staffMap['Alex Silva'], pkgMap[memberMap['Tom Wilson']], '2026-06-01', '10:00', 'scheduled', 'pt'],
  [memberMap['Olivia Martinez'], staffMap['Alex Silva'], pkgMap[memberMap['Olivia Martinez']], '2026-06-02', '14:00', 'scheduled', 'pt'],
  [memberMap['Emma Brown'], staffMap['Alex Silva'], pkgMap[memberMap['Emma Brown']], '2026-05-28', '09:00', 'completed', 'assessment'],
];
for (const p of pts) {
  if (p[0] && p[1]) ptIns.run(...p);
}

// ── CANCELLATION REQUESTS ──
const crIns = db.prepare(`INSERT OR IGNORE INTO cancellation_requests (member_id, requested_by, cancellation_reason, reason_category, status) VALUES (?,?,?,?,?)`);
const crs = [
  [memberMap['Noah Garcia'], staffMap['Sarah Chen'], 'Injured lower back, need 2 months off', 'injury', 'pending'],
  [memberMap['Ava Thompson'], staffMap['Sarah Chen'], 'Moving interstate', 'moving', 'cancelled'],
];
for (const c of crs) {
  if (c[0]) crIns.run(...c);
}

// ── SCHEDULED MESSAGES ──
const msgIns
 = db.prepare(`INSERT OR IGNORE INTO scheduled_messages (lead_id, member_id, message_type, status, recipient_phone, body, scheduled_for, created_at) VALUES (?,?,?,'pending',?,?,?,datetime('now'))`);
const msgs = [
  [leadMap['Jake Miller'], null, 'sms', '0421111111', 'Hey Jake! Thanks for reaching out. Want to book a free trial at ROAR MMA?', '2026-06-01 10:00:00'],
  [null, memberMap['Tom Wilson'], 'sms', '0411111111', 'Great session today Tom! Your guard passing is improving fast.', '2026-05-29 19:00:00'],
  [leadMap['Chloe White'], null, 'email', null, 'Hey Chloe, you crushed your trial! Ready to lock in a membership?', '2026-06-01 09:00:00'],
];
for (const m of msgs) {
  if (m[0] || m[1]) msgIns.run(...m);
}
db.pragma('foreign_keys = ON');

// ── STAFF TASKS ──
const taskIns = db.prepare(`INSERT OR IGNORE INTO staff_tasks (lead_id, member_id, assigned_to, task_type, priority, title, description, due_date, status) VALUES (?,?,?,?,?,?,?,?,?)`);
const tasks = [
  [leadMap['Jake Miller'], null, staffMap['Jess Taylor'], 'call_hot_lead', 'high', 'Call Jake Miller - hot lead', 'High interest lead from Instagram. Call to book trial.', '2026-06-01', 'pending'],
  [leadMap['Mia Harris'], null, staffMap['Jess Taylor'], 'warm_lead_checkin', 'medium', 'Follow up with Mia Harris', 'Contacted twice but no answer. Try again.', '2026-06-02', 'pending'],
  [null, memberMap['Noah Garcia'], staffMap['Mike Johnson'], 'retention_check_in', 'high', 'Noah Garcia - cancellation risk', 'Has requested cancellation due to injury. Offer retention options.', '2026-06-01', 'pending'],
  [leadMap['Chloe White'], null, staffMap['Jess Taylor'], 'conversion_push', 'high', 'Chloe White - convert to member', 'Completed trial, very interested. Follow up to sign up.', '2026-06-01', 'pending'],
  [null, memberMap['Emma Brown'], staffMap['Alex Silva'], 'check_no_show', 'medium', 'Emma Brown no-show 28/5', 'Did not attend Muay Thai Basics. Check in.', '2026-06-01', 'pending'],
];
for (const t of tasks) {
  if (t[0] || t[1]) taskIns.run(...t);
}

// ── STOCK ADJUSTMENTS (some products low) ──
const prods = db.prepare('SELECT id, name FROM products').all();
const adjIns = db.prepare(`INSERT OR IGNORE INTO stock_adjustments (product_id, adjustment_type, quantity, reason, adjusted_by) VALUES (?,'add',?,?,?)`);
// Add stock to some products
const adjustments = [
  [prods[0]?.id, 50, 'Initial stock - Rash Guards', staffMap['Sarah Chen']],
  [prods[1]?.id, 30, 'Initial stock - Shorts', staffMap['Sarah Chen']],
  [prods[2]?.id, 15, 'Initial stock - Gi', staffMap['Sarah Chen']],
  [prods[3]?.id, 10, 'Initial stock - Gloves', staffMap['Sarah Chen']],
  [prods[4]?.id, 5, 'Initial stock - Wraps', staffMap['Sarah Chen']],
];
for (const a of adjustments) {
  if (a[0] && a[1] !== undefined) adjIns.run(a[0], a[1], a[2], a[3]);
}
// Update stock quantities
db.prepare('UPDATE products SET stock_quantity = 5 WHERE name LIKE ?').run('%rash%');
db.prepare('UPDATE products SET stock_quantity = 3 WHERE name LIKE ?').run('%short%');
db.prepare('UPDATE products SET stock_quantity = 1 WHERE name LIKE ?').run('%gi%');
db.prepare('UPDATE products SET stock_quantity = 0 WHERE name LIKE ?').run('%glove%');
db.prepare('UPDATE products SET stock_quantity = 12 WHERE name LIKE ?').run('%wrap%');

// ── PRODUCT SALES ──
const saleIns = db.prepare(`INSERT OR IGNORE INTO product_sales (product_id, quantity, unit_price, total_amount, member_id, sold_by, payment_method) VALUES (?,?,?,?,?,?,?)`);
const sales = [
  [prods[0]?.id, 1, 59.99, 59.99, memberMap['Tom Wilson'], staffMap['Sarah Chen'], 'card'],
  [prods[1]?.id, 2, 39.99, 79.98, memberMap['Olivia Martinez'], staffMap['Sarah Chen'], 'card'],
  [prods[4]?.id, 1, 12.99, 12.99, memberMap['Emma Brown'], staffMap['Sarah Chen'], 'card'],
];
for (const s of sales) {
  if (s[0] && s[5]) saleIns.run(...s);
}

console.log('Seed complete!\n');

// Print summary
const tables = ['staff', 'members', 'leads', 'classes', 'bookings', 'attendance', 'transactions', 'member_pt_packages', 'pt_sessions', 'staff_tasks', 'products', 'stock_adjustments', 'product_sales', 'cancellation_requests', 'scheduled_messages', 'member_belt_progress'];
for (const t of tables) {
  const c = db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get().c;
  console.log(`  ${t}: ${c} rows`);
}

db.close();
