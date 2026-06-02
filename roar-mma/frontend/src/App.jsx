import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { LocationProvider } from './contexts/LocationContext';
import { queryClient } from './lib/queryClient';
import ErrorBoundary from './components/Shared/ErrorBoundary';

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
const Settings = lazy(() => import('./pages/Settings'));
const TrialConversionDashboard = lazy(() => import('./pages/TrialConversionDashboard'));
const MemberProfile = lazy(() => import('./pages/MemberProfile'));
const Coaching = lazy(() => import('./pages/Coaching'));
const Gradings = lazy(() => import('./pages/Gradings'));
const POS = lazy(() => import('./pages/POS'));
const Waivers = lazy(() => import('./pages/Waivers'));
const SocialMedia = lazy(() => import('./pages/SocialMedia'));
const KioskWaiver = lazy(() => import('./pages/KioskWaiver'));
const ApprovalQueue = lazy(() => import('./pages/ApprovalQueue'));
const LeadsWizard = lazy(() => import('./pages/LeadsWizard'));
const MemberPortal = lazy(() => import('./pages/MemberPortal'));
const WorkflowBuilder = lazy(() => import('./pages/WorkflowBuilder'));

import AppShell from './components/Layout/AppShell';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <LocationProvider>
          <WebSocketProvider>
            <NotificationProvider>
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/kiosk/waiver" element={<KioskWaiver />} />
                  <Route path="/portal/*" element={<MemberPortal />} />

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
                    <Route path="leads/wizard" element={<LeadsWizard />} />
                    <Route path="billing" element={<Billing />} />
                    <Route path="staff" element={<Staff />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="ai" element={<AIAssistant />} />
                    <Route path="ai-dashboard" element={<AIDashboard />} />
                    <Route path="agents" element={<AgentTracking />} />
                    <Route path="calendar" element={<Calendar />} />
                    <Route path="communications" element={<Communications />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="trial-conversion" element={<TrialConversionDashboard />} />
                    <Route path="coaching" element={<Coaching />} />
                    <Route path="gradings" element={<Gradings />} />
                    <Route path="pos" element={<POS />} />
                    <Route path="waivers" element={<Waivers />} />
                    <Route path="social-media" element={<SocialMedia />} />
                    <Route path="approval-queue" element={<ApprovalQueue />} />
                    <Route path="workflows" element={<WorkflowBuilder />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </NotificationProvider>
          </WebSocketProvider>
          </LocationProvider>
        </AuthProvider>
      </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
