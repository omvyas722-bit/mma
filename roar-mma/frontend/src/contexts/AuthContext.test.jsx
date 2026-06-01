import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';

const mockNavigate = vi.hoisted(() => vi.fn());
const mockApiPost = vi.hoisted(() => vi.fn());
const mockApiGet = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../lib/api', () => ({
  default: {
    get: mockApiGet,
    post: mockApiPost,
    defaults: { headers: { common: {} } },
  },
}));

function TestComponent() {
  const { user, loading, login, logout, hasPermission } = useAuth();
  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="user">{user ? user.name : 'null'}</div>
      <button type="button" onClick={() => login('a@b.com', 'pw')}>Login</button>
      <button type="button" onClick={logout}>Logout</button>
      <div data-testid="perm-admin">{hasPermission('members:read').toString()}</div>
    </div>
  );
}

function renderWithRouter(component) {
  return render(
    <MemoryRouter>
      <AuthProvider>{component}</AuthProvider>
    </MemoryRouter>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockNavigate.mockClear();
  });

  it('shows loading initially when token exists', () => {
    mockApiGet.mockResolvedValue({ data: { name: 'Admin', role: 'owner' } });
    localStorage.setItem('token', 'mock-token');
    renderWithRouter(<TestComponent />);
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
  });

  it('shows no loading when no token', () => {
    renderWithRouter(<TestComponent />);
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  it('sets user on successful login', async () => {
    mockApiPost.mockResolvedValue({
      data: { token: 'new-token', user: { name: 'Admin', role: 'owner' } },
    });
    renderWithRouter(<TestComponent />);
    await act(async () => {
      fireEvent.click(screen.getByText('Login'));
    });
    expect(mockApiPost).toHaveBeenCalledWith('/api/auth/login', { email: 'a@b.com', password: 'pw' });
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('clears user on logout', async () => {
    localStorage.setItem('token', 'mock-token');
    mockApiGet.mockResolvedValue({ data: { name: 'Admin', role: 'owner' } });
    renderWithRouter(<TestComponent />);
    await waitFor(() => { expect(screen.getByTestId('user')).toHaveTextContent('Admin'); });
    fireEvent.click(screen.getByText('Logout'));
    await waitFor(() => { expect(screen.getByTestId('user')).toHaveTextContent('null'); });
  });
});
