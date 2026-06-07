const https = require('https');
const urlMod = require('url');

function graphRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = `https://graph.facebook.com/v19.0${path}`;
    const parsed = urlMod.parse(url);
    const opts = { hostname: parsed.hostname, path: parsed.path, method, headers: { 'Content-Type': 'application/json' } };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function postToFacebook(pageAccessToken, message, mediaUrls = []) {
  try {
    const fields = `message=${encodeURIComponent(message)}&access_token=${pageAccessToken}`;
    const result = await graphRequest(`/${process.env.FACEBOOK_PAGE_ID || 'me'}/feed?${fields}`, 'POST');
    if (result.error) throw new Error(`Facebook API error: ${result.error.message}`);
    return { success: true, platform_post_id: result.id, result };
  } catch (e) {
    if (e.message.includes('Error: Facebook API')) throw e;
    return { success: false, error: e.message };
  }
}

async function postToInstagram(businessAccountId, pageAccessToken, message, mediaUrl = null) {
  try {
    if (mediaUrl) {
      const creationResult = await graphRequest(`/${businessAccountId}/media?image_url=${encodeURIComponent(mediaUrl)}&caption=${encodeURIComponent(message)}&access_token=${pageAccessToken}`, 'POST');
      if (creationResult.error) throw new Error(`Instagram API error: ${creationResult.error.message}`);
      const publishResult = await graphRequest(`/${businessAccountId}/media_publish?creation_id=${creationResult.id}&access_token=${pageAccessToken}`, 'POST');
      if (publishResult.error) throw new Error(`Instagram API error: ${publishResult.error.message}`);
      return { success: true, platform_post_id: publishResult.id };
    } else {
      const result = await graphRequest(`/${businessAccountId}/media?caption=${encodeURIComponent(message)}&access_token=${pageAccessToken}&media_type=IMAGE_URL&image_url=https://via.placeholder.com/1`, 'POST');
      return { success: false, error: 'Instagram requires media. Attach an image.' };
    }
  } catch (e) {
    if (e.message.includes('Error: Instagram')) throw e;
    return { success: false, error: e.message };
  }
}

module.exports = { postToFacebook, postToInstagram, graphRequest };