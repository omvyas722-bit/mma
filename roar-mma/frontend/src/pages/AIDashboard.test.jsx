import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AIDashboard from './AIDashboard';

vi.mock('../contexts/NotificationContext', () => ({
  useNotifications: () => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }),
}));

const mockGet = vi.fn();

vi.mock('../lib/api', () => ({
  default: {
    get: (...args) => mockGet(...args),
    post: () => Promise.resolve({ data: {} }),
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

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
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
    mockGet.mockImplementation((url) => {
      if (url === '/api/ai/status') return Promise.resolve({ data: mockStatusData });
      if (url === '/api/ai/agents') return Promise.resolve({ data: mockAgentsData });
      if (url === '/api/ai/history') return Promise.resolve({ data: mockHistoryData });
      return Promise.reject(new Error('Unknown URL'));
    });
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

  it('shows uptime formatted', async () => {
    render(<AIDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('1h 0m')).toBeInTheDocument();
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
});
