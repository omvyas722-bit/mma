// Layout Component System - Application layout structure

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Avatar } from '../Avatar';
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem, DropdownSeparator } from '../Dropdown';

// Main Layout Component
export function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// Header Component
export function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left side - Logo and menu button */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg lg:hidden"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">R</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">
              ROAR MMA
            </span>
          </Link>
        </div>

        {/* Right side - Actions and user menu */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg"
            aria-label="Toggle theme"
          >
            {mode === 'light' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>

          {/* Notifications */}
          <button
            className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg relative"
            aria-label="Notifications"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* User menu */}
          <Dropdown>
            <DropdownTrigger>
              <button className="flex items-center gap-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <Avatar
                  src={user?.avatar}
                  name={user?.name}
                  size="sm"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden md:block">
                  {user?.name}
                </span>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </DropdownTrigger>
            <DropdownContent align="end">
              <DropdownItem
                icon="👤"
                onClick={() => navigate('/profile')}
              >
                Profile
              </DropdownItem>
              <DropdownItem
                icon="⚙️"
                onClick={() => navigate('/settings')}
              >
                Settings
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                icon="🚪"
                onClick={logout}
              >
                Logout
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}

// Sidebar Component
export function Sidebar({ isOpen, onClose }) {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Members', href: '/members', icon: '👥' },
    { name: 'Leads', href: '/leads', icon: '🎯' },
    { name: 'Classes', href: '/classes', icon: '📅' },
    { name: 'Payments', href: '/payments', icon: '💰' },
    { name: 'Communications', href: '/communications', icon: '📧' },
    { name: 'Reports', href: '/reports', icon: '📈' },
    { name: 'Calendar', href: '/calendar', icon: '🗓️' },
    { name: 'Settings', href: '/settings', icon: '⚙️' },
  ];

  const isActive = (href) => location.pathname === href || location.pathname.startsWith(href + '/');

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-16 left-0 bottom-0 w-64 bg-white dark:bg-gray-800
          border-r border-gray-200 dark:border-gray-700
          transform transition-transform duration-300 z-30
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <nav className="p-4 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg
                transition-colors font-medium
                ${
                  isActive(item.href)
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }
              `}
              onClick={() => {
                if (window.innerWidth < 1024) {
                  onClose();
                }
              }}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}

// Page Container Component
export function PageContainer({ children, className = '' }) {
  return (
    <div className={`max-w-7xl mx-auto ${className}`}>
      {children}
    </div>
  );
}

// Page Header Component
export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
  className = '',
}) {
  return (
    <div className={`mb-6 ${className}`}>
      {breadcrumb && <div className="mb-4">{breadcrumb}</div>}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

// Content Section Component
export function ContentSection({
  title,
  subtitle,
  children,
  className = '',
}) {
  return (
    <section className={`mb-8 ${className}`}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

// Empty Layout (for auth pages)
export function EmptyLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {children}
    </div>
  );
}

export default {
  Layout,
  Header,
  Sidebar,
  PageContainer,
  PageHeader,
  ContentSection,
  EmptyLayout,
};

// Usage examples:
/*
// Main app layout
import { Layout, PageContainer, PageHeader } from './components/Layout';

function App() {
  return (
    <Layout>
      <PageContainer>
        <PageHeader
          title="Dashboard"
          subtitle="Welcome back! Here's what's happening today."
          actions={
            <button className="btn btn-primary">
              Add Member
            </button>
          }
        />
        <div>Dashboard content...</div>
      </PageContainer>
    </Layout>
  );
}

// With breadcrumb
import { Breadcrumb } from './components/Breadcrumb';

<Layout>
  <PageContainer>
    <PageHeader
      title="Member Profile"
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Members', href: '/members' },
            { label: 'John Doe' },
          ]}
        />
      }
    />
  </PageContainer>
</Layout>

// Content sections
<Layout>
  <PageContainer>
    <PageHeader title="Settings" />

    <ContentSection
      title="General Settings"
      subtitle="Manage your gym's basic information"
    >
      <form>...</form>
    </ContentSection>

    <ContentSection
      title="Notification Settings"
      subtitle="Configure email and SMS notifications"
    >
      <form>...</form>
    </ContentSection>
  </PageContainer>
</Layout>

// Auth pages (no sidebar/header)
import { EmptyLayout } from './components/Layout';

function LoginPage() {
  return (
    <EmptyLayout>
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md">
          <h1>Login</h1>
          <form>...</form>
        </div>
      </div>
    </EmptyLayout>
  );
}
*/
