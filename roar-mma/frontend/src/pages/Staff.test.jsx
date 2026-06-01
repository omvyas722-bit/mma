import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import Staff from './Staff';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: () => true, user: { name: 'Test', role: 'owner' } }),
}));

afterEach(() => server.resetHandlers());
const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <BrowserRouter><QueryClientProvider client={queryClient}><NotificationProvider>{children}</NotificationProvider></QueryClientProvider></BrowserRouter>
  );
};

describe('Staff Page', () => {
  it('shows loading state initially', () => {
    render(<Staff />, { wrapper: createWrapper() });
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('displays staff table after loading', async () => {
    render(<Staff />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('Kane Mousah')).toBeInTheDocument(); expect(screen.getByText('Sarah Connor')).toBeInTheDocument(); });
  });

  it('shows role badges', async () => {
    render(<Staff />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('COACH')).toBeInTheDocument(); });
  });

  it('shows stats cards', async () => {
    render(<Staff />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('Total')).toBeInTheDocument(); });
  });

  it('renders filter input', async () => {
    render(<Staff />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByLabelText('Filter by role')).toBeInTheDocument(); });
  });
});
