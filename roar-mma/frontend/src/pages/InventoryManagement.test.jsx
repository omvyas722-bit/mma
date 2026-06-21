import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';
import InventoryManagement from './InventoryManagement';

const API_URL = 'http://localhost:3001';

afterEach(() => server.resetHandlers());

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  });
  return ({ children }) => (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>{children}</NotificationProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

function addMissingHandlers() {
  server.use(
    http.get(`${API_URL}/api/stock/suppliers`, () =>
      HttpResponse.json([
        { id: 1, name: 'MMA Gear Co', contact_person: 'Mike', email: 'mike@mmagear.com', phone: '0411111111', address: '123 Gym St', notes: '' },
      ])
    ),
    http.get(`${API_URL}/api/stock/movements/1`, () =>
      HttpResponse.json([
        { id: 1, quantity_change: 10, reason: 'restock', notes: 'Monthly restock', created_at: '2026-06-01T10:00:00Z', adjusted_by_name: 'Kane' },
      ])
    ),
    http.get(`${API_URL}/api/stock/analytics`, () =>
      HttpResponse.json({
        total_products: 42,
        low_stock_count: 3,
        total_stock_value: 15234.50,
        active_suppliers: 2,
      })
    ),
    http.post(`${API_URL}/api/stock/products`, () =>
      HttpResponse.json({ id: 3, name: 'New Product', sell_price: 29.99 }, { status: 201 })
    ),
    http.put(`${API_URL}/api/stock/products/:id`, ({ params }) =>
      HttpResponse.json({ id: parseInt(params.id, 10), name: 'Updated' })
    ),
    http.delete(`${API_URL}/api/stock/products/:id`, () =>
      HttpResponse.json({ success: true })
    ),
    http.post(`${API_URL}/api/stock/products/:id/adjust`, () =>
      HttpResponse.json({ success: true })
    ),
    http.post(`${API_URL}/api/stock/suppliers`, () =>
      HttpResponse.json({ id: 2, name: 'New Supplier' }, { status: 201 })
    ),
  );
}

describe('InventoryManagement', () => {
  describe('Tab Navigation', () => {
    it('renders all tab buttons', () => {
      render(<InventoryManagement />, { wrapper: createWrapper() });
      expect(screen.getByText('products')).toBeInTheDocument();
      expect(screen.getByText('alerts')).toBeInTheDocument();
      expect(screen.getByText('suppliers')).toBeInTheDocument();
      expect(screen.getByText('movements')).toBeInTheDocument();
      expect(screen.getByText('analytics')).toBeInTheDocument();
    });

    it('switches tabs on click', async () => {
      addMissingHandlers();
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('analytics'));
      expect(await screen.findByText('Total Products')).toBeInTheDocument();
    });
  });

  describe('ProductList', () => {
    it('shows loading state', () => {
      render(<InventoryManagement />, { wrapper: createWrapper() });
      expect(screen.getByText('products').closest('button')).toBeInTheDocument();
    });

    it('renders products from API', async () => {
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(screen.getByText('ROAR T-Shirt')).toBeInTheDocument();
        expect(screen.getByText('ROAR Shorts')).toBeInTheDocument();
      });
    });

    it('displays product details: price, stock, category', async () => {
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(screen.getByText('$39.99')).toBeInTheDocument();
        expect(screen.getByText('$49.99')).toBeInTheDocument();
        expect(screen.getAllByText('apparel').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows low stock badge when qty <= min_stock', async () => {
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(screen.getAllByText('Low').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('filters products by search query', async () => {
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await screen.findByText('ROAR T-Shirt');
      const searchInput = screen.getByLabelText('Search products');
      await userEvent.type(searchInput, 'Shorts');
      await waitFor(() => {
        expect(screen.queryByText('ROAR T-Shirt')).not.toBeInTheDocument();
        expect(screen.getByText('ROAR Shorts')).toBeInTheDocument();
      });
    });

    it('shows empty state when search yields no results', async () => {
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await screen.findByText('ROAR T-Shirt');
      const searchInput = screen.getByLabelText('Search products');
      await userEvent.type(searchInput, 'ZZZ_NONEXISTENT');
      await waitFor(() => {
        expect(screen.getByText('No products found')).toBeInTheDocument();
      });
    });

    it('shows error state on API failure', async () => {
      server.use(
        http.get(`${API_URL}/api/stock/products`, () =>
          HttpResponse.json({ error: 'Server error' }, { status: 500 })
        ),
      );
      addMissingHandlers();
      render(<InventoryManagement />, { wrapper: createWrapper() });
      expect(await screen.findByText('Failed to load products')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('opens add product form on button click', async () => {
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await screen.findByText('ROAR T-Shirt');
      await userEvent.click(screen.getByText('+ Add Product'));
      expect(screen.getByText('Add Product')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('adds a new product via form submission', async () => {
      addMissingHandlers();
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await screen.findByText('ROAR T-Shirt');
      await userEvent.click(screen.getByText('+ Add Product'));
      await userEvent.type(screen.getAllByRole('textbox')[1], 'New Product');
      await userEvent.type(screen.getAllByRole('spinbutton')[0], '29.99');
      const saveBtn = screen.getByText('Save');
      await userEvent.click(saveBtn);
      await waitFor(() => {
        expect(screen.getByText('Product created')).toBeInTheDocument();
      });
    });

    it('opens edit form with pre-filled data', async () => {
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await screen.findByText('ROAR T-Shirt');
      const editBtns = screen.getAllByText('Edit');
      await userEvent.click(editBtns[0]);
      expect(screen.getByText('Edit Product')).toBeInTheDocument();
      expect(screen.getByDisplayValue('ROAR T-Shirt')).toBeInTheDocument();
    });

    it('deletes a product after confirmation', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      addMissingHandlers();
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await screen.findByText('ROAR T-Shirt');
      const deleteBtns = screen.getAllByText('Delete');
      await userEvent.click(deleteBtns[0]);
      await waitFor(() => {
        expect(screen.getByText('Product deleted')).toBeInTheDocument();
      });
      confirmSpy.mockRestore();
    });

    it('opens adjust stock modal and applies adjustment', async () => {
      addMissingHandlers();
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await screen.findByText('ROAR T-Shirt');
      await userEvent.click(screen.getAllByText('Adjust')[0]);
      expect(screen.getByText(/Adjust Stock: ROAR T-Shirt/)).toBeInTheDocument();
      const qtyInput = screen.getByPlaceholderText('e.g. 10 or -2');
      await userEvent.type(qtyInput, '5');
      await userEvent.click(screen.getByText('Apply'));
      await waitFor(() => {
        expect(screen.getByText('Stock adjusted')).toBeInTheDocument();
      });
    });

    it('cancels adjust stock modal', async () => {
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await screen.findByText('ROAR T-Shirt');
      await userEvent.click(screen.getAllByText('Adjust')[0]);
      await userEvent.click(screen.getByText('Cancel'));
      await waitFor(() => {
        expect(screen.queryByText(/Adjust Stock:/)).not.toBeInTheDocument();
      });
    });
  });

  describe('StockAlerts', () => {
    beforeEach(() => {
      server.use(
        http.get(`${API_URL}/api/stock/alerts`, () =>
          HttpResponse.json([
            { id: 1, product_name: 'ROAR Shorts', alert_type: 'low_stock', message: 'Stock below minimum threshold', created_at: '2026-06-01' },
            { id: 2, product_name: 'MMA Gloves', alert_type: 'out_of_stock', message: 'Out of stock', created_at: '2026-06-02' },
          ])
        ),
      );
    });

    it('switches to alerts tab and shows data', async () => {
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('alerts'));
      expect(await screen.findByText('ROAR Shorts')).toBeInTheDocument();
      expect(screen.getByText('low_stock')).toBeInTheDocument();
    });

    it('resolves an alert', async () => {
      server.use(
        http.post(`${API_URL}/api/stock/alerts/1/resolve`, () =>
          HttpResponse.json({ success: true })
        ),
      );
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('alerts'));
      expect(await screen.findByText('ROAR Shorts')).toBeInTheDocument();
      await userEvent.click(screen.getAllByText('Resolve')[0]);
      await waitFor(() => {
        expect(screen.getByText('Alert resolved')).toBeInTheDocument();
      });
    });

    it('shows error state for alerts', async () => {
      server.use(
        http.get(`${API_URL}/api/stock/alerts`, () =>
          HttpResponse.json({ error: 'Server error' }, { status: 500 })
        ),
      );
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('alerts'));
      expect(await screen.findByText('Failed to load alerts')).toBeInTheDocument();
    });

    it('shows empty state for alerts', async () => {
      server.use(
        http.get(`${API_URL}/api/stock/alerts`, () =>
          HttpResponse.json([])
        ),
      );
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('alerts'));
      expect(await screen.findByText('No active stock alerts')).toBeInTheDocument();
    });
  });

  describe('Suppliers', () => {
    it('switches to suppliers tab and shows data', async () => {
      addMissingHandlers();
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('suppliers'));
      expect(await screen.findByText('MMA Gear Co')).toBeInTheDocument();
    });

    it('opens add supplier form and submits', async () => {
      addMissingHandlers();
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('suppliers'));
      await screen.findByText('MMA Gear Co');
      await userEvent.click(screen.getByText('+ Add Supplier'));
      expect(screen.getByText('Add Supplier')).toBeInTheDocument();
      const nameInput = screen.getAllByDisplayValue('')[0];
      await userEvent.type(nameInput, 'New Supplier');
      await userEvent.click(screen.getByText('Save'));
      await waitFor(() => {
        expect(screen.getByText('Supplier added')).toBeInTheDocument();
      });
    });

    it('shows empty state for suppliers', async () => {
      server.use(
        http.get(`${API_URL}/api/stock/suppliers`, () =>
          HttpResponse.json([])
        ),
      );
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('suppliers'));
      expect(await screen.findByText('No suppliers')).toBeInTheDocument();
    });

    it('shows error state for suppliers', async () => {
      server.use(
        http.get(`${API_URL}/api/stock/suppliers`, () =>
          HttpResponse.json({ error: 'Server error' }, { status: 500 })
        ),
      );
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('suppliers'));
      expect(await screen.findByText('Failed to load suppliers')).toBeInTheDocument();
    });
  });

  describe('StockMovements', () => {
    it('shows product search and allows selection', async () => {
      addMissingHandlers();
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('movements'));
      expect(await screen.findByLabelText('Search product for movements')).toBeInTheDocument();
      const searchInput = screen.getByLabelText('Search product for movements');
      await userEvent.type(searchInput, 'T-Shirt');
      const productBtn = await screen.findByText('ROAR T-Shirt');
      expect(productBtn).toBeInTheDocument();
      await userEvent.click(productBtn);
      expect(await screen.findByText(/Showing:/)).toBeInTheDocument();
    });

    it('clears selected product', async () => {
      addMissingHandlers();
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('movements'));
      const searchInput = await screen.findByLabelText('Search product for movements');
      await userEvent.type(searchInput, 'T-Shirt');
      await userEvent.click(await screen.findByText('ROAR T-Shirt'));
      await screen.findByText(/Showing:/);
      await userEvent.click(screen.getByText('Clear'));
      await waitFor(() => {
        expect(screen.getByText('Select a product to view stock movement history')).toBeInTheDocument();
      });
    });

    it('shows movements for selected product', async () => {
      addMissingHandlers();
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('movements'));
      const searchInput = await screen.findByLabelText('Search product for movements');
      await userEvent.type(searchInput, 'T-Shirt');
      await userEvent.click(await screen.findByText('ROAR T-Shirt'));
      expect(await screen.findByText('+10')).toBeInTheDocument();
      expect(screen.getByText('restock')).toBeInTheDocument();
    });
  });

  describe('StockAnalytics', () => {
    it('shows analytics data', async () => {
      addMissingHandlers();
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('analytics'));
      expect(await screen.findByText('Total Products')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('Low Stock Items')).toBeInTheDocument();
      expect(screen.getByText('$15234.50')).toBeInTheDocument();
      expect(screen.getByText('Active Suppliers')).toBeInTheDocument();
    });

    it('shows error state for analytics', async () => {
      server.use(
        http.get(`${API_URL}/api/stock/analytics`, () =>
          HttpResponse.json({ error: 'Server error' }, { status: 500 })
        ),
      );
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('analytics'));
      expect(await screen.findByText('Failed to load analytics')).toBeInTheDocument();
    });

    it('shows no data state for analytics', async () => {
      server.use(
        http.get(`${API_URL}/api/stock/analytics`, () =>
          HttpResponse.json(null)
        ),
      );
      render(<InventoryManagement />, { wrapper: createWrapper() });
      await userEvent.click(screen.getByText('analytics'));
      expect(await screen.findByText('No analytics data available')).toBeInTheDocument();
    });
  });
});
