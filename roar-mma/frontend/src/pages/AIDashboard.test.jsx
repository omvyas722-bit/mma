import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AIDashboard from './AIDashboard';

vi.mock('../contexts/NotificationContext', () => ({
  useNotifications: () => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }),
}));

const mockGet = vi.fn();
const mockPost = vi.fn(() => Promise.resolve({ data: { enabled: true } }));

vi.mock('../lib/api', () => ({
  default: {
    get: (...args) => mockGet(...args),
    post: (...args) => mockPost(...args),
    put: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

const mockStatusData = {
  running: true,
  uptime: 3600,
  lastTick: '2025-01-01T00:00:00.000Z',
  actionsToday: 42,
  dailyApiCalls: 15,
  dailyApiLimit: 50,
  agentsRegistered: 10,
};

const mockAgentsData = [
  { agent_name: 'leads', enabled: true, description: 'Monitors leads' },
  { agent_name: 'tasks', enabled: false, description: 'Creates tasks' },
  { agent_name: 'billing', enabled: true, description: 'Tracks billing' },
];

const mockHistoryData = [
  { id: 1, agent_name: 'leads', action_type: 'check_leads', summary: 'Checked leads', status: 'success', created_at: '2025-01-01T00:00:00.000Z' },
  { id: 2, agent_name: 'billing', action_type: 'check_payments', summary: 'Billing check', status: 'warning', created_at: '2025-01-01T00:01:00.000Z' },
];

const mockTokenData = {
  total: { total_tokens: 150000, prompt_tokens: 80000, completion_tokens: 70000, cost: 0.0450 },
  byAgent: [
    { agent_name: 'leads', total_tokens: 100000, cost: 0.03, calls: 50 },
    { agent_name: 'billing', total_tokens: 50000, cost: 0.015, calls: 25 },
  ],
  daily: [
    { date: '2025-01-01', tokens: 5000, cost: 0.0015 },
    { date: '2025-01-02', tokens: 3000, cost: 0.0009 },
  ],
};

const mockConfigData = [
  { id: 1, agent_name: 'leads', interval_ms: 60000, model_override: '', token_budget: 100000, token_used: 5000 },
];

const defaultImpl = (url) => {
  if (url === '/api/ai/status') return Promise.resolve({ data: mockStatusData });
  if (url === '/api/ai/agents') return Promise.resolve({ data: mockAgentsData });
  if (url === '/api/ai/history') return Promise.resolve({ data: mockHistoryData });
  if (url === '/api/agents/token-usage?days=30') return Promise.resolve({ data: mockTokenData });
  if (url === '/api/agents/token-usage?days=90') return Promise.resolve({ data: { daily: [] } });
  if (url === '/api/agents/config') return Promise.resolve({ data: { configs: mockConfigData } });
  return Promise.reject(new Error('Unknown URL'));
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </BrowserRouter>
  );
};

describe('AIDashboard Page', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockGet.mockImplementation(defaultImpl);
    mockPost.mockResolvedValue({ data: { enabled: true } });
  });

  it('renders the page title', () => {
    render(<AIDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('AI Dashboard')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<AIDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Monitor AI system status and activity')).toBeInTheDocument();
  });

  it('shows status cards after loading', async () => {
    render(<AIDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Running')).toBeInTheDocument();
    });
    expect(screen.getByText('AI Status')).toBeInTheDocument();
  });

  it('shows uptime formatted as hours and minutes', async () => {
    render(<AIDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('1h 0m')).toBeInTheDocument();
    });
  });

  it('formats uptime over 24 hours as Xd Yh', async () => {
    mockGet.mockImplementation((url) => {
      if (url === '/api/ai/status') return Promise.resolve({ data: { ...mockStatusData, uptime: 90000 } });
      return defaultImpl(url);
    });
    render(<AIDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('1d 1h 0m')).toBeInTheDocument();
    });
  });

  it('shows actions today', async () => {
    render(<AIDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  it('shows daily API usage', async () => {
    render(<AIDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('15/50')).toBeInTheDocument();
    });
  });

  it('renders agent controls', async () => {
    render(<AIDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      const leads = screen.getAllByText('leads');
      expect(leads.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Agent Controls')).toBeInTheDocument();
    });
  });

  it('shows agent descriptions', async () => {
    render(<AIDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Monitors leads')).toBeInTheDocument();
      expect(screen.getByText('Creates tasks')).toBeInTheDocument();
    });
  });

  it('renders activity log section', async () => {
    render(<AIDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Activity Log')).toBeInTheDocument();
    });
  });

  it('renders activity entries', async () => {
    render(<AIDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Checked leads')).toBeInTheDocument();
      expect(screen.getByText('Billing check')).toBeInTheDocument();
    });
  });

  it('has agent filter dropdown', async () => {
    render(<AIDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('All Agents')).toBeInTheDocument();
    });
  });

  it('shows green status indicator when running', async () => {
    render(<AIDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      const indicators = document.querySelectorAll('.bg-green-500');
      expect(indicators.length).toBeGreaterThan(0);
    });
  });

  it('calls POST /api/ai/agents/:name/toggle when agent toggle clicked', async () => {
    render(<AIDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Monitors leads')).toBeInTheDocument();
    });
    const toggles = document.querySelectorAll('input[type="checkbox"]');
    expect(toggles.length).toBe(3);
    fireEvent.click(toggles[0]);
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/ai/agents/leads/toggle');
    });
  });

  it('shows enabled/disabled agent states correctly', async () => {
    render(<AIDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      const toggles = document.querySelectorAll('input[type="checkbox"]');
      expect(toggles[0].checked).toBe(true);
      expect(toggles[1].checked).toBe(false);
      expect(toggles[2].checked).toBe(true);
    });
  });

  it('shows empty activity feed when no history', async () => {
    mockGet.mockImplementation((url) => {
      if (url === '/api/ai/history') return Promise.resolve({ data: [] });
      return defaultImpl(url);
    });
    render(<AIDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No AI activity recorded yet')).toBeInTheDocument();
    });
  });

  it('renders activity filter dropdown with agent names', async () => {
    render(<AIDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('leads').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('billing').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows token usage tab', async () => {
    render(<AIDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Token Usage')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Token Usage'));
    await waitFor(() => {
      expect(screen.getByText('Token Usage Summary')).toBeInTheDocument();
    });
  });

  it('shows per-agent breakdown in token tab', async () => {
    render(<AIDashboard />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Token Usage'));
    await waitFor(() => {
      expect(screen.getByText('Per-Agent Breakdown')).toBeInTheDocument();
    });
  });

  it('shows empty token usage state', async () => {
    mockGet.mockImplementation((url) => {
      if (url.startsWith('/api/agents/token-usage')) return Promise.resolve({ data: null });
      return defaultImpl(url);
    });
    render(<AIDashboard />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Token Usage'));
    await waitFor(() => {
      expect(screen.getByText('No token data')).toBeInTheDocument();
    });
  });

  it('shows error state for status cards', async () => {
    mockGet.mockImplementation((url) => {
      if (url === '/api/ai/status') return Promise.reject(new Error('Failed'));
      return defaultImpl(url);
    });
    render(<AIDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Failed to load AI status')).toBeInTheDocument();
    });
  });

  it('shows retry button on status error', async () => {
    mockGet.mockImplementation((url) => {
      if (url === '/api/ai/status') return Promise.reject(new Error('Failed'));
      return defaultImpl(url);
    });
    render(<AIDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('shows self-improvement tab', async () => {
    render(<AIDashboard />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Self-Improvement'));
    await waitFor(() => {
      expect(screen.getByText('HEALER Self-Improvement Proposals')).toBeInTheDocument();
    });
  });

  it('shows link to mission control', () => {
    render(<AIDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Switch to Mission Control →')).toBeInTheDocument();
  });

  it('shows tab navigation', () => {
    render(<AIDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Self-Improvement')).toBeInTheDocument();
    expect(screen.getByText('Token Usage')).toBeInTheDocument();
  });
});
