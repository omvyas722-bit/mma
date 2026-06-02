const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const privacyData = require('../data/privacy');
const router = express.Router();

router.get('/consents/:memberId', authenticateToken, requirePermission('members:read'), (req, res) => {
  try { res.json({ consents: privacyData.getConsents(parseInt(req.params.memberId)) }); }
  catch (error) { res.status(500).json({ error: 'Failed to fetch consents' }); }
});

router.put('/consents/:memberId/:type', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const { granted } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
    const consents = privacyData.setConsent(parseInt(req.params.memberId), req.params.type, granted, ip);
    res.json({ consents });
  } catch (error) { res.status(500).json({ error: 'Failed to update consent' }); }
});

router.get('/retention', authenticateToken, requirePermission('settings:read'), (req, res) => {
  try { res.json({ policies: privacyData.getRetentionPolicies() }); }
  catch (error) { res.status(500).json({ error: 'Failed to fetch policies' }); }
});

router.put('/retention/:id', authenticateToken, requirePermission('settings:write'), (req, res) => {
  try {
    const policies = privacyData.updateRetentionPolicy(parseInt(req.params.id), req.body);
    res.json({ policies });
  } catch (error) { res.status(500).json({ error: 'Failed to update policy' }); }
});

router.post('/export', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const { member_id, export_type, format } = req.body;
    const exportLog = privacyData.requestExport(member_id || null, export_type, format, req.user.id);
    res.status(201).json(exportLog);
  } catch (error) { res.status(500).json({ error: 'Failed to request export' }); }
});

router.get('/exports', authenticateToken, requirePermission('members:read'), (req, res) => {
  try { res.json({ exports: privacyData.getExports() }); }
  catch (error) { res.status(500).json({ error: 'Failed to fetch exports' }); }
});

router.get('/export-member/:memberId', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const data = privacyData.getMemberData(parseInt(req.params.memberId));
    res.json(data);
  } catch (error) { res.status(500).json({ error: 'Failed to export member data' }); }
});

module.exports = router;
