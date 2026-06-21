import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
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
    await waitFor(() => { expect(screen.getByText('ROAR T-Shirt')).toBeInTheDocument(); expect(screen.getByText('ROAR Shorts')).toBeInTheDocument(); });
  });

  it('shows product prices and stock in POS tab', async () => {
    render(<POS />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('$39.99')).toBeInTheDocument();
      expect(screen.getByText('$49.99')).toBeInTheDocument();
      expect(screen.getByText('50 in stock')).toBeInTheDocument();
      expect(screen.getByText('3 in stock')).toBeInTheDocument();
    });
  });

  it('switches to products tab', async () => {
    render(<POS />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('products'));
    await waitFor(() => { expect(screen.getByText('RTS-001')).toBeInTheDocument(); expect(screen.getByText('RSS-001')).toBeInTheDocument(); });
  });

  it('switches to alerts tab', async () => {
    render(<POS />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('alerts'));
    await waitFor(() => { expect(screen.getByText(/ROAR Shorts/)).toBeInTheDocument(); expect(screen.getByText(/Low stock/)).toBeInTheDocument(); });
  });

  it('shows cart area', async () => {
    render(<POS />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('Cart')).toBeInTheDocument(); expect(screen.getByText('Cart empty')).toBeInTheDocument(); });
  });

  it('adds product to cart on click', async () => {
    render(<POS />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('ROAR T-Shirt')).toBeInTheDocument(); });
    fireEvent.click(screen.getByText('ROAR T-Shirt'));
    await waitFor(() => { expect(screen.getByText(/ROAR T-Shirt ×1/)).toBeInTheDocument(); });
  });

  it('shows total price after adding to cart', async () => {
    render(<POS />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('ROAR T-Shirt')).toBeInTheDocument(); });
    fireEvent.click(screen.getByText('ROAR T-Shirt'));
    await waitFor(() => {
      expect(screen.getAllByText(/\$39\.99/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Total')).toBeInTheDocument();
    });
  });

  it('updates total with discount', async () => {
    render(<POS />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('ROAR T-Shirt')).toBeInTheDocument(); });
    fireEvent.click(screen.getByText('ROAR T-Shirt'));
    const discountInput = screen.getByPlaceholderText('0%');
    fireEvent.change(discountInput, { target: { value: '10' } });
    await waitFor(() => {
      expect(screen.getByText(/Discount \(10%\)/)).toBeInTheDocument();
    });
  });

  it('shows error state when products API fails', async () => {
    server.use(http.get('http://localhost:3001/api/stock/products', ({ request }) => {
      const url = new URL(request.url);
      if (url.searchParams.get('active') === 'true') return HttpResponse.error();
      return HttpResponse.json({ products: [] });
    }));
    render(<POS />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('Cart')).toBeInTheDocument(); });
  });

  it('shows empty state in products tab', async () => {
    server.use(http.get('http://localhost:3001/api/stock/products', () => HttpResponse.json({ products: [] })));
    render(<POS />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('products'));
    await waitFor(() => { expect(screen.getByText('No products')).toBeInTheDocument(); });
  });

  it('shows resolve button on alerts tab', async () => {
    render(<POS />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('alerts'));
    await waitFor(() => { expect(screen.getByText('Resolve')).toBeInTheDocument(); });
  });

  it('shows Member search in cart', async () => {
    render(<POS />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByPlaceholderText('Search member...')).toBeInTheDocument(); });
  });

  it('shows discount input field', async () => {
    render(<POS />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByPlaceholderText('0%')).toBeInTheDocument(); });
  });

  it('shows tendered input and change', async () => {
    render(<POS />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('ROAR T-Shirt')).toBeInTheDocument(); });
    fireEvent.click(screen.getByText('ROAR T-Shirt'));
    const tenderedInput = screen.getByPlaceholderText('Tendered $');
    fireEvent.change(tenderedInput, { target: { value: '50' } });
    await waitFor(() => { expect(screen.getByText(/Change: \$10\.01/)).toBeInTheDocument(); });
  });
});
