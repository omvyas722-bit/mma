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
];
