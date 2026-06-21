import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, afterEach } from 'vitest';
import Members from './Members';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';
import { LocationProvider } from '../contexts/LocationContext';
import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3001';

afterEach(() => server.resetHandlers());

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });
  return ({ children }) => (
    <BrowserRouter><LocationProvider><QueryClientProvider client={queryClient}><NotificationProvider>{children}</NotificationProvider></QueryClientProvider></LocationProvider></BrowserRouter>
  );
};

describe('Members Page', () => {
  it('shows loading state initially', () => {
    render(<Members />, { wrapper: createWrapper() });
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('displays member table after loading', async () => {
    render(<Members />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('shows member status badges', async () => {
    render(<Members />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('trial')).toBeInTheDocument();
    });
  });

  it('renders filter inputs', async () => {
    render(<Members />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByLabelText('Search members')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by plan')).toBeInTheDocument();
    });
  });

  it('shows export and add member buttons', async () => {
    render(<Members />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Export')).toBeInTheDocument();
      expect(screen.getByText('+ Add Member')).toBeInTheDocument();
    });
  });

  it('shows error state with retry on API failure', async () => {
    server.use(
      http.get(`${API_URL}/api/members`, () => HttpResponse.json({ error: 'Server error' }, { status: 500 })),
    );
    render(<Members />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });
  });

  it('shows empty state when no members match filters', async () => {
    server.use(
      http.get(`${API_URL}/api/members`, () => HttpResponse.json({ members: [], total: 0 })),
    );
    render(<Members />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No members found')).toBeInTheDocument();
    });
  });

  it('status filter select changes the query', async () => {
    render(<Members />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'active' } });
    expect(screen.getByLabelText('Filter by status')).toHaveValue('active');
  });

  it('renders pagination with correct range', async () => {
    render(<Members />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/1–2 of 2/)).toBeInTheDocument();
    });
  });

  it('renders paginator buttons', async () => {
    render(<Members />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
    });
  });

  it('shows bulk selection mode button', async () => {
    render(<Members />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByLabelText('Select all members')).toBeInTheDocument();
    });
  });

  it('shows individual member checkboxes for bulk actions', async () => {
    render(<Members />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByLabelText('Select John Doe')).toBeInTheDocument();
      expect(screen.getByLabelText('Select Jane Smith')).toBeInTheDocument();
    });
  });

  it('displays plan filter', async () => {
    render(<Members />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByLabelText('Filter by plan')).toBeInTheDocument();
    });
  });
});
