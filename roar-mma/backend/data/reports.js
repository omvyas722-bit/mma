// Reports data access layer
const { getDatabase } = require('../db/connection');

function getMembershipReport(filters = {}) {
  const db = getDatabase();

  const dateFrom = filters.date_from || '2000-01-01';
  const dateTo = filters.date_to || '2099-12-31';

  return {
    summary: {
      total_members: db.prepare('SELECT COUNT(*) as count FROM members').get().count,
      active: db.prepare("SELECT COUNT(*) as count FROM members WHERE status = 'active'").get().count,
      trial: db.prepare("SELECT COUNT(*) as count FROM members WHERE status = 'trial'").get().count,
      paused: db.prepare("SELECT COUNT(*) as count FROM members WHERE status = 'paused'").get().count,
      cancelled: db.prepare("SELECT COUNT(*) as count FROM members WHERE status = 'cancelled'").get().count,
    },
    by_location: db.prepare(`
      SELECT location, status, COUNT(*) as count
      FROM members
      GROUP BY location, status
      ORDER BY location, status
    `).all(),
    by_plan: db.prepare(`
      SELECT plan, COUNT(*) as count
      FROM members
      WHERE status = 'active'
      GROUP BY plan
      ORDER BY count DESC
    `).all(),
    new_members: db.prepare(`
      SELECT DATE(joined_date) as date, COUNT(*) as count
      FROM members
      WHERE DATE(joined_date) BETWEEN ? AND ?
      GROUP BY DATE(joined_date)
      ORDER BY date
    `).all(dateFrom, dateTo),
    trial_conversions: db.prepare(`
      SELECT COUNT(*) as count
      FROM members
      WHERE status = 'active'
        AND DATE(joined_date) < DATE(updated_at)
        AND DATE(updated_at) BETWEEN ? AND ?
    `).get(dateFrom, dateTo).count
  };
}

function getRevenueReport(filters = {}) {
  const db = getDatabase();

  const dateFrom = filters.date_from || '2000-01-01';
  const dateTo = filters.date_to || '2099-12-31';

  return {
    summary: {
      total_revenue: db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE status = 'succeeded'
          AND DATE(created_at) BETWEEN ? AND ?
      `).get(dateFrom, dateTo).total,
      total_transactions: db.prepare(`
        SELECT COUNT(*) as count
        FROM transactions
        WHERE status = 'succeeded'
          AND DATE(created_at) BETWEEN ? AND ?
      `).get(dateFrom, dateTo).count,
      failed_payments: db.prepare(`
        SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE status = 'failed'
          AND DATE(created_at) BETWEEN ? AND ?
      `).get(dateFrom, dateTo),
      avg_transaction: db.prepare(`
        SELECT COALESCE(AVG(amount), 0) as avg
        FROM transactions
        WHERE status = 'succeeded'
          AND DATE(created_at) BETWEEN ? AND ?
      `).get(dateFrom, dateTo).avg
    },
    by_type: db.prepare(`
      SELECT type, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE status = 'succeeded'
        AND DATE(created_at) BETWEEN ? AND ?
      GROUP BY type
      ORDER BY total DESC
    `).all(dateFrom, dateTo),
    by_date: db.prepare(`
      SELECT DATE(created_at) as date, COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE status = 'succeeded'
        AND DATE(created_at) BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all(dateFrom, dateTo),
    top_members: db.prepare(`
      SELECT
        m.id,
        m.first_name || ' ' || m.last_name as name,
        COUNT(t.id) as transaction_count,
        COALESCE(SUM(t.amount), 0) as total_spent
      FROM members m
      JOIN transactions t ON m.id = t.member_id
      WHERE t.status = 'succeeded'
        AND DATE(t.created_at) BETWEEN ? AND ?
      GROUP BY m.id
      ORDER BY total_spent DESC
      LIMIT 10
    `).all(dateFrom, dateTo)
  };
}

function getAttendanceReport(filters = {}) {
  const db = getDatabase();

  const dateFrom = filters.date_from || '2000-01-01';
  const dateTo = filters.date_to || '2099-12-31';

  return {
    summary: {
      total_bookings: db.prepare(`
        SELECT COUNT(*) as count
        FROM bookings b
        JOIN class_instances ci ON b.class_instance_id = ci.id
        WHERE ci.date BETWEEN ? AND ?
      `).get(dateFrom, dateTo).count,
      attended: db.prepare(`
        SELECT COUNT(*) as count
        FROM bookings b
        JOIN class_instances ci ON b.class_instance_id = ci.id
        WHERE b.status = 'attended'
          AND ci.date BETWEEN ? AND ?
      `).get(dateFrom, dateTo).count,
      no_shows: db.prepare(`
        SELECT COUNT(*) as count
        FROM bookings b
        JOIN class_instances ci ON b.class_instance_id = ci.id
        WHERE b.status = 'no_show'
          AND ci.date BETWEEN ? AND ?
      `).get(dateFrom, dateTo).count,
      cancelled: db.prepare(`
        SELECT COUNT(*) as count
        FROM bookings b
        JOIN class_instances ci ON b.class_instance_id = ci.id
        WHERE b.status = 'cancelled'
          AND ci.date BETWEEN ? AND ?
      `).get(dateFrom, dateTo).count
    },
    by_class_type: db.prepare(`
      SELECT
        c.class_type,
        COUNT(b.id) as bookings,
        SUM(CASE WHEN b.status = 'attended' THEN 1 ELSE 0 END) as attended
      FROM bookings b
      JOIN class_instances ci ON b.class_instance_id = ci.id
      JOIN classes c ON ci.class_id = c.id
      WHERE ci.date BETWEEN ? AND ?
      GROUP BY c.class_type
      ORDER BY bookings DESC
    `).all(dateFrom, dateTo),
    by_location: db.prepare(`
      SELECT
        c.location,
        COUNT(b.id) as bookings,
        SUM(CASE WHEN b.status = 'attended' THEN 1 ELSE 0 END) as attended
      FROM bookings b
      JOIN class_instances ci ON b.class_instance_id = ci.id
      JOIN classes c ON ci.class_id = c.id
      WHERE ci.date BETWEEN ? AND ?
      GROUP BY c.location
      ORDER BY bookings DESC
    `).all(dateFrom, dateTo),
    top_attendees: db.prepare(`
      SELECT
        m.id,
        m.first_name || ' ' || m.last_name as name,
        COUNT(b.id) as total_bookings,
        SUM(CASE WHEN b.status = 'attended' THEN 1 ELSE 0 END) as attended
      FROM members m
      JOIN bookings b ON m.id = b.member_id
      JOIN class_instances ci ON b.class_instance_id = ci.id
      WHERE ci.date BETWEEN ? AND ?
      GROUP BY m.id
      ORDER BY attended DESC
      LIMIT 10
    `).all(dateFrom, dateTo)
  };
}

function getLeadsReport(filters = {}) {
  const db = getDatabase();

  const dateFrom = filters.date_from || '2000-01-01';
  const dateTo = filters.date_to || '2099-12-31';

  return {
    summary: {
      total_leads: db.prepare(`
        SELECT COUNT(*) as count
        FROM leads
        WHERE DATE(created_at) BETWEEN ? AND ?
      `).get(dateFrom, dateTo).count,
      converted: db.prepare(`
        SELECT COUNT(*) as count
        FROM leads
        WHERE stage = 'converted'
          AND DATE(updated_at) BETWEEN ? AND ?
      `).get(dateFrom, dateTo).count,
      lost: db.prepare(`
        SELECT COUNT(*) as count
        FROM leads
        WHERE stage = 'lost'
          AND DATE(updated_at) BETWEEN ? AND ?
      `).get(dateFrom, dateTo).count,
      conversion_rate: 0 // Calculated below
    },
    by_source: db.prepare(`
      SELECT source, COUNT(*) as count
      FROM leads
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY source
      ORDER BY count DESC
    `).all(dateFrom, dateTo),
    by_stage: db.prepare(`
      SELECT stage, COUNT(*) as count
      FROM leads
      GROUP BY stage
      ORDER BY
        CASE stage
          WHEN 'new' THEN 1
          WHEN 'contacted' THEN 2
          WHEN 'trial_booked' THEN 3
          WHEN 'trial_completed' THEN 4
          WHEN 'converted' THEN 5
          WHEN 'lost' THEN 6
        END
    `).all(),
    conversion_funnel: db.prepare(`
      SELECT
        SUM(CASE WHEN stage = 'new' THEN 1 ELSE 0 END) as new,
        SUM(CASE WHEN stage = 'contacted' THEN 1 ELSE 0 END) as contacted,
        SUM(CASE WHEN stage = 'trial_booked' THEN 1 ELSE 0 END) as trial_booked,
        SUM(CASE WHEN stage = 'trial_completed' THEN 1 ELSE 0 END) as trial_completed,
        SUM(CASE WHEN stage = 'converted' THEN 1 ELSE 0 END) as converted
      FROM leads
      WHERE DATE(created_at) BETWEEN ? AND ?
    `).get(dateFrom, dateTo)
  };
}

module.exports = {
  getMembershipReport,
  getRevenueReport,
  getAttendanceReport,
  getLeadsReport
};
