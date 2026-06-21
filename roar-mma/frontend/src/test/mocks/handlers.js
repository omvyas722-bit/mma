// TEST CREDENTIALS - Not used in production
// Mock Service Worker handlers for API mocking
import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3001';

export const handlers = [
  // Auth endpoints
  http.post(`${API_URL}/api/auth/login`, async ({ request }) => {
    const body = await request.json();

    if (body.email === 'owner@roarmma.com.au' && body.password === 'admin123') {
      return HttpResponse.json({
        token: 'mock-jwt-token',
        user: {
          id: 1,
          name: 'System Owner',
          email: 'owner@roarmma.com.au',
          role: 'owner',
        },
      });
    }

    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.get(`${API_URL}/api/auth/me`, () => {
    return HttpResponse.json({
      id: 1,
      name: 'System Owner',
      email: 'owner@roarmma.com.au',
      role: 'owner',
    });
  }),

  // Members endpoints
  http.get(`${API_URL}/api/members`, () => {
    return HttpResponse.json({
      members: [
        {
          id: 1,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '0412345678',
          status: 'active',
          location: 'rockingham',
          joined_date: '2024-01-01',
        },
        {
          id: 2,
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@example.com',
          phone: '0412345679',
          status: 'trial',
          location: 'bibra_lake',
          joined_date: '2024-02-01',
        },
      ],
      total: 2,
    });
  }),

  http.get(`${API_URL}/api/members/:id`, ({ params }) => {
    return HttpResponse.json({
      id: parseInt(params.id, 10),
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '0412345678',
      status: 'active',
      location: 'rockingham',
      joined_date: '2024-01-01',
      membership_type: 'unlimited',
    });
  }),

  http.post(`${API_URL}/api/members`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 3,
      ...body,
    }, { status: 201 });
  }),

  http.put(`${API_URL}/api/members/:id`, async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: parseInt(params.id, 10),
      ...body,
    });
  }),

  http.delete(`${API_URL}/api/members/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Dashboard endpoint
  http.get(`${API_URL}/api/dashboard`, () => {
    return HttpResponse.json({
      kpis: {
        active_members: { value: 156, delta: 5.2 },
        monthly_revenue: { value: 45000, delta: 12.3 },
        today_bookings: { value: 24, delta: -2.1 },
        new_leads: { value: 8, delta: 15.0 },
      },
      todays_classes: [
        {
          id: 1,
          name: 'BJJ Fundamentals',
          start_time: '18:00',
          coach_name: 'Kane Mousah',
          location: 'rockingham',
          capacity: 20,
          booked_count: 15,
        },
      ],
      recent_activity: [
        {
          type: 'member_joined',
          description: 'John Doe joined as a trial member',
          timestamp: new Date().toISOString(),
        },
      ],
    });
  }),

  // Analytics endpoint
  http.get(`${API_URL}/api/analytics/dashboard`, () => {
    const now = new Date();
    const member_growth = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      return { label: `${d.getMonth() + 1}/${d.getDate()}`, value: 120 + i * 2 };
    });
    const revenue_trend = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      return { label: `${d.getMonth() + 1}/${d.getDate()}`, value: 30000 + Math.floor(Math.random() * 5000) };
    });
    return HttpResponse.json({
      member_growth,
      revenue_trend,
      class_attendance: [
        { label: 'Mon', value: 18 },
        { label: 'Tue', value: 22 },
        { label: 'Wed', value: 15 },
        { label: 'Thu', value: 24 },
        { label: 'Fri', value: 12 },
        { label: 'Sat', value: 30 },
        { label: 'Sun', value: 8 },
      ],
    });
  }),

  // Classes endpoints
  http.get(`${API_URL}/api/classes/instances`, () => {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, '0');
    const d = String(monday.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    return HttpResponse.json([
      {
        id: 1,
        class_name: 'BJJ Fundamentals',
        class_type: 'bjj',
        date: dateStr,
        start_time: '18:00',
        capacity: 20,
        booked_count: 15,
        coach_name: 'Kane Mousah',
        location: 'rockingham',
        status: 'scheduled',
      },
    ]);
  }),

  // Leads endpoints
  http.get(`${API_URL}/api/leads`, () => {
    return HttpResponse.json({
      leads: [
        { id: 1, first_name: 'Alice', last_name: 'Johnson', phone: '0412345680', email: 'alice@example.com', source: 'website', stage: 'new', score: 65, created_at: new Date().toISOString(), last_contact_date: new Date().toISOString() },
        { id: 2, first_name: 'Bob', last_name: 'Smith', phone: '0412345681', email: 'bob@example.com', source: 'facebook', stage: 'contacted', score: 45, created_at: new Date(Date.now() - 86400000).toISOString(), last_contact_date: new Date(Date.now() - 86400000 * 3).toISOString() },
      ],
    });
  }),

  // Payments endpoints
  http.get(`${API_URL}/api/payments`, () => {
    return HttpResponse.json({
      payments: [
        {
          id: 1,
          member_name: 'John Doe',
          amount: 150.00,
          description: 'Monthly membership',
          status: 'succeeded',
          created_at: new Date().toISOString(),
        },
      ],
      summary: {
        total_revenue: 45000,
        pending_amount: 500,
        failed_count: 2,
        month_revenue: 12000,
      },
    });
  }),

  // Health check
  http.get(`${API_URL}/api/health`, () => {
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  }),

  // AI endpoints
  http.post(`${API_URL}/api/ai/chat`, async ({ request }) => {
    const body = await request.json();
    const query = body.query?.toLowerCase() || '';

    if (query.includes('fail')) {
      return HttpResponse.json({ error: 'AI service unavailable' }, { status: 503 });
    }

    const responses = {
      'active members': 'Currently 156 active members',
      'members': 'Currently 156 active members',
      'new leads': 'You have 8 new leads this week',
      'leads': 'You have 8 new leads this week',
      'revenue': "Today's revenue is $2,450",
      'tasks': 'There are 3 overdue tasks',
      'overdue tasks': 'There are 3 overdue tasks',
      'summary': '📊 **Business Summary**\n\n👥 **Members:** 156 active, 12 on trial\n🎯 **Leads:** 8 new\n💰 **Revenue This Month:** $45,000\n📅 **Classes Today:** 4\n📋 **Overdue Tasks:** 3',
    };

    let response = 'I can help with that! Check the dashboard for details.';
    for (const [key, val] of Object.entries(responses)) {
      if (query.includes(key)) {
        response = val;
        break;
      }
    }

    return HttpResponse.json({
      response,
      actions: query.includes('task') ? [{ type: 'task_created', text: 'Task created' }] : [],
    });
  }),

  http.get(`${API_URL}/api/ai/status`, () => {
    return HttpResponse.json({
      running: true,
      uptime: 3600,
      lastTick: new Date().toISOString(),
      actionsToday: 42,
      dailyApiCalls: 15,
      dailyApiLimit: 50,
      agentsRegistered: 10,
    });
  }),

  http.get(`${API_URL}/api/ai/agents`, () => {
    return HttpResponse.json([
      { agent_name: 'leads', enabled: true, description: 'Monitors and manages new leads' },
      { agent_name: 'trials', enabled: true, description: 'Manages trial member conversions' },
      { agent_name: 'retention', enabled: false, description: 'Monitors member retention metrics' },
      { agent_name: 'tasks', enabled: true, description: 'Creates and tracks staff tasks' },
      { agent_name: 'analytics', enabled: true, description: 'Generates business insights' },
      { agent_name: 'billing', enabled: true, description: 'Monitors billing and payments' },
      { agent_name: 'belt_grading', enabled: false, description: 'Tracks belt grading progress' },
      { agent_name: 'stock', enabled: true, description: 'Monitors inventory levels' },
      { agent_name: 'staff', enabled: true, description: 'Tracks staff performance' },
      { agent_name: 'messaging', enabled: true, description: 'Handles automated messages' },
      { agent_name: 'sales_team', enabled: true, description: 'LLM-powered sales pipeline management' },
      { agent_name: 'member_success_team', enabled: true, description: 'LLM-powered member retention' },
      { agent_name: 'operations_team', enabled: true, description: 'LLM-powered operations management' },
      { agent_name: 'finance_team', enabled: true, description: 'LLM-powered finance monitoring' },
    ]);
  }),

  http.post(`${API_URL}/api/ai/agents/:name/toggle`, ({ params }) => {
    return HttpResponse.json({ agent_name: params.name, enabled: true });
  }),

  http.get(`${API_URL}/api/ai/history`, ({ request }) => {
    const url = new URL(request.url);
    const agentFilter = url.searchParams.get('agent');
    const allActivities = [
      { id: 1, agent_name: 'leads', action_type: 'check_leads', summary: 'Checked for new leads', status: 'success', created_at: new Date().toISOString() },
      { id: 2, agent_name: 'tasks', action_type: 'check_tasks', summary: 'Created follow-up task for lead #5', status: 'success', created_at: new Date(Date.now() - 60000).toISOString() },
      { id: 3, agent_name: 'billing', action_type: 'check_payments', summary: 'Payment processing check completed', status: 'partial', created_at: new Date(Date.now() - 120000).toISOString() },
    ];
    const filtered = agentFilter ? allActivities.filter(a => a.agent_name === agentFilter) : allActivities;
    return HttpResponse.json(filtered);
  }),

  // Notifications
  http.get(`${API_URL}/api/notifications`, () => {
    return HttpResponse.json({
      notifications: [
        { id: '1', type: 'payment_failed', title: 'Failed payment', message: 'John Doe payment failed', link: '/billing', created_at: new Date().toISOString(), read: false },
        { id: '2', type: 'new_lead', title: 'New lead', message: 'New lead from website', link: '/leads', created_at: new Date().toISOString(), read: true },
      ],
      total: 2,
      unread: 1,
    });
  }),

  http.post(`${API_URL}/api/notifications/dismiss`, () => HttpResponse.json({ success: true })),
  http.post(`${API_URL}/api/notifications/mark-read`, () => HttpResponse.json({ success: true })),

  // Transactions (Billing)
  http.get(`${API_URL}/api/transactions`, () => {
    return HttpResponse.json({
      transactions: [
        { id: 1, member_name: 'John Doe', member_email: 'john@example.com', type: 'membership', amount: 69, status: 'completed', payment_method: 'card', created_at: '2024-04-22T10:00:00Z' },
        { id: 2, member_name: 'Jane Smith', type: 'hold_fee', amount: 15, status: 'failed', created_at: '2024-04-21T10:00:00Z' },
      ],
      total: 2,
    });
  }),

  http.get(`${API_URL}/api/transactions/stats`, () => {
    return HttpResponse.json({ mrr: 15000, today: 1200, failed_this_month: { count: 3, total: 210 }, this_month: 12000, by_type: [{ type: 'membership', total: 10000, count: 120 }, { type: 'hold_fee', total: 500, count: 30 }] });
  }),

  http.post(`${API_URL}/api/transactions`, () => HttpResponse.json({ id: 99 }, { status: 201 })),
  http.post(`${API_URL}/api/transactions/:id/refund`, () => HttpResponse.json({ success: true })),

  // Staff
  http.get(`${API_URL}/api/staff`, () => {
    return HttpResponse.json([
      { id: 1, name: 'Kane Mousah', email: 'kane@roarmma.com.au', role: 'coach', location: 'rockingham', active: true, created_at: '2024-01-01' },
      { id: 2, name: 'Sarah Connor', email: 'sarah@roarmma.com.au', role: 'front_desk', location: 'bibra_lake', active: true, created_at: '2024-02-01' },
    ]);
  }),

  http.get(`${API_URL}/api/staff/stats`, () => {
    return HttpResponse.json({ total: 2, by_role: [{ role: 'coach', count: 1 }, { role: 'front_desk', count: 1 }] });
  }),

  http.get(`${API_URL}/api/staff-performance/:id`, () => {
    return HttpResponse.json({ classes_taught: 45, avg_fill_rate: 72, pt_sessions: 12, pt_revenue: 2400 });
  }),

  http.put(`${API_URL}/api/staff/:id`, () => HttpResponse.json({ success: true })),
  http.post(`${API_URL}/api/staff`, () => HttpResponse.json({ id: 3 }, { status: 201 })),

  // Scheduled Messages
  http.get(`${API_URL}/api/scheduled-messages`, () => {
    return HttpResponse.json({ scheduled_messages: [
      { id: 1, message_type: 'email', subject: 'Welcome', body: 'Welcome to ROAR MMA', status: 'sent', recipient_count: 50, scheduled_for: null },
      { id: 2, message_type: 'sms', subject: null, body: 'Class reminder tomorrow', status: 'pending', recipient_count: 20, scheduled_for: new Date(Date.now() + 86400000).toISOString() },
    ]});
  }),

  http.post(`${API_URL}/api/scheduled-messages`, () => HttpResponse.json({ id: 3 }, { status: 201 })),
  http.post(`${API_URL}/api/scheduled-messages/:id/cancel`, () => HttpResponse.json({ success: true })),

  // Message Templates
  http.get(`${API_URL}/api/message-templates`, () => {
    return HttpResponse.json({ templates: [
      { id: 1, name: 'Welcome Email', type: 'email', subject: 'Welcome!', body: 'Hi {first_name}, welcome!', trigger_event: 'member_created' },
    ]});
  }),

  http.delete(`${API_URL}/api/message-templates/:id`, () => new HttpResponse(null, { status: 204 })),

  // AI Approval
  http.get(`${API_URL}/api/ai/pending-approval`, () => {
    return HttpResponse.json({ pending: [
      { id: 1, agent: 'HERMES', channel: 'sms', recipient_name: 'Alice Johnson', subject: null, body: 'Hi Alice, ready for your trial?', created_at: new Date().toISOString() },
    ], total: 1 });
  }),

  http.post(`${API_URL}/api/ai/approve/:id`, () => HttpResponse.json({ success: true })),
  http.post(`${API_URL}/api/ai/reject/:id`, () => HttpResponse.json({ success: true })),

  // Grading
  http.get(`${API_URL}/api/grading/sessions`, () => {
    return HttpResponse.json({ sessions: [
      { id: 1, name: 'June Grading', date: '2024-06-15', location: 'rockingham', status: 'scheduled', notes: 'Bring gi' },
    ]});
  }),

  http.get(`${API_URL}/api/grading/belts`, () => {
    return HttpResponse.json({ belts: [
      { id: 1, name: 'White', rank: 1 }, { id: 2, name: 'Blue', rank: 2 }, { id: 3, name: 'Purple', rank: 3 },
    ]});
  }),

  http.post(`${API_URL}/api/grading/sessions`, () => HttpResponse.json({ id: 2 }, { status: 201 })),

  http.get(`${API_URL}/api/grading/belts/registry`, () => {
    return HttpResponse.json({ registry: [] });
  }),

  http.get(`${API_URL}/api/grading/fighters/leaderboard`, () => {
    return HttpResponse.json([]);
  }),

  // Stock
  http.get(`${API_URL}/api/stock/products`, () => {
    return HttpResponse.json({ products: [
      { id: 1, name: 'ROAR T-Shirt', sku: 'RTS-001', sell_price: 39.99, stock_qty: 50, min_stock: 10, category: 'apparel' },
      { id: 2, name: 'ROAR Shorts', sku: 'RSS-001', sell_price: 49.99, stock_qty: 3, min_stock: 10, category: 'apparel' },
    ]});
  }),

  http.get(`${API_URL}/api/stock/alerts`, () => {
    return HttpResponse.json({ alerts: [
      { id: 1, product_name: 'ROAR Shorts', type: 'low_stock', current_qty: 3, min_stock: 10 },
    ]});
  }),

  http.post(`${API_URL}/api/stock/sales`, () => HttpResponse.json({ id: 1 }, { status: 201 })),
  http.post(`${API_URL}/api/stock/alerts/:id/resolve`, () => HttpResponse.json({ success: true })),

  // Lead interactions
  http.get(`${API_URL}/api/leads/:id/interactions`, () => {
    return HttpResponse.json({ interactions: [
      { id: 1, interaction_type: 'note', notes: 'Called and left voicemail', created_at: new Date().toISOString(), staff_name: 'Kane Mousah' },
    ]});
  }),

  http.post(`${API_URL}/api/leads/:id/interactions`, () => HttpResponse.json({ id: 2 }, { status: 201 })),

  // Waivers
  http.get(`${API_URL}/api/waivers/templates`, () => {
    return HttpResponse.json({ templates: [
      { id: 1, name: 'Standard Gym Waiver', body_text: 'I hereby acknowledge that martial arts training involves inherent risks...', version: 1, active: true, created_at: '2024-01-01T00:00:00Z' },
      { id: 2, name: 'Minor Waiver', body_text: 'I, as parent/guardian, consent to my child participating in martial arts...', version: 1, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]});
  }),

  http.get(`${API_URL}/api/waivers/templates/:id`, ({ params }) => {
    return HttpResponse.json({ id: parseInt(params.id, 10), name: 'Standard Gym Waiver', body_text: 'I hereby acknowledge...', version: 1, active: true });
  }),

  http.post(`${API_URL}/api/waivers/templates`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 3, ...body, version: 1, active: true }, { status: 201 });
  }),

  http.put(`${API_URL}/api/waivers/templates/:id`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 1, ...body });
  }),

  http.delete(`${API_URL}/api/waivers/templates/:id`, () => HttpResponse.json({ success: true })),

  http.post(`${API_URL}/api/waivers/sign`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 1, member_id: body.member_id, template_id: body.template_id, signed_at: new Date().toISOString(), template_name: 'Standard Gym Waiver' }, { status: 201 });
  }),

  http.get(`${API_URL}/api/waivers/member/:memberId`, () => {
    return HttpResponse.json({ waivers: [
      { id: 1, member_id: 1, template_id: 1, template_name: 'Standard Gym Waiver', signed_at: new Date().toISOString() },
    ]});
  }),

  http.get(`${API_URL}/api/waivers/documents/member/:memberId`, () => {
    return HttpResponse.json({ documents: [
      { id: 1, member_id: 1, doc_type: 'health', file_name: 'health_clearance.pdf', file_path: '/uploads/health_clearance.pdf', notes: 'Annual health clearance', uploaded_at: new Date().toISOString() },
    ]});
  }),

  http.post(`${API_URL}/api/waivers/documents/upload`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 2, ...body, uploaded_at: new Date().toISOString() }, { status: 201 });
  }),

  http.delete(`${API_URL}/api/waivers/documents/:id`, () => HttpResponse.json({ success: true })),

  http.get(`${API_URL}/api/settings`, () => {
    return HttpResponse.json({
      general: { gym_name: 'ROAR MMA', gym_phone: '(08) 9999 9999', gym_email: 'info@roarmma.com.au', timezone: 'Australia/Perth' },
      locations: [{ id: 'rockingham', name: 'Rockingham' }, { id: 'bibra_lake', name: 'Bibra Lake' }],
      membership: { trial_duration_days: 14, monthly_fee: 99.99, pt_rate: 75 },
      notifications: { sms_enabled: true, email_enabled: true, reminder_hours: 24 },
      webhooks: { lightspeed_url: 'https://hooks.roarmma.com.au/lightspeed', lightspeed_enabled: true, stripe_url: 'https://hooks.roarmma.com.au/stripe', stripe_enabled: true },
      integrations: { sendgrid_api_key: '', twilio_account_sid: '', twilio_auth_token: '' },
    });
  }),

  http.put(`${API_URL}/api/settings`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...body, updated_at: new Date().toISOString() });
  }),

  http.get(`${API_URL}/api/webhooks/status`, () => {
    return HttpResponse.json({
      lightspeed: { url: 'https://hooks.roarmma.com.au/lightspeed', enabled: true, last_delivery: new Date().toISOString() },
      stripe: { url: 'https://hooks.roarmma.com.au/stripe', enabled: true, last_delivery: null },
    });
  }),

  http.post(`${API_URL}/api/webhooks/lightspeed/sync`, () => {
    return HttpResponse.json({ success: true, synced: 42 });
  }),

  http.get(`${API_URL}/api/auth/api-key`, () => {
    return HttpResponse.json({ keys: [] });
  }),

  http.get(`${API_URL}/api/reports/:type`, ({ params }) => {
    const { type } = params;
    if (type === 'membership') {
      return HttpResponse.json({
        summary: { total_members: 150, active: 120, trial: 20, paused: 5, cancelled: 10 },
        by_location: [{ location: 'rockingham', count: 80 }, { location: 'bibra_lake', count: 70 }],
        by_plan: [{ membership_type: 'adult', count: 100 }, { membership_type: 'kids', count: 30 }, { membership_type: 'fighter', count: 20 }],
        new_members: [{ month: '2026-01', count: 15 }, { month: '2026-02', count: 20 }],
        membership_trend: [{ date: '2026-01', active: 100, trial: 15 }, { date: '2026-02', active: 110, trial: 18 }],
      });
    }
    return HttpResponse.json({});
  }),

  http.get(`${API_URL}/api/reports/weekly-digest`, () => {
    return HttpResponse.json([]);
  }),

  http.get(`${API_URL}/api/calendar/events`, () => {
    return HttpResponse.json([
      { id: 1, title: 'BJJ Class', type: 'class', date: new Date().toISOString().split('T')[0], start_time: '09:00', end_time: '10:00', description: 'Gi BJJ' },
      { id: 2, title: 'Gym Event', type: 'event', date: new Date().toISOString().split('T')[0], start_time: '18:00', end_time: '20:00', description: 'Sparring night' },
    ]);
  }),
];
