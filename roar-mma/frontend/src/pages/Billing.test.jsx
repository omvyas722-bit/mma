import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import Billing from './Billing';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';

afterEach(() => server.resetHandlers());
const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <BrowserRouter><QueryClientProvider client={queryClient}><NotificationProvider>{children}</NotificationProvider></QueryClientProvider></BrowserRouter>
  );
};

describe('Billing Page', () => {
  it('renders the billing heading', () => {
    render(<Billing />, { wrapper: createWrapper() });
    expect(screen.getByText('Billing')).toBeInTheDocument();
  });

  it('displays transaction table after loading', async () => {
    render(<Billing />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('shows stats cards with values', async () => {
    render(<Billing />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('MRR')).toBeInTheDocument();
      expect(screen.getAllByText('$15,000.00').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('$1,200.00')).toBeInTheDocument();
    });
  });

  it('shows error state when transactions fail', async () => {
    server.use(
      http.get('http://localhost:3001/api/transactions', () => HttpResponse.json({ error: 'fail' }, { status: 500 })),
      http.get('http://localhost:3001/api/transactions/stats', () => HttpResponse.json({ error: 'fail' }, { status: 500 })),
      http.get('http://localhost:3001/api/dashboard', () => HttpResponse.json({ error: 'fail' }, { status: 500 })),
      http.get('http://localhost:3001/api/dashboard/revenue-forecast', () => HttpResponse.json({ error: 'fail' }, { status: 500 })),
    );
    render(<Billing />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('Failed to load transactions')).toBeInTheDocument(), { timeout: 8000 });
  });

  it('shows empty state when no transactions exist', async () => {
    server.use(http.get('http://localhost:3001/api/transactions', () => HttpResponse.json({ transactions: [], total: 0 })));
    render(<Billing />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('No transactions found')).toBeInTheDocument());
  });

  it('shows filter inputs', async () => {
    render(<Billing />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByLabelText('Search transactions')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by type')).toBeInTheDocument();
    });
  });

  it('shows record payment button and opens modal on click', async () => {
    render(<Billing />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('+ Record Payment')).toBeInTheDocument());
    await userEvent.click(screen.getByText('+ Record Payment'));
    expect(screen.getAllByText('Record Payment').length).toBeGreaterThanOrEqual(2);
  });

  it('shows MRR forecast with confirmed and at-risk breakdown', async () => {
    server.use(http.get('http://localhost:3001/api/dashboard/revenue-forecast', () => HttpResponse.json({ monthlyProjection: 14500, churnRate: 3.2 })));
    render(<Billing />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Current MRR')).toBeInTheDocument();
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
      expect(screen.getByText('At Risk')).toBeInTheDocument();
    });
  });

  it('shows MIDAS chase alert when present', async () => {
    server.use(http.get('http://localhost:3001/api/dashboard', () => HttpResponse.json({
      midas_chase: { member_id: 5, amount: 150, summary: 'Chasing John', created_at: '2026-06-20T10:00:00Z' },
    })));
    render(<Billing />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('MIDAS Chase in Progress')).toBeInTheDocument());
  });

  it('shows revenue by type sections', async () => {
    render(<Billing />, { wrapper: createWrapper() });
    const membershipLabels = await screen.findAllByText('membership');
    expect(membershipLabels.length).toBeGreaterThanOrEqual(1);
    await waitFor(() => expect(screen.getByText(/10000/)).toBeInTheDocument());
  });

  it('opens write-off modal for a failed transaction', async () => {
    render(<Billing />, { wrapper: createWrapper() });
    await waitFor(() => {
      const writeOffBtns = screen.getAllByText('Write Off');
      expect(writeOffBtns.length).toBeGreaterThan(0);
    });
    await userEvent.click(screen.getAllByText('Write Off')[0]);
    expect(screen.getByText('Write Off Transaction')).toBeInTheDocument();
  });

  it('shows pagination when total exceeds limit', async () => {
    server.use(http.get('http://localhost:3001/api/transactions', () => HttpResponse.json({
      transactions: Array.from({ length: 50 }, (_, i) => ({
        id: i + 1, member_name: `Member ${i + 1}`, type: 'membership', amount: 69,
        status: 'completed', created_at: '2024-04-22T10:00:00Z',
      })),
      total: 55,
    })));
    render(<Billing />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('1–50 of 55')).toBeInTheDocument());
    expect(screen.getByLabelText('Next page')).toBeInTheDocument();
    expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
  });

  it('dispatches payment search when typing in search box', async () => {
    render(<Billing />, { wrapper: createWrapper() });
    const searchInput = await screen.findByLabelText('Search transactions');
    await userEvent.type(searchInput, 'John');
    expect(searchInput).toHaveValue('John');
  });
});
