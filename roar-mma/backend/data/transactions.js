// Transactions/Billing data access layer
const { getDatabase } = require('../db/connection');

function getAllTransactions(filters = {}) {
  const db = getDatabase();

  let query = `
    SELECT
      t.id, t.member_id, t.amount, t.currency, t.type, t.status, t.payment_method, t.lightspeed_transaction_id, t.description, t.processed_at, t.failure_reason, t.created_at, t.updated_at,
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

  const limit = parseInt(filters.limit) || 50;
  const offset = parseInt(filters.offset) || 0;

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
      t.id, t.member_id, t.amount, t.currency, t.type, t.status, t.payment_method, t.lightspeed_transaction_id, t.description, t.processed_at, t.failure_reason, t.created_at, t.updated_at,
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
    'description', 'failure_reason', 'processed_at'
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

    by_type: db.prepare(`
      SELECT type, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE DATE(created_at) >= ? AND status = 'completed'
      GROUP BY type
    `).all(monthStartStr)
  };

  // Calculate MRR (Monthly Recurring Revenue)
  const mrr = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE type = 'membership'
      AND status = 'completed'
      AND DATE(created_at) >= ?
  `).get(monthStartStr).total;

  stats.mrr = mrr;

  return stats;
}

function getFailedPayments() {
  const db = getDatabase();

  return db.prepare(`
    SELECT
      t.id, t.member_id, t.amount, t.currency, t.type, t.status, t.payment_method, t.lightspeed_transaction_id, t.description, t.processed_at, t.failure_reason, t.created_at, t.updated_at,
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
  getFailedPayments
};
