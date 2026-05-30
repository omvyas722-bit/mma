const TeamAgent = require('./teamAgentBase');
const { getDatabase } = require('../../../db/connection');

class OperationsTeamAgent extends TeamAgent {
  constructor() {
    super('operations_team', 'Operations', `You are the Operations Department Head at ROAR MMA. You manage class schedules, staff allocation, inventory, and facilities.

You have access to:
- Class schedules with instructors, capacity, locations
- Staff with roles and availability
- Products with stock levels
- Suppliers for reordering
- Staff tasks to prioritize
- PT session scheduling

Your responsibilities:
1. MONITOR class capacity — flag under/over-utilized classes, suggest schedule adjustments
2. MANAGE inventory — detect low stock, suggest reorders, flag overstock
3. OPTIMIZE staff allocation — ensure classes have instructors, balance workload
4. PRIORITIZE tasks — identify critical tasks and ensure they're assigned
5. TRACK facility usage — suggest schedule changes based on demand patterns
6. MANAGE purchase orders — flag when stock needs reordering
7. ENSURE class coverage — detect unassigned or double-booked instructors

Rules:
- Be practical and operational — focus on what can be improved
- Be data-driven — use capacity, stock levels, attendance numbers
- Be proactive — flag issues before they become problems
- Respond with ONLY a valid JSON array of actions. No markdown, no explanation, no code blocks.
- Each action has a "type" and parameters. Available action types: create_task, flag_stock_alert, log_report, draft_message
- Execute MAX 6 actions per tick. Pick the most impactful ones.`);
  }

  buildDepartmentContext(db) {
    const classes = db.prepare(`SELECT c.*, s.name as instructor_name FROM classes c LEFT JOIN staff s ON c.instructor_id = s.id WHERE c.active = 1`).all();

    const todayBookings = db.prepare(`
      SELECT c.id, c.name, c.class_type, c.max_capacity, c.start_time,
        (SELECT COUNT(*) FROM bookings b WHERE b.class_id = c.id AND b.booking_date = date('now') AND b.status != 'cancelled') as booked_count
      FROM classes c WHERE c.active = 1`).all();

    const lowStock = db.prepare(`SELECT * FROM products WHERE stock_quantity <= min_stock_level AND active = 1`).all();

    const inventory = db.prepare(`SELECT id, name, category, sku, stock_quantity, min_stock_level, cost_price, sell_price FROM products WHERE active = 1`).all();

    const staff = db.prepare(`SELECT id, name, role FROM staff WHERE active = 1`).all();

    const pendingTasks = db.prepare(`SELECT st.*, s.name as assigned_name FROM staff_tasks st LEFT JOIN staff s ON st.assigned_to = s.id WHERE st.status = 'pending' ORDER BY CASE st.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END`).all();

    const unassignedClasses = db.prepare(`SELECT * FROM classes WHERE instructor_id IS NULL AND active = 1`).all();

    return [
      `=== CLASS SCHEDULE (${classes.length}) ===`,
      classes.map(c => `[#${c.id}] ${c.name} (${c.class_type}) | Instructor: ${c.instructor_name || 'UNASSIGNED'} | Day: ${c.day_of_week} | ${c.start_time}-${c.end_time} | Capacity: ${c.max_capacity} | Location: ${c.location || 'N/A'}`).join('\n'),
      `\n=== TODAY'S BOOKINGS PER CLASS ===`,
      todayBookings.map(b => `[#${b.id}] ${b.name} (${b.start_time}) | ${b.booked_count}/${b.max_capacity} booked | ${b.booked_count >= b.max_capacity * 0.9 ? '⚠️ NEAR CAPACITY' : b.booked_count <= Math.ceil(b.max_capacity * 0.2) ? '📉 LOW' : '✅ OK'}`).join('\n'),
      `\n=== INVENTORY (${inventory.length}) ===`,
      inventory.map(i => `[#${i.id}] ${i.name} (${i.sku || 'N/A'}) | Stock: ${i.stock_quantity} | Min: ${i.min_stock_level} | ${i.stock_quantity <= i.min_stock_level ? '⚠️ LOW STOCK' : '✅ OK'} | Cost: $${i.cost_price} | Sell: $${i.sell_price} | Margin: ${Math.round((i.sell_price - i.cost_price) / i.sell_price * 100)}%`).join('\n'),
      `\n=== LOW STOCK ALERTS (${lowStock.length}) ===`,
      lowStock.map(p => `[#${p.id}] ${p.name} | Stock: ${p.stock_quantity} | Min: ${p.min_stock_level} | Reorder ${p.min_stock_level * 2 - p.stock_quantity} units`).join('\n'),
      `\n=== STAFF (${staff.length}) ===`,
      staff.map(s => `[#${s.id}] ${s.name} (${s.role})`).join('\n'),
      `\n=== PENDING TASKS (${pendingTasks.length}) ===`,
      pendingTasks.map(t => `[#${t.id}] ${t.title} | Priority: ${t.priority} | Assignee: ${t.assigned_name || 'Unassigned'} | Due: ${t.due_date || 'No due date'} | Type: ${t.task_type}`).join('\n'),
      `\n=== UNASSIGNED CLASSES (${unassignedClasses.length}) ===`,
      unassignedClasses.map(c => `[#${c.id}] ${c.name} - needs instructor assigned`).join('\n'),
    ].join('\n');
  }
}

const instance = new OperationsTeamAgent();
module.exports = { handler: ({ db, aiState, openRouter, broadcast, config }) => instance.run(db, aiState, openRouter, broadcast, config) };
