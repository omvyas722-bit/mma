import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../contexts/AuthContext';

describe('ProtectedRoute', () => {
  const renderWithRouter = (ui) =>
    render(<MemoryRouter initialEntries={['/dashboard']}>{ui}</MemoryRouter>);

  it('shows loading when auth is loading', () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    renderWithRouter(<ProtectedRoute><div>Dashboard</div></ProtectedRoute>);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders loading spinner element', () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    renderWithRouter(<ProtectedRoute><div>Dashboard</div></ProtectedRoute>);
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    renderWithRouter(<ProtectedRoute><div>Dashboard</div></ProtectedRoute>);
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    useAuth.mockReturnValue({ user: { id: 1, name: 'Test', email: 'test@test.com' }, loading: false });
    renderWithRouter(<ProtectedRoute><div>Dashboard Content</div></ProtectedRoute>);
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });

  it('renders children when user has all properties', () => {
    useAuth.mockReturnValue({ user: { id: 1, name: 'Admin', role: 'owner' }, loading: false });
    renderWithRouter(<ProtectedRoute><div data-testid="admin-panel">Admin</div></ProtectedRoute>);
    expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
  });

  it('renders multiple children when authenticated', () => {
    useAuth.mockReturnValue({ user: { id: 1 }, loading: false });
    renderWithRouter(
      <ProtectedRoute>
        <div data-testid="child1">Child 1</div>
        <div data-testid="child2">Child 2</div>
      </ProtectedRoute>
    );
    expect(screen.getByTestId('child1')).toBeInTheDocument();
    expect(screen.getByTestId('child2')).toBeInTheDocument();
  });
});
