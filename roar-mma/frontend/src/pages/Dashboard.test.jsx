import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import Dashboard from './Dashboard';
import { server } from '../test/mocks/server';
import { LocationProvider } from '../contexts/LocationContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { http, HttpResponse } from 'msw';

vi.mock('../contexts/WebSocketContext', () => ({
  useWebSocket: () => ({}),
}));

const API_URL = 'http://localhost:3001';

const missingEndpoints = [
  http.get(`${API_URL}/api/dashboard/sparklines`, () => HttpResponse.json({ sparklines: [] })),
  http.get(`${API_URL}/api/pixel/analytics`, () => HttpResponse.json(null)),
  http.get(`${API_URL}/api/dashboard/revenue-forecast`, () => HttpResponse.json(null)),
];

afterEach(() => server.resetHandlers());
beforeEach(() => server.use(...missingEndpoints));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  });
  return ({ children }) => (
    <BrowserRouter>
      <LocationProvider>
        <QueryClientProvider client={queryClient}>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </QueryClientProvider>
      </LocationProvider>
    </BrowserRouter>
  );
};

describe('Dashboard Page', () => {
  it('displays loading spinner initially', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows error state with retry on API failure', async () => {
    server.use(
      http.get(`${API_URL}/api/dashboard`, () => HttpResponse.json({ error: 'Server error' }, { status: 500 })),
      http.get(`${API_URL}/api/analytics/dashboard`, () => HttpResponse.json({ error: 'err' }, { status: 500 })),
      http.get(`${API_URL}/api/dashboard/sparklines`, () => HttpResponse.json({ error: 'err' }, { status: 500 })),
      http.get(`${API_URL}/api/ai/status`, () => HttpResponse.json({ error: 'err' }, { status: 500 })),
      http.get(`${API_URL}/api/pixel/analytics`, () => HttpResponse.json({ error: 'err' }, { status: 500 })),
      http.get(`${API_URL}/api/dashboard/revenue-forecast`, () => HttpResponse.json({ error: 'err' }, { status: 500 })),
    );
    render(<Dashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Try again')).toBeInTheDocument();
    }, { timeout: 8000 });
  });

  it('displays all 8 KPI cards after loading', async () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Active Members')).toBeInTheDocument();
      expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
      expect(screen.getByText('Open Leads')).toBeInTheDocument();
      expect(screen.getByText('Class Fill %')).toBeInTheDocument();
      expect(screen.getByText('New This Week')).toBeInTheDocument();
      expect(screen.getByText('Active Trials')).toBeInTheDocument();
      expect(screen.getByText("Today's Bookings")).toBeInTheDocument();
      expect(screen.getByText('Hot Leads')).toBeInTheDocument();
    });
  });

  it('shows KPI values from API', async () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByLabelText('Active Members: 156')).toBeInTheDocument();
      expect(screen.getByLabelText(/Monthly Revenue: \$/)).toBeInTheDocument();
    });
  });

  it('shows delta indicators for KPIs', async () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      const deltas = screen.getAllByText(/[↑↓]\s*[\d.]+%/);
      expect(deltas.length).toBeGreaterThan(0);
    });
  });

  it('displays AI agent status panel', async () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('AI Agent Status')).toBeInTheDocument();
      expect(screen.getByText('ZEUS')).toBeInTheDocument();
      expect(screen.getByText('MIDAS')).toBeInTheDocument();
      expect(screen.getByText('HERMES')).toBeInTheDocument();
      expect(screen.getByText('ORACLE')).toBeInTheDocument();
      expect(screen.getByText('HEALER')).toBeInTheDocument();
    });
  });

  it('displays today\'s classes and recent activity', async () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('BJJ Fundamentals')).toBeInTheDocument();
      expect(screen.getByText(/Kane Mousah/)).toBeInTheDocument();
      expect(screen.getByText(/John Doe joined/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no classes or activity', async () => {
    server.use(
      http.get(`${API_URL}/api/dashboard`, () => HttpResponse.json({
        kpis: { active_members: { value: 10, delta: 1 }, monthly_revenue: { value: 100, delta: 0 }, today_bookings: { value: 1, delta: 0 }, new_leads: { value: 1, delta: 0 } },
        todays_classes: [],
        recent_activity: [],
      })),
    );
    render(<Dashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No classes scheduled today')).toBeInTheDocument();
      expect(screen.getByText('No recent activity')).toBeInTheDocument();
    });
  });

  it('shows failed payments alert', async () => {
    server.use(
      http.get(`${API_URL}/api/dashboard`, () => HttpResponse.json({
        kpis: { active_members: { value: 10, delta: 1 }, monthly_revenue: { value: 100, delta: 0 }, today_bookings: { value: 1, delta: 0 }, new_leads: { value: 1, delta: 0 } },
        todays_classes: [],
        recent_activity: [],
        failed_payments: { count: 3, total: 450, members: [{ id: 1, name: 'John Doe', amount: 150 }] },
      })),
    );
    render(<Dashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed Payments')).toBeInTheDocument();
      expect(screen.getByText(/3 members/)).toBeInTheDocument();
    });
  });

  it('allows editing monthly membership goal target', async () => {
    server.use(
      http.put(`${API_URL}/api/dashboard/goal-target`, () => HttpResponse.json({ success: true })),
    );
    render(<Dashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Monthly Membership Goal')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTitle('Edit target'));
    const input = screen.getByRole('spinbutton');
    expect(input).toBeInTheDocument();
    fireEvent.change(input, { target: { value: '50' } });
    fireEvent.click(screen.getByText('Save'));
  });

  it('renders chart sections', async () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Member Growth (30d)')).toBeInTheDocument();
      expect(screen.getByText('Revenue Trend (30d)')).toBeInTheDocument();
      expect(screen.getByText('Class Attendance This Week')).toBeInTheDocument();
    });
  });
});
