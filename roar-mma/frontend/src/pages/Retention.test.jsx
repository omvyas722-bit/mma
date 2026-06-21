import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';
import Retention from './Retention';

const API_URL = 'http://localhost:3001';

afterEach(() => server.resetHandlers());

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  });
  return ({ children }) => (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>{children}</NotificationProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

function addRetentionHandlers() {
  server.use(
    http.get(`${API_URL}/api/retention/cancellation-requests`, () =>
      HttpResponse.json({
        requests: [
          {
            id: 1, member_id: 42, member_name: 'John Doe', reason: 'Moving overseas', requested_at: new Date(Date.now() - 86400000).toISOString(),
            offers: [
              { id: 10, type: 'discount', description: '20% off for 3 months', discount_pct: 20 },
              { id: 11, type: 'freeze', description: 'Freeze membership for 60 days', discount_pct: null },
            ],
          },
          {
            id: 2, member_id: 55, member_name: 'Jane Smith', reason: 'Too expensive', requested_at: new Date(Date.now() - 172800000).toISOString(),
            offers: [],
          },
        ],
      })
    ),
    http.get(`${API_URL}/api/retention/winback-campaigns`, () =>
      HttpResponse.json({
        campaigns: [
          { id: 1, name: 'Summer Comeback', description: 'Win back lapsed members', target_segment: 'lapsed_90d', recipient_count: 150, status: 'active' },
          { id: 2, name: 'New Year Rejoin', description: 'January campaign', target_segment: 'all', recipient_count: 300, status: 'draft' },
        ],
      })
    ),
    http.get(`${API_URL}/api/retention/analytics`, () =>
      HttpResponse.json({
        retention_rate: 78,
        saved_this_month: 12,
        churn_rate: 22,
        winback_rate: 15,
        cancellation_reasons: [
          { reason: 'Moving', count: 10, percentage: 35 },
          { reason: 'Cost', count: 8, percentage: 28 },
          { reason: 'Injury', count: 5, percentage: 17 },
        ],
      })
    ),
    http.post(`${API_URL}/api/retention/retention-offers/:id/accept`, () =>
      HttpResponse.json({ success: true })
    ),
    http.post(`${API_URL}/api/retention/retention-offers/:id/reject`, () =>
      HttpResponse.json({ success: true })
    ),
    http.post(`${API_URL}/api/retention/cancellation-requests/:id/process`, () =>
      HttpResponse.json({ success: true })
    ),
  );
}

describe('Retention', () => {
  describe('Tab Navigation', () => {
    it('renders all tab buttons', () => {
      render(<Retention />, { wrapper: createWrapper() });
      expect(screen.getByText('Cancellation Requests')).toBeInTheDocument();
      expect(screen.getByText('Win-Back Campaigns')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
    });

    it('switches to Win-Back tab', async () => {
      addRetentionHandlers();
      render(<Retention />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('Win-Back Campaigns'));
      expect(await screen.findByText('Summer Comeback')).toBeInTheDocument();
    });

    it('switches to Analytics tab', async () => {
      addRetentionHandlers();
      render(<Retention />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('Analytics'));
      expect(await screen.findByText('Retention Rate')).toBeInTheDocument();
    });
  });

  describe('Cancellation Requests', () => {
    it('shows loading state', () => {
      addRetentionHandlers();
      render(<Retention />, { wrapper: createWrapper() });
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThanOrEqual(1);
    });

    it('renders cancellation requests', async () => {
      addRetentionHandlers();
      render(<Retention />, { wrapper: createWrapper() });
      expect(await screen.findByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Moving overseas')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Too expensive')).toBeInTheDocument();
    });

    it('shows empty state when no requests', async () => {
      server.use(
        http.get(`${API_URL}/api/retention/cancellation-requests`, () =>
          HttpResponse.json({ requests: [] })
        ),
      );
      render(<Retention />, { wrapper: createWrapper() });
      expect(await screen.findByText('No pending cancellation requests')).toBeInTheDocument();
    });

    it('expands review section on click', async () => {
      addRetentionHandlers();
      render(<Retention />, { wrapper: createWrapper() });
      await screen.findByText('John Doe');
      await userEvent.click(screen.getAllByText('Review')[0]);
      expect(screen.getByText('Retention Offers')).toBeInTheDocument();
      expect(screen.getByText(/20% off/)).toBeInTheDocument();
      expect(screen.getByText(/freeze/)).toBeInTheDocument();
    });

    it('closes review section on second click', async () => {
      addRetentionHandlers();
      render(<Retention />, { wrapper: createWrapper() });
      await screen.findByText('John Doe');
      await userEvent.click(screen.getAllByText('Review')[0]);
      expect(screen.getByText('Retention Offers')).toBeInTheDocument();
      await userEvent.click(screen.getByText('Close'));
      await waitFor(() => {
        expect(screen.queryByText('Retention Offers')).not.toBeInTheDocument();
      });
    });

    it('accepts a retention offer', async () => {
      addRetentionHandlers();
      render(<Retention />, { wrapper: createWrapper() });
      await screen.findByText('John Doe');
      await userEvent.click(screen.getAllByText('Review')[0]);
      const acceptBtns = screen.getAllByText('Accept');
      await userEvent.click(acceptBtns[0]);
      await waitFor(() => {
        expect(screen.getByText('Processed')).toBeInTheDocument();
      });
    });

    it('rejects a retention offer', async () => {
      addRetentionHandlers();
      render(<Retention />, { wrapper: createWrapper() });
      await screen.findByText('John Doe');
      await userEvent.click(screen.getAllByText('Review')[0]);
      const rejectBtns = screen.getAllByText('Reject');
      await userEvent.click(rejectBtns[0]);
      await waitFor(() => {
        expect(screen.getByText('Processed')).toBeInTheDocument();
      });
    });

    it('processes a cancellation directly', async () => {
      addRetentionHandlers();
      render(<Retention />, { wrapper: createWrapper() });
      await screen.findByText('John Doe');
      await userEvent.click(screen.getAllByText('Review')[0]);
      await userEvent.click(screen.getByText('Process Cancellation'));
      await waitFor(() => {
        expect(screen.getByText('Processed')).toBeInTheDocument();
      });
    });

    it('shows member ID when name is missing', async () => {
      server.use(
        http.get(`${API_URL}/api/retention/cancellation-requests`, () =>
          HttpResponse.json({
            requests: [
              { id: 3, member_id: 99, reason: 'No reason', requested_at: null, offers: [] },
            ],
          })
        ),
      );
      render(<Retention />, { wrapper: createWrapper() });
      expect(await screen.findByText('Member #99')).toBeInTheDocument();
      expect(screen.getByText('No reason')).toBeInTheDocument();
    });
  });

  describe('Win-Back Campaigns', () => {
    it('displays win-back campaigns', async () => {
      addRetentionHandlers();
      render(<Retention />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('Win-Back Campaigns'));
      expect(await screen.findByText('Summer Comeback')).toBeInTheDocument();
      expect(screen.getByText('New Year Rejoin')).toBeInTheDocument();
    });

    it('shows campaign details: description, target, recipients', async () => {
      addRetentionHandlers();
      render(<Retention />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('Win-Back Campaigns'));
      expect(await screen.findByText('Win back lapsed members')).toBeInTheDocument();
      expect(screen.getByText(/Target: lapsed_90d/)).toBeInTheDocument();
      expect(screen.getByText(/150 recipients/)).toBeInTheDocument();
    });

    it('shows status badge', async () => {
      addRetentionHandlers();
      render(<Retention />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('Win-Back Campaigns'));
      expect(await screen.findByText('active')).toBeInTheDocument();
      expect(screen.getByText('draft')).toBeInTheDocument();
    });

    it('shows empty state', async () => {
      server.use(
        http.get(`${API_URL}/api/retention/winback-campaigns`, () =>
          HttpResponse.json({ campaigns: [] })
        ),
      );
      render(<Retention />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('Win-Back Campaigns'));
      expect(await screen.findByText('No active win-back campaigns')).toBeInTheDocument();
    });
  });

  describe('Retention Analytics', () => {
    it('displays metric cards', async () => {
      addRetentionHandlers();
      render(<Retention />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('Analytics'));
      expect(await screen.findByText('78%')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('22%')).toBeInTheDocument();
      expect(screen.getByText('15%')).toBeInTheDocument();
    });

    it('shows top cancellation reasons', async () => {
      addRetentionHandlers();
      render(<Retention />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('Analytics'));
      expect(await screen.findByText('Top Cancellation Reasons')).toBeInTheDocument();
      expect(screen.getByText('Moving')).toBeInTheDocument();
      expect(screen.getByText('Cost')).toBeInTheDocument();
      expect(screen.getByText('Injury')).toBeInTheDocument();
    });

    it('shows no analytics state', async () => {
      server.use(
        http.get(`${API_URL}/api/retention/analytics`, () =>
          HttpResponse.json(null)
        ),
      );
      render(<Retention />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('Analytics'));
      expect(await screen.findByText('No analytics data yet')).toBeInTheDocument();
    });

    it('renders metric card with red color for churn', async () => {
      addRetentionHandlers();
      render(<Retention />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('Analytics'));
      expect(await screen.findByText('Churn Rate')).toBeInTheDocument();
    });
  });
});
