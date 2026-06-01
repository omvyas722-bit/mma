const TeamAgent = require('./teamAgentBase');
const { getDatabase } = require('../../../db/connection');

class FinanceTeamAgent extends TeamAgent {
  constructor() {
    super('finance_team', 'Finance', `You are the Finance & Billing Department Head at ROAR MMA. You manage revenue, payments, and financial health.

You have access to:
- Transactions with amounts, types, statuses, payment methods
- Members with plans, payment status
- PT packages and session usage
- Failed payments and billing issues
- Membership plan data and pricing

Your responsibilities:
1. MONITOR revenue — track daily/weekly/monthly revenue, flag trends
2. IDENTIFY billing issues — failed payments, expired cards, overdue accounts
3. TRACK PT package utilization — suggest top-ups when sessions are running low
4. FLAG churn risks — members with repeated failed payments or downgraded plans
5. GENERATE financial reports — revenue by type, by coach commission, by product
6. RECOMMEND actions — follow up on failed payments, suggest renewals
7. ANALYZE profitability — product margins, coach commission costs, membership mix

Rules:
- Be analytical — reference numbers, percentages, trends
- Be proactive — flag payment issues before they become churn
- Be revenue-focused — maximize collected revenue, minimize losses
- Respond with ONLY a valid JSON array of actions. No markdown, no explanation, no code blocks.
- Each action has a "type" and parameters. Available action types: create_task, draft_message, flag_failed_payment, suggest_retention, log_report
- Execute MAX 6 actions per tick. Pick the most impactful ones.`);
  }

  buildDepartmentContext(db) {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(); monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    const revenueToday = db.prepare(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM transactions WHERE date(created_at) = ? AND status = 'completed'`).get(today);
    const revenueMonth = db.prepare(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM transactions WHERE date(created_at) >= ? AND status = 'completed'`).get(monthStartStr);

    const revenueByType = db.prepare(`SELECT type, COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM transactions WHERE date(created_at) >= ? AND status = 'completed' GROUP BY type`).all(monthStartStr);

    const failedPayments = db.prepare(`SELECT t.*, m.first_name || ' ' || m.last_name as member_name, m.email, m.phone
      FROM transactions t JOIN members m ON t.member_id = m.id WHERE t.status = 'failed' ORDER BY t.created_at DESC LIMIT 10`).all();

    const membersByPlan = db.prepare(`SELECT plan, COUNT(*) as count FROM members WHERE status = 'active' GROUP BY plan`).all();

    const ptPackageUsage = db.prepare(`
      SELECT mpp.*, p.name as package_name, m.first_name || ' ' || m.last_name as member_name
      FROM member_pt_packages mpp
      JOIN pt_packages p ON mpp.package_id = p.id
      JOIN members m ON mpp.member_id = m.id
      WHERE mpp.status = 'active' AND (CAST(mpp.sessions_remaining AS REAL) / CAST(mpp.sessions_total AS REAL)) <= 0.3`).all();

    const commissions = db.prepare(`SELECT * FROM coach_commissions WHERE status = 'pending'`).all();

    const activeMembersByPlan = db.prepare(`SELECT plan, COUNT(*) as count, ROUND(AVG(CAST(julianday('now') AS REAL) - CAST(julianday(joined_date) AS REAL)), 0) as avg_days FROM members WHERE status = 'active' GROUP BY plan`).all();

    const productMargins = db.prepare(`SELECT name, cost_price, sell_price, stock_quantity, ROUND((sell_price - cost_price) / sell_price * 100, 1) as margin_pct, ROUND((sell_price - cost_price) * stock_quantity, 2) as potential_profit FROM products WHERE active = 1 ORDER BY potential_profit DESC`).all();

    return [
      `=== TODAY'S REVENUE ===`,
      `Total: $${revenueToday.total} (${revenueToday.count} transactions)`,
      `\n=== MONTHLY REVENUE (since ${monthStartStr}) ===`,
      `Total: $${revenueMonth.total} (${revenueMonth.count} transactions)`,
      `\n=== REVENUE BY TYPE ===`,
      revenueByType.map(r => `${r.type}: $${r.total} (${r.count} txns)`).join('\n'),
      `\n=== FAILED PAYMENTS (${failedPayments.length}) ===`,
      failedPayments.map(f => `[Txn #${f.id}] ${f.member_name} | Amount: $${f.amount} | Type: ${f.type} | Method: ${f.payment_method || 'N/A'} | Date: ${f.created_at} | Contact: ${f.email || f.phone || 'N/A'}`).join('\n'),
      `\n=== MEMBERSHIP MIX (${activeMembersByPlan.length} plans) ===`,
      activeMembersByPlan.map(p => `${p.plan}: ${p.count} members (avg ${p.avg_days} days)`).join('\n'),
      `\n=== PT PACKAGES NEAR EXHAUSTION (${ptPackageUsage.length}) ===`,
      ptPackageUsage.map(p => `${p.member_name} | Package: ${p.package_name} | Used: ${p.sessions_used}/${p.sessions_total} | Remaining: ${p.sessions_remaining}`).join('\n'),
      `\n=== PENDING COACH COMMISSIONS (${commissions.length}) ===`,
      commissions.map(c => `Coach #${c.coach_id} | Period: ${c.period_start} to ${c.period_end} | Sessions: ${c.sessions_count} | Revenue: $${c.total_revenue} | Commission: $${c.total_commission}`).join('\n'),
      `\n=== PRODUCT MARGINS ===`,
      productMargins.map(p => `${p.name}: $${p.cost_price} → $${p.sell_price} (${p.margin_pct}% margin) | Stock: ${p.stock_quantity} | Potential profit: $${p.potential_profit}`).join('\n')
    ].join('\n');
  }
}

const instance = new FinanceTeamAgent();
module.exports = { handler: ({ db, openRouter, broadcast, config }) => instance.run(db, openRouter, broadcast, config) };
