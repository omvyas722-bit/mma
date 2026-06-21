import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AgentWatcher from './AgentWatcher';

const addStepListenerMock = vi.fn();
const getRecentStepsMock = vi.fn(() => []);

vi.mock('../contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    addStepListener: addStepListenerMock,
    getRecentSteps: getRecentStepsMock,
  }),
}));

function makeStep(overrides = {}) {
  return {
    agent: 'zeus',
    step: 'starting',
    detail: 'Beginning orchestration',
    timestamp: Date.now(),
    ...overrides,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

function setupListener() {
  let listener;
  addStepListenerMock.mockImplementation(fn => {
    listener = fn;
    return () => {};
  });
  render(<AgentWatcher />);
  return listener;
}

describe('AgentWatcher', () => {
  it('shows waiting message when no steps received', () => {
    render(<AgentWatcher />);
    expect(screen.getByText('Waiting for agent steps...')).toBeInTheDocument();
  });

  it('shows "No steps match this filter" when filtered but no match', () => {
    render(<AgentWatcher />);
    expect(screen.getByText('Waiting for agent steps...')).toBeInTheDocument();
  });

  it('displays step details when a step arrives', async () => {
    const listener = setupListener();
    listener(makeStep());
    await waitFor(() => {
      expect(screen.getByText(/Beginning orchestration/)).toBeInTheDocument();
    });
    expect(screen.getAllByText('Zeus (Orchestrator)').length).toBeGreaterThan(0);
    expect(screen.getByText('starting')).toBeInTheDocument();
  });

  it('renders step icon based on step type', async () => {
    const listener = setupListener();

    listener(makeStep({ step: 'starting' }));
    await waitFor(() => {
      expect(screen.getByText('▶️')).toBeInTheDocument();
    });

    listener(makeStep({ step: 'complete', agent: 'scout' }));
    await waitFor(() => {
      expect(screen.getAllByText('✅').length).toBeGreaterThan(0);
    });

    listener(makeStep({ step: 'error', agent: 'healer' }));
    await waitFor(() => {
      expect(screen.getAllByText('❌').length).toBeGreaterThan(0);
    });

    listener(makeStep({ step: 'llm', agent: 'pixel' }));
    await waitFor(() => {
      expect(screen.getAllByText('🤖').length).toBeGreaterThan(0);
    });

    listener(makeStep({ step: 'actions', agent: 'leads' }));
    await waitFor(() => {
      expect(screen.getAllByText('⚡').length).toBeGreaterThan(0);
    });
  });

  it('limits steps to 300', async () => {
    const listener = setupListener();
    for (let i = 0; i < 350; i++) {
      listener(makeStep({ agent: 'zeus', step: 'llm', detail: `Step ${i}`, timestamp: Date.now() + i }));
    }
    await waitFor(() => {
      const displayed = screen.getAllByText(/^Step \d+$/);
      expect(displayed.length).toBeLessThanOrEqual(300);
    });
  });

  it('updates active agent indicator on starting steps', async () => {
    const listener = setupListener();
    listener(makeStep({ agent: 'scout', step: 'starting' }));
    await waitFor(() => {
      expect(screen.getByText(/Scout.*running/)).toBeInTheDocument();
    });
  });

  it('clears active agent on complete step', async () => {
    const listener = setupListener();
    listener(makeStep({ agent: 'scout', step: 'starting' }));
    await waitFor(() => {
      expect(screen.getByText(/Scout.*running/)).toBeInTheDocument();
    });
    listener(makeStep({ agent: 'scout', step: 'complete' }));
    await waitFor(() => {
      expect(screen.queryByText(/Scout.*running/)).not.toBeInTheDocument();
    });
  });

  it('clears active agent on error step', async () => {
    const listener = setupListener();
    listener(makeStep({ agent: 'scout', step: 'starting' }));
    await waitFor(() => {
      expect(screen.getByText(/Scout.*running/)).toBeInTheDocument();
    });
    listener(makeStep({ agent: 'scout', step: 'error' }));
    await waitFor(() => {
      expect(screen.queryByText(/Scout.*running/)).not.toBeInTheDocument();
    });
  });

  it('pauses and resumes via button', async () => {
    const user = userEvent.setup();
    const listener = setupListener();
    listener(makeStep({ agent: 'zeus', step: 'starting', detail: 'first' }));
    await user.click(screen.getByText('⏸ Pause'));
    await waitFor(() => {
      expect(screen.getByText('▶ Resume')).toBeInTheDocument();
      expect(screen.getByText(/(PAUSED)/)).toBeInTheDocument();
    });
    listener(makeStep({ agent: 'zeus', step: 'llm', detail: 'paused step' }));
    expect(screen.queryByText('paused step')).not.toBeInTheDocument();
    await user.click(screen.getByText('▶ Resume'));
    await waitFor(() => {
      expect(screen.getByText('⏸ Pause')).toBeInTheDocument();
    });
  });

  it('clears all steps on Clear button', async () => {
    const user = userEvent.setup();
    const listener = setupListener();
    listener(makeStep({ agent: 'zeus', step: 'starting', detail: 'to clear' }));
    await waitFor(() => {
      expect(screen.getByText('to clear')).toBeInTheDocument();
    });
    await user.click(screen.getByText('🗑 Clear'));
    await waitFor(() => {
      expect(screen.getByText('Waiting for agent steps...')).toBeInTheDocument();
    });
  });

  it('filters steps by agent dropdown', async () => {
    const user = userEvent.setup();
    const listener = setupListener();
    listener(makeStep({ agent: 'zeus', step: 'llm', detail: 'zeus action' }));
    listener(makeStep({ agent: 'scout', step: 'llm', detail: 'scout action' }));
    await waitFor(() => {
      expect(screen.getByText('zeus action')).toBeInTheDocument();
      expect(screen.getByText('scout action')).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByRole('combobox'), 'scout');
    await waitFor(() => {
      expect(screen.getByText('scout action')).toBeInTheDocument();
      expect(screen.queryByText('zeus action')).not.toBeInTheDocument();
    });
  });

  it('shows filtered steps count in footer', async () => {
    const listener = setupListener();
    listener(makeStep({ agent: 'zeus', step: 'llm', detail: 'count me' }));
    listener(makeStep({ agent: 'scout', step: 'llm', detail: 'count me 2' }));
    await waitFor(() => {
      expect(screen.getByText(/2 steps displayed/)).toBeInTheDocument();
    });
  });

  it('shows buffered steps count when paused', async () => {
    const user = userEvent.setup();
    let latestListener;
    addStepListenerMock.mockImplementation(fn => {
      latestListener = fn;
      return () => {};
    });
    render(<AgentWatcher />);
    latestListener(makeStep({ agent: 'zeus', step: 'starting' }));
    await user.click(screen.getByText('⏸ Pause'));
    await waitFor(() => {
      expect(screen.getByText(/(PAUSED)/)).toBeInTheDocument();
    });
    latestListener(makeStep({ agent: 'scout', step: 'llm', detail: 'buffered' }));
    await waitFor(() => {
      expect(screen.getByText(/1 buffered/)).toBeInTheDocument();
    });
  });

  it("shows '● Live' indicator when not paused", () => {
    render(<AgentWatcher />);
    expect(screen.getByText('● Live')).toBeInTheDocument();
  });

  it('shows timestamp next to each step', async () => {
    const listener = setupListener();
    const now = Date.now();
    listener(makeStep({ agent: 'zeus', step: 'starting', detail: 'timed', timestamp: now }));
    await waitFor(() => {
      expect(screen.getByText(/AM|PM/)).toBeInTheDocument();
    });
  });

  it('highlights current step row with background', async () => {
    let listener;
    addStepListenerMock.mockImplementation(fn => {
      listener = fn;
      return () => {};
    });
    const { container } = render(<AgentWatcher />);
    listener(makeStep({ agent: 'zeus', step: 'starting', detail: 'activate' }));
    await waitFor(() => {
      expect(screen.getByText(/Zeus.*running/)).toBeInTheDocument();
    });
    listener(makeStep({ agent: 'zeus', step: 'llm', detail: 'current step' }));
    await waitFor(() => {
      const rows = container.querySelectorAll('.bg-white\\/5');
      expect(rows.length).toBeGreaterThan(0);
    });
  });
});
