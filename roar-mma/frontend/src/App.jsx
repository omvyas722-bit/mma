// Main App component with routing
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { queryClient } from './lib/queryClient';
import ErrorBoundary from './components/Shared/ErrorBoundary';

// Lazy-loaded pages
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Members = lazy(() => import('./pages/Members'));
const Classes = lazy(() => import('./pages/Classes'));
const Leads = lazy(() => import('./pages/Leads'));
const Reports = lazy(() => import('./pages/Reports'));
const Billing = lazy(() => import('./pages/Billing'));
const Staff = lazy(() => import('./pages/Staff'));
const AIAssistant = lazy(() => import('./pages/AIAssistant'));
const AIDashboard = lazy(() => import('./pages/AIDashboard'));
const AgentTracking = lazy(() => import('./pages/AgentTracking'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Communications = lazy(() => import('./pages/Communications'));
const Payments = lazy(() => import('./pages/Payments'));
const Settings = lazy(() => import('./pages/Settings'));
const TrialConversionDashboard = lazy(() => import('./pages/TrialConversionDashboard'));
const MemberProfile = lazy(() => import('./pages/MemberProfile'));
const Coaching = lazy(() => import('./pages/Coaching'));

// Layout
import AppShell from './components/Layout/AppShell';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <WebSocketProvider>
            <NotificationProvider>
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />

                  {/* Protected routes */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <AppShell />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="members" element={<Members />} />
                    <Route path="members/:id" element={<MemberProfile />} />
                    <Route path="classes" element={<Classes />} />
                    <Route path="leads" element={<Leads />} />
                    <Route path="billing" element={<Billing />} />
                    <Route path="staff" element={<Staff />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="ai" element={<AIAssistant />} />
                    <Route path="ai-dashboard" element={<AIDashboard />} />
                    <Route path="agents" element={<AgentTracking />} />
                    <Route path="calendar" element={<Calendar />} />
                    <Route path="communications" element={<Communications />} />
                    <Route path="payments" element={<Payments />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="trial-conversion" element={<TrialConversionDashboard />} />
                    <Route path="coaching" element={<Coaching />} />
                  </Route>

                  {/* Catch all */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </NotificationProvider>
          </WebSocketProvider>
        </AuthProvider>
      </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
