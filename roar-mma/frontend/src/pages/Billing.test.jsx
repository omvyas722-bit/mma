import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import Billing from './Billing';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';

afterEach(() => server.resetHandlers());
const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <BrowserRouter><QueryClientProvider client={queryClient}><NotificationProvider>{children}</NotificationProvider></QueryClientProvider></BrowserRouter>
  );
};

describe('Billing Page', () => {
  it('shows loading state initially', () => {
    render(<Billing />, { wrapper: createWrapper() });
    expect(screen.getByText('Billing')).toBeInTheDocument();
  });

  it('displays transaction table after loading', async () => {
    render(<Billing />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('John Doe')).toBeInTheDocument(); expect(screen.getByText('Jane Smith')).toBeInTheDocument(); });
  });

  it('shows stats cards', async () => {
    render(<Billing />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('MRR')).toBeInTheDocument(); expect(screen.getByText('Today')).toBeInTheDocument(); });
  });

  it('shows filter inputs', async () => {
    render(<Billing />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByLabelText('Search transactions')).toBeInTheDocument(); });
  });

  it('shows record payment button', () => {
    render(<Billing />, { wrapper: createWrapper() });
    expect(screen.getByText('+ Record Payment')).toBeInTheDocument();
  });
});
