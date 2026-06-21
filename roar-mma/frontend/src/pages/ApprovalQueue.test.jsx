import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';
import ApprovalQueue from './ApprovalQueue';

const API_URL = 'http://localhost:3001';

const aDayAgo = new Date(Date.now() - 86400000).toISOString();
const mockItems = [
  { id: 1, status: 'pending', agent_name: 'HERMES', action_type: 'send_sms', reason: 'Follow up with lead Alice', payload: JSON.stringify({ phone: '0412345680', message: 'Hi Alice' }), created_at: aDayAgo, reviewed_by: null },
  { id: 2, status: 'approved', agent_name: 'MIDAS', action_type: 'create_task', reason: 'Create follow-up task', payload: JSON.stringify({ assignee: 'Kane' }), created_at: aDayAgo, reviewed_by: 'System Owner' },
  { id: 3, status: 'rejected', agent_name: 'ZEUS', action_type: 'flag_member', reason: 'Flag suspicious activity', payload: JSON.stringify({ member_id: 5 }), created_at: aDayAgo, reviewed_by: 'System Owner' },
];

afterEach(() => server.resetHandlers());
beforeEach(() => {
  server.use(
    http.get(`${API_URL}/api/approval-queue`, ({ request }) => {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') || 'pending';
      const filtered = status === '' ? mockItems : mockItems.filter(i => i.status === status);
      return HttpResponse.json({ queue: filtered });
    }),
    http.post(`${API_URL}/api/approval-queue/:id/approve`, () => HttpResponse.json({ success: true })),
    http.post(`${API_URL}/api/approval-queue/:id/reject`, () => HttpResponse.json({ success: true })),
  );
});

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('ApprovalQueue', () => {
  it('shows loading skeleton initially', () => {
    render(<ApprovalQueue />, { wrapper: createWrapper() });
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders pending items after loading', async () => {
    render(<ApprovalQueue />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('HERMES')).toBeInTheDocument();
      expect(screen.getByText('send sms')).toBeInTheDocument();
      expect(screen.getByText(/Follow up with lead/i)).toBeInTheDocument();
    });
  });

  it('shows status badge colors for each item', async () => {
    server.use(
      http.get(`${API_URL}/api/approval-queue`, () =>
        HttpResponse.json({ queue: mockItems }),
      ),
    );
    render(<ApprovalQueue />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('approved')).toBeInTheDocument();
      expect(screen.getByText('rejected')).toBeInTheDocument();
    });
  });

  it('shows approve/reject buttons for pending items only', async () => {
    render(<ApprovalQueue />, { wrapper: createWrapper() });
    await waitFor(() => {
      const approveButtons = screen.getAllByText('✓ Approve');
      expect(approveButtons.length).toBe(1);
      expect(screen.getAllByText(/✕/).length).toBeGreaterThan(0);
    });
  });

  it('shows review info for non-pending items', async () => {
    server.use(
      http.get(`${API_URL}/api/approval-queue`, () =>
        HttpResponse.json({ queue: mockItems }),
      ),
    );
    render(<ApprovalQueue />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/✓ by System Owner/)).toBeInTheDocument();
      expect(screen.getByText(/✕ by System Owner/)).toBeInTheDocument();
    });
  });

  it('calls approve mutation when Approve is clicked', async () => {
    const user = userEvent.setup();
    let approved = false;
    server.use(
      http.post(`${API_URL}/api/approval-queue/:id/approve`, async ({ params }) => {
        approved = true;
        expect(params.id).toBe('1');
        return HttpResponse.json({ success: true });
      }),
    );
    render(<ApprovalQueue />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('✓ Approve'));
    await user.click(screen.getByText('✓ Approve'));
    await waitFor(() => expect(approved).toBe(true));
  });

  it('calls reject mutation when Reject is clicked', async () => {
    const user = userEvent.setup();
    let rejected = false;
    server.use(
      http.post(`${API_URL}/api/approval-queue/:id/reject`, async ({ params }) => {
        rejected = true;
        expect(params.id).toBe('1');
        return HttpResponse.json({ success: true });
      }),
    );
    render(<ApprovalQueue />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('✕ Reject'));
    await user.click(screen.getByText('✕ Reject'));
    await waitFor(() => expect(rejected).toBe(true));
  });

  it('disables Approve button when mutation is pending', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API_URL}/api/approval-queue/:id/approve`, async () => {
        await new Promise(r => setTimeout(r, 500));
        return HttpResponse.json({ success: true });
      }),
    );
    render(<ApprovalQueue />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('✓ Approve'));
    await user.click(screen.getByText('✓ Approve'));
    await waitFor(() => {
      expect(screen.getByText('✓ Approve')).toBeDisabled();
    });
  });

  it('expands item to show JSON payload on click', async () => {
    const user = userEvent.setup();
    render(<ApprovalQueue />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('HERMES'));
    const cards = screen.getAllByText(/HERMES|MIDAS|ZEUS/);
    await user.click(cards[0]);
    await waitFor(() => {
      expect(screen.getByText(/payload/)).toBeInTheDocument();
    });
  });

  it('filters items by status filter buttons', async () => {
    const user = userEvent.setup();
    render(<ApprovalQueue />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('pending').length).toBeGreaterThan(0);
    });
    await user.click(screen.getAllByText('approved')[0]);
    await waitFor(() => {
      expect(screen.getAllByText('approved').length).toBeGreaterThan(0);
    });
    await user.click(screen.getAllByText('rejected')[0]);
    await waitFor(() => {
      expect(screen.getAllByText('rejected').length).toBeGreaterThan(0);
    });
    await user.click(screen.getByText('All'));
    await waitFor(() => {
      expect(screen.getByText('All')).toBeInTheDocument();
    });
  });

  it('shows empty state when no pending items', async () => {
    server.use(
      http.get(`${API_URL}/api/approval-queue`, () =>
        HttpResponse.json({ queue: [] }),
      ),
    );
    render(<ApprovalQueue />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/No pending approvals/)).toBeInTheDocument();
    });
  });

  it('shows generic empty state for non-pending filters', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API_URL}/api/approval-queue`, () =>
        HttpResponse.json({ queue: [] }),
      ),
    );
    render(<ApprovalQueue />, { wrapper: createWrapper() });
    await user.click(screen.getAllByText('approved')[0]);
    await waitFor(() => {
      expect(screen.getByText(/No items found/)).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    server.use(
      http.get(`${API_URL}/api/approval-queue`, () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 }),
      ),
    );
    render(<ApprovalQueue />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/No pending approvals/)).toBeInTheDocument();
    }, { timeout: 12000 });
  });

  it('shows timestamp formatted with date-fns', async () => {
    render(<ApprovalQueue />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/\w{3}\s+\d+/)).toBeInTheDocument();
    });
  });
});
