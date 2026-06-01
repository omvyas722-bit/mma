import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import Leads from './Leads';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';

afterEach(() => server.resetHandlers());
const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <BrowserRouter><QueryClientProvider client={queryClient}><NotificationProvider>{children}</NotificationProvider></QueryClientProvider></BrowserRouter>
  );
};

describe('Leads Page', () => {
  it('shows loading state initially', () => {
    render(<Leads />, { wrapper: createWrapper() });
    expect(screen.getAllByLabelText('Loading').length).toBeGreaterThan(0);
  });

  it('displays pipeline columns after loading', async () => {
    render(<Leads />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('New Leads')).toBeInTheDocument(); expect(screen.getByText('Contacted')).toBeInTheDocument(); expect(screen.getByText('Converted ✓')).toBeInTheDocument(); });
  });

  it('shows lead cards in columns', async () => {
    render(<Leads />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText(/Alice Johnson/)).toBeInTheDocument(); });
  });

  it('renders filter inputs', async () => {
    render(<Leads />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByLabelText('Search leads')).toBeInTheDocument(); expect(screen.getByLabelText('Filter by stage')).toBeInTheDocument(); });
  });

  it('shows add lead button', () => {
    render(<Leads />, { wrapper: createWrapper() });
    expect(screen.getByText('+ Add Lead')).toBeInTheDocument();
  });
});
