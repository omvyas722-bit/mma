import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppShell from './AppShell';
import { server } from '../../test/mocks/server';

const mockUser = { name: 'Test User', role: 'owner' };
const mockLogout = vi.fn();
let mockConnected = true;

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, logout: mockLogout }),
}));

vi.mock('../../contexts/WebSocketContext', () => ({
  useWebSocket: () => ({ connected: mockConnected }),
}));

vi.mock('../../contexts/LocationContext', () => ({
  useLocation: () => ({ selectedLocation: 'all', changeLocation: vi.fn(), locations: [{ id: 'all', name: 'All Locations' }, { id: 'rockingham', name: 'Rockingham' }], locationName: 'All Locations' }),
}));

afterEach(() => server.resetHandlers());
function renderWithRouter(initialPath = '/dashboard') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <QueryClientProvider client={queryClient}>
        <AppShell />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('AppShell Component', () => {
  beforeEach(() => {
    mockLogout.mockClear();
    mockConnected = true;
  });

  it('renders the logo', () => {
    renderWithRouter();
    expect(screen.getByText('ROAR MMA')).toBeInTheDocument();
  });

  it('renders navigation links', async () => {
    renderWithRouter();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Members')).toBeInTheDocument();
    expect(screen.getByText('Classes')).toBeInTheDocument();
    expect(screen.getByText('Leads')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('highlights active nav item', () => {
    renderWithRouter('/members');
    const membersLink = screen.getByText('Members').closest('a');
    expect(membersLink).toHaveClass('bg-red-900/80');
  });

  it('shows user name and role', () => {
    renderWithRouter();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('owner')).toBeInTheDocument();
  });

  it('shows connected status', () => {
    renderWithRouter();
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('calls logout on logout button click', () => {
    renderWithRouter();
    const userMenu = screen.getByLabelText('User menu').closest('button');
    fireEvent.click(userMenu);
    fireEvent.click(screen.getByText('Logout'));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('shows disconnected status when not connected', () => {
    mockConnected = false;
    renderWithRouter();
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });
});
