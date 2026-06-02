const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { getDatabase } = require('../db/connection');
const { waiverTemplates, memberWaivers, memberDocuments } = require('../data/waivers');
const auth = require('../middleware/auth');

const kioskLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many kiosk requests' } });

// ── Waiver Templates ──

router.get('/templates', auth.authenticateToken, auth.requireRole('owner', 'gm', 'front_desk'), (req, res) => {
  try {
    const templates = waiverTemplates.getAll();
    res.json({ templates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/templates/:id', auth.authenticateToken, auth.requireRole('owner', 'gm', 'front_desk'), (req, res) => {
  try {
    const tpl = waiverTemplates.getById(parseInt(req.params.id, 10));
    if (!tpl) return res.status(404).json({ error: 'Template not found' });
    res.json(tpl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/templates', auth.authenticateToken, auth.requireRole('owner', 'gm'), (req, res) => {
  try {
    const { name, body_text } = req.body;
    if (!name || !body_text) return res.status(400).json({ error: 'name and body_text are required' });
    const tpl = waiverTemplates.create({ name, body_text });
    res.status(201).json(tpl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/templates/:id', auth.authenticateToken, auth.requireRole('owner', 'gm'), (req, res) => {
  try {
    const tpl = waiverTemplates.update(parseInt(req.params.id, 10), req.body);
    if (!tpl) return res.status(404).json({ error: 'Template not found' });
    res.json(tpl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/templates/:id', auth.authenticateToken, auth.requireRole('owner', 'gm'), (req, res) => {
  try {
    const ok = waiverTemplates.remove(parseInt(req.params.id, 10));
    if (!ok) return res.status(404).json({ error: 'Template not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sign', auth.authenticateToken, auth.requireRole('owner', 'gm', 'front_desk', 'coach'), (req, res) => {
  try {
    const { member_id, template_id, signature_data, ip_address } = req.body;
    if (!member_id || !template_id || !signature_data) {
      return res.status(400).json({ error: 'member_id, template_id, and signature_data are required' });
    }
    const waiver = memberWaivers.sign({ member_id, template_id, signature_data, ip_address });
    res.status(201).json(waiver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/member/:memberId', auth.authenticateToken, auth.requireRole('owner', 'gm', 'front_desk', 'coach'), (req, res) => {
  try {
    const waivers = memberWaivers.getByMember(parseInt(req.params.memberId, 10));
    res.json({ waivers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth.authenticateToken, auth.requireRole('owner', 'gm', 'front_desk', 'coach'), (req, res) => {
  try {
    const waiver = memberWaivers.getById(parseInt(req.params.id, 10));
    if (!waiver) return res.status(404).json({ error: 'Waiver not found' });
    res.json(waiver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/documents/member/:memberId', auth.authenticateToken, auth.requireRole('owner', 'gm', 'front_desk', 'coach'), (req, res) => {
  try {
    const docs = memberDocuments.getByMember(parseInt(req.params.memberId, 10));
    res.json({ documents: docs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/documents/upload', auth.authenticateToken, auth.requireRole('owner', 'gm', 'front_desk'), (req, res) => {
  try {
    const { member_id, doc_type, file_name, file_path, notes } = req.body;
    if (!member_id || !doc_type || !file_name || !file_path) {
      return res.status(400).json({ error: 'member_id, doc_type, file_name, and file_path are required' });
    }
    const doc = memberDocuments.create({ member_id, doc_type, file_name, file_path, notes });
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/documents/:id', auth.authenticateToken, auth.requireRole('owner', 'gm', 'front_desk'), (req, res) => {
  try {
    const ok = memberDocuments.remove(parseInt(req.params.id, 10));
    if (!ok) return res.status(404).json({ error: 'Document not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Kiosk: lookup member by phone
router.get('/kiosk/lookup', kioskLimiter, (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 3) return res.json({ members: [] });
    const db = getDatabase();
    const members = db.prepare(`
      SELECT id, first_name, last_name, phone, email, date_of_birth, 
             (SELECT name FROM member_plans WHERE member_plans.member_id = members.id AND status = 'active' LIMIT 1) as plan_name
      FROM members
      WHERE phone LIKE ? OR email LIKE ? OR first_name || ' ' || last_name LIKE ?
      LIMIT 20
    `).all(`%${q}%`, `%${q}%`, `%${q}%`);
    res.json({ members });
  } catch (error) {
    res.status(500).json({ error: 'Lookup failed' });
  }
});

// Kiosk: sign waiver (no auth)
router.post('/kiosk/sign', kioskLimiter, (req, res) => {
  try {
    const { member_id, template_id, signature_data, guardian_name, guardian_relation } = req.body;
    if (!member_id || !template_id || !signature_data) {
      return res.status(400).json({ error: 'member_id, template_id, and signature_data are required' });
    }
    const db = getDatabase();
    const member = db.prepare('SELECT id, first_name, last_name, date_of_birth FROM members WHERE id = ?').get(member_id);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    const deliveryMethod = member.email ? 'email' : 'sms';

    const result = db.prepare(`INSERT INTO member_waivers (member_id, template_id, signature_data, ip_address, signed_at, guardian_name, guardian_relation) VALUES (?, ?, ?, ?, datetime('now'), ?, ?)`).run(
      member_id, template_id, signature_data, ip, guardian_name || null, guardian_relation || null
    );

    // Queue delivery of signed copy
    db.prepare(`INSERT INTO event_queue (event_type, payload, status) VALUES ('DELIVER_SIGNED_WAIVER', ?, 'pending')`).run(JSON.stringify({
      member_id, waiver_id: result.lastInsertRowid, email: member.email, phone: member.phone,
      member_name: `${member.first_name} ${member.last_name}`, deliveryMethod,
    }));

    res.status(201).json({ waiver_id: result.lastInsertRowid, member_name: `${member.first_name} ${member.last_name}` });
  } catch (error) {
    console.error('Kiosk sign error:', error);
    res.status(500).json({ error: 'Failed to sign waiver' });
  }
});

// Kiosk: list active waiver templates
router.get('/kiosk/templates', kioskLimiter, (req, res) => {
  try {
    const db = getDatabase();
    const templates = db.prepare('SELECT id, name, body_text FROM waiver_templates WHERE active = 1 ORDER BY name').all();
    res.json({ templates });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

module.exports = router;
