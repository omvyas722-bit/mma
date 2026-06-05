const axios = require('axios');
const { getDatabase } = require('../db/connection');

const LIGHTSPEED_API_KEY = process.env.LIGHTSPEED_API_KEY;
const LIGHTSPEED_API_SECRET = process.env.LIGHTSPEED_API_SECRET;
const LIGHTSPEED_REFRESH_TOKEN = process.env.LIGHTSPEED_REFRESH_TOKEN;
const LIGHTSPEED_ACCOUNT_ID = process.env.LIGHTSPEED_ACCOUNT_ID;
const BASE_URL = 'https://api.lightspeed.app';

let accessToken = null;
let tokenExpiresAt = null;

async function getAccessToken() {
  if (accessToken && tokenExpiresAt && Date.now() < tokenExpiresAt) return accessToken;
  if (!LIGHTSPEED_API_KEY || !LIGHTSPEED_API_SECRET) return null;
  try {
    const res = await axios.post(`${BASE_URL}/oauth/token`, {
      client_id: LIGHTSPEED_API_KEY,
      client_secret: LIGHTSPEED_API_SECRET,
      refresh_token: LIGHTSPEED_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    });
    accessToken = res.data.access_token;
    tokenExpiresAt = Date.now() + (res.data.expires_in || 3600) * 1000;
    return accessToken;
  } catch (err) {
    console.error('Failed to get Lightspeed access token:', err?.response?.data || err.message);
    return null;
  }
}

async function apiGet(path) {
  const token = await getAccessToken();
  if (!token) throw new Error('Lightspeed not authenticated');
  const res = await axios.get(`${BASE_URL}/api/2.0/accounts/${LIGHTSPEED_ACCOUNT_ID}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  return res.data;
}

// Sync sales from Lightspeed (last N days)
async function syncSales(daysBack = 7) {
  const db = getDatabase();
  const since = new Date(Date.now() - daysBack * 86400000).toISOString();
  let offset = 0;
  let synced = 0;
  while (true) {
    const data = await apiGet(`/sales.json?created_at=>${since}&limit=100&offset=${offset}`);
    const sales = data?.Sale || [];
    if (sales.length === 0) break;
    for (const sale of sales) {
      const existing = db.prepare('SELECT id FROM transactions WHERE lightspeed_transaction_id = ?').get(sale.id.toString());
      if (existing) continue;
      const memberEmail = sale.customer?.email;
      let memberId = null;
      if (memberEmail) {
        const member = db.prepare('SELECT id FROM members WHERE email = ?').get(memberEmail);
        if (member) memberId = member.id;
      }
      db.prepare(`INSERT INTO transactions (member_id, amount, currency, type, status, payment_method, lightspeed_transaction_id, description, processed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`).run(
        memberId, parseFloat(sale.total) || 0, sale.currency || 'TWD',
        determineType(sale), 'completed', sale.paymentType || 'card',
        sale.id.toString(), sale.note || sale.lineItems?.[0]?.description || `Sale #${sale.id}`,
        sale.createdAt || new Date().toISOString()
      );
      synced++;
    }
    offset += sales.length;
  }
  return { synced, daysBack };
}

// Sync customers from Lightspeed
async function syncCustomers() {
  const db = getDatabase();
  let offset = 0;
  let synced = 0;
  while (true) {
    const data = await apiGet(`/customers.json?limit=100&offset=${offset}`);
    const customers = data?.Customer || [];
    if (customers.length === 0) break;
    for (const c of customers) {
      const existing = db.prepare('SELECT id FROM members WHERE lightspeed_customer_id = ?').get(c.id.toString());
      if (existing) {
        db.prepare('UPDATE members SET first_name = ?, last_name = ?, email = ?, phone = ?, updated_at = datetime(\'now\') WHERE lightspeed_customer_id = ?')
          .run(c.firstName || '', c.lastName || '', c.email || '', c.phone || '', c.id.toString());
      } else {
        const existingEmail = c.email ? db.prepare('SELECT id FROM members WHERE email = ?').get(c.email) : null;
        if (existingEmail) {
          db.prepare('UPDATE members SET lightspeed_customer_id = ?, updated_at = datetime(\'now\') WHERE id = ?')
            .run(c.id.toString(), existingEmail.id);
        }
      }
      synced++;
    }
    offset += customers.length;
  }
  return { synced };
}

function determineType(sale) {
  const note = (sale.note || '').toLowerCase();
  if (note.includes('membership')) return 'membership';
  if (note.includes('hold') || note.includes('pause')) return 'hold_fee';
  if (note.includes('pt') || note.includes('personal training')) return 'pt_pack';
  return 'product';
}

async function getProducts() {
  try {
    const data = await apiGet('/items.json?limit=100');
    return data?.Item || [];
  } catch (err) {
    console.error('Error fetching Lightspeed products:', err?.response?.data || err.message);
    return [];
  }
}

async function syncProduct(product) {
  const token = await getAccessToken();
  if (!token) {
    console.warn('Lightspeed not configured — cannot sync product');
    return null;
  }
  try {
    const res = await axios.post(`${BASE_URL}/api/2.0/accounts/${LIGHTSPEED_ACCOUNT_ID}/items.json`, product, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    return res.data;
  } catch (err) {
    console.error('Error syncing product to Lightspeed:', err?.response?.data || err.message);
    throw err;
  }
}

async function getSales(daysBack = 7) {
  try {
    const since = new Date(Date.now() - daysBack * 86400000).toISOString();
    const data = await apiGet(`/sales.json?created_at=>${since}&limit=100`);
    return data?.Sale || [];
  } catch (err) {
    console.error('Error fetching Lightspeed sales:', err?.response?.data || err.message);
    return [];
  }
}

async function syncAll(daysBack = 30) {
  const results = {};
  try { results.sales = await syncSales(daysBack); } catch (e) { results.sales = { error: e.message }; }
  try { results.customers = await syncCustomers(); } catch (e) { results.customers = { error: e.message }; }
  return results;
}

module.exports = { syncSales, syncCustomers, syncAll, getAccessToken, getProducts, syncProduct, getSales };
