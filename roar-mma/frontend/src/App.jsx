import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { LocationProvider } from './contexts/LocationContext';
import { queryClient } from './lib/queryClient';
import ErrorBoundary from './components/Shared/ErrorBoundary';
import PageWrapper from './components/PageWrapper';
import NotFound from './pages/NotFound';

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
const MissionControl = lazy(() => import('./pages/MissionControl'));
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
const PerfectGymHub = lazy(() => import('./pages/PerfectGymHub'));
const StaffSchedule = lazy(() => import('./pages/StaffSchedule'));
const Subscriptions = lazy(() => import('./pages/Subscriptions'));
const FamilyDiscounts = lazy(() => import('./pages/FamilyDiscounts'));
const LeadScoring = lazy(() => import('./pages/LeadScoring'));
const Retention = lazy(() => import('./pages/Retention'));
const MakeupClasses = lazy(() => import('./pages/MakeupClasses'));
const PTSessions = lazy(() => import('./pages/PTSessions'));
const PhoneSystem = lazy(() => import('./pages/PhoneSystem'));
const Privacy = lazy(() => import('./pages/Privacy'));
const InventoryManagement = lazy(() => import('./pages/InventoryManagement'));

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
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full border-b-2 border-blue-600 h-12 w-12"></div></div>}>
                <Routes>
                  <Route path="/login" element={<PageWrapper title="Login"><Login /></PageWrapper>} />
                  <Route path="/kiosk/waiver" element={<PageWrapper title="Kiosk Waiver"><KioskWaiver /></PageWrapper>} />
                  <Route path="/portal/*" element={<PageWrapper title="Member Portal"><MemberPortal /></PageWrapper>} />

                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <AppShell />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<PageWrapper title="Dashboard"><Dashboard /></PageWrapper>} />
                    <Route path="members" element={<PageWrapper title="Members"><Members /></PageWrapper>} />
                    <Route path="members/:id" element={<PageWrapper title="Member Profile"><MemberProfile /></PageWrapper>} />
                    <Route path="classes" element={<PageWrapper title="Classes"><Classes /></PageWrapper>} />
                    <Route path="leads" element={<PageWrapper title="Leads"><Leads /></PageWrapper>} />
                    <Route path="leads/wizard" element={<PageWrapper title="Leads Wizard"><LeadsWizard /></PageWrapper>} />
                    <Route path="billing" element={<PageWrapper title="Billing"><Billing /></PageWrapper>} />
                    <Route path="staff" element={<PageWrapper title="Staff"><Staff /></PageWrapper>} />
                    <Route path="reports" element={<PageWrapper title="Reports"><Reports /></PageWrapper>} />
                    <Route path="ai" element={<PageWrapper title="AI Assistant"><AIAssistant /></PageWrapper>} />
                    <Route path="ai-dashboard" element={<PageWrapper title="AI Dashboard"><AIDashboard /></PageWrapper>} />
                    <Route path="agents" element={<PageWrapper title="Agent Tracking"><AgentTracking /></PageWrapper>} />
                    <Route path="mission-control" element={<PageWrapper title="Mission Control"><MissionControl /></PageWrapper>} />
                    <Route path="calendar" element={<PageWrapper title="Calendar"><Calendar /></PageWrapper>} />
                    <Route path="communications" element={<PageWrapper title="Communications"><Communications /></PageWrapper>} />
                    <Route path="settings" element={<PageWrapper title="Settings"><Settings /></PageWrapper>} />
                    <Route path="trial-conversion" element={<PageWrapper title="Trial Conversion"><TrialConversionDashboard /></PageWrapper>} />
                    <Route path="coaching" element={<PageWrapper title="Coaching"><Coaching /></PageWrapper>} />
                    <Route path="gradings" element={<PageWrapper title="Gradings"><Gradings /></PageWrapper>} />
                    <Route path="pos" element={<PageWrapper title="POS"><POS /></PageWrapper>} />
                    <Route path="inventory" element={<PageWrapper title="Inventory"><InventoryManagement /></PageWrapper>} />
                    <Route path="waivers" element={<PageWrapper title="Waivers"><Waivers /></PageWrapper>} />
                    <Route path="social-media" element={<PageWrapper title="Social Media"><SocialMedia /></PageWrapper>} />
                    <Route path="approval-queue" element={<PageWrapper title="Approval Queue"><ApprovalQueue /></PageWrapper>} />
                    <Route path="workflows" element={<PageWrapper title="Workflows"><WorkflowBuilder /></PageWrapper>} />
                    <Route path="perfectgym" element={<PageWrapper title="PerfectGym"><PerfectGymHub /></PageWrapper>} />
                    <Route path="staff-schedule" element={<PageWrapper title="Staff Schedule"><StaffSchedule /></PageWrapper>} />
                    <Route path="subscriptions" element={<PageWrapper title="Subscriptions"><Subscriptions /></PageWrapper>} />
                    <Route path="family-discounts" element={<PageWrapper title="Family Discounts"><FamilyDiscounts /></PageWrapper>} />
                    <Route path="lead-scoring" element={<PageWrapper title="Lead Scoring"><LeadScoring /></PageWrapper>} />
                    <Route path="retention" element={<PageWrapper title="Retention"><Retention /></PageWrapper>} />
                    <Route path="makeup-classes" element={<PageWrapper title="Makeup Classes"><MakeupClasses /></PageWrapper>} />
                    <Route path="pt-sessions" element={<PageWrapper title="PT Sessions"><PTSessions /></PageWrapper>} />
                    <Route path="phone-system" element={<PageWrapper title="Phone System"><PhoneSystem /></PageWrapper>} />
                    <Route path="privacy" element={<PageWrapper title="Privacy"><Privacy /></PageWrapper>} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
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
