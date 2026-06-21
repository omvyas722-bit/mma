import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No data" />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<EmptyState description="Nothing to show" />);
    expect(screen.getByText('Nothing to show')).toBeInTheDocument();
  });

  it('renders action button when action callback provided', () => {
    render(<EmptyState title="Empty" action={vi.fn()} actionLabel="Add item" />);
    expect(screen.getByText('Add item')).toBeInTheDocument();
  });

  it('calls action handler on click', () => {
    const onAction = vi.fn();
    render(<EmptyState title="Empty" action={onAction} actionLabel="Go" />);
    fireEvent.click(screen.getByText('Go'));
    expect(onAction).toHaveBeenCalled();
  });

  it('renders default icon', () => {
    const { container } = render(<EmptyState title="Empty" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders custom icon', () => {
    render(<EmptyState title="Empty" icon={<span data-testid="custom-icon">*</span>} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('shows default action label', () => {
    render(<EmptyState title="Empty" action={vi.fn()} />);
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });
});
