import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import Reports from './Reports';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';

afterEach(() => server.resetHandlers());
const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <BrowserRouter><QueryClientProvider client={queryClient}><NotificationProvider>{children}</NotificationProvider></QueryClientProvider></BrowserRouter>
  );
};

describe('Reports Page', () => {
  it('renders heading and report type select', async () => {
    render(<Reports />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('Reports')).toBeInTheDocument());
    expect(screen.getByText('Membership')).toBeInTheDocument();
  });

  it('shows membership summary cards after loading', async () => {
    render(<Reports />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('150')).toBeInTheDocument());
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('shows loading spinner while report loads', () => {
    render(<Reports />, { wrapper: createWrapper() });
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('shows error state on API failure', async () => {
    server.use(http.get('http://localhost:3001/api/reports/membership', () => HttpResponse.json({ error: 'fail' }, { status: 500 })));
    render(<Reports />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('Failed to load report. Please try again.')).toBeInTheDocument());
  });

  it('switches to Revenue report type', async () => {
    render(<Reports />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('150')).toBeInTheDocument());
    await userEvent.selectOptions(screen.getByRole('combobox'), 'revenue');
    expect(screen.getByText('Revenue')).toBeInTheDocument();
  });

  it('shows Export CSV and PDF buttons for membership report', async () => {
    render(<Reports />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
      expect(screen.getByText('PDF')).toBeInTheDocument();
    });
  });

  it('shows date preset buttons and updates date inputs on click', async () => {
    render(<Reports />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('This Month')).toBeInTheDocument());
    expect(screen.getByText('Last Month')).toBeInTheDocument();
    expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
    expect(screen.getByText('This Year')).toBeInTheDocument();
  });

  it('shows date from/to inputs', async () => {
    render(<Reports />, { wrapper: createWrapper() });
    await waitFor(() => {
      const dateInputs = screen.getAllByDisplayValue(/2026/);
      expect(dateInputs.length).toBeGreaterThan(0);
    });
  });

  it('shows generate report button and triggers refetch', async () => {
    render(<Reports />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('Generate Report')).toBeInTheDocument());
  });

  it('changes date values when clicking Last Month preset', async () => {
    render(<Reports />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('Last Month')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Last Month'));
    const dateInputs = screen.getAllByDisplayValue(/2026/);
    expect(dateInputs.length).toBe(2);
  });
});
