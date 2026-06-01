const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const socialMedia = require('../data/socialMedia');
const router = express.Router();

router.get('/summary', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    res.json(socialMedia.getSummary());
  } catch (error) {
    console.error('Error fetching social media summary:', error);
    res.status(500).json({ error: 'Failed to fetch social media summary' });
  }
});

router.get('/platforms', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    res.json({ platforms: socialMedia.getPlatforms() });
  } catch (error) {
    console.error('Error fetching platforms:', error);
    res.status(500).json({ error: 'Failed to fetch platforms' });
  }
});

router.post('/platforms/:id/connect', authenticateToken, requirePermission('ai:manage'), (req, res) => {
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

router.post('/platforms/:id/disconnect', authenticateToken, requirePermission('ai:manage'), (req, res) => {
  try {
    const platform = socialMedia.disconnectPlatform(parseInt(req.params.id));
    res.json(platform);
  } catch (error) {
    console.error('Error disconnecting platform:', error);
    res.status(500).json({ error: 'Failed to disconnect platform' });
  }
});

router.get('/posts', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const { status } = req.query;
    res.json({ posts: socialMedia.getPosts({ status }) });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

router.get('/posts/:id', authenticateToken, requirePermission('reports:read'), (req, res) => {
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

router.post('/posts', authenticateToken, requirePermission('communications:write'), (req, res) => {
  try {
    const { platform_ids, title, content, media_urls, scheduled_at, status, created_by } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });
    const post = socialMedia.createPost({ platform_ids, title, content, media_urls, scheduled_at, status, created_by: created_by || req.user?.id });
    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

router.put('/posts/:id', authenticateToken, requirePermission('communications:write'), (req, res) => {
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

router.delete('/posts/:id', authenticateToken, requirePermission('communications:write'), (req, res) => {
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

router.post('/posts/:id/publish', authenticateToken, requirePermission('communications:write'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const post = socialMedia.getPostById(id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.status === 'published') return res.status(400).json({ error: 'Post already published' });

    const db = require('../db/connection').getDatabase();
    const now = new Date().toISOString();

    socialMedia.updatePost(id, { status: 'published', published_at: now });

    const platforms = JSON.parse(post.platform_ids || '[]');
    for (const platform of platforms) {
      db.prepare(`INSERT INTO event_queue (event_type, payload, status) VALUES ('PUBLISH_SOCIAL_POST', ?, 'pending')`)
        .run(JSON.stringify({ post_id: id, platform, content: post.content, media_urls: post.media_urls }));
    }

    res.json({ ...socialMedia.getPostById(id), queued: true });
  } catch (error) {
    console.error('Error publishing post:', error);
    res.status(500).json({ error: 'Failed to publish post' });
  }
});

router.get('/templates', authenticateToken, requirePermission('reports:read'), (req, res) => {
  try {
    const { category } = req.query;
    res.json({ templates: socialMedia.getTemplates(category) });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

router.get('/analytics', authenticateToken, requirePermission('reports:read'), (req, res) => {
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
