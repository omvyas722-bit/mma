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

    const today = new Date().toISOString().split('T')[0];
    const todayCount = db.prepare(`
      SELECT COUNT(*) as count FROM pixel_events WHERE DATE(created_at) = ?
    `).get(today)?.count || 0;
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekCount = db.prepare(`
      SELECT COUNT(*) as count FROM pixel_events WHERE created_at >= ?
    `).get(weekStart.toISOString().split('T')[0])?.count || 0;
    const monthStart = new Date(); monthStart.setDate(1);
    const monthCount = db.prepare(`
      SELECT COUNT(*) as count FROM pixel_events WHERE created_at >= ?
    `).get(monthStart.toISOString().split('T')[0])?.count || 0;

    const topPages = db.prepare(`
      SELECT page_url, COUNT(*) as count FROM pixel_events
      WHERE created_at >= ? AND page_url != ''
      GROUP BY page_url ORDER BY count DESC LIMIT 10
    `).all(since);

    const topReferrers = db.prepare(`
      SELECT COALESCE(NULLIF(page_url, ''), '(direct)') as referrer, COUNT(*) as count FROM pixel_events
      WHERE created_at >= ?
      GROUP BY referrer ORDER BY count DESC LIMIT 10
    `).all(since);

    res.json({ events, byCampaign, daily, totals: { today: todayCount, week: weekCount, month: monthCount, total: events.reduce((s, e) => s + e.count, 0) }, topPages, topReferrers });
  } catch (err) {
    console.error('[PIXEL] Analytics error:', err.message);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// AI caption generation (PIXEL agent)
router.post('/generate-caption', authenticateToken, requirePermission('communications:write'), async (req, res) => {
  try {
    const { topic, tone, platform, keywords } = req.body;
    if (!topic) return res.status(400).json({ error: 'topic is required' });

    const providerChain = require('../services/ai/providerChain');
    const prompt = `Write a social media post caption for a martial arts gym.
Topic: ${topic}
Tone: ${tone || 'motivational'}
Platform: ${platform || 'instagram'}
Keywords to include: ${keywords || 'none'}

Return JSON: { caption (the post text), hashtags (comma-separated), best_time_to_post (string), engagement_tip (string) }`;

    const result = await providerChain.completeChat(
      [{ role: 'user', content: prompt }],
      { jsonMode: true, temperature: 0.7, maxTokens: 600 }
    );

    let captionData = { caption: '', hashtags: '', best_time_to_post: '', engagement_tip: '' };
    if (result.content) {
      try { captionData = JSON.parse(result.content); } catch {}
    }

    res.json(captionData);
  } catch (error) {
    console.error('[PIXEL] Caption generation error:', error.message);
    res.status(500).json({ error: 'Failed to generate caption' });
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