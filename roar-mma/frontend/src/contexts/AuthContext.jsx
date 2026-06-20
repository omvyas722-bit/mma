// Authentication context
import { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await api.get('/api/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [fetchCurrentUser]);

  const login = useCallback(async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);

      navigate('/dashboard');
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  }, [navigate]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    if (window.location.pathname !== '/login') {
      navigate('/login');
    }
  }, [navigate]);

  const hasPermission = useCallback((permission) => {
    if (!user) return false;

    const rolePermissions = {
      owner: ['*'],
      gm: [
        'members:read', 'members:create', 'members:update', 'members:delete',
        'classes:read', 'classes:create', 'classes:update', 'classes:delete',
        'bookings:*',
        'leads:*',
        'reports:read', 'reports:write',
        'staff:read', 'staff:create', 'staff:update',
        'dashboard:read',
        'ai:manage', 'ai:read',
        'analytics:read',
        'transactions:read', 'transactions:create',
        'attendance:*',
        'communications:read', 'communications:write',
        'settings:read', 'settings:write',
        'stock:read', 'stock:write',
        'grading:read', 'grading:write',
        'pt:read', 'pt:write',
        'retention:read', 'retention:write',
        'tasks:read', 'tasks:write'
      ],
      front_desk: [
        'members:read', 'members:create',
        'classes:read',
        'bookings:*',
        'leads:read', 'leads:create',
        'attendance:*',
        'communications:read',
        'dashboard:read'
      ],
      coach: [
        'classes:read',
        'attendance:*',
        'members:read',
        'grading:read', 'grading:write',
        'pt:read', 'pt:write',
        'tasks:read'
      ],
      sales: [
        'leads:*',
        'members:read',
        'communications:read', 'communications:write',
        'dashboard:read'
      ],
      social: [
        'social:*',
        'communications:read'
      ]
    };

    const permissions = rolePermissions[user.role] || [];

    if (permissions.includes('*')) {
      return true;
    }

    if (permissions.includes(permission)) {
      return true;
    }

    const [resource] = permission.split(':');
    if (permissions.includes(`${resource}:*`)) {
      return true;
    }

    return false;
  }, [user]);

  const value = useMemo(() => ({ user, loading, login, logout, hasPermission }), [user, loading, login, logout, hasPermission]);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
