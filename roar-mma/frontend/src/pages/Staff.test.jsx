import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
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
    await waitFor(() => { expect(screen.getByText('COACH')).toBeInTheDocument(); expect(screen.getByText('FRONT DESK')).toBeInTheDocument(); });
  });

  it('shows stat cards', async () => {
    render(<Staff />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('Total')).toBeInTheDocument(); expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1); expect(screen.getByText('Coaches')).toBeInTheDocument(); expect(screen.getAllByText('Front Desk').length).toBeGreaterThanOrEqual(1); });
  });

  it('renders filter input', async () => {
    render(<Staff />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByLabelText('Filter by role')).toBeInTheDocument(); });
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get('http://localhost:3001/api/staff', () => HttpResponse.json({ error: 'fail' }, { status: 500 })),
      http.get('http://localhost:3001/api/staff/stats', () => HttpResponse.json({ error: 'fail' }, { status: 500 })),
    );
    render(<Staff />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByRole('alert')).toBeInTheDocument(); expect(screen.getByText(/Failed to load staff/)).toBeInTheDocument(); }, { timeout: 8000 });
  });

  it('shows empty state when no staff returned', async () => {
    server.use(http.get('http://localhost:3001/api/staff', () => HttpResponse.json([])));
    render(<Staff />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('No staff found.')).toBeInTheDocument(); });
  });

  it('switches to Schedule tab', async () => {
    render(<Staff />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Schedule'));
    await waitFor(() => { expect(screen.getByText('Weekly Schedule')).toBeInTheDocument(); });
  });

  it('filters staff by role', async () => {
    render(<Staff />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('Kane Mousah')).toBeInTheDocument(); });
    const select = screen.getByLabelText('Filter by role');
    fireEvent.change(select, { target: { value: 'coach' } });
    await waitFor(() => {
      expect(select.value).toBe('coach');
    });
  });

  it('shows Add Staff button and opens modal', async () => {
    render(<Staff />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('+ Add Staff Member')).toBeInTheDocument(); });
    fireEvent.click(screen.getByText('+ Add Staff Member'));
    await waitFor(() => { expect(screen.getByRole('dialog', { name: 'Add Staff Member' })).toBeInTheDocument(); });
  });

  it('shows the Add Staff form with required fields', async () => {
    render(<Staff />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('+ Add Staff Member')).toBeInTheDocument(); });
    fireEvent.click(screen.getByText('+ Add Staff Member'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Full name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Temp password')).toBeInTheDocument();
    });
  });

  it('displays compliance badge for staff', async () => {
    server.use(http.get('http://localhost:3001/api/certifications', () => HttpResponse.json({ certifications: [] })));
    server.use(http.get('http://localhost:3001/api/certifications/expiring', () => HttpResponse.json({ expiring: [] })));
    render(<Staff />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1); });
  });

});
