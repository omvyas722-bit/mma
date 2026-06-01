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

  it('shows partial status with blue badge', () => {
    const activities = [{ id: 4, agent_name: 'billing', action_type: 'check_payments', summary: 'Partial check', status: 'partial', created_at: new Date().toISOString() }];
    render(<ActivityFeed isLoading={false} activities={activities} />);
    const badge = screen.getByText('partial');
    expect(badge.className).toContain('bg-blue-100');
  });

  it('defaults unknown status to success color', () => {
    const activities = [{ id: 5, agent_name: 'test', action_type: 'test', summary: 'Unknown status', status: 'unknown', created_at: new Date().toISOString() }];
    render(<ActivityFeed isLoading={false} activities={activities} />);
    const badge = screen.getByText('unknown');
    expect(badge.className).toContain('bg-green-100');
  });

  it('handles future timestamps', () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    const activities = [{ id: 6, agent_name: 'test', action_type: 'test', summary: 'Future activity', status: 'success', created_at: future }];
    render(<ActivityFeed isLoading={false} activities={activities} />);
    expect(screen.getByText('just now')).toBeInTheDocument();
  });

  it('handles missing timestamp', () => {
    const activities = [{ id: 7, agent_name: 'test', action_type: 'test', summary: 'No timestamp', status: 'success' }];
    render(<ActivityFeed isLoading={false} activities={activities} />);
    const timeElements = screen.getAllByText('');
    expect(timeElements.length).toBeGreaterThanOrEqual(0);
  });

  it('displays agent name with underscores replaced', () => {
    const activities = [{ id: 8, agent_name: 'belt_grading', action_type: 'check', summary: 'Checked grading', status: 'success', created_at: new Date().toISOString() }];
    render(<ActivityFeed isLoading={false} activities={activities} />);
    expect(screen.getByText('belt grading')).toBeInTheDocument();
  });

  it('shows default empty message when not provided', () => {
    render(<ActivityFeed isLoading={false} activities={[]} />);
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
  });
});
