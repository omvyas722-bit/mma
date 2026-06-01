import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import POS from './POS';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';

afterEach(() => server.resetHandlers());
const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <BrowserRouter><QueryClientProvider client={queryClient}><NotificationProvider>{children}</NotificationProvider></QueryClientProvider></BrowserRouter>
  );
};

describe('POS Page', () => {
  it('renders header and tabs', () => {
    render(<POS />, { wrapper: createWrapper() });
    expect(screen.getByText('Merchandise & POS')).toBeInTheDocument();
    expect(screen.getByText('pos')).toBeInTheDocument();
    expect(screen.getByText('products')).toBeInTheDocument();
    expect(screen.getByText('alerts')).toBeInTheDocument();
  });

  it('displays products in POS tab', async () => {
    render(<POS />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('ROAR T-Shirt')).toBeInTheDocument(); });
  });

  it('switches to products tab', async () => {
    render(<POS />, { wrapper: createWrapper() });
    screen.getByText('products').click();
    await waitFor(() => { expect(screen.getByText('RTS-001')).toBeInTheDocument(); });
  });

  it('switches to alerts tab', async () => {
    render(<POS />, { wrapper: createWrapper() });
    screen.getByText('alerts').click();
    await waitFor(() => { expect(screen.getByText(/ROAR Shorts/)).toBeInTheDocument(); });
  });

  it('shows cart area', async () => {
    render(<POS />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('Cart')).toBeInTheDocument(); });
  });
});
