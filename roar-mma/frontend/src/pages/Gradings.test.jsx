import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import Gradings from './Gradings';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';

afterEach(() => server.resetHandlers());
const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <BrowserRouter><QueryClientProvider client={queryClient}><NotificationProvider>{children}</NotificationProvider></QueryClientProvider></BrowserRouter>
  );
};

describe('Gradings Page', () => {
  it('renders header and schedule button', () => {
    render(<Gradings />, { wrapper: createWrapper() });
    expect(screen.getByText('Belt Gradings')).toBeInTheDocument();
    expect(screen.getByText('+ Schedule Grading')).toBeInTheDocument();
  });

  it('shows loading spinner initially', () => {
    render(<Gradings />, { wrapper: createWrapper() });
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('displays grading sessions after loading', async () => {
    render(<Gradings />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('June Grading')).toBeInTheDocument(); });
  });

  it('renders status filter', async () => {
    render(<Gradings />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('All Sessions')).toBeInTheDocument(); });
  });
});
