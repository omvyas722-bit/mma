// Dashboard Page Tests
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import Dashboard from './Dashboard';
import { server } from '../test/mocks/server';

vi.mock('../contexts/WebSocketContext', () => ({
  useWebSocket: () => ({}),
}));

// Setup MSW
afterEach(() => server.resetHandlers());
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Dashboard Page', () => {
  it('displays loading spinner initially', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays KPI cards after loading', async () => {
    render(<Dashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Active Members')).toBeInTheDocument();
      expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
      expect(screen.getAllByText("Today's Classes").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('New This Week')).toBeInTheDocument();
    });
  });

  it('displays today\'s classes', async () => {
    render(<Dashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('BJJ Fundamentals')).toBeInTheDocument();
      expect(screen.getByText(/Kane Mousah/)).toBeInTheDocument();
    });
  });

  it('displays recent activity', async () => {
    render(<Dashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/John Doe joined/i)).toBeInTheDocument();
    });
  });

  it('shows delta indicators for KPIs', async () => {
    render(<Dashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Check for percentage indicators
      const percentages = screen.getAllByText(/%/);
      expect(percentages.length).toBeGreaterThan(0);
    });
  });
});
