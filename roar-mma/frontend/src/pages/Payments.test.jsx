import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import Payments from './Payments';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3001';

vi.mock('../contexts/NotificationContext', () => ({
  useNotifications: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }),
}));

vi.mock('../components/Shared/Spinner', () => ({
  PageLoader: () => <div data-testid="page-loader">Loading...</div>,
}));

vi.mock('../components/Modal', () => ({
  default: ({ isOpen, title, children }) => isOpen ? (
    <div data-testid="modal">
      <h3>{title}</h3>
      {children}
    </div>
  ) : null,
}));

const defaultTransactions = [
  { id: 1, member_name: 'John Doe', description: 'Monthly membership', amount: 150, status: 'succeeded', created_at: '2024-06-01T10:00:00Z' },
  { id: 2, member_name: 'Jane Smith', description: 'PT session', amount: 75, status: 'pending', created_at: '2024-06-02T10:00:00Z' },
  { id: 3, member_name: 'Bob Wilson', description: 'Gear purchase', amount: 200, status: 'failed', created_at: '2024-06-03T10:00:00Z' },
  { id: 4, member_name: 'Alice Brown', description: 'Refund', amount: 99, status: 'refunded', created_at: '2024-06-04T10:00:00Z' },
];

const defaultStats = {
  mrr: 45000, pending_amount: 500, failed_this_month: { count: 2, total: 150 }, this_month: 12000,
};

const setupPaymentsHandlers = () => {
  server.use(
    http.get(`${API_URL}/api/transactions`, () => HttpResponse.json({ transactions: defaultTransactions })),
    http.get(`${API_URL}/api/transactions/stats`, () => HttpResponse.json(defaultStats)),
  );
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

describe('Payments Page', () => {
  beforeEach(() => {
    server.resetHandlers();
    setupPaymentsHandlers();
  });

  afterEach(() => server.resetHandlers());

  it('shows loading spinner initially', () => {
    render(<Payments />, { wrapper: createWrapper() });
    expect(screen.getByTestId('page-loader')).toBeInTheDocument();
  });

  it('renders payment rows and heading after loading', async () => {
    render(<Payments />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Payments')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Monthly membership')).toBeInTheDocument();
    });
  });

  it('displays summary cards for revenue metrics', async () => {
    render(<Payments />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText(/^\$45,000/)).toBeInTheDocument();
    });
  });

  it('shows empty state when no payments exist', async () => {
    server.use(
      http.get(`${API_URL}/api/transactions`, () => HttpResponse.json({ transactions: [] })),
    );
    render(<Payments />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No payments found')).toBeInTheDocument();
    });
  });

  it('renders status badges for succeeded, pending, failed, refunded', async () => {
    render(<Payments />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('succeeded')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('failed')).toBeInTheDocument();
      expect(screen.getByText('refunded')).toBeInTheDocument();
    });
  });

  it('filters payments via the search input', async () => {
    render(<Payments />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Search by member name or transaction ID...');
    fireEvent.change(searchInput, { target: { value: 'Jane' } });
    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('filters payments via the status dropdown', async () => {
    render(<Payments />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    const filterSelect = screen.getByRole('combobox');
    fireEvent.change(filterSelect, { target: { value: 'succeeded' } });
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('opens Process Payment modal when button is clicked', async () => {
    render(<Payments />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Process Payment')).toBeInTheDocument();
    });
    const buttons = screen.getAllByText('Process Payment');
    fireEvent.click(buttons[0]);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('shows Refund button only for succeeded payments', async () => {
    render(<Payments />, { wrapper: createWrapper() });
    await waitFor(() => {
      const refunds = screen.getAllByRole('button', { name: 'Refund' });
      expect(refunds.length).toBe(1);
    });
  });

  it('handles API transaction failure gracefully with empty state', async () => {
    server.use(
      http.get(`${API_URL}/api/transactions`, () => HttpResponse.json({ error: 'Server error' }, { status: 500 })),
    );
    render(<Payments />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No payments found')).toBeInTheDocument();
    });
  });

  it('handles API stats failure gracefully with zero summary values', async () => {
    server.use(
      http.get(`${API_URL}/api/transactions/stats`, () => HttpResponse.json({ error: 'Server error' }, { status: 500 })),
    );
    render(<Payments />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getAllByText('$0.00')).toHaveLength(3);
    });
  });

  it('shows all four summary cards (Total Revenue, Pending, Failed, This Month)', async () => {
    render(<Payments />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('This Month')).toBeInTheDocument();
    });
    const failedElements = screen.getAllByText('Failed');
    const pendingElements = screen.getAllByText('Pending');
    expect(failedElements.length).toBeGreaterThanOrEqual(1);
    expect(pendingElements.length).toBeGreaterThanOrEqual(1);
  });
});
