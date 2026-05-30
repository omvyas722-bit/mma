import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ActivityFeed from './ActivityFeed';

const sampleActivities = [
  { id: 1, agent_name: 'leads', action_type: 'check_leads', summary: 'Checked for new leads', status: 'success', created_at: new Date().toISOString() },
  { id: 2, agent_name: 'tasks', action_type: 'check_tasks', summary: 'Created follow-up task', status: 'warning', created_at: new Date(Date.now() - 60000).toISOString() },
  { id: 3, agent_name: 'billing', action_type: 'check_payments', summary: 'Payment check failed', status: 'error', created_at: new Date(Date.now() - 120000).toISOString() },
];

describe('ActivityFeed Component', () => {
  it('shows loading spinner when isLoading', () => {
    const { container } = render(<ActivityFeed isLoading={true} activities={[]} />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('shows empty message when no activities', () => {
    render(<ActivityFeed isLoading={false} activities={[]} emptyMessage="No activity yet" />);
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
  });

  it('shows custom empty message', () => {
    render(<ActivityFeed isLoading={false} activities={null} emptyMessage="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders activities with summaries', () => {
    render(<ActivityFeed isLoading={false} activities={sampleActivities} />);
    expect(screen.getByText('Checked for new leads')).toBeInTheDocument();
    expect(screen.getByText('Created follow-up task')).toBeInTheDocument();
    expect(screen.getByText('Payment check failed')).toBeInTheDocument();
  });

  it('renders agent badges', () => {
    render(<ActivityFeed isLoading={false} activities={sampleActivities} />);
    expect(screen.getByText('leads')).toBeInTheDocument();
    expect(screen.getByText('tasks')).toBeInTheDocument();
    expect(screen.getByText('billing')).toBeInTheDocument();
  });

  it('shows status badges with correct colors', () => {
    render(<ActivityFeed isLoading={false} activities={sampleActivities} />);
    const statuses = screen.getAllByText(/success|warning|error/);
    expect(statuses).toHaveLength(3);
    expect(statuses[0].className).toContain('bg-green-100');
    expect(statuses[1].className).toContain('bg-yellow-100');
    expect(statuses[2].className).toContain('bg-red-100');
  });
});
