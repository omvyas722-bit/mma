import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AgentToggle from './AgentToggle';

const mockPost = vi.fn();

vi.mock('../../lib/api', () => ({
  default: {
    post: (...args) => mockPost(...args),
  },
}));

describe('AgentToggle Component', () => {
  // eslint-disable-next-line no-undef
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('renders agent name', () => {
    render(<AgentToggle agentName="leads" enabled={true} description="Monitors leads" />);
    expect(screen.getByText('leads')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<AgentToggle agentName="leads" enabled={true} description="Monitors new leads" />);
    expect(screen.getByText('Monitors new leads')).toBeInTheDocument();
  });

  it('shows toggle as checked when enabled', () => {
    render(<AgentToggle agentName="leads" enabled={true} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.checked).toBe(true);
  });

  it('shows toggle as unchecked when disabled', () => {
    render(<AgentToggle agentName="leads" enabled={false} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.checked).toBe(false);
  });

  it('calls API on toggle', async () => {
    mockPost.mockResolvedValue({ data: { agent_name: 'leads', enabled: true } });

    render(<AgentToggle agentName="leads" enabled={false} />);
    const checkbox = screen.getByRole('checkbox');

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/ai/agents/leads/toggle');
    });
  });

  it('shows agent icon based on name', () => {
    render(<AgentToggle agentName="leads" enabled={true} />);
    expect(screen.getByText('🎯')).toBeInTheDocument();
  });

  it('shows default robot icon for unknown agents', () => {
    render(<AgentToggle agentName="unknown_agent" enabled={true} />);
    expect(screen.getByText('🤖')).toBeInTheDocument();
  });

  it('disables toggle while updating', async () => {
    mockPost.mockImplementation(() => new Promise(() => {}));

    render(<AgentToggle agentName="leads" enabled={false} />);
    const checkbox = screen.getByRole('checkbox');

    fireEvent.click(checkbox);
    expect(checkbox.disabled).toBe(true);
  });

  it('handles API error gracefully', async () => {
    mockPost.mockRejectedValue(new Error('Network error'));

    render(<AgentToggle agentName="leads" enabled={false} />);
    const checkbox = screen.getByRole('checkbox');

    fireEvent.click(checkbox);
    await waitFor(() => { expect(mockPost).toHaveBeenCalled(); });
    expect(checkbox.disabled).toBe(false);
  });

  it('formats lastAction relative time', () => {
    const justNow = new Date().toISOString();
    const fiveMinsAgo = new Date(Date.now() - 300000).toISOString();
    const twoHoursAgo = new Date(Date.now() - 7200000).toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();

    const { rerender } = render(<AgentToggle agentName="leads" enabled={true} lastAction={justNow} />);
    expect(screen.getByText(/Just now/)).toBeInTheDocument();

    rerender(<AgentToggle agentName="leads" enabled={true} lastAction={fiveMinsAgo} />);
    expect(screen.getByText(/5m ago/)).toBeInTheDocument();

    rerender(<AgentToggle agentName="leads" enabled={true} lastAction={twoHoursAgo} />);
    expect(screen.getByText(/2h ago/)).toBeInTheDocument();

    rerender(<AgentToggle agentName="leads" enabled={true} lastAction={yesterday} />);
    expect(screen.getByText(/24h ago/)).toBeInTheDocument();
  });

  it('hides last action section when no lastAction', () => {
    render(<AgentToggle agentName="leads" enabled={true} />);
    expect(screen.queryByText(/Last action/)).not.toBeInTheDocument();
  });

  it('replaces underscores with spaces in agent name', () => {
    render(<AgentToggle agentName="belt_grading" enabled={true} />);
    expect(screen.getByText('belt grading')).toBeInTheDocument();
  });

  it('calls onChange with agent name and new state', async () => {
    const onChange = vi.fn();
    mockPost.mockResolvedValue({ data: { agent_name: 'leads', enabled: true } });

    render(<AgentToggle agentName="leads" enabled={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('leads', true);
    });
  });
});
