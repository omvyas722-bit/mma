import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PageWrapper from './PageWrapper';

vi.mock('./Shared/ErrorBoundary', () => ({
  PageErrorBoundary: ({ children, pageName }) => <div data-testid="error-boundary" data-page={pageName}>{children}</div>,
}));

describe('PageWrapper', () => {
  beforeEach(() => {
    document.title = '';
  });

  it('renders children', () => {
    render(<PageWrapper><div data-testid="child">Content</div></PageWrapper>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('sets document.title with title prop', () => {
    render(<PageWrapper title="Dashboard"><div>Content</div></PageWrapper>);
    expect(document.title).toContain('Dashboard');
  });

  it('sets document.title with title and site name', () => {
    render(<PageWrapper title="Members"><div>Content</div></PageWrapper>);
    expect(document.title).toBe('Members | Mixed Martial Arts');
  });

  it('renders without title', () => {
    render(<PageWrapper><div>Content</div></PageWrapper>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('updates document.title when title changes', () => {
    const { rerender } = render(<PageWrapper title="Dashboard"><div>Content</div></PageWrapper>);
    expect(document.title).toBe('Dashboard | Mixed Martial Arts');
    rerender(<PageWrapper title="Settings"><div>Content</div></PageWrapper>);
    expect(document.title).toBe('Settings | Mixed Martial Arts');
  });

  it('wraps children in error boundary', () => {
    render(<PageWrapper title="Test"><div>Content</div></PageWrapper>);
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
  });

  it('passes pageName to error boundary', () => {
    render(<PageWrapper title="Reports"><div>Content</div></PageWrapper>);
    expect(screen.getByTestId('error-boundary')).toHaveAttribute('data-page', 'Reports');
  });

  it('passes "Page" as pageName when no title', () => {
    render(<PageWrapper><div>Content</div></PageWrapper>);
    expect(screen.getByTestId('error-boundary')).toHaveAttribute('data-page', 'Page');
  });
});
