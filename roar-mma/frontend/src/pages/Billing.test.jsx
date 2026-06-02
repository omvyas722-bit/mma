import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import Billing from './Billing';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';

afterEach(() => server.resetHandlers());

beforeEach(() => {
  server.use(
    http.get('http://localhost:3001/api/transactions', () => {
      return HttpResponse.json({
        transactions: [
          { id: 1, member_name: 'John Doe', member_email: 'john@example.com', type: 'membership', amount: 69, status: 'completed', payment_method: 'card', created_at: '2024-04-22T10:00:00Z' },
          { id: 2, member_name: 'Jane Smith', type: 'hold_fee', amount: 15, status: 'failed', created_at: '2024-04-21T10:00:00Z' },
        ],
        total: 2,
      });
    }),
    http.get('http://localhost:3001/api/transactions/stats', () => {
      return HttpResponse.json({ mrr: 15000, today: 1200, failed_this_month: { count: 3, total: 210 }, this_month: 12000, by_type: [{ type: 'membership', total: 10000, count: 120 }, { type: 'hold_fee', total: 500, count: 30 }] });
    }),
  );
});
const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <BrowserRouter><QueryClientProvider client={queryClient}><NotificationProvider>{children}</NotificationProvider></QueryClientProvider></BrowserRouter>
  );
};

describe('Billing Page', () => {
  it('shows loading state initially', () => {
    render(<Billing />, { wrapper: createWrapper() });
    expect(screen.getByText('Billing')).toBeInTheDocument();
  });

  it('displays transaction table after loading', async () => {
    render(<Billing />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('John Doe')).toBeInTheDocument(); expect(screen.getByText('Jane Smith')).toBeInTheDocument(); });
  });

  it('shows stats cards', async () => {
    render(<Billing />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('MRR')).toBeInTheDocument(); expect(screen.getByText('Today')).toBeInTheDocument(); });
  });

  it('shows filter inputs', async () => {
    render(<Billing />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByLabelText('Search transactions')).toBeInTheDocument(); });
  });

  it('shows record payment button', () => {
    render(<Billing />, { wrapper: createWrapper() });
    expect(screen.getByText('+ Record Payment')).toBeInTheDocument();
  });
});
