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
      id: parseInt(params.id),
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
      id: parseInt(params.id),
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

  // Classes endpoints
  http.get(`${API_URL}/api/classes/instances`, () => {
    return HttpResponse.json([
      {
        id: 1,
        class_name: 'BJJ Fundamentals',
        class_type: 'bjj',
        date: '2024-04-22',
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
    return HttpResponse.json([
      {
        id: 1,
        first_name: 'Alice',
        last_name: 'Johnson',
        phone: '0412345680',
        email: 'alice@example.com',
        source: 'website',
        stage: 'new',
        created_at: new Date().toISOString(),
      },
    ]);
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
];
