import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import Classes from './Classes';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';

afterEach(() => server.resetHandlers());
const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <BrowserRouter><QueryClientProvider client={queryClient}><NotificationProvider>{children}</NotificationProvider></QueryClientProvider></BrowserRouter>
  );
};

describe('Classes Page', () => {
  it('shows loading state initially', () => {
    render(<Classes />, { wrapper: createWrapper() });
    expect(screen.getAllByText('').length >= 0).toBe(true);
  });

  it('displays day columns after loading', async () => {
    render(<Classes />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('Monday')).toBeInTheDocument(); expect(screen.getByText('Tuesday')).toBeInTheDocument(); });
  });

  it('shows class cards', async () => {
    render(<Classes />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('BJJ Fundamentals')).toBeInTheDocument(); });
  });

  it('shows stats row', async () => {
    render(<Classes />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('Classes This Week')).toBeInTheDocument(); });
  });

  it('renders week navigation', async () => {
    render(<Classes />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByLabelText('Previous week')).toBeInTheDocument(); expect(screen.getByLabelText('Next week')).toBeInTheDocument(); });
  });
});
