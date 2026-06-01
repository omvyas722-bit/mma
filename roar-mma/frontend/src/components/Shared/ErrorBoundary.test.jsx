import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ErrorBoundary, { PageErrorBoundary, ComponentErrorBoundary } from './ErrorBoundary';
import { useState } from 'react';

function ThrowError({ message = 'Test error' }) {
  throw new Error(message);
}

function SafeChild() {
  return <div>Safe content</div>;
}

function ConditionalThrower({ throwError }) {
  if (throwError) throw new Error('Oops');
  return <div>Safe content</div>;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ErrorBoundary Component', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <SafeChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('shows default fallback when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={({ error, resetError }) => (
        <div>
          <p>Custom error: {error.message}</p>
          <button type="button" onClick={resetError}>Retry</button>
        </div>
      )}>
        <ThrowError message="Oops!" />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom error: Oops!')).toBeInTheDocument();
  });

  it('resetError clears the error state', () => {
    let shouldThrow = true;
    function DynamicChild() {
      if (shouldThrow) throw new Error('Oops');
      return <div>Safe content</div>;
    }

    render(
      <ErrorBoundary fallback={({ resetError }) => (
        <div>
          <p>Error state</p>
          <button type="button" onClick={() => { shouldThrow = false; resetError(); }}>Try Again</button>
        </div>
      )}>
        <DynamicChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('Error state')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Try Again'));
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('calls onError prop when error occurs', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

describe('PageErrorBoundary Component', () => {
  it('renders children when no error', () => {
    render(
      <PageErrorBoundary pageName="Dashboard">
        <SafeChild />
      </PageErrorBoundary>
    );
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('shows page-specific error fallback', () => {
    render(
      <PageErrorBoundary pageName="Dashboard">
        <ThrowError />
      </PageErrorBoundary>
    );
    expect(screen.getByText('Error loading Dashboard')).toBeInTheDocument();
  });
});

describe('ComponentErrorBoundary Component', () => {
  it('renders children when no error', () => {
    render(
      <ComponentErrorBoundary componentName="MemberList">
        <SafeChild />
      </ComponentErrorBoundary>
    );
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('shows component-specific error fallback', () => {
    render(
      <ComponentErrorBoundary componentName="MemberList">
        <ThrowError />
      </ComponentErrorBoundary>
    );
    expect(screen.getByText('Error loading MemberList')).toBeInTheDocument();
  });
});
