const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { getDatabase } = require('../db/connection');

const router = express.Router();

// Track pixel event (public - used by tracking pixel)
router.post('/track', express.raw({ type: 'image/gif' }), (req, res) => {
  try {
    const pixelId = req.query.pid || req.headers['x-pixel-id'];
    const eventType = req.query.evt || 'PageView';
    const campaignId = req.query.cid || null;
    const value = parseFloat(req.query.val) || null;
    const leadId = req.query.lid || null;

    if (!pixelId) return res.status(400).end();

    const db = getDatabase();
    db.prepare(`
      INSERT INTO pixel_events (pixel_id, event_type, lead_id, campaign_id, value, page_url, user_agent, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(pixelId, eventType, leadId, campaignId, value, req.headers['referer'] || '', req.headers['user-agent'] || '', req.ip || '');

    // Return 1x1 transparent GIF
    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': gif.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(gif);
  } catch (err) {
    console.error('[PIXEL] Track error:', err.message);
    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, { 'Content-Type': 'image/gif', 'Content-Length': gif.length });
    res.end(gif);
  }
});

// GET pixel tracking (for <img> tags)
router.get('/track', (req, res) => {
  try {
    const pixelId = req.query.pid;
    const eventType = req.query.evt || 'PageView';
    const campaignId = req.query.cid || null;
    const value = parseFloat(req.query.val) || null;
    const leadId = req.query.lid || null;

    if (!pixelId) return res.status(400).end();

    const db = getDatabase();
    db.prepare(`
      INSERT INTO pixel_events (pixel_id, event_type, lead_id, campaign_id, value, page_url, user_agent, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(pixelId, eventType, leadId, campaignId, value, req.query.url || req.headers['referer'] || '', req.headers['user-agent'] || '', req.ip || '');

    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': gif.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(gif);
  } catch (err) {
    console.error('[PIXEL] Track error:', err.message);
    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, { 'Content-Type': 'image/gif', 'Content-Length': gif.length });
    res.end(gif);
  }
});

// Get pixel events (authenticated)
router.get('/events', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const db = getDatabase();
    const { event_type, campaign_id, date_from, date_to, limit } = req.query;
    let query = 'SELECT * FROM pixel_events WHERE 1=1';
    const params = [];
    if (event_type) { query += ' AND event_type = ?'; params.push(event_type); }
    if (campaign_id) { query += ' AND campaign_id = ?'; params.push(campaign_id); }
    if (date_from) { query += ' AND DATE(created_at) >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND DATE(created_at) <= ?'; params.push(date_to); }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit) || 100);
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    console.error('[PIXEL] Events error:', err.message);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get pixel analytics
router.get('/analytics', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const db = getDatabase();
    const days = parseInt(req.query.days) || 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const events = db.prepare(`
      SELECT event_type, COUNT(*) as count, COALESCE(SUM(value),0) as total_value
      FROM pixel_events WHERE created_at >= ? GROUP BY event_type
    `).all(since);

    const byCampaign = db.prepare(`
      SELECT p.campaign_id, sc.name as campaign_name, COUNT(*) as events,
        COALESCE(SUM(p.value),0) as total_value,
        COUNT(DISTINCT p.lead_id) as unique_leads
      FROM pixel_events p LEFT JOIN social_campaigns sc ON p.campaign_id = sc.id
      WHERE p.created_at >= ? AND p.campaign_id IS NOT NULL
      GROUP BY p.campaign_id
    `).all(since);

    const daily = db.prepare(`
      SELECT DATE(created_at) as date, event_type, COUNT(*) as count
      FROM pixel_events WHERE created_at >= ?
      GROUP BY DATE(created_at), event_type ORDER BY date
    `).all(since);

    res.json({ events, byCampaign, daily });
  } catch (err) {
    console.error('[PIXEL] Analytics error:', err.message);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get pixel code snippet (for embedding)
router.get('/snippet/:pixelId', authenticateToken, requirePermission('reports:read'), (req, res) => {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  const pixelId = req.params.pixelId;
  const snippet = `<!-- ROAR MMA Tracking Pixel -->
<script>
(function(){
  var img = new Image();
  img.src = "${baseUrl}/api/pixel/track?pid=${pixelId}&evt=PageView&url="+encodeURIComponent(window.location.href);
  document.body.appendChild(img);
})();
</script>`;
  res.json({ pixelId, snippet, baseUrl });
});

module.exports = router;