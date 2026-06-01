import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import Communications from './Communications';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';

afterEach(() => server.resetHandlers());
const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <BrowserRouter><QueryClientProvider client={queryClient}><NotificationProvider>{children}</NotificationProvider></QueryClientProvider></BrowserRouter>
  );
};

describe('Communications Page', () => {
  it('renders header and compose button', () => {
    render(<Communications />, { wrapper: createWrapper() });
    expect(screen.getByText('Communications')).toBeInTheDocument();
    expect(screen.getByText('+ Compose Message')).toBeInTheDocument();
  });

  it('shows tab navigation', () => {
    render(<Communications />, { wrapper: createWrapper() });
    expect(screen.getByText('history')).toBeInTheDocument();
    expect(screen.getByText('templates')).toBeInTheDocument();
    expect(screen.getByText('scheduled')).toBeInTheDocument();
  });

  it('displays message history after loading', async () => {
    render(<Communications />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('Welcome')).toBeInTheDocument(); });
  });

  it('switches to templates tab', async () => {
    render(<Communications />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('Welcome')).toBeInTheDocument(); });
    screen.getByText('templates').click();
    await waitFor(() => { expect(screen.getByText('Welcome Email')).toBeInTheDocument(); });
  });

  it('switches to approval tab', async () => {
    render(<Communications />, { wrapper: createWrapper() });
    screen.getByText('Pending Approval').click();
    await waitFor(() => { expect(screen.getByText(/HERMES follow-up/)).toBeInTheDocument(); });
  });
});
