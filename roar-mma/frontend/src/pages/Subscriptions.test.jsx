import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import Subscriptions from './Subscriptions';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3001';

vi.mock('../contexts/NotificationContext', () => ({
  useNotifications: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }),
}));

const mockSubscriptions = [
  { id: 1, member_id: 1, member_name: 'John Doe', amount: 99.00, status: 'active', next_billing_date: '2024-07-01', last_payment_date: '2024-06-01', last_payment_status: 'success' },
  { id: 2, member_id: 2, member_name: 'Jane Smith', amount: 149.00, status: 'active', next_billing_date: '2024-07-05', last_payment_date: '2024-06-05', last_payment_status: 'failed' },
  { id: 3, member_id: 3, member_name: 'Bob Wilson', amount: 79.00, status: 'paused', next_billing_date: null, last_payment_date: '2024-05-01', last_payment_status: 'success' },
  { id: 4, member_id: 4, member_name: 'Alice Brown', amount: 199.00, status: 'cancelled', next_billing_date: null, last_payment_date: '2024-03-01', last_payment_status: 'success' },
];

const mockMrrHistory = {
  history: [
    { month: '2024-01', mrr: 10000 },
    { month: '2024-02', mrr: 12000 },
    { month: '2024-03', mrr: 11500 },
    { month: '2024-04', mrr: 13000 },
    { month: '2024-05', mrr: 14000 },
    { month: '2024-06', mrr: 15500 },
  ],
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  });
  return ({ children }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Subscriptions Page', () => {
  beforeEach(() => server.resetHandlers());

  const setupHandlers = () => {
    server.use(
      http.get(`${API_URL}/api/transactions/subscriptions`, () => HttpResponse.json({ subscriptions: mockSubscriptions })),
      http.get(`${API_URL}/api/transactions/mrr-history`, () => HttpResponse.json(mockMrrHistory)),
    );
  };

  it('shows loading skeleton initially', () => {
    server.use(
      http.get(`${API_URL}/api/transactions/subscriptions`, () => new Promise(() => {})),
      http.get(`${API_URL}/api/transactions/mrr-history`, () => new Promise(() => {})),
    );
    render(<Subscriptions />, { wrapper: createWrapper() });
    expect(screen.getByText('Subscriptions')).toBeInTheDocument();
  });

  it('renders subscription rows and heading after loading', async () => {
    setupHandlers();
    render(<Subscriptions />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Subscriptions')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('shows empty state when no subscriptions exist', async () => {
    server.use(
      http.get(`${API_URL}/api/transactions/subscriptions`, () => HttpResponse.json({ subscriptions: [] })),
      http.get(`${API_URL}/api/transactions/mrr-history`, () => HttpResponse.json({ history: [] })),
    );
    render(<Subscriptions />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No subscriptions yet')).toBeInTheDocument();
    });
  });

  it('displays summary cards with correct values', async () => {
    setupHandlers();
    render(<Subscriptions />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Active Subs')).toBeInTheDocument();
      expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
      expect(screen.getByText('At Risk')).toBeInTheDocument();
      expect(screen.getByText('Avg per Sub')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('renders status badges for active, paused, cancelled subscriptions', async () => {
    setupHandlers();
    render(<Subscriptions />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('paused')).toBeInTheDocument();
      expect(screen.getByText('cancelled')).toBeInTheDocument();
    });
    const activeBadges = screen.getAllByText('active');
    expect(activeBadges.length).toBe(2);
  });

  it('shows MRR history chart when data is available', async () => {
    setupHandlers();
    render(<Subscriptions />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('MRR History')).toBeInTheDocument();
    });
  });

  it('does not show MRR chart when no history data', async () => {
    server.use(
      http.get(`${API_URL}/api/transactions/subscriptions`, () => HttpResponse.json({ subscriptions: mockSubscriptions })),
      http.get(`${API_URL}/api/transactions/mrr-history`, () => HttpResponse.json({ history: [] })),
    );
    render(<Subscriptions />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.queryByText('MRR History')).not.toBeInTheDocument();
    });
  });

  it('shows warning indicator for failed last payment', async () => {
    setupHandlers();
    render(<Subscriptions />, { wrapper: createWrapper() });
    await waitFor(() => {
      const warningIcons = document.querySelectorAll('.text-red-600');
      expect(warningIcons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders Create Subscription button and opens form on click', async () => {
    setupHandlers();
    render(<Subscriptions />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('+ Create Subscription')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Create Subscription'));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Create Subscription')).toBeInTheDocument();
    });
  });

  it('shows at-risk count matching subscriptions with failed last payment', async () => {
    setupHandlers();
    render(<Subscriptions />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully with empty table', async () => {
    server.use(
      http.get(`${API_URL}/api/transactions/subscriptions`, () => HttpResponse.json({ error: 'Server error' }, { status: 500 })),
      http.get(`${API_URL}/api/transactions/mrr-history`, () => HttpResponse.json({ error: 'err' }, { status: 500 })),
    );
    render(<Subscriptions />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No subscriptions yet')).toBeInTheDocument();
    });
  });
});
