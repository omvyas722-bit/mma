// Main application shell with sidebar navigation
import { Suspense } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useWebSocket } from '../../contexts/WebSocketContext';

export default function AppShell() {
  const { user, logout } = useAuth();
  const { connected } = useWebSocket();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Members', path: '/members', icon: '👥' },
    { name: 'Classes', path: '/classes', icon: '🥋' },
    { name: 'Leads', path: '/leads', icon: '🎯' },
    { name: 'Billing', path: '/billing', icon: '💰' },
    { name: 'Staff', path: '/staff', icon: '👔' },
    { name: 'Reports', path: '/reports', icon: '📈' },
    { name: 'AI Assistant', path: '/ai', icon: '🤖' },
    { name: 'AI Dashboard', path: '/ai-dashboard', icon: '⚙️' },
    { name: 'AI Agents', path: '/agents', icon: '🧠' },
  ];

  function isActive(path) {
    return location.pathname === path;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gray-900">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 bg-gray-800">
            <h1 className="text-xl font-bold text-white">ROAR MMA</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User info and status */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-gray-400">
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
              </div>
              <button
                onClick={logout}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="ml-64">
        <div className="p-8">
          <Suspense fallback={<div className="text-center py-8 text-gray-500">Loading...</div>}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
