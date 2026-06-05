const { getDatabase } = require('../db/connection');

function getPlatforms() {
  return getDatabase().prepare('SELECT * FROM social_platforms ORDER BY name').all();
}

function updatePlatformConnection(id, { connected, access_token, refresh_token, token_expires_at, page_id }) {
  const db = getDatabase();
  db.prepare(`UPDATE social_platforms SET connected = ?, access_token = ?, refresh_token = ?, token_expires_at = ?, page_id = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(connected ? 1 : 0, access_token || null, refresh_token || null, token_expires_at || null, page_id || null, id);
  return db.prepare('SELECT * FROM social_platforms WHERE id = ?').get(id);
}

function disconnectPlatform(id) {
  const db = getDatabase();
  db.prepare(`UPDATE social_platforms SET connected = 0, access_token = NULL, refresh_token = NULL, token_expires_at = NULL, page_id = NULL, updated_at = datetime('now') WHERE id = ?`).run(id);
  return db.prepare('SELECT * FROM social_platforms WHERE id = ?').get(id);
}

function getPosts(filters = {}) {
  const db = getDatabase();
  let query = 'SELECT * FROM social_posts WHERE 1=1';
  const params = [];
  if (filters.status) { query += ' AND status = ?'; params.push(filters.status); }
  if (filters.platform) { query += ' AND EXISTS (SELECT 1 FROM json_each(platform_ids) WHERE value = ?)'; params.push(filters.platform); }
  query += ' ORDER BY scheduled_at DESC, created_at DESC';
  return db.prepare(query).all(...params);
}

function getPostById(id) {
  return getDatabase().prepare('SELECT * FROM social_posts WHERE id = ?').get(id);
}

function createPost({ platform_ids, title, content, media_urls, scheduled_at, status, created_by }) {
  const db = getDatabase();
  const result = db.prepare(`INSERT INTO social_posts (platform_ids, title, content, media_urls, scheduled_at, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(platform_ids || '[]', title || null, content, media_urls || '[]', scheduled_at || null, status || 'draft', created_by || null);
  return db.prepare('SELECT * FROM social_posts WHERE id = ?').get(result.lastInsertRowid);
}

function updatePost(id, fields) {
  const db = getDatabase();
  const allowed = ['platform_ids', 'title', 'content', 'media_urls', 'scheduled_at', 'status', 'published_at'];
  const sets = [];
  const params = [];
  for (const k of allowed) {
    if (fields[k] !== undefined) { sets.push(`${k} = ?`); params.push(fields[k]); }
  }
  if (sets.length === 0) return getPostById(id);
  sets.push("updated_at = datetime('now')");
  params.push(id);
  db.prepare(`UPDATE social_posts SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return getPostById(id);
}

function deletePost(id) {
  return getDatabase().prepare('DELETE FROM social_posts WHERE id = ?').run(id);
}

function getAnalytics(postId) {
  return getDatabase().prepare('SELECT * FROM social_analytics WHERE post_id = ? ORDER BY platform').all(postId);
}

function upsertAnalytics({ post_id, platform, impressions, reach, engagement, likes, comments, shares, clicks }) {
  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM social_analytics WHERE post_id = ? AND platform = ?').get(post_id, platform);
  if (existing) {
    db.prepare(`UPDATE social_analytics SET impressions = ?, reach = ?, engagement = ?, likes = ?, comments = ?, shares = ?, clicks = ?, fetched_at = datetime('now') WHERE id = ?`)
      .run(impressions || 0, reach || 0, engagement || 0, likes || 0, comments || 0, shares || 0, clicks || 0, existing.id);
  } else {
    db.prepare(`INSERT INTO social_analytics (post_id, platform, impressions, reach, engagement, likes, comments, shares, clicks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(post_id, platform, impressions || 0, reach || 0, engagement || 0, likes || 0, comments || 0, shares || 0, clicks || 0);
  }
  return getAnalytics(post_id);
}

// Campaigns
function getCampaigns(filters = {}) {
  const db = getDatabase();
  let query = 'SELECT * FROM social_campaigns WHERE 1=1';
  const params = [];
  if (filters.status) { query += ' AND status = ?'; params.push(filters.status); }
  if (filters.platform) { query += ' AND platform = ?'; params.push(filters.platform); }
  query += ' ORDER BY created_at DESC';
  return db.prepare(query).all(...params);
}

function getCampaignById(id) {
  return getDatabase().prepare('SELECT * FROM social_campaigns WHERE id = ?').get(id);
}

function createCampaign(data) {
  const db = getDatabase();
  const r = db.prepare(`INSERT INTO social_campaigns (name, platform, campaign_type, budget, start_date, end_date, target_url, utm_campaign, utm_source, utm_medium, status, notes, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(data.name, data.platform, data.campaign_type || 'promotion', data.budget || null, data.start_date || null, data.end_date || null, data.target_url || null, data.utm_campaign || null, data.utm_source || null, data.utm_medium || null, data.status || 'draft', data.notes || null, data.created_by || null);
  return getCampaignById(r.lastInsertRowid);
}

function updateCampaign(id, fields) {
  const db = getDatabase();
  const allowed = ['name','platform','campaign_type','budget','start_date','end_date','target_url','utm_campaign','utm_source','utm_medium','status','notes'];
  const sets = []; const vals = [];
  for (const k of allowed) { if (fields[k] !== undefined) { sets.push(`${k}=?`); vals.push(fields[k]); } }
  if (sets.length === 0) return getCampaignById(id);
  sets.push("updated_at=datetime('now')"); vals.push(id);
  db.prepare(`UPDATE social_campaigns SET ${sets.join(',')} WHERE id=?`).run(...vals);
  return getCampaignById(id);
}

function deleteCampaign(id) {
  return getDatabase().prepare('DELETE FROM social_campaigns WHERE id = ?').run(id);
}

function getCampaignLeads(campaignId) {
  const c = getCampaignById(campaignId);
  if (!c || !c.utm_campaign) return [];
  return getDatabase().prepare("SELECT * FROM leads WHERE utm_campaign = ? ORDER BY created_at DESC").all(c.utm_campaign);
}

// Lead-from-post correlation
function getLeadsByUtmSource(source) {
  return getDatabase().prepare("SELECT * FROM leads WHERE utm_source = ? ORDER BY created_at DESC").all(source);
}

function getTemplates(category) {
  const db = getDatabase();
  if (category) {
    return db.prepare('SELECT * FROM social_content_templates WHERE category = ? ORDER BY name').all(category);
  }
  return db.prepare('SELECT * FROM social_content_templates ORDER BY category, name').all();
}

function getSummary() {
  const db = getDatabase();
  const totalPosts = db.prepare('SELECT COUNT(*) as count FROM social_posts').get();
  const scheduledPosts = db.prepare("SELECT COUNT(*) as count FROM social_posts WHERE status = 'scheduled'").get();
  const publishedPosts = db.prepare("SELECT COUNT(*) as count FROM social_posts WHERE status = 'published'").get();
  const draftPosts = db.prepare("SELECT COUNT(*) as count FROM social_posts WHERE status = 'draft'").get();
  const connectedPlatforms = db.prepare('SELECT COUNT(*) as count FROM social_platforms WHERE connected = 1').get();
  const upcomingPosts = db.prepare("SELECT * FROM social_posts WHERE status IN ('scheduled') AND scheduled_at >= datetime('now') ORDER BY scheduled_at ASC LIMIT 10").all();
  const totalImpressions = db.prepare('SELECT COALESCE(SUM(impressions), 0) as count FROM social_analytics').get();
  const totalEngagement = db.prepare('SELECT COALESCE(SUM(engagement), 0) as count FROM social_analytics').get();
  return {
    totalPosts: totalPosts.count,
    scheduledPosts: scheduledPosts.count,
    publishedPosts: publishedPosts.count,
    draftPosts: draftPosts.count,
    connectedPlatforms: connectedPlatforms.count,
    upcomingPosts,
    totalImpressions: totalImpressions.count,
    totalEngagement: totalEngagement.count,
  };
}

module.exports = {
  getPlatforms,
  updatePlatformConnection,
  disconnectPlatform,
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  getAnalytics,
  upsertAnalytics,
  getTemplates,
  getSummary,
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignLeads,
  getLeadsByUtmSource,
};
