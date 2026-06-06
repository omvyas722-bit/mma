import { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useLocation as useAppLocation } from '../../contexts/LocationContext';
import api from '../../lib/api';

function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => { if (ref.current && !ref.current.contains(e.target)) handler(e); };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => { document.removeEventListener('mousedown', listener); document.removeEventListener('touchstart', listener); };
  }, [ref, handler]);
}

function useEscapeKey(handler) {
  useEffect(() => {
    const listener = (e) => { if (e.key === 'Escape') handler(e); };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [handler]);
}

function TrapFocus({ containerRef, active }) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    const focusable = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first.focus();
    const handler = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    container.addEventListener('keydown', handler);
    return () => container.removeEventListener('keydown', handler);
  }, [active, containerRef]);
}

const NAV_SECTIONS = [
  {
    label: 'Dashboard',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    ],
  },
  {
    label: 'People',
    items: [
      { name: 'Members', path: '/members', icon: '👥' },
      { name: 'Leads', path: '/leads', icon: '🎯' },
      { name: 'Staff', path: '/staff', icon: '👔' },
    ],
  },
  {
    label: 'Schedule',
    items: [
      { name: 'Classes', path: '/classes', icon: '🥋' },
      { name: 'Calendar', path: '/calendar', icon: '📅' },
      { name: 'Staff Schedule', path: '/staff-schedule', icon: '🕐' },
    ],
  },
  {
    label: 'Sales & Billing',
    items: [
      { name: 'Billing', path: '/billing', icon: '💰' },
      { name: 'Subscriptions', path: '/subscriptions', icon: '📋' },
      { name: 'POS / Stock', path: '/pos', icon: '🛒' },
      { name: 'Inventory', path: '/inventory', icon: '📦' },
      { name: 'Family Discounts', path: '/family-discounts', icon: '👪' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { name: 'Communications', path: '/communications', icon: '✉️' },
      { name: 'Social Media', path: '/social-media', icon: '📱' },
      { name: 'Campaigns', path: '/social-media', icon: '📣' },
    ],
  },
  {
    label: 'Growth',
    items: [
      { name: 'Trial Conversion', path: '/trial-conversion', icon: '🔄' },
      { name: 'Lead Scoring', path: '/lead-scoring', icon: '🏆' },
      { name: 'Retention', path: '/retention', icon: '🛡️' },
      { name: 'Makeup Classes', path: '/makeup-classes', icon: '🔁' },
    ],
  },
  {
    label: 'Training',
    items: [
      { name: 'Gradings', path: '/gradings', icon: '🥇' },
      { name: 'Coaching', path: '/coaching', icon: '🎓' },
      { name: 'PT Sessions', path: '/pt-sessions', icon: '💪' },
      { name: 'Certifications', path: '/staff', icon: '📜' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { name: 'Waivers', path: '/waivers', icon: '📝' },
      { name: 'Reports', path: '/reports', icon: '📈' },
      { name: 'Workflows', path: '/workflows', icon: '⚡' },
      { name: 'Automated Msgs', path: '/communications', icon: '🤖' },
      { name: 'Approval Queue', path: '/approval-queue', icon: '✅' },
    ],
  },
  {
    label: 'AI',
    items: [
      { name: 'AI Dashboard', path: '/ai-dashboard', icon: '🤖' },
      { name: 'Mission Control', path: '/mission-control', icon: '🎮' },
      { name: 'AI Assistant', path: '/ai', icon: '💬' },
      { name: 'Agent Tracking', path: '/agents', icon: '📡' },
      { name: 'Phone System', path: '/phone-system', icon: '📞' },
    ],
  },
  {
    label: 'System',
    items: [
      { name: 'Settings', path: '/settings', icon: '⚙️' },
      { name: 'PerfectGym', path: '/perfectgym', icon: '🔄' },
      { name: 'Privacy', path: '/privacy', icon: '🔒' },
    ],
  },
];

function Dropdown({ trigger, children, align = 'right', className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));
  useEscapeKey(() => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(v => !v); } }}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {typeof trigger === 'function' ? trigger(open) : trigger}
      </button>
      {open && (
        <div
          className={`absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 ${align === 'right' ? 'right-0' : 'left-0'} ${className}`}
          role="menu"
        >
          {typeof children === 'function' ? children({ close: () => setOpen(false) }) : children}
        </div>
      )}
    </div>
  );
}

export default function AppShell() {
  const { user, logout, hasPermission } = useAuth();
  const { connected } = useWebSocket();
  const { selectedLocation, changeLocation, locations } = useAppLocation();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);
  const overlayRef = useRef(null);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status-pill'],
    queryFn: async () => { const r = await api.get('/api/ai/status'); return r.data; },
    refetchInterval: 30000,
  });

  const { data: notifData, refetch: refetchNotifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => { const r = await api.get('/api/notifications?scope=unread&limit=10'); return r.data; },
    refetchInterval: 15000,
  });

  const dismissNotif = useMutation({
    mutationFn: (id) => api.post('/api/notifications/dismiss', { id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  const markRead = useMutation({
    mutationFn: (id) => api.post('/api/notifications/mark-read', { id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  const notifs = notifData?.notifications || [];
  const unreadCount = notifs.length;

  const aiPillColor = !aiStatus?.running ? 'bg-red-500' : aiStatus?.actionsToday > 0 ? 'bg-green-500' : 'bg-yellow-500';
  const aiPillText = !aiStatus?.running ? 'Error' : 'Active';
  const pendingApproval = notifs.filter(n => n.type === 'ai_approval').length;

  const [collapsedSections, setCollapsedSections] = useState(() => {
    const saved = {};
    NAV_SECTIONS.forEach((sec) => { saved[sec.label] = false; });
    return saved;
  });
  const toggleSection = (label) => {
    setCollapsedSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isExactPath = (path) => location.pathname === path;
  const sectionHasActive = (section) => section.items.some(item => isExactPath(item.path));

  const sidebarContent = (
    <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto" role="navigation" aria-label="Main navigation">
      {NAV_SECTIONS.map((section) => {
        const hasActive = sectionHasActive(section);
        const isCollapsed = collapsedSections[section.label] && !hasActive;
        return (
          <div key={section.label}>
            <button
              type="button"
              onClick={() => toggleSection(section.label)}
              className={`flex items-center w-full px-2 py-1.5 text-[11px] font-semibold uppercase tracking-widest rounded transition-colors ${hasActive ? 'text-red-400' : 'text-gray-600 hover:text-gray-400'}`}
              aria-expanded={!isCollapsed}
            >
              <span className={`mr-1.5 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} aria-hidden="true">▶</span>
              {section.label}
            </button>
            {!isCollapsed && (
              <div className="space-y-0.5 ml-1">
                {section.items.map((item) => (
                  <Link
                    key={item.path + item.name}
                    to={item.path}
                    onClick={closeSidebar}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isExactPath(item.path)
                        ? 'bg-red-900/80 text-white'
                        : 'text-gray-400 hover:bg-red-900/40 hover:text-white'
                    }`}
                    aria-current={isExactPath(item.path) ? 'page' : undefined}
                  >
                    <span className="mr-2.5 text-sm" aria-hidden="true">{item.icon}</span>
                    <span className="truncate">{item.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skip link */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-red-600 focus:text-white focus:rounded">
        Skip to main content
      </a>

      {/* TOPBAR */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-40 flex items-center px-4 gap-3 shadow-sm" role="banner">
        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>

        <div className="flex-shrink-0">
          <Link to="/dashboard" className="text-lg font-bold text-red-600">ROAR MMA</Link>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Location Switcher */}
          <Dropdown
            align="right"
            className="w-48"
            trigger={() => (
              <span className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" aria-label={`Location: ${locations.find(l => l.id === selectedLocation)?.name || 'All Locations'}`}>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                <span className="text-gray-700 hidden sm:inline">{locations.find(l => l.id === selectedLocation)?.name || 'All Locations'}</span>
                <span className="text-gray-700 sm:hidden">Location</span>
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
              </span>
            )}
          >
            {({ close }) => locations.map(loc => (
              <button key={loc.id} type="button" role="menuitem" onClick={() => { changeLocation(loc.id); close(); }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedLocation === loc.id ? 'text-red-600 font-medium' : 'text-gray-700'}`}
              >{loc.name}</button>
            ))}
          </Dropdown>

          {/* Notification Bell */}
          <Dropdown
            align="right"
            className="w-80 max-h-96 overflow-y-auto"
            trigger={(open) => (
              <span className={`inline-flex items-center justify-center relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ${open ? 'bg-gray-100' : ''}`} aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                {unreadCount > 0 && (
                  <span className="absolute top-[-3px] left-[19px] bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1" aria-hidden="true">{unreadCount}</span>
                )}
              </span>
            )}
          >
            {({ close }) => (
              <>
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">Notifications</span>
                  {unreadCount > 0 && <span className="text-xs text-red-600" aria-live="polite">{unreadCount} new</span>}
                </div>
                {notifs.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">No notifications</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifs.map(n => (
                      <div key={n.id} className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${!n.read_at ? 'bg-red-50/50' : ''}`}
                        onClick={() => { markRead.mutate(n.id); if (n.link) { navigate(n.link); close(); } }}
                        role="button" tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); markRead.mutate(n.id); if (n.link) { navigate(n.link); close(); } }}}
                        aria-label={n.title}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-sm mt-0.5" aria-hidden="true">
                            {n.type === 'ai_approval' ? '🤖' : n.type === 'payment_failed' ? '💰' : n.type === 'new_lead' ? '🎯' : '📌'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">{n.title}</p>
                            <p className="text-xs text-gray-500 truncate">{n.message}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{n.created_at ? new Date(n.created_at + 'Z').toLocaleString() : ''}</p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); dismissNotif.mutate(n.id); }}
                            className="text-gray-300 hover:text-gray-500 text-xs" aria-label="Dismiss notification">&times;</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </Dropdown>

          {/* AI Status Pill */}
          <button type="button" onClick={() => navigate('/ai-dashboard')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            aria-label={`AI status: ${aiPillText}${pendingApproval > 0 ? `, ${pendingApproval} pending approval` : ''}`}
          >
            <span className={`w-2 h-2 rounded-full ${aiPillColor}`} aria-hidden="true"></span>
            <span className="text-gray-600 hidden sm:inline">AI {aiPillText}</span>
            {pendingApproval > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1" aria-label={`${pendingApproval} pending approvals`}>{pendingApproval}</span>
            )}
          </button>

          {/* User Menu */}
          <Dropdown
            align="right"
            className="w-48"
            trigger={(open) => (
              <span className={`flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded-lg transition-colors ${open ? 'bg-gray-100' : ''}`} aria-label="User menu">
                <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold select-none" aria-hidden="true">
                  {(user?.name?.[0] || '?')}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-gray-900 leading-tight">{user?.name}</p>
                  <p className="text-[10px] text-gray-500 capitalize leading-tight">{user?.role?.replace('_', ' ')}</p>
                </div>
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
              </span>
            )}
          >
            {({ close }) => (
              <>
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                  <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 capitalize">{user?.role?.replace('_', ' ')}</span>
                </div>
                <button type="button" role="menuitem" onClick={() => { navigate('/settings'); close(); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >My Profile</button>
                <button type="button" role="menuitem" onClick={() => { navigate('/classes'); close(); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >My Schedule</button>
                <button type="button" role="menuitem" onClick={() => { navigate('/settings'); close(); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >Change Password</button>
                <button type="button" role="menuitem" onClick={() => { navigate('/settings'); close(); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >Notification Preferences</button>
                <div className="my-1 h-px bg-gray-200" />
                <button type="button" role="menuitem" onClick={() => { logout(); close(); }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >Logout</button>
              </>
            )}
          </Dropdown>
        </div>
      </header>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          ref={overlayRef}
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`fixed top-14 left-0 bottom-0 w-64 bg-[#0d0000] z-30 transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        aria-label="Sidebar navigation"
      >
        <div className="flex flex-col h-full">
          {sidebarContent}
          <div className="p-3 border-t border-red-900/50">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} aria-hidden="true"></div>
              <span className="text-[10px] text-gray-500">{connected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main id="main-content" className="lg:ml-64 pt-14 min-h-screen">
        <div className="p-4 sm:p-6">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-16" role="status" aria-label="Loading page">
      <div className="space-y-3 w-full max-w-lg">
        <div className="h-8 bg-gray-200 rounded-lg animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
        <div className="h-32 bg-gray-200 rounded-lg animate-pulse mt-4"></div>
        <div className="h-8 bg-gray-200 rounded animate-pulse w-1/2"></div>
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}
