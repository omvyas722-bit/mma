import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatsCard from './StatsCard';

describe('StatsCard Component', () => {
  it('renders title and value', () => {
    render(<StatsCard title="Active Members" value={156} />);
    expect(screen.getByText('Active Members')).toBeInTheDocument();
    expect(screen.getByText('156')).toBeInTheDocument();
  });

  it('shows positive change with green up arrow', () => {
    render(<StatsCard title="Revenue" value={45000} change={12.3} />);
    const change = screen.getByText(/↑/);
    expect(change).toBeInTheDocument();
    expect(change).toHaveClass('text-green-600');
  });

  it('shows negative change with red down arrow', () => {
    render(<StatsCard title="Bookings" value={24} change={-2.1} />);
    const change = screen.getByText(/↓/);
    expect(change).toBeInTheDocument();
    expect(change).toHaveClass('text-red-600');
  });

  it('shows no change indicator when change is omitted', () => {
    render(<StatsCard title="Members" value={100} />);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const Icon = () => <svg data-testid="test-icon" />;
    render(<StatsCard title="Test" value={1} icon={<Icon />} />);
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<StatsCard title="Test" value={1} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('respects trend prop over change sign', () => {
    render(<StatsCard title="Test" value={1} change={-5} trend="up" />);
    expect(screen.getByText(/↑/)).toBeInTheDocument();
  });
});
