import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Skeleton, { TextSkeleton, CardSkeleton, TableSkeleton, ListSkeleton, FormSkeleton } from './LoadingSkeleton';

describe('Skeleton', () => {
  it('renders base skeleton', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('renders with width and height', () => {
    const { container } = render(<Skeleton width="200px" height="40px" />);
    expect(container.firstChild).toHaveStyle({ width: '200px', height: '40px' });
  });

  it('renders circular variant', () => {
    const { container } = render(<Skeleton variant="circular" />);
    expect(container.firstChild).toHaveClass('rounded-full');
  });

  it('renders rectangular variant', () => {
    const { container } = render(<Skeleton variant="rectangular" />);
    expect(container.firstChild).toHaveClass('rounded');
  });
});

describe('TextSkeleton', () => {
  it('renders one line by default', () => {
    const { container } = render(<TextSkeleton />);
    expect(container.firstChild.children.length).toBe(1);
  });

  it('renders specified number of lines', () => {
    const { container } = render(<TextSkeleton lines={3} />);
    expect(container.firstChild.children.length).toBe(3);
  });
});

describe('CardSkeleton', () => {
  it('renders card layout', () => {
    const { container } = render(<CardSkeleton />);
    expect(container.firstChild).toHaveClass('bg-white');
  });
});

describe('TableSkeleton', () => {
  it('renders with default rows', () => {
    const { container } = render(<TableSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with specified rows', () => {
    const { container } = render(<TableSkeleton rows={3} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('ListSkeleton', () => {
  it('renders with default items', () => {
    const { container } = render(<ListSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with specified count', () => {
    const { container } = render(<ListSkeleton items={3} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('FormSkeleton', () => {
  it('renders form fields', () => {
    const { container } = render(<FormSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
