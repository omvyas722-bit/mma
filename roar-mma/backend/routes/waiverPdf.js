const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db/connection');
const auth = require('../middleware/auth');

router.get('/:id/pdf', auth.authenticateToken, auth.requireRole('owner', 'gm', 'front_desk', 'coach'), (req, res) => {
  try {
    const db = getDatabase();
    const waiver = db.prepare(`
      SELECT mw.id, mw.member_id, mw.template_id, mw.signed_at, mw.signature_data,
             wt.name as template_name, wt.body_text,
             m.first_name, m.last_name, m.email, m.date_of_birth, m.phone
      FROM member_waivers mw
      JOIN waiver_templates wt ON wt.id = mw.template_id
      JOIN members m ON m.id = mw.member_id
      WHERE mw.id = ?
    `).get(req.params.id);

    if (!waiver) return res.status(404).json({ error: 'Waiver not found' });
    res.json(waiver);
  } catch (err) {
    console.error('Error fetching waiver PDF data:', err);
    res.status(500).json({ error: 'Failed to fetch waiver data' });
  }
});

module.exports = router;
