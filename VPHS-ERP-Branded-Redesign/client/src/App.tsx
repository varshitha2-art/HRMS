import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { MainLayout } from './layouts/MainLayout';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { Sites } from './pages/Sites';
import { AttendancePage } from './pages/Attendance';
import { Leaves } from './pages/Leaves';
import { PayrollPage } from './pages/Payroll';
import { DocumentsPage } from './pages/Documents';
import { ReportsPage } from './pages/Reports';
import { DataImport } from './pages/DataImport';
import { SettingsPage } from './pages/Settings';
import { AuditLogs } from './pages/AuditLogs';
import { Profile } from './pages/Profile';
import { UserRole } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: UserRole[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-amber-600 font-bold text-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-600 mr-3" />
        Loading VPHS ERP Portal...
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user.role !== 'SUPER_ADMIN' && !allowedRoles.includes(user.role as UserRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Landing Home Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Public Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Portal Layout */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
            </Route>

            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route
                path="/employees"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HR', 'SITE_MANAGER']}>
                    <Employees />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sites"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'SITE_MANAGER']}>
                    <Sites />
                  </ProtectedRoute>
                }
              />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/leaves" element={<Leaves />} />
              <Route path="/payroll" element={<PayrollPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HR', 'SITE_MANAGER']}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/import"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HR']}>
                    <DataImport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <AuditLogs />
                  </ProtectedRoute>
                }
              />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Catch All */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
