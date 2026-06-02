const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticateMember } = require('../middleware/memberAuth');
const { getDatabase } = require('../db/connection');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

// Member login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const db = getDatabase();
    const member = db.prepare('SELECT id, first_name, last_name, email, phone, password_hash, status FROM members WHERE email = ? AND portal_enabled = 1').get(email);
    if (!member || !member.password_hash) return res.status(401).json({ error: 'Invalid email or password' });
    if (!(await bcrypt.compare(password, member.password_hash))) return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ id: member.id, email: member.email, name: `${member.first_name} ${member.last_name}`, type: 'member' }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    res.json({ token, member: { id: member.id, first_name: member.first_name, last_name: member.last_name, email: member.email, phone: member.phone, status: member.status } });
  } catch (err) {
    console.error('[PORTAL] Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Member register (set password)
router.post('/register', async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone } = req.body;
    if (!email || !password || !first_name || !last_name) return res.status(400).json({ error: 'email, password, first_name, last_name required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const db = getDatabase();
    const existing = db.prepare('SELECT id FROM members WHERE email = ?').get(email);
    if (!existing) return res.status(404).json({ error: 'No member found with that email. Contact the gym to register.' });
    if (db.prepare('SELECT id FROM members WHERE email = ? AND password_hash IS NOT NULL').get(email)) return res.status(400).json({ error: 'Portal already set up for this member' });
    const hash = await bcrypt.hash(password, 10);
    db.prepare("UPDATE members SET password_hash=?, first_name=COALESCE(NULLIF(?, ''), first_name), last_name=COALESCE(NULLIF(?, ''), last_name), phone=COALESCE(NULLIF(?, ''), phone), portal_enabled=1 WHERE id=?").run(hash, first_name, last_name, phone, existing.id);
    const token = jwt.sign({ id: existing.id, email, name: `${first_name} ${last_name}`, type: 'member' }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    res.json({ token, message: 'Portal activated' });
  } catch (err) {
    console.error('[PORTAL] Register error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// My profile
router.get('/profile', authenticateMember, (req, res) => {
  try {
    const db = getDatabase();
    const member = db.prepare('SELECT id, first_name, last_name, email, phone, date_of_birth, location, status, plan, joined_date, emergency_contact_name, emergency_contact_phone, experience_level, health_score FROM members WHERE id = ?').get(req.member.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  } catch (err) {
    console.error('[PORTAL] Profile error:', err.message);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// Update profile
router.put('/profile', authenticateMember, (req, res) => {
  try {
    const { phone, emergency_contact_name, emergency_contact_phone } = req.body;
    const db = getDatabase();
    db.prepare("UPDATE members SET phone=COALESCE(NULLIF(?, ''), phone), emergency_contact_name=COALESCE(NULLIF(?, ''), emergency_contact_name), emergency_contact_phone=COALESCE(NULLIF(?, ''), emergency_contact_phone), updated_at=datetime('now') WHERE id=?")
      .run(phone, emergency_contact_name, emergency_contact_phone, req.member.id);
    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error('[PORTAL] Update profile error:', err.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upcoming classes
router.get('/classes', authenticateMember, (req, res) => {
  try {
    const db = getDatabase();
    const classes = db.prepare(`
      SELECT ci.*, c.name, c.description, c.discipline, c.difficulty, c.color_code,
        (SELECT COUNT(*) FROM bookings b WHERE b.class_id = ci.class_id AND b.booking_date = ci.date) as booked_count
      FROM class_instances ci JOIN classes c ON ci.class_id = c.id
      WHERE ci.date >= DATE('now')
      ORDER BY ci.date, ci.start_time
      LIMIT 50
    `).all();
    res.json(classes);
  } catch (err) {
    console.error('[PORTAL] Classes error:', err.message);
    res.status(500).json({ error: 'Failed to load classes' });
  }
});

// My bookings
router.get('/bookings', authenticateMember, (req, res) => {
  try {
    const db = getDatabase();
    const bookings = db.prepare(`
      SELECT b.*, c.name as class_name, c.discipline, ci.start_time, ci.end_time, ci.date, ci.location
      FROM bookings b JOIN classes c ON b.class_id = c.id
      LEFT JOIN class_instances ci ON ci.class_id = b.class_id AND ci.date = b.booking_date
      WHERE b.member_id = ? ORDER BY b.booking_date DESC LIMIT 50
    `).all(req.member.id);
    res.json(bookings);
  } catch (err) {
    console.error('[PORTAL] Bookings error:', err.message);
    res.status(500).json({ error: 'Failed to load bookings' });
  }
});

// Book a class
router.post('/book', authenticateMember, (req, res) => {
  try {
    const { class_id, date } = req.body;
    if (!class_id || !date) return res.status(400).json({ error: 'class_id and date required' });
    const db = getDatabase();
    const existing = db.prepare('SELECT id FROM bookings WHERE member_id=? AND class_id=? AND booking_date=? AND status!=\'cancelled\'').get(req.member.id, class_id, date);
    if (existing) return res.status(400).json({ error: 'Already booked' });
    const r = db.prepare("INSERT INTO bookings (member_id, class_id, booking_date, status) VALUES (?,?,?,'confirmed')").run(req.member.id, class_id, date);
    res.status(201).json({ id: r.lastInsertRowid, message: 'Booked' });
  } catch (err) {
    console.error('[PORTAL] Book error:', err.message);
    res.status(500).json({ error: 'Failed to book' });
  }
});

// Cancel booking
router.post('/cancel-booking/:id', authenticateMember, (req, res) => {
  try {
    const db = getDatabase();
    const booking = db.prepare('SELECT id, member_id FROM bookings WHERE id=?').get(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.member_id !== req.member.id) return res.status(403).json({ error: 'Not your booking' });
    db.prepare("UPDATE bookings SET status='cancelled', updated_at=datetime('now') WHERE id=?").run(req.params.id);
    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    console.error('[PORTAL] Cancel error:', err.message);
    res.status(500).json({ error: 'Failed to cancel' });
  }
});

// My attendance
router.get('/attendance', authenticateMember, (req, res) => {
  try {
    const db = getDatabase();
    const attendance = db.prepare(`
      SELECT a.*, c.name as class_name, c.discipline
      FROM attendance a JOIN classes c ON a.class_id = c.id
      WHERE a.member_id = ? ORDER BY a.check_in_time DESC LIMIT 30
    `).all(req.member.id);
    res.json(attendance);
  } catch (err) {
    console.error('[PORTAL] Attendance error:', err.message);
    res.status(500).json({ error: 'Failed to load attendance' });
  }
});

// My payments
router.get('/payments', authenticateMember, (req, res) => {
  try {
    const db = getDatabase();
    const payments = db.prepare("SELECT id, amount, currency, type, status, payment_method, description, processed_at, created_at FROM transactions WHERE member_id=? ORDER BY created_at DESC LIMIT 20").all(req.member.id);
    res.json(payments);
  } catch (err) {
    console.error('[PORTAL] Payments error:', err.message);
    res.status(500).json({ error: 'Failed to load payments' });
  }
});

// My belt progression
router.get('/belts', authenticateMember, (req, res) => {
  try {
    const db = getDatabase();
    const belts = db.prepare(`
      SELECT mbp.*, bl.name as belt_name, bl.color_code, bl.sort_order, bl.discipline
      FROM member_belt_progress mbp JOIN belt_levels bl ON mbp.belt_level_id = bl.id
      WHERE mbp.member_id = ? ORDER BY bl.sort_order DESC
    `).all(req.member.id);
    res.json(belts);
  } catch (err) {
    console.error('[PORTAL] Belts error:', err.message);
    res.status(500).json({ error: 'Failed to load belts' });
  }
});

// My upcoming schedule (next 7 days)
router.get('/schedule', authenticateMember, (req, res) => {
  try {
    const db = getDatabase();
    const schedule = db.prepare(`
      SELECT ci.*, c.name, c.discipline, c.description, c.difficulty,
        CASE WHEN b.id IS NOT NULL THEN 1 ELSE 0 END as booked,
        b.id as booking_id, b.status as booking_status
      FROM class_instances ci
      JOIN classes c ON ci.class_id = c.id
      LEFT JOIN bookings b ON b.class_id = ci.class_id AND b.booking_date = ci.date AND b.member_id = ? AND b.status != 'cancelled'
      WHERE ci.date >= DATE('now') AND ci.date <= DATE('now', '+7 days')
      ORDER BY ci.date, ci.start_time
    `).all(req.member.id);
    res.json(schedule);
  } catch (err) {
    console.error('[PORTAL] Schedule error:', err.message);
    res.status(500).json({ error: 'Failed to load schedule' });
  }
});

module.exports = router;