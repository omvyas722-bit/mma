// Main App component with routing
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { queryClient } from './lib/queryClient';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Classes from './pages/Classes';
import Leads from './pages/Leads';
import Reports from './pages/Reports';
import Billing from './pages/Billing';
import Staff from './pages/Staff';
import AIAssistant from './pages/AIAssistant';
import AIDashboard from './pages/AIDashboard';

// Layout
import AppShell from './components/Layout/AppShell';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <WebSocketProvider>
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
                <Route path="classes" element={<Classes />} />
                <Route path="leads" element={<Leads />} />
                <Route path="billing" element={<Billing />} />
                <Route path="staff" element={<Staff />} />
                <Route path="reports" element={<Reports />} />
                <Route path="ai" element={<AIAssistant />} />
                <Route path="ai-dashboard" element={<AIDashboard />} />
              </Route>

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </WebSocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
