import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import Members from './Members';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';

afterEach(() => server.resetHandlers());
const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <BrowserRouter><QueryClientProvider client={queryClient}><NotificationProvider>{children}</NotificationProvider></QueryClientProvider></BrowserRouter>
  );
};

describe('Members Page', () => {
  it('shows loading state initially', () => {
    render(<Members />, { wrapper: createWrapper() });
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('displays member table after loading', async () => {
    render(<Members />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('John Doe')).toBeInTheDocument(); expect(screen.getByText('Jane Smith')).toBeInTheDocument(); });
  });

  it('shows member status badges', async () => {
    render(<Members />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('active')).toBeInTheDocument(); expect(screen.getByText('trial')).toBeInTheDocument(); });
  });

  it('renders filter inputs', async () => {
    render(<Members />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByLabelText('Search members')).toBeInTheDocument(); });
  });

  it('shows export button', async () => {
    render(<Members />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('Export')).toBeInTheDocument(); });
  });
});
