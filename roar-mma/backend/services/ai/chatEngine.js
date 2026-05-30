const openRouter = require('./openRouterClient');
const leadsData = require('../../data/leads');
const membersData = require('../../data/members');
const transactionsData = require('../../data/transactions');
const staffTasksData = require('../../data/staffTasks');
const staffData = require('../../data/staff');
const { getDatabase } = require('../../db/connection');

const INTENT_PATTERNS = {
  lead_query: [
    /lead/i, /leads/i, /prospect/i, /potential/i,
    /hot/i, /cold/i, /warm/i, /interested/i,
    /new lead/i, /recent lead/i, /uncontacted/i
  ],
  member_query: [
    /member/i, /members/i, /active/i, /trial/i,
    /student/i, /students/i, /attendance/i, /attend/i,
    /who (hasn't|has not|didn't|did not)/i, /no.show/i,
    /checked.?in/i, /visited/i
  ],
  revenue_query: [
    /revenue/i, /income/i, /earnings/i, /sales/i,
    /how much/i, /made/i, /money/i, /financial/i,
    /mrr/i, /monthly.?recur/i
  ],
  class_query: [
    /class/i, /classes/i, /session/i, /sessions/i,
    /schedule/i, /timetable/i, /popular/i,
    /today/i, /upcoming/i, /this week/i
  ],
  staff_query: [
    /staff/i, /coach/i, /coaches/i, /trainer/i,
    /employee/i, /instructor/i, /top.?perform/i,
    /task/i, /tasks/i, /overdue/i, /todo/i
  ],
  task_query: [
    /create.?task/i, /remind/i, /reminder/i,
    /overdue/i, /pending task/i, /to.?do/i,
    /call /i, /follow.?up/i, /schedule/i
  ],
  help: [
    /^help/i, /^what can you/i, /^what do you/i,
    /^how (do|can) (i|you)/i, /^commands/i,
    /^capabilities/i, /^features/i
  ]
};

function detectIntent(query) {
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(query)) return intent;
    }
  }
  return 'general_query';
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD'
  }).format(amount || 0);
}

function formatTimestamp(ts) {
  if (!ts) return 'N/A';
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

function buildSystemPrompt(dataContext, userContext) {
  return `You are the AI assistant for ROAR MMA gym management system. Answer the user's question based on the data provided below. Be concise, friendly, and natural — don't just repeat the data verbatim, interpret it conversationally. Use emojis sparingly.

User context: ${JSON.stringify(userContext || {})}

Here is the relevant data to answer with:
${dataContext}`;
}

const GENERAL_SYSTEM_PROMPT = `You are the AI assistant for ROAR MMA gym management system. You help staff with questions about gym operations — members, leads, revenue, classes, and staff. Be concise, friendly, and professional. If you don't know the answer, say so.`;

async function callOpenRouter(query, dataContext, userContext) {
  const messages = dataContext
    ? [
        { role: 'system', content: buildSystemPrompt(dataContext, userContext) },
        { role: 'user', content: query }
      ]
    : [
        { role: 'system', content: GENERAL_SYSTEM_PROMPT },
        { role: 'user', content: query }
      ];

  const response = await openRouter.completeChat(messages, { temperature: 0.3, maxTokens: 512 });

  if (response.error) {
    throw new Error(`OpenRouter error: ${response.error}`);
  }

  return response.content || "I understood your question, but I don't have enough data to answer it yet.";
}

async function handleLeadQuery(query) {
  const db = getDatabase();

  const wantCount = /\b(how many|count|number of|total)\b/i.test(query);

  if (wantCount) {
    const stats = leadsData.getLeadStats();
    if (/hot/i.test(query)) {
      const hot = db.prepare("SELECT COUNT(*) as count FROM leads WHERE stage IN ('trial_completed','contacted')").get().count;
      const lines = Object.entries(stats)
        .filter(([k]) => k !== 'total')
        .map(([stage, count]) => `${stage.replace('_', ' ')}: ${count}`)
        .join(', ');
      return {
        context: `Lead stats: hot leads (needing attention): ${hot}. Full breakdown: ${lines}. Total leads: ${stats.total}.`
      };
    }
    if (/new/i.test(query)) {
      return {
        context: `New leads waiting to be contacted: ${stats.new}. Total leads: ${stats.total}.`
      };
    }
    const lines = Object.entries(stats)
      .filter(([k]) => k !== 'total')
      .map(([stage, count]) => `${stage.replace('_', ' ')}: ${count}`)
      .join(', ');
    return {
      context: `Lead overview — ${lines}. Total leads: ${stats.total}.`
    };
  }

  if (/recent/i.test(query) || /new/i.test(query)) {
    const leads = leadsData.getAllLeads({});
    const recent = leads.slice(0, 5);
    if (recent.length === 0) return null;
    const leadLines = recent.map(l =>
      `${l.first_name} ${l.last_name} — ${l.stage?.replace('_', ' ') || 'new'}${l.source ? ` (${l.source})` : ''}`
    ).join('\n');
    return {
      context: `Recent leads (showing ${recent.length}):\n${leadLines}`
    };
  }

  if (/uncontacted/i.test(query) || /untouched/i.test(query)) {
    const leads = leadsData.getAllLeads({ stage: 'new' });
    const count = leads.length;
    if (count === 0) {
      return { context: 'All leads have been contacted.' };
    }
    const names = leads.slice(0, 3).map(l => `${l.first_name} ${l.last_name}`).join(', ');
    return {
      context: `Uncontacted leads: ${count}. First few: ${names}.`
    };
  }

  return null;
}

async function handleMemberQuery(query) {
  const wantCount = /\b(how many|count|number of|total)\b/i.test(query);
  const db = getDatabase();

  if (wantCount) {
    const stats = membersData.getMemberStats();
    if (/trial/i.test(query)) {
      return {
        context: `Members on trial: ${stats.trial}. Total members: ${stats.total}.`
      };
    }
    if (/active/i.test(query)) {
      return {
        context: `Active members: ${stats.active}. Total members: ${stats.total}.`
      };
    }
    if (/paused/i.test(query)) {
      return {
        context: `Paused members: ${stats.paused}. Total members: ${stats.total}.`
      };
    }
    if (/cancel/i.test(query)) {
      return {
        context: `Cancelled members: ${stats.cancelled}. Total members: ${stats.total}.`
      };
    }
    const totalActive = stats.active + stats.trial;
    return {
      context: `Member stats — active: ${stats.active}, trial: ${stats.trial}, paused: ${stats.paused}, cancelled: ${stats.cancelled}, total: ${stats.total}.`
    };
  }

  if (/trial.*end/i.test(query) || /trial ending/i.test(query)) {
    const members = db.prepare(`
      SELECT * FROM members WHERE status = 'trial' AND trial_end_date IS NOT NULL
      ORDER BY trial_end_date ASC LIMIT 5
    `).all();
    if (members.length === 0) {
      return { context: 'No trial members with upcoming end dates.' };
    }
    const lines = members.map(m => `${m.first_name} ${m.last_name} — trial ends ${new Date(m.trial_end_date).toLocaleDateString()}`).join('\n');
    return {
      context: `Trial memberships ending soon:\n${lines}`
    };
  }

  if (/no.?show/i.test(query) || /(hasn't|has not|didn't|did not).*(class|come|attend)/i.test(query)) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const inactive = db.prepare(`
      SELECT m.*, MAX(b.attended_at) as last_attended
      FROM members m
      LEFT JOIN bookings b ON m.id = b.member_id AND b.status = 'attended'
      WHERE m.status = 'active'
      GROUP BY m.id
      HAVING last_attended IS NULL OR last_attended < ?
      ORDER BY last_attended ASC NULLS FIRST
      LIMIT 10
    `).all(thirtyDaysAgo);
    if (inactive.length === 0) {
      return { context: 'All active members have attended class recently.' };
    }
    const lines = inactive.map(m =>
      `${m.first_name} ${m.last_name} — last visit: ${m.last_attended ? formatTimestamp(m.last_attended) : 'never'}`
    ).join('\n');
    return {
      context: `Members who haven't attended in 30 days (${inactive.length} total):\n${lines}`
    };
  }

  return null;
}

async function handleRevenueQuery(query) {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];

  if (/today/i.test(query)) {
    const total = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions
      WHERE DATE(created_at) = ? AND status = 'succeeded'
    `).get(today).total;
    const count = db.prepare(`
      SELECT COUNT(*) as count FROM transactions
      WHERE DATE(created_at) = ? AND status = 'succeeded'
    `).get(today).count;
    return {
      context: `Today's revenue: ${formatCurrency(total)} from ${count} transaction${count !== 1 ? 's' : ''}.`
    };
  }

  if (/month/i.test(query) || /this month/i.test(query)) {
    const stats = transactionsData.getRevenueStats();
    return {
      context: `This month's revenue: ${formatCurrency(stats.this_month)}. MRR: ${formatCurrency(stats.mrr)}. Failed this month: ${stats.failed_this_month.count} transactions worth ${formatCurrency(stats.failed_this_month.total)}.`
    };
  }

  const stats = transactionsData.getRevenueStats();
  return {
    context: `Revenue summary — today: ${formatCurrency(stats.today)}, this month: ${formatCurrency(stats.this_month)}, MRR: ${formatCurrency(stats.mrr)}, failed transactions this month: ${stats.failed_this_month.count} (${formatCurrency(stats.failed_this_month.total)}).`
  };
}

async function handleClassQuery(query) {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];

  if (/today/i.test(query) || /upcoming/i.test(query)) {
    const instances = db.prepare(`
      SELECT ci.*, c.name as class_name, c.class_type, c.location, s.name as coach_name,
        (SELECT COUNT(*) FROM bookings WHERE class_instance_id = ci.id AND status = 'booked') as booked_count
      FROM class_instances ci
      JOIN classes c ON ci.class_id = c.id
      LEFT JOIN staff s ON ci.coach_id = s.id
      WHERE ci.date = ?
      ORDER BY ci.start_time
    `).all(today);
    if (instances.length === 0) {
      return { context: 'No classes scheduled for today.' };
    }
    const lines = instances.map(ci =>
      `${ci.class_name} — ${ci.start_time?.slice(0, 5)} | Coach: ${ci.coach_name || 'None'} | ${ci.location} (${ci.booked_count}/${ci.capacity || '?'} booked)`
    ).join('\n');
    return {
      context: `Today's classes (${today}):\n${lines}`
    };
  }

  if (/popular/i.test(query) || /most.*(booked|attended|popular)/i.test(query)) {
    const popular = db.prepare(`
      SELECT c.name, COUNT(b.id) as total_bookings
      FROM classes c
      JOIN class_instances ci ON c.id = ci.class_id
      JOIN bookings b ON ci.id = b.class_instance_id AND b.status = 'booked'
      GROUP BY c.id
      ORDER BY total_bookings DESC
      LIMIT 5
    `).all();
    if (popular.length === 0) {
      return { context: 'Not enough booking data yet.' };
    }
    const lines = popular.map((c, i) => `${i + 1}. ${c.name} — ${c.total_bookings} bookings`).join('\n');
    return {
      context: `Most popular classes:\n${lines}`
    };
  }

  return null;
}

async function handleStaffQuery(query) {
  const db = getDatabase();

  if (/top.*perform/i.test(query) || /best/i.test(query)) {
    const topStaff = db.prepare(`
      SELECT s.name, COUNT(DISTINCT l.id) as leads_converted
      FROM staff s
      LEFT JOIN leads l ON s.id = l.assigned_to AND l.stage = 'converted'
      GROUP BY s.id
      ORDER BY leads_converted DESC
      LIMIT 5
    `).all();
    if (topStaff.length === 0) {
      return { context: 'No staff performance data available.' };
    }
    const lines = topStaff.map((s, i) => `${i + 1}. ${s.name} — ${s.leads_converted} conversions`).join('\n');
    return {
      context: `Top performing staff by leads converted:\n${lines}`
    };
  }

  if (/task|overdue|todo/i.test(query)) {
    const tasks = staffTasksData.getAllTasks({});
    const overdue = tasks.filter(t => t.status === 'pending' && t.due_date && new Date(t.due_date) < new Date());
    if (overdue.length === 0) {
      return { context: 'No overdue tasks. Everything is on track.' };
    }
    const lines = overdue.slice(0, 5).map(t =>
      `${t.title} — ${t.assigned_to_name || 'Unassigned'} (due ${formatTimestamp(t.due_date)})`
    ).join('\n');
    return {
      context: `Overdue tasks (${overdue.length} total):\n${lines}`
    };
  }

  const staff = staffData.getAllStaff({});
  if (staff.length === 0) {
    return { context: 'No staff members found.' };
  }
  const lines = staff.map(s => `${s.name} — ${s.role}${s.active ? ' (active)' : ' (inactive)'}`).join('\n');
  return {
    context: `Staff members:\n${lines}`
  };
}

async function handleTaskQuery(query) {
  const createMatch = query.match(/create\s+(?:a\s+)?task\s+(?:to\s+)?(.+)/i);
  if (createMatch) {
    const description = createMatch[1].trim();
    const task = staffTasksData.createTask({
      task_type: 'custom',
      priority: 'medium',
      title: description.length > 100 ? description.slice(0, 97) + '...' : description,
      description,
      status: 'pending'
    });
    return {
      context: `A new task was just created in the system. Task title: "${description}". Task ID: ${task.id}. Priority: medium. Status: pending.`,
      action: { type: 'task_created', taskId: task.id, title: description }
    };
  }

  const db = getDatabase();
  const tasks = staffTasksData.getAllTasks({});
  const pending = tasks.filter(t => t.status === 'pending');
  if (pending.length === 0) {
    return { context: 'No pending tasks. All clear!' };
  }
  const lines = pending.slice(0, 5).map(t =>
    `${t.title} — ${t.priority} priority${t.due_date ? ` (due ${formatTimestamp(t.due_date)})` : ''}`
  ).join('\n');
  return {
    context: `Pending tasks (${pending.length} total):\n${lines}`
  };
}

async function handleHelpQuery() {
  return {
    context: `The user is asking about your capabilities. You can help with:

Leads — "Show me new leads", "How many hot leads?", "Any uncontacted leads?"
Members — "How many active members?", "Who hasn't been to class?", "Trials ending soon?"
Revenue — "What's today's revenue?", "Monthly revenue?", "MRR?"
Classes — "What classes are today?", "Most popular class?"
Staff — "Who's the top performer?", "Show staff tasks"
Tasks — "Create a task to call John", "What tasks are overdue?"
Summary — "How's the business doing?", "Give me a summary"

Describe your capabilities naturally.`
  };
}

async function handleGeneralQuery() {
  const db = getDatabase();
  const memberStats = membersData.getMemberStats();
  const revenueStats = transactionsData.getRevenueStats();
  const leadStats = leadsData.getLeadStats();

  const dayOfWeek = new Date().getDay();
  const todayClasses = db.prepare(`
    SELECT COUNT(*) as count FROM classes WHERE day_of_week = ? AND active = 1
  `).get(dayOfWeek).count;

  const tasks = staffTasksData.getAllTasks({});
  const overdueCount = tasks.filter(t => t.status === 'pending' && t.due_date && new Date(t.due_date) < new Date()).length;

  return {
    context: `Business summary — active members: ${memberStats.active}, trial: ${memberStats.trial}, total members: ${memberStats.total}. Leads: ${leadStats.new} new, ${leadStats.total} total. Revenue this month: ${formatCurrency(revenueStats.this_month)}. Classes today: ${todayClasses}. Overdue tasks: ${overdueCount}.`
  };
}

async function processQuery(query, userContext) {
  try {
    const intent = detectIntent(query);
    let result = null;

    switch (intent) {
      case 'lead_query':
        result = await handleLeadQuery(query);
        break;
      case 'member_query':
        result = await handleMemberQuery(query);
        break;
      case 'revenue_query':
        result = await handleRevenueQuery(query);
        break;
      case 'class_query':
        result = await handleClassQuery(query);
        break;
      case 'staff_query':
        result = await handleStaffQuery(query);
        break;
      case 'task_query':
        result = await handleTaskQuery(query);
        break;
      case 'help':
        result = await handleHelpQuery();
        break;
      default:
        result = await handleGeneralQuery();
    }

    if (result && result.context) {
      const responseText = await callOpenRouter(query, result.context, userContext);
      return {
        response: responseText,
        action: result.action || null,
        confidence: 0.9
      };
    }

    const responseText = await callOpenRouter(query, null, userContext);
    return { response: responseText, action: null, confidence: 0.7 };
  } catch (error) {
    console.error('[CHAT-ENGINE] Error processing query:', error);
    return { response: `I'm sorry, I encountered an error: ${error.message}`, action: null, confidence: 0 };
  }
}

module.exports = { processQuery };
