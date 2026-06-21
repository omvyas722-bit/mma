import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';
import MissionControl from './MissionControl';

vi.mock('../contexts/WebSocketContext', () => ({
  useWebSocket: () => ({}),
}));

const API_URL = 'http://localhost:3001';

const mockOverview = {
  daemon: { running: true, uptime: 3600, lastTick: new Date().toISOString(), ticksExecuted: 120, agentsRegistered: 10 },
  agents: [
    { agent_name: 'leads', enabled: true, lastError: null, lastErrorTime: null },
    { agent_name: 'trials', enabled: false, lastError: null, lastErrorTime: null },
    { agent_name: 'billing', enabled: true, lastError: 'API timeout', lastErrorTime: new Date(Date.now() - 300000).toISOString() },
  ],
  circuitBreakers: [
    { agent: 'billing', failures: 7, retryInMs: 30000 },
  ],
  pendingApprovals: 3,
  stats: { actionsToday: 42, pendingTasks: 5 },
};

const mockTokenUsage = {
  total: { total_tokens: 500000, prompt_tokens: 300000, completion_tokens: 200000, cost: 12.5 },
  byAgent: [
    { agent_name: 'leads', calls: 150, total_tokens: 200000, cost: 5.0 },
    { agent_name: 'billing', calls: 75, total_tokens: 100000, cost: 2.5 },
  ],
};

const mockHistory = [
  { id: 'h1', agent_name: 'leads', status: 'completed', summary: 'Checked for new leads', created_at: new Date().toISOString() },
  { id: 'h2', agent_name: 'billing', status: 'failed', summary: 'Payment API timeout', created_at: new Date(Date.now() - 60000).toISOString() },
];

const mockScheduledTasks = [
  { id: 't1', agent_name: 'leads', frequency: 'weekly', day_of_week: 1, time_of_day: '09:00', interval_hours: null, day_of_month: null, task_description: 'Check leads weekly', enabled: true },
  { id: 't2', agent_name: 'billing', frequency: 'daily', day_of_week: null, time_of_day: null, interval_hours: 6, day_of_month: null, task_description: 'Run billing check', enabled: false },
];

afterEach(() => server.resetHandlers());
beforeEach(() => {
  server.use(
    http.get(`${API_URL}/api/mission-control/overview`, () => HttpResponse.json(mockOverview)),
    http.get(`${API_URL}/api/agents/token-usage`, () => HttpResponse.json(mockTokenUsage)),
    http.get(`${API_URL}/api/ai/history`, ({ request }) => {
      const url = new URL(request.url);
      const filter = url.searchParams.get('agent');
      if (filter) return HttpResponse.json(mockHistory.filter(h => h.agent_name === filter));
      return HttpResponse.json(mockHistory);
    }),
    http.post(`${API_URL}/api/agents/run`, () => HttpResponse.json({ success: true })),
    http.post(`${API_URL}/api/ai/agents/:name/toggle`, () => HttpResponse.json({ success: true })),
    http.post(`${API_URL}/api/mission-control/reset-circuit-breakers`, () => HttpResponse.json({ success: true })),
    http.post(`${API_URL}/api/agents/nl-schedule`, () => HttpResponse.json({
      parsed: { frequency: 'weekly', day: 'Monday', time: '07:00', agentName: 'leads' },
    })),
    http.get(`${API_URL}/api/agents/scheduled-tasks`, () => HttpResponse.json({ tasks: mockScheduledTasks })),
    http.delete(`${API_URL}/api/agents/scheduled-tasks/:id`, () => new HttpResponse(null, { status: 204 })),
    http.put(`${API_URL}/api/agents/scheduled-tasks/:id/toggle`, () => HttpResponse.json({ success: true })),
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

describe('MissionControl', () => {
  it('shows loading skeletons for agent fleet and token usage', () => {
    render(<MissionControl />, { wrapper: createWrapper() });
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders daemon status bar after loading', async () => {
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/Daemon Running/)).toBeInTheDocument();
      expect(screen.getByText(/1h 0m/)).toBeInTheDocument();
      expect(screen.getByText(/120/)).toBeInTheDocument();
    });
  });

  it('shows Daemon Stopped status when not running', async () => {
    server.use(
      http.get(`${API_URL}/api/mission-control/overview`, () => HttpResponse.json({
        ...mockOverview, daemon: { running: false, uptime: 0, lastTick: null, ticksExecuted: 0, agentsRegistered: 0 }, stats: { actionsToday: 0, pendingTasks: 0 },
      })),
    );
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/Daemon Stopped/)).toBeInTheDocument();
    });
  });

  it('renders agent fleet cards with toggle and run buttons', async () => {
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('leads').length).toBeGreaterThan(0);
      expect(screen.getAllByText('trials').length).toBeGreaterThan(0);
      expect(screen.getAllByText('billing').length).toBeGreaterThan(0);
      const runButtons = screen.getAllByText('Run Now');
      expect(runButtons.length).toBe(3);
    });
  });

  it('shows error text on agent cards', async () => {
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/Error: API timeout/)).toBeInTheDocument();
    });
  });

  it('shows error state for overview with retry', async () => {
    server.use(
      http.get(`${API_URL}/api/mission-control/overview`, () =>
        HttpResponse.json({ error: 'fail' }, { status: 500 }),
      ),
    );
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Failed to load agents')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('shows empty circuit breakers message', async () => {
    server.use(
      http.get(`${API_URL}/api/mission-control/overview`, () => HttpResponse.json({
        ...mockOverview, circuitBreakers: [],
      })),
    );
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('All circuits closed')).toBeInTheDocument();
    });
  });

  it('shows open circuit breakers with failure count', async () => {
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('7 failures')).toBeInTheDocument();
    });
  });

  it('shows pending approvals count', async () => {
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('pending approvals')).toBeInTheDocument();
    });
  });

  it('renders Approval Queue link with count', async () => {
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => {
      const links = screen.getAllByText(/Approval Queue/);
      const link = links.find(el => el.closest('a'));
      expect(link).toBeTruthy();
      expect(link.closest('a')).toHaveAttribute('href', '/approval-queue');
    });
  });

  it('triggers run all agents', async () => {
    const user = userEvent.setup();
    let called = false;
    server.use(
      http.post(`${API_URL}/api/agents/run`, async () => {
        called = true;
        return HttpResponse.json({ success: true });
      }),
    );
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Run All Agents'));
    await user.click(screen.getByText('Run All Agents'));
    await waitFor(() => expect(called).toBe(true));
  });

  it('shows Running... state while running all agents', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API_URL}/api/agents/run`, async () => {
        await new Promise(r => setTimeout(r, 500));
        return HttpResponse.json({ success: true });
      }),
    );
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Run All Agents'));
    await user.click(screen.getByText('Run All Agents'));
    await waitFor(() => {
      expect(screen.getByText('Running...')).toBeInTheDocument();
    });
  });

  it('runs individual agent via Run Now on AgentCard', async () => {
    const user = userEvent.setup();
    let runAgent = '';
    server.use(
      http.post(`${API_URL}/api/agents/run`, async ({ request }) => {
        const body = await request.json();
        runAgent = body.agent;
        return HttpResponse.json({ success: true });
      }),
    );
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => screen.getAllByText('Run Now'));
    await user.click(screen.getAllByText('Run Now')[0]);
    await waitFor(() => expect(runAgent).toBe('leads'));
  });

  it('toggles agent enable/disable', async () => {
    const user = userEvent.setup();
    let toggled = '';
    server.use(
      http.post(`${API_URL}/api/ai/agents/:name/toggle`, async ({ params }) => {
        toggled = params.name;
        return HttpResponse.json({ success: true });
      }),
    );
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });
    await user.click(screen.getAllByRole('checkbox')[0]);
    await waitFor(() => expect(toggled).toBe('leads'));
  });

  it('resets circuit breakers', async () => {
    const user = userEvent.setup();
    let reset = false;
    server.use(
      http.post(`${API_URL}/api/mission-control/reset-circuit-breakers`, () => {
        reset = true;
        return HttpResponse.json({ success: true });
      }),
    );
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText(/Reset Circuit Breakers/));
    await user.click(screen.getByText(/Reset Circuit Breakers/));
    await waitFor(() => expect(reset).toBe(true));
  });

  it('disables reset circuit breakers when none open', async () => {
    server.use(
      http.get(`${API_URL}/api/mission-control/overview`, () => HttpResponse.json({
        ...mockOverview, circuitBreakers: [],
      })),
    );
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/Reset Circuit Breakers \(0 open\)/)).toBeDisabled();
    });
  });

  it('renders Natural Language Scheduler form', async () => {
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Natural Language Scheduler')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e\.g\. "Every Monday/)).toBeInTheDocument();
      expect(screen.getByText('Schedule')).toBeInTheDocument();
    });
  });

  it('submits NL scheduler form and shows result', async () => {
    const user = userEvent.setup();
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByPlaceholderText(/e\.g\. "Every Monday/));
    const input = screen.getByPlaceholderText(/e\.g\. "Every Monday/);
    await user.type(input, 'Every Monday at 7am send report');
    await user.click(screen.getByText('Schedule'));
    await waitFor(() => {
      const scheduleMsgs = screen.getAllByText('Schedule created!');
      expect(scheduleMsgs.length).toBeGreaterThan(0);
      const weeklyEls = screen.getAllByText(/weekly/);
      expect(weeklyEls.length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Monday/).length).toBeGreaterThan(0);
      expect(screen.getByText(/07:00/)).toBeInTheDocument();
    });
  });

  it('shows scheduled tasks list', async () => {
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Existing Scheduled Tasks')).toBeInTheDocument();
      expect(screen.getByText('Check leads weekly')).toBeInTheDocument();
      expect(screen.getByText('Run billing check')).toBeInTheDocument();
    });
  });

  it('toggles scheduled task on/off', async () => {
    const user = userEvent.setup();
    let toggledId = '';
    server.use(
      http.put(`${API_URL}/api/agents/scheduled-tasks/:id/toggle`, async ({ params }) => {
        toggledId = params.id;
        return HttpResponse.json({ success: true });
      }),
    );
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => screen.getAllByText('On'));
    await user.click(screen.getAllByText('On')[0]);
    await waitFor(() => expect(toggledId).toBe('t1'));
  });

  it('shows delete confirmation then deletes task', async () => {
    const user = userEvent.setup();
    let deletedId = '';
    server.use(
      http.delete(`${API_URL}/api/agents/scheduled-tasks/:id`, async ({ params }) => {
        deletedId = params.id;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => screen.getAllByText('Delete'));
    await user.click(screen.getAllByText('Delete')[0]);
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    await user.click(screen.getByText('Confirm'));
    await waitFor(() => expect(deletedId).toBe('t1'));
  });

  it('cancels task deletion', async () => {
    const user = userEvent.setup();
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => screen.getAllByText('Delete'));
    await user.click(screen.getAllByText('Delete')[0]);
    await user.click(screen.getByText('No'));
    await waitFor(() => {
      expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
    });
  });

  it('renders token usage panel with totals', async () => {
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Token Usage (30d)')).toBeInTheDocument();
      expect(screen.getByText((500000).toLocaleString())).toBeInTheDocument();
      expect(screen.getByText('$12.5000')).toBeInTheDocument();
    });
  });

  it('renders token usage by agent table', async () => {
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => {
      const leads = screen.getAllByText('leads');
      expect(leads.length).toBeGreaterThan(0);
      expect(screen.getByText('$5.0000')).toBeInTheDocument();
    });
  });

  it('shows empty token usage state', async () => {
    server.use(
      http.get(`${API_URL}/api/agents/token-usage`, () => HttpResponse.json(null)),
    );
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No token data')).toBeInTheDocument();
    });
  });

  it('renders activity timeline with history entries', async () => {
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Activity Timeline')).toBeInTheDocument();
      expect(screen.getByText('Checked for new leads')).toBeInTheDocument();
      expect(screen.getByText('Payment API timeout')).toBeInTheDocument();
    });
  });

  it('filters activity timeline by agent dropdown', async () => {
    const user = userEvent.setup();
    render(<MissionControl />, { wrapper: createWrapper() });
    await screen.findByText('Activity Timeline');
    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(options.length).toBeGreaterThan(1);
    });
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'billing');
    await waitFor(() => {
      expect(screen.getByText('Payment API timeout')).toBeInTheDocument();
    });
  });

  it('shows error state for history with retry', async () => {
    server.use(
      http.get(`${API_URL}/api/ai/history`, () =>
        HttpResponse.json({ error: 'fail' }, { status: 500 }),
      ),
    );
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Failed to load activity')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('shows empty history state', async () => {
    server.use(
      http.get(`${API_URL}/api/ai/history`, () => HttpResponse.json([])),
    );
    render(<MissionControl />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No activity recorded yet')).toBeInTheDocument();
    });
  });
});
