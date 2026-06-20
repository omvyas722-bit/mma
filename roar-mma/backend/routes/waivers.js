const express = require('express');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const router = express.Router();
const { getDatabase } = require('../db/connection');
const { waiverTemplates, memberWaivers, memberDocuments, pendingParentSignatures, waiverAnalytics } = require('../data/waivers');
const auth = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');
const messagingProviders = require('../services/messagingProviders');

const kioskLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many kiosk requests' } });

// ── Waiver Templates ──

router.get('/templates', auth.authenticateToken, auditLog('view_list', 'waiver'), auth.requireRole('owner', 'gm', 'front_desk'), (req, res) => {
  try {
    const templates = waiverTemplates.getAll();
    res.json({ templates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/templates/:id', auth.authenticateToken, auditLog('view', 'waiver'), auth.requireRole('owner', 'gm', 'front_desk'), (req, res) => {
  try {
    const tpl = waiverTemplates.getById(parseInt(req.params.id, 10));
    if (!tpl) return res.status(404).json({ error: 'Template not found' });
    res.json(tpl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/templates', auth.authenticateToken, auditLog('create', 'waiver'), auth.requireRole('owner', 'gm'), (req, res) => {
  try {
    const { name, body_text } = req.body;
    if (!name || !body_text) return res.status(400).json({ error: 'name and body_text are required' });
    const tpl = waiverTemplates.create({ name, body_text });
    res.status(201).json(tpl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/templates/:id', auth.authenticateToken, auditLog('update', 'waiver'), auth.requireRole('owner', 'gm'), (req, res) => {
  try {
    const tpl = waiverTemplates.update(parseInt(req.params.id, 10), req.body);
    if (!tpl) return res.status(404).json({ error: 'Template not found' });
    res.json(tpl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/templates/:id', auth.authenticateToken, auditLog('delete', 'waiver'), auth.requireRole('owner', 'gm'), (req, res) => {
  try {
    const ok = waiverTemplates.remove(parseInt(req.params.id, 10));
    if (!ok) return res.status(404).json({ error: 'Template not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sign', auth.authenticateToken, auditLog('sign', 'waiver'), auth.requireRole('owner', 'gm', 'front_desk', 'coach'), (req, res) => {
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

router.get('/member/:memberId', auth.authenticateToken, auditLog('view_list', 'waiver'), auth.requireRole('owner', 'gm', 'front_desk', 'coach'), (req, res) => {
  try {
    const waivers = memberWaivers.getByMember(parseInt(req.params.memberId, 10));
    res.json({ waivers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth.authenticateToken, auditLog('view', 'waiver'), auth.requireRole('owner', 'gm', 'front_desk', 'coach'), (req, res) => {
  try {
    const waiver = memberWaivers.getById(parseInt(req.params.id, 10));
    if (!waiver) return res.status(404).json({ error: 'Waiver not found' });
    res.json(waiver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/documents/member/:memberId', auth.authenticateToken, auditLog('view_list', 'waiver'), auth.requireRole('owner', 'gm', 'front_desk', 'coach'), (req, res) => {
  try {
    const docs = memberDocuments.getByMember(parseInt(req.params.memberId, 10));
    res.json({ documents: docs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/documents/upload', auth.authenticateToken, auditLog('upload', 'waiver'), auth.requireRole('owner', 'gm', 'front_desk'), (req, res) => {
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

router.delete('/documents/:id', auth.authenticateToken, auditLog('delete', 'waiver'), auth.requireRole('owner', 'gm', 'front_desk'), (req, res) => {
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

// ── Kiosk PIN verification with 3-attempt lockout ──
const pinAttempts = new Map();
router.post('/kiosk/verify-pin', kioskLimiter, (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || !/^\d{4}$/.test(pin)) return res.status(400).json({ valid: false, error: 'Invalid PIN format' });
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const attempts = pinAttempts.get(ip) || { count: 0, locked_until: null };
    if (attempts.locked_until && Date.now() < attempts.locked_until) {
      return res.status(429).json({ valid: false, locked: true, error: 'Too many PIN attempts. Try again in 5 minutes.', retry_after: Math.ceil((attempts.locked_until - Date.now()) / 60000) });
    }
    const db = getDatabase();
    const row = db.prepare("SELECT value FROM system_settings WHERE key = 'kiosk_pin'").get();
    const storedPin = row?.value || '1234';
    if (pin === storedPin) {
      pinAttempts.delete(ip);
      return res.json({ valid: true });
    }
    attempts.count += 1;
    if (attempts.count >= 3) {
      attempts.locked_until = Date.now() + 300000;
      attempts.count = 0;
      pinAttempts.set(ip, attempts);
      return res.status(429).json({ valid: false, locked: true, error: 'Too many failed PIN attempts. Locked for 5 minutes.', retry_after: 5 });
    }
    pinAttempts.set(ip, attempts);
    res.json({ valid: false, remaining: 3 - attempts.count, error: `Invalid PIN. ${3 - attempts.count} attempt(s) remaining.` });
  } catch (error) {
    res.status(500).json({ error: 'PIN verification failed' });
  }
});

// ── Kiosk: guest sign + auto-create lead ──
router.post('/kiosk/guest-sign', kioskLimiter, (req, res) => {
  try {
    const { first_name, last_name, phone, email, template_id, signature_data, delivery_method, delivery_contact } = req.body;
    if (!first_name || !last_name || !phone || !template_id || !signature_data) {
      return res.status(400).json({ error: 'first_name, last_name, phone, template_id, and signature_data required' });
    }
    const db = getDatabase();

    // Create minimal member record
    const memberResult = db.prepare(`
      INSERT INTO members (first_name, last_name, phone, email, status, source)
      VALUES (?, ?, ?, ?, 'active', 'kiosk_guest')
    `).run(first_name, last_name, phone, email || null, 'active', 'kiosk_guest');
    const memberId = memberResult.lastInsertRowid;

    // Sign waiver
    const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    db.prepare(`INSERT INTO member_waivers (member_id, template_id, signature_data, ip_address, signed_at) VALUES (?, ?, ?, ?, datetime('now'))`).run(
      memberId, template_id, signature_data, ip
    );

    // Queue delivery
    db.prepare(`INSERT INTO event_queue (event_type, payload, status) VALUES ('DELIVER_SIGNED_WAIVER', ?, 'pending')`).run(JSON.stringify({
      member_id: memberId, email, phone, member_name: `${first_name} ${last_name}`, deliveryMethod: delivery_method || 'email',
    }));

    // Create lead
    db.prepare(`INSERT INTO leads (first_name, last_name, phone, email, source, stage) VALUES (?, ?, ?, ?, 'walk_in', 'new')`)
      .run(first_name, last_name, phone, email || null);

    res.status(201).json({ member_id: memberId, member_name: `${first_name} ${last_name}`, message: "You've been added to our leads list" });
  } catch (error) {
    console.error('Guest sign error:', error);
    res.status(500).json({ error: 'Failed to process guest sign' });
  }
});

// ── Send parent waiver link (auth required) ──
router.post('/send-parent-link', auth.authenticateToken, auditLog('send_parent_link', 'waiver'), auth.requireRole('owner', 'gm', 'front_desk'), (req, res) => {
  try {
    const { member_id, template_id, parent_email } = req.body;
    if (!member_id || !template_id || !parent_email) {
      return res.status(400).json({ error: 'member_id, template_id, and parent_email required' });
    }
    const db = getDatabase();
    const member = db.prepare('SELECT id, first_name, last_name FROM members WHERE id = ?').get(member_id);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString(); // 7 days

    const pending = pendingParentSignatures.create({ member_id, template_id, parent_email, token, expires_at: expiresAt });

    // Load messaging settings
    if (!messagingProviders._loaded) messagingProviders.loadSettings();

    const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/parent-sign/${token}`;
    const subject = `Please sign waiver for ${member.first_name} ${member.last_name} - ROAR MMA`;
    const body = `
      <div style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px;">
        <h2>Parent Waiver Signature Required</h2>
        <p>Dear Parent/Guardian,</p>
        <p><strong>${member.first_name} ${member.last_name}</strong> needs a parent or guardian to sign their waiver.</p>
        <p>Please click the link below to review and sign the waiver:</p>
        <p style="text-align:center;margin:30px 0;">
          <a href="${link}" style="background:#dc2626;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px;display:inline-block;">
            Sign Waiver Now
          </a>
        </p>
        <p>This link will expire in 7 days.</p>
        <p>If you did not request this, please ignore this email.</p>
        <p>— ROAR MMA Team</p>
      </div>
    `;

    messagingProviders.sendEmail(parent_email, subject, body).catch(err => console.error('Failed to send parent waiver email:', err));

    res.status(201).json({ pending_id: pending.id, message: 'Parent waiver link sent' });
  } catch (error) {
    console.error('Send parent link error:', error);
    res.status(500).json({ error: 'Failed to send parent waiver link' });
  }
});

// ── Get parent sign waiver info by token (public) ──
router.get('/parent-sign/:token', kioskLimiter, (req, res) => {
  try {
    const pending = pendingParentSignatures.getByToken(req.params.token);
    if (!pending) return res.status(404).json({ error: 'Link invalid or expired' });
    const expiresAt = new Date(pending.expires_at);
    if (expiresAt < new Date()) return res.status(410).json({ error: 'Link has expired' });
    res.json({ pending, waiver_text: pending.body_text });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch waiver' });
  }
});

// ── Parent signs waiver by token (public) ──
router.post('/parent-sign/:token', kioskLimiter, (req, res) => {
  try {
    const { signature_data, parent_name, parent_relation } = req.body;
    if (!signature_data) return res.status(400).json({ error: 'Signature required' });
    const pending = pendingParentSignatures.getByToken(req.params.token);
    if (!pending) return res.status(404).json({ error: 'Link invalid or expired' });
    const expiresAt = new Date(pending.expires_at);
    if (expiresAt < new Date()) return res.status(410).json({ error: 'Link has expired' });

    // Sign the pending record
    const signed = pendingParentSignatures.sign(pending.id, signature_data, parent_name || null, parent_relation || null);

    // Also record the actual member waiver
    const db = getDatabase();
    const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    db.prepare(`
      INSERT INTO member_waivers (member_id, template_id, signature_data, ip_address, signed_at, guardian_name, guardian_relation)
      VALUES (?, ?, ?, ?, datetime('now'), ?, ?)
    `).run(pending.member_id, pending.template_id, signature_data, ip, signed.parent_name, signed.parent_relation);

    res.json({ message: 'Waiver signed successfully by parent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sign waiver' });
  }
});

// ── Get pending parent signatures for a member ──
router.get('/member/:memberId/pending-parent', auth.authenticateToken, auth.requireRole('owner', 'gm', 'front_desk'), (req, res) => {
  try {
    const pending = pendingParentSignatures.getPendingByMember(parseInt(req.params.memberId, 10));
    const expired = pending.filter(p => new Date(p.expires_at) < new Date());
    const active = pending.filter(p => new Date(p.expires_at) >= new Date());
    res.json({ active, expired, total: pending.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Resend expired parent waiver link ──
router.post('/member/:memberId/pending-parent/resend', auth.authenticateToken, auditLog('resend_parent_link', 'waiver'), auth.requireRole('owner', 'gm', 'front_desk'), (req, res) => {
  try {
    const { parent_email, template_id } = req.body;
    const memberId = parseInt(req.params.memberId, 10);
    const db = getDatabase();
    const member = db.prepare('SELECT id, first_name, last_name, email FROM members WHERE id = ?').get(memberId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const tplId = template_id || db.prepare("SELECT id FROM waiver_templates WHERE active = 1 ORDER BY id DESC LIMIT 1").get()?.id;
    if (!tplId) return res.status(400).json({ error: 'No active waiver template' });

    const email = parent_email || member.email;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

    pendingParentSignatures.create({ member_id: memberId, template_id: tplId, parent_email: email, token, expires_at: expiresAt });

    if (!messagingProviders._loaded) messagingProviders.loadSettings();

    const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/parent-sign/${token}`;
    const subject = `Please sign waiver for ${member.first_name} ${member.last_name} - ROAR MMA`;
    const body = `
      <div style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px;">
        <h2>Parent Waiver Signature Required</h2>
        <p>Dear Parent/Guardian,</p>
        <p><strong>${member.first_name} ${member.last_name}</strong> needs a parent or guardian to sign their waiver.</p>
        <p>Please click the link below to review and sign the waiver:</p>
        <p style="text-align:center;margin:30px 0;">
          <a href="${link}" style="background:#dc2626;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px;display:inline-block;">Sign Waiver Now</a>
        </p>
        <p>This link will expire in 7 days.</p>
        <p>— ROAR MMA Team</p>
      </div>
    `;
    messagingProviders.sendEmail(email, subject, body).catch(err => console.error('Failed to resend parent waiver email:', err));

    res.status(201).json({ message: 'Parent waiver link resent' });
  } catch (error) {
    console.error('Resend parent link error:', error);
    res.status(500).json({ error: 'Failed to resend parent waiver link' });
  }
});

// ── Waiver Analytics (auth required) ──
router.get('/analytics', auth.authenticateToken, auditLog('view', 'waiver'), auth.requireRole('owner', 'gm', 'front_desk'), (req, res) => {
  try {
    const stats = waiverAnalytics.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
