const { getDatabase } = require('../db/connection');

function ensureTable() {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS eod_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL DEFAULT 'daily',
      date DATE NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    )
  `);
}

async function generateWeeklyDigest(aiState) {
  const db = getDatabase();
  ensureTable();

  const now = new Date();
  // This Monday
  const thisMonday = new Date(now);
  thisMonday.setDate(thisMonday.getDate() - ((thisMonday.getDay() + 6) % 7));
  const mondayStr = thisMonday.toISOString().split('T')[0];

  // Last Monday to Sunday
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(lastSunday.getDate() - 1);
  const fromDate = lastMonday.toISOString().split('T')[0];
  const toDate = lastSunday.toISOString().split('T')[0];

  const newMembers = db.prepare(`
    SELECT COUNT(*) as count FROM members WHERE DATE(created_at) BETWEEN ? AND ?
  `).get(fromDate, toDate).count;

  const revenue = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE DATE(created_at) BETWEEN ? AND ? AND status != 'failed'
  `).get(fromDate, toDate).total;

  const newLeads = db.prepare(`
    SELECT COUNT(*) as count FROM leads WHERE DATE(created_at) BETWEEN ? AND ?
  `).get(fromDate, toDate).count;

  const trialConversions = db.prepare(`
    SELECT COUNT(*) as count FROM members
    WHERE status = 'active' AND DATE(trial_end_date) BETWEEN ? AND ?
  `).get(fromDate, toDate).count;

  const attendance = db.prepare(`
    SELECT COUNT(*) as total,
           SUM(CASE WHEN status = 'attended' THEN 1 ELSE 0 END) as attended
    FROM bookings WHERE DATE(booking_date) BETWEEN ? AND ?
  `).get(fromDate, toDate);

  const attendanceRate = attendance.total > 0
    ? Math.round((attendance.attended / attendance.total) * 100)
    : 0;

  const cancellations = db.prepare(`
    SELECT COUNT(*) as count FROM members
    WHERE DATE(cancellation_date) BETWEEN ? AND ? AND status = 'cancelled'
  `).get(fromDate, toDate).count;

  const topClass = db.prepare(`
    SELECT c.name, COUNT(b.id) as attended
    FROM bookings b JOIN classes c ON b.class_id = c.id
    WHERE b.status = 'attended' AND DATE(b.booking_date) BETWEEN ? AND ?
    GROUP BY c.name ORDER BY attended DESC LIMIT 1
  `).get(fromDate, toDate);

  const pendingTasks = db.prepare(`
    SELECT COUNT(*) as count FROM staff_tasks WHERE status = 'pending'
  `).get().count;

  const failedPayments = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
    FROM transactions WHERE status = 'failed' AND DATE(created_at) BETWEEN ? AND ?
  `).get(fromDate, toDate);

  const digestData = {
    week_start: fromDate,
    week_end: toDate,
    new_members: newMembers,
    total_revenue: revenue,
    new_leads: newLeads,
    trial_conversions: trialConversions,
    attendance_rate: attendanceRate,
    total_bookings: attendance.total,
    attended_bookings: attendance.attended,
    cancellations,
    top_class: topClass ? topClass.name : null,
    top_class_attended: topClass ? topClass.attended : 0,
    pending_tasks: pendingTasks,
    failed_payments: failedPayments.count,
    failed_payments_total: failedPayments.total
  };

  if (aiState) {
    const summary = `Weekly Digest (${fromDate} - ${toDate}): ${newMembers} new members, $${Number(revenue).toFixed(2)} revenue, ${newLeads} leads, ${trialConversions} conversions, ${attendanceRate}% attendance, ${cancellations} cancellations.`;
    await aiState.logActivity({
      agentName: 'weekly_digest',
      actionType: 'weekly_digest',
      details: digestData,
      summary
    });
  }

  db.prepare(`
    INSERT INTO eod_reports (type, date, content) VALUES ('weekly', ?, ?)
  `).run(mondayStr, JSON.stringify(digestData));

  console.log(`[WEEKLY-DIGEST] Generated weekly digest for ${fromDate} - ${toDate}`);
  return digestData;
}

module.exports = { generateWeeklyDigest };
