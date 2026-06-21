import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Spinner, { LoadingOverlay, PageLoader } from './Spinner';

describe('Spinner', () => {
  it('renders default spinner', () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toHaveClass('animate-spin');
  });

  it('renders different sizes', () => {
    const sizes = ['sm', 'md', 'lg', 'xl'];
    sizes.forEach(s => {
      const { unmount } = render(<Spinner size={s} />);
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
      unmount();
    });
  });

  it('renders with color prop', () => {
    const { container } = render(<Spinner color="green" />);
    expect(container.firstChild).toHaveClass('border-green-600');
  });
});

describe('LoadingOverlay', () => {
  it('renders with overlay', () => {
    render(<LoadingOverlay />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<LoadingOverlay message="Please wait..." />);
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('has spinner inside', () => {
    render(<LoadingOverlay />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });
});

describe('PageLoader', () => {
  it('renders spinner', () => {
    render(<PageLoader />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders loading text', () => {
    render(<PageLoader />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
