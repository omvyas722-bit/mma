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

  it('calls API on toggle and updates state', async () => {
    mockPost.mockResolvedValue({ data: { agent_name: 'leads', enabled: true } });

    render(<AgentToggle agentName="leads" enabled={false} />);
    const checkbox = screen.getByRole('checkbox');

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/ai/agents/leads/toggle');
    });
    expect(checkbox.checked).toBe(true);
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
});
