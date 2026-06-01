const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const certsData = require('../data/certifications');
const router = express.Router();

router.get('/staff/:staffId', authenticateToken, requirePermission('staff:read'), (req, res) => {
  try {
    res.json({ certifications: certsData.getCertificationsByStaff(parseInt(req.params.staffId)) });
  } catch (error) {
    console.error('Error fetching certifications:', error);
    res.status(500).json({ error: 'Failed to fetch certifications' });
  }
});

router.post('/', authenticateToken, requirePermission('staff:update'), (req, res) => {
  try {
    const { staff_id, cert_name, issuing_body, cert_number, issued_date, expiry_date, notes } = req.body;
    if (!staff_id || !cert_name) return res.status(400).json({ error: 'staff_id and cert_name are required' });
    const cert = certsData.createCertification({ staff_id, cert_name, issuing_body, cert_number, issued_date, expiry_date, notes });
    res.status(201).json(cert);
  } catch (error) {
    console.error('Error creating certification:', error);
    res.status(500).json({ error: 'Failed to create certification' });
  }
});

router.put('/:id', authenticateToken, requirePermission('staff:update'), (req, res) => {
  try {
    const existing = certsData.getCertificationById(parseInt(req.params.id));
    if (!existing) return res.status(404).json({ error: 'Certification not found' });
    const cert = certsData.updateCertification(parseInt(req.params.id), req.body);
    res.json(cert);
  } catch (error) {
    console.error('Error updating certification:', error);
    res.status(500).json({ error: 'Failed to update certification' });
  }
});

router.delete('/:id', authenticateToken, requirePermission('staff:update'), (req, res) => {
  try {
    const existing = certsData.getCertificationById(parseInt(req.params.id));
    if (!existing) return res.status(404).json({ error: 'Certification not found' });
    certsData.deleteCertification(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting certification:', error);
    res.status(500).json({ error: 'Failed to delete certification' });
  }
});

router.get('/expiring', authenticateToken, requirePermission('staff:read'), (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    res.json({ expiring: certsData.getExpiringCertifications(days) });
  } catch (error) {
    console.error('Error fetching expiring certifications:', error);
    res.status(500).json({ error: 'Failed to fetch expiring certifications' });
  }
});

module.exports = router;
