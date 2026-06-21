import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';
import AgentTracking from './AgentTracking';

vi.mock('../contexts/WebSocketContext', () => ({
  useWebSocket: () => ({}),
}));

const API_URL = 'http://localhost:3001';

const mockStats = {
  actionsToday: 42,
  totalActions: 1560,
  pendingTasks: 5,
  agents: [
    { name: 'sales_team', enabled: true, recentActions: [
      { id: 's1', summary: 'Sent follow-up to 3 leads', status: 'completed', created_at: new Date().toISOString() },
      { id: 's2', summary: 'Scored 5 new leads', status: 'completed', created_at: new Date(Date.now() - 60000).toISOString() },
    ]},
    { name: 'member_success_team', enabled: true, recentActions: [
      { id: 'ms1', summary: 'Checked member retention', status: 'failed', created_at: new Date().toISOString() },
    ]},
    { name: 'operations_team', enabled: false, recentActions: [] },
    { name: 'finance_team', enabled: true, recentActions: [
      { id: 'f1', summary: 'Flagged overdue invoice #1042', status: 'completed', created_at: new Date().toISOString() },
    ]},
  ],
};

const mockLogs = {
  logs: [
    { id: 'l1', agent_name: 'sales_team', summary: 'Processed 3 new leads', status: 'completed', created_at: new Date().toISOString(), details: { actions_decided: 3, actions_taken: [{ action: 'send_email', status: 'ok', result: 'sent' }], context_summary: '3 leads scored > 80' } },
    { id: 'l2', agent_name: 'finance_team', summary: 'Checked billing', status: 'failed', created_at: new Date(Date.now() - 120000).toISOString(), details: { actions_decided: 1, actions_taken: [{ action: 'process_payment', status: 'error', error: 'Card declined' }] } },
  ],
};

afterEach(() => server.resetHandlers());
beforeEach(() => {
  server.use(
    http.get(`${API_URL}/api/agents/stats`, () => HttpResponse.json(mockStats)),
    http.get(`${API_URL}/api/agents/logs`, () => HttpResponse.json(mockLogs)),
    http.post(`${API_URL}/api/agents/run`, () => HttpResponse.json({ success: true })),
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

describe('AgentTracking', () => {
  it('shows loading state initially', () => {
    render(<AgentTracking />, { wrapper: createWrapper() });
    expect(screen.getByText('Loading activity...')).toBeInTheDocument();
  });

  it('renders all 4 agent cards with labels after loading', async () => {
    render(<AgentTracking />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Sales & Marketing')).toBeInTheDocument();
      expect(screen.getByText('Member Success')).toBeInTheDocument();
      expect(screen.getByText('Operations')).toBeInTheDocument();
      expect(screen.getByText('Finance & Billing')).toBeInTheDocument();
    });
  });

  it('shows stats summary in header', async () => {
    render(<AgentTracking />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('1560')).toBeInTheDocument();
      expect(screen.getByText(/pending tasks in queue/)).toBeInTheDocument();
    });
  });

  it('shows enabled/disabled indicator dots', async () => {
    render(<AgentTracking />, { wrapper: createWrapper() });
    await waitFor(() => {
      const cards = screen.getAllByRole('button', { name: /Run .*Agent$/ });
      expect(cards.length).toBe(4);
    });
  });

  it('shows Run All Agents button', async () => {
    render(<AgentTracking />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/⚡ Run All Agents/)).toBeInTheDocument();
    });
  });

  it('triggers run all agents on button click', async () => {
    const user = userEvent.setup();
    let runAllCalled = false;
    server.use(
      http.post(`${API_URL}/api/agents/run`, async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        expect(Object.keys(body).length).toBe(0);
        runAllCalled = true;
        return HttpResponse.json({ success: true });
      }),
    );
    render(<AgentTracking />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText(/⚡ Run All Agents/));
    await user.click(screen.getByText(/⚡ Run All Agents/));
    await waitFor(() => expect(runAllCalled).toBe(true));
  });

  it('shows Running All Agents... while running', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API_URL}/api/agents/run`, async () => {
        await new Promise(r => setTimeout(r, 500));
        return HttpResponse.json({ success: true });
      }),
    );
    render(<AgentTracking />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText(/⚡ Run All Agents/));
    await user.click(screen.getByText(/⚡ Run All Agents/));
    await waitFor(() => {
      expect(screen.getByText('Running All Agents...')).toBeInTheDocument();
    });
  });

  it('runs individual agent from card button', async () => {
    const user = userEvent.setup();
    let runAgentCalled = '';
    server.use(
      http.post(`${API_URL}/api/agents/run`, async ({ request }) => {
        const body = await request.json();
        runAgentCalled = body.agent;
        return HttpResponse.json({ success: true });
      }),
    );
    render(<AgentTracking />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Run Sales & Marketing Agent'));
    await user.click(screen.getByText('Run Sales & Marketing Agent'));
    await waitFor(() => expect(runAgentCalled).toBe('sales_team'));
  });

  it('shows error state for stats with retry', async () => {
    server.use(
      http.get(`${API_URL}/api/agents/stats`, () =>
        HttpResponse.json({ error: 'fail' }, { status: 500 }),
      ),
      http.get(`${API_URL}/api/agents/logs`, () => HttpResponse.json(mockLogs)),
    );
    render(<AgentTracking />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Failed to load agent stats')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('shows error state for logs with retry', async () => {
    server.use(
      http.get(`${API_URL}/api/agents/logs`, () =>
        HttpResponse.json({ error: 'fail' }, { status: 500 }),
      ),
    );
    render(<AgentTracking />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Failed to load activity')).toBeInTheDocument();
      expect(screen.getAllByText('Retry').length).toBeGreaterThan(0);
    });
  });

  it('shows empty logs state', async () => {
    server.use(
      http.get(`${API_URL}/api/agents/logs`, () => HttpResponse.json({ logs: [] })),
    );
    render(<AgentTracking />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText(/No activity yet/).length).toBeGreaterThan(0);
    });
  });

  it('filters logs by agent filter buttons', async () => {
    const user = userEvent.setup();
    render(<AgentTracking />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('🎯 Sales & Marketing'));
    await user.click(screen.getByText('🎯 Sales & Marketing'));
    await waitFor(() => {
      expect(screen.getByText('🎯 Sales & Marketing')).toHaveClass('bg-gray-900');
    });
  });

  it('renders activity timeline with log entries', async () => {
    render(<AgentTracking />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Processed 3 new leads')).toBeInTheDocument();
      expect(screen.getByText('Checked billing')).toBeInTheDocument();
    });
  });

  it('opens detail drawer when clicking a log entry', async () => {
    const user = userEvent.setup();
    render(<AgentTracking />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Processed 3 new leads'));
    await user.click(screen.getByText('Processed 3 new leads'));
    await waitFor(() => {
      expect(screen.getByText('Agent Run Details')).toBeInTheDocument();
      expect(screen.getByText('Summary')).toBeInTheDocument();
    });
  });

  it('shows action details in the drawer', async () => {
    const user = userEvent.setup();
    render(<AgentTracking />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Processed 3 new leads'));
    await user.click(screen.getByText('Processed 3 new leads'));
    await waitFor(() => {
      expect(screen.getByText('send_email')).toBeInTheDocument();
      expect(screen.getByText('3 actions decided, 1 executed')).toBeInTheDocument();
    });
  });

  it('shows error details in drawer for failed actions', async () => {
    const user = userEvent.setup();
    render(<AgentTracking />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Checked billing'));
    await user.click(screen.getByText('Checked billing'));
    await waitFor(() => {
      expect(screen.getByText('process_payment')).toBeInTheDocument();
      expect(screen.getByText('Card declined')).toBeInTheDocument();
    });
  });

  it('closes drawer when clicking close button', async () => {
    const user = userEvent.setup();
    render(<AgentTracking />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Processed 3 new leads'));
    await user.click(screen.getByText('Processed 3 new leads'));
    await waitFor(() => screen.getByText('Agent Run Details'));
    const closeButtons = document.body.querySelectorAll('[aria-label="Close drawer"]');
    await user.click(closeButtons[0]);
    await waitFor(() => {
      expect(screen.queryByText('Agent Run Details')).not.toBeInTheDocument();
    });
  });

  it('shows no activity text when agents array is empty', async () => {
    server.use(
      http.get(`${API_URL}/api/agents/stats`, () => HttpResponse.json({
        actionsToday: 0, totalActions: 0, pendingTasks: 0, agents: [],
      })),
      http.get(`${API_URL}/api/agents/logs`, () => HttpResponse.json({ logs: [] })),
    );
    render(<AgentTracking />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText(/No activity yet/).length).toBeGreaterThan(0);
    });
  });
});
