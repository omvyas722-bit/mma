const express = require('express');
const router = express.Router();
const { waiverTemplates, memberWaivers, memberDocuments } = require('../data/waivers');
const auth = require('../middleware/auth');

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

module.exports = router;
