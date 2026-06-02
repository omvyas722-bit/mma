// Transactions/Billing data access layer
const { getDatabase } = require('../db/connection');

function getAllTransactions(filters = {}) {
  const db = getDatabase();

  let query = `
    SELECT
      t.id, t.member_id, t.amount, t.currency, t.type, t.status, t.payment_method, t.lightspeed_transaction_id, t.stripe_payment_intent_id, t.stripe_payment_method, t.write_off_reason, t.write_off_at, t.write_off_by,
      t.description, t.processed_at, t.failure_reason, t.created_at, t.updated_at,
      m.first_name || ' ' || m.last_name as member_name,
      m.email as member_email
    FROM transactions t
    JOIN members m ON t.member_id = m.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.member_id) {
    query += ' AND t.member_id = ?';
    params.push(filters.member_id);
  }

  if (filters.status) {
    query += ' AND t.status = ?';
    params.push(filters.status);
  }

  if (filters.type) {
    query += ' AND t.type = ?';
    params.push(filters.type);
  }

  if (filters.date_from) {
    query += ' AND DATE(t.created_at) >= ?';
    params.push(filters.date_from);
  }

  if (filters.date_to) {
    query += ' AND DATE(t.created_at) <= ?';
    params.push(filters.date_to);
  }

  const limit = parseInt(filters.limit, 10) || 50;
  const offset = parseInt(filters.offset, 10) || 0;

  query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const transactions = db.prepare(query).all(...params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM transactions t WHERE 1=1';
  const countParams = [];

  if (filters.member_id) {
    countQuery += ' AND t.member_id = ?';
    countParams.push(filters.member_id);
  }

  if (filters.status) {
    countQuery += ' AND t.status = ?';
    countParams.push(filters.status);
  }

  if (filters.type) {
    countQuery += ' AND t.type = ?';
    countParams.push(filters.type);
  }

  const { total } = db.prepare(countQuery).get(...countParams);

  return { transactions, total, limit, offset };
}

function getTransactionById(id) {
  const db = getDatabase();
  return db.prepare(`
    SELECT
      t.id, t.member_id, t.amount, t.currency, t.type, t.status, t.payment_method, t.lightspeed_transaction_id, t.stripe_payment_intent_id, t.stripe_payment_method, t.write_off_reason, t.write_off_at, t.write_off_by,
      t.description, t.processed_at, t.failure_reason, t.created_at, t.updated_at,
      m.first_name || ' ' || m.last_name as member_name,
      m.email as member_email,
      m.phone as member_phone
    FROM transactions t
    JOIN members m ON t.member_id = m.id
    WHERE t.id = ?
  `).get(id);
}

function createTransaction(transactionData) {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO transactions (
      member_id, amount, currency, type, status, payment_method,
      lightspeed_transaction_id, description, processed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    transactionData.member_id,
    transactionData.amount,
    transactionData.currency || 'AUD',
    transactionData.type,
    transactionData.status || 'pending',
    transactionData.payment_method || null,
    transactionData.lightspeed_transaction_id || null,
    transactionData.description || null,
    transactionData.processed_at || null
  );

  return getTransactionById(result.lastInsertRowid);
}

function updateTransaction(id, updates) {
  const db = getDatabase();

  const allowedFields = [
    'status', 'payment_method', 'lightspeed_transaction_id',
    'description', 'failure_reason', 'processed_at',
    'write_off_reason', 'write_off_at', 'write_off_by',
    'stripe_payment_intent_id', 'stripe_payment_method'
  ];

  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) {
    throw new Error('No valid fields to update');
  }

  fields.push('updated_at = datetime(\'now\')');
  values.push(id);

  const query = `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...values);

  return getTransactionById(id);
}

function writeOffTransaction(id, reason, staffId) {
  return updateTransaction(id, {
    status: 'write_off',
    write_off_reason: reason,
    write_off_at: new Date().toISOString(),
    write_off_by: staffId
  });
}

function getWriteOffs(filters = {}) {
  const db = getDatabase();
  let query = `
    SELECT t.*, m.first_name || ' ' || m.last_name as member_name,
      s.name as written_off_by_name
    FROM transactions t
    JOIN members m ON t.member_id = m.id
    LEFT JOIN staff s ON t.write_off_by = s.id
    WHERE t.status = 'write_off'
  `;
  const params = [];
  if (filters.date_from) { query += ' AND DATE(t.write_off_at) >= ?'; params.push(filters.date_from); }
  if (filters.date_to) { query += ' AND DATE(t.write_off_at) <= ?'; params.push(filters.date_to); }
  query += ' ORDER BY t.write_off_at DESC LIMIT 50';
  return db.prepare(query).all(...params);
}

function getMrrHistory(months = 12) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM mrr_history ORDER BY month DESC LIMIT ?').all(months);
}

function getSubscriptions(filters = {}) {
  const db = getDatabase();
  let query = `
    SELECT s.*, m.first_name || ' ' || m.last_name as member_name, m.email as member_email
    FROM subscriptions s JOIN members m ON s.member_id = m.id WHERE 1=1
  `;
  const params = [];
  if (filters.status) { query += ' AND s.status = ?'; params.push(filters.status); }
  if (filters.member_id) { query += ' AND s.member_id = ?'; params.push(filters.member_id); }
  query += ' ORDER BY s.created_at DESC';
  return db.prepare(query).all(...params);
}

function createSubscription(data) {
  const db = getDatabase();
  const r = db.prepare(`
    INSERT INTO subscriptions (member_id, plan_name, amount, currency, status, stripe_subscription_id, stripe_price_id, current_period_start, current_period_end)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(data.member_id, data.plan_name, data.amount, data.currency || 'AUD', data.status || 'active',
    data.stripe_subscription_id, data.stripe_price_id, data.current_period_start, data.current_period_end);
  return db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(r.lastInsertRowid);
}

function getRevenueStats(filters = {}) {
  const db = getDatabase();

  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split('T')[0];

  const stats = {
    today: db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE DATE(created_at) = ? AND status = 'completed'
    `).get(today).total,

    this_month: db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE DATE(created_at) >= ? AND status = 'completed'
    `).get(monthStartStr).total,

    failed_this_month: db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE DATE(created_at) >= ? AND status = 'failed'
    `).get(monthStartStr),

    write_offs_this_month: db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE DATE(created_at) >= ? AND status = 'write_off'
    `).get(monthStartStr),

    by_type: db.prepare(`
      SELECT type, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE DATE(created_at) >= ? AND status = 'completed'
      GROUP BY type
    `).all(monthStartStr)
  };

  // MRR — sum of active subscription amounts
  const mrrRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as active_subs
    FROM subscriptions WHERE status = 'active'
  `).get();
  stats.mrr = mrrRow.total;
  stats.active_subscriptions = mrrRow.active_subs;

  return stats;
}

function getFailedPayments() {
  const db = getDatabase();

  return db.prepare(`
    SELECT
      t.id, t.member_id, t.amount, t.currency, t.type, t.status, t.payment_method, t.lightspeed_transaction_id, t.stripe_payment_intent_id, t.stripe_payment_method, t.write_off_reason, t.write_off_at, t.write_off_by,
      t.description, t.processed_at, t.failure_reason, t.created_at, t.updated_at,
      m.first_name || ' ' || m.last_name as member_name,
      m.email as member_email,
      m.phone as member_phone
    FROM transactions t
    JOIN members m ON t.member_id = m.id
    WHERE t.status = 'failed'
    ORDER BY t.created_at DESC
    LIMIT 50
  `).all();
}

module.exports = {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  getRevenueStats,
  getFailedPayments,
  writeOffTransaction,
  getWriteOffs,
  getMrrHistory,
  getSubscriptions,
  createSubscription
};
