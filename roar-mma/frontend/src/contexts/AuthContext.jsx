// Authentication context
import { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchCurrentUser() {
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
  }

  async function login(email, password) {
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
  }

  function logout() {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    navigate('/login');
  }

  function hasPermission(permission) {
    if (!user) return false;

    const rolePermissions = {
      owner: ['*'],
      gm: [
        'members:read', 'members:create', 'members:update',
        'classes:read', 'classes:create', 'classes:update',
        'bookings:*',
        'leads:*',
        'reports:read',
        'staff:read'
      ],
      front_desk: [
        'members:read', 'members:create',
        'classes:read',
        'bookings:*',
        'waivers:*'
      ],
      coach: [
        'classes:read',
        'attendance:*',
        'members:read'
      ],
      sales: [
        'leads:*',
        'members:read'
      ],
      social: [
        'social:*'
      ]
    };

    const permissions = rolePermissions[user.role] || [];

    // Owner has all permissions
    if (permissions.includes('*')) {
      return true;
    }

    // Check exact match
    if (permissions.includes(permission)) {
      return true;
    }

    // Check wildcard match
    const [resource] = permission.split(':');
    if (permissions.includes(`${resource}:*`)) {
      return true;
    }

    return false;
  }

  const value = {
    user,
    loading,
    login,
    logout,
    hasPermission
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
