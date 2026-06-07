const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const socialMedia = require('../data/socialMedia');
const { auditLog } = require('../middleware/auditLog');
const router = express.Router();

router.get('/summary', authenticateToken, requirePermission('reports:read'), auditLog('view', 'social_media'), (req, res) => {
  try {
    res.json(socialMedia.getSummary());
  } catch (error) {
    console.error('Error fetching social media summary:', error);
    res.status(500).json({ error: 'Failed to fetch social media summary' });
  }
});

router.get('/platforms', authenticateToken, requirePermission('reports:read'), auditLog('view_list', 'social_media'), (req, res) => {
  try {
    res.json({ platforms: socialMedia.getPlatforms() });
  } catch (error) {
    console.error('Error fetching platforms:', error);
    res.status(500).json({ error: 'Failed to fetch platforms' });
  }
});

router.post('/platforms/:id/connect', authenticateToken, requirePermission('ai:manage'), auditLog('connect', 'social_media'), (req, res) => {
  try {
    const { access_token, refresh_token, token_expires_at, page_id } = req.body;
    const platform = socialMedia.updatePlatformConnection(parseInt(req.params.id), {
      connected: true, access_token, refresh_token, token_expires_at, page_id,
    });
    res.json(platform);
  } catch (error) {
    console.error('Error connecting platform:', error);
    res.status(500).json({ error: 'Failed to connect platform' });
  }
});

router.post('/platforms/:id/disconnect', authenticateToken, requirePermission('ai:manage'), auditLog('disconnect', 'social_media'), (req, res) => {
  try {
    const platform = socialMedia.disconnectPlatform(parseInt(req.params.id));
    res.json(platform);
  } catch (error) {
    console.error('Error disconnecting platform:', error);
    res.status(500).json({ error: 'Failed to disconnect platform' });
  }
});

router.get('/posts', authenticateToken, requirePermission('reports:read'), auditLog('view_list', 'social_media'), (req, res) => {
  try {
    const { status } = req.query;
    res.json({ posts: socialMedia.getPosts({ status }) });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

router.get('/posts/:id', authenticateToken, requirePermission('reports:read'), auditLog('view', 'social_media'), (req, res) => {
  try {
    const post = socialMedia.getPostById(parseInt(req.params.id));
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const analytics = socialMedia.getAnalytics(post.id);
    res.json({ post, analytics });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

router.post('/posts', authenticateToken, requirePermission('communications:write'), auditLog('create', 'social_media'), (req, res) => {
  try {
    const { platform_ids, title, content, media_urls, scheduled_at, status, created_by, post_type } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });
    const post = socialMedia.createPost({ platform_ids, title, content, media_urls, scheduled_at, status, created_by: created_by || req.user?.id, post_type });
    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

router.put('/posts/:id', authenticateToken, requirePermission('communications:write'), auditLog('update', 'social_media'), (req, res) => {
  try {
    const existing = socialMedia.getPostById(parseInt(req.params.id));
    if (!existing) return res.status(404).json({ error: 'Post not found' });
    if (existing.status === 'published') return res.status(400).json({ error: 'Cannot edit published post' });
    const post = socialMedia.updatePost(parseInt(req.params.id), req.body);
    res.json(post);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

router.delete('/posts/:id', authenticateToken, requirePermission('communications:write'), auditLog('delete', 'social_media'), (req, res) => {
  try {
    const existing = socialMedia.getPostById(parseInt(req.params.id));
    if (!existing) return res.status(404).json({ error: 'Post not found' });
    if (existing.status === 'published') return res.status(400).json({ error: 'Cannot delete published post' });
    socialMedia.deletePost(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

router.post('/posts/:id/publish', authenticateToken, requirePermission('communications:write'), auditLog('publish', 'social_media'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const post = socialMedia.getPostById(id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.status === 'published') return res.status(400).json({ error: 'Post already published' });

    const db = require('../db/connection').getDatabase();
    const now = new Date().toISOString();
    const metaApi = require('../services/metaApi');
    const platforms = JSON.parse(post.platform_ids || '[]');
    const results = [];

    for (const platform of platforms) {
      const platformRow = socialMedia.getPlatformById(platform);
      if (!platformRow || !platformRow.access_token) {
        results.push({ platform: platformRow?.name || platform, success: false, error: 'Platform not connected' });
        continue;
      }
      try {
        if (platformRow.platform_type === 'facebook') {
          const r = await metaApi.postToFacebook(platformRow.access_token, post.content, post.media_urls ? JSON.parse(post.media_urls) : []);
          results.push({ platform: platformRow.name, ...r });
        } else if (platformRow.platform_type === 'instagram') {
          const r = await metaApi.postToInstagram(platformRow.account_id, platformRow.access_token, post.content, post.media_urls ? JSON.parse(post.media_urls)?.[0] : null);
          results.push({ platform: platformRow.name, ...r });
        } else {
          db.prepare(`INSERT INTO event_queue (event_type, payload, status) VALUES ('PUBLISH_SOCIAL_POST', ?, 'pending')`)
            .run(JSON.stringify({ post_id: id, platform, content: post.content, media_urls: post.media_urls }));
          results.push({ platform: platformRow.name, success: true, queued: true });
        }
      } catch (e) {
        results.push({ platform: platformRow.name, success: false, error: e.message });
        db.prepare(`INSERT INTO event_queue (event_type, payload, status) VALUES ('PUBLISH_SOCIAL_POST', ?, 'pending')`)
          .run(JSON.stringify({ post_id: id, platform: platformRow.id, content: post.content, media_urls: post.media_urls }));
      }
    }

    socialMedia.updatePost(id, { status: 'published', published_at: now });
    res.json({ ...socialMedia.getPostById(id), results });
  } catch (error) {
    console.error('Error publishing post:', error);
    res.status(500).json({ error: 'Failed to publish post' });
  }
});

router.get('/templates', authenticateToken, requirePermission('reports:read'), auditLog('view_list', 'social_media'), (req, res) => {
  try {
    const { category } = req.query;
    res.json({ templates: socialMedia.getTemplates(category) });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Hashtag Group routes
router.get('/hashtag-groups', authenticateToken, requirePermission('reports:read'), auditLog('view_list', 'social_media'), (req, res) => {
  try {
    res.json({ groups: socialMedia.getHashtagGroups() });
  } catch (error) {
    console.error('Error fetching hashtag groups:', error);
    res.status(500).json({ error: 'Failed to fetch hashtag groups' });
  }
});

router.post('/hashtag-groups', authenticateToken, requirePermission('communications:write'), auditLog('create', 'social_media'), (req, res) => {
  try {
    const { name, hashtags } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const g = socialMedia.createHashtagGroup({ name, hashtags: hashtags || [], created_by: req.user?.id });
    res.status(201).json(g);
  } catch (error) {
    console.error('Error creating hashtag group:', error);
    res.status(500).json({ error: 'Failed to create hashtag group' });
  }
});

router.put('/hashtag-groups/:id', authenticateToken, requirePermission('communications:write'), auditLog('update', 'social_media'), (req, res) => {
  try {
    const existing = socialMedia.getHashtagGroupById(parseInt(req.params.id));
    if (!existing) return res.status(404).json({ error: 'Hashtag group not found' });
    res.json(socialMedia.updateHashtagGroup(parseInt(req.params.id), req.body));
  } catch (error) {
    console.error('Error updating hashtag group:', error);
    res.status(500).json({ error: 'Failed to update hashtag group' });
  }
});

router.delete('/hashtag-groups/:id', authenticateToken, requirePermission('communications:write'), auditLog('delete', 'social_media'), (req, res) => {
  try {
    const existing = socialMedia.getHashtagGroupById(parseInt(req.params.id));
    if (!existing) return res.status(404).json({ error: 'Hashtag group not found' });
    socialMedia.deleteHashtagGroup(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting hashtag group:', error);
    res.status(500).json({ error: 'Failed to delete hashtag group' });
  }
});

// Campaign routes
router.get('/campaigns', authenticateToken, requirePermission('reports:read'), auditLog('view_list', 'social_media'), (req, res) => {
  try {
    res.json({ campaigns: socialMedia.getCampaigns(req.query) });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

router.get('/campaigns/:id', authenticateToken, requirePermission('reports:read'), auditLog('view', 'social_media'), (req, res) => {
  try {
    const c = socialMedia.getCampaignById(parseInt(req.params.id));
    if (!c) return res.status(404).json({ error: 'Campaign not found' });
    const leads = socialMedia.getCampaignLeads(c.id);
    const analytics = socialMedia.getCampaignAnalyticsAgg(c.id);
    res.json({ campaign: c, leads, analytics });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

router.post('/campaigns', authenticateToken, requirePermission('communications:write'), auditLog('create', 'social_media'), (req, res) => {
  try {
    const c = socialMedia.createCampaign({ ...req.body, created_by: req.user?.id });
    res.status(201).json(c);
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

router.put('/campaigns/:id', authenticateToken, requirePermission('communications:write'), auditLog('update', 'social_media'), (req, res) => {
  try {
    const existing = socialMedia.getCampaignById(parseInt(req.params.id));
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });
    res.json(socialMedia.updateCampaign(parseInt(req.params.id), req.body));
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

router.delete('/campaigns/:id', authenticateToken, requirePermission('communications:write'), auditLog('delete', 'social_media'), (req, res) => {
  try {
    const existing = socialMedia.getCampaignById(parseInt(req.params.id));
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });
    socialMedia.deleteCampaign(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// Meta API connection (OAuth proxy)
router.post('/connect/meta', authenticateToken, requirePermission('ai:manage'), auditLog('connect', 'social_media'), (req, res) => {
  try {
    const { code, redirect_uri } = req.body;
    if (!code) return res.status(400).json({ error: 'Authorization code required' });
    const https = require('https');
    const qs = new URLSearchParams({
      code, redirect_uri, client_id: process.env.META_APP_ID || '', client_secret: process.env.META_APP_SECRET || '',
      grant_type: 'authorization_code',
    });
    https.get(`https://graph.facebook.com/v19.0/oauth/access_token?${qs}`, (resp) => {
      let d = '';
      resp.on('data', c => d += c);
      resp.on('end', () => {
        try {
          const t = JSON.parse(d);
          if (t.access_token) {
            const platform = socialMedia.updatePlatformConnection(1, { connected: true, access_token: t.access_token, token_expires_at: t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null });
            return res.json(platform);
          }
          res.status(400).json({ error: t.error?.message || 'Failed to exchange code' });
        } catch { res.status(500).json({ error: 'Failed to parse Meta response' }); }
      });
    }).on('error', (e) => res.status(500).json({ error: e.message }));
  } catch (error) {
    console.error('Error connecting Meta:', error);
    res.status(500).json({ error: 'Failed to connect Meta' });
  }
});

// Lead-from-post correlation
router.get('/lead-correlation', authenticateToken, requirePermission('reports:read'), auditLog('view', 'social_media'), (req, res) => {
  try {
    const db = require('../db/connection').getDatabase();
    const posts = socialMedia.getPosts({ status: 'published' });
    const correlations = posts.map(p => {
      const utm = p.utm_campaign || p.title?.toLowerCase().replace(/\s+/g, '_');
      const leads = utm ? db.prepare("SELECT COUNT(*) as c FROM leads WHERE utm_campaign = ?").get(utm) : { c: 0 };
      return { post_id: p.id, title: p.title, utm_campaign: utm, leads_count: leads.c };
    });
    res.json({ correlations, total_leads: correlations.reduce((s, c) => s + c.leads_count, 0) });
  } catch (error) {
    console.error('Error fetching lead correlation:', error);
    res.status(500).json({ error: 'Failed to fetch lead correlation' });
  }
});

router.get('/analytics', authenticateToken, requirePermission('reports:read'), auditLog('view', 'social_media'), (req, res) => {
  try {
    const db = require('../db/connection').getDatabase();
    const byPlatform = db.prepare(`SELECT platform, SUM(impressions) as impressions, SUM(reach) as reach, SUM(engagement) as engagement, SUM(likes) as likes, SUM(comments) as comments, SUM(shares) as shares, SUM(clicks) as clicks FROM social_analytics GROUP BY platform`).all();
    const total = {
      impressions: byPlatform.reduce((s, p) => s + p.impressions, 0),
      reach: byPlatform.reduce((s, p) => s + p.reach, 0),
      engagement: byPlatform.reduce((s, p) => s + p.engagement, 0),
      likes: byPlatform.reduce((s, p) => s + p.likes, 0),
      comments: byPlatform.reduce((s, p) => s + p.comments, 0),
      shares: byPlatform.reduce((s, p) => s + p.shares, 0),
      clicks: byPlatform.reduce((s, p) => s + p.clicks, 0),
    };
    res.json({ byPlatform, total });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
