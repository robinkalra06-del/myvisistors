import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { DashboardLayout } from '../components/layout/DashboardLayout.jsx';

// Pages
import { OverviewPage } from '../pages/OverviewPage.jsx';
import { LiveVisitorsPage } from '../pages/LiveVisitorsPage.jsx';
import { VisitorHistoryPage } from '../pages/VisitorHistoryPage.jsx';
import { WebsitesPage } from '../pages/WebsitesPage.jsx';
import { InstallationPage } from '../pages/InstallationPage.jsx';
import { AnalyticsPage } from '../pages/AnalyticsPage.jsx';
import { CustomEventsPage } from '../pages/CustomEventsPage.jsx';
import { ActivityFeedPage } from '../pages/ActivityFeedPage.jsx';
import { NotificationsPage } from '../pages/NotificationsPage.jsx';
import { TeamMembersPage } from '../pages/TeamMembersPage.jsx';
import { AdminDashboardPage } from '../pages/AdminDashboardPage.jsx';
import { SettingsPage } from '../pages/SettingsPage.jsx';
import { DocumentationPage } from '../pages/DocumentationPage.jsx';

// Auth Pages
import { LoginPage } from '../pages/LoginPage.jsx';
import { RegisterPage } from '../pages/RegisterPage.jsx';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage.jsx';
import { ResetPasswordPage } from '../pages/ResetPasswordPage.jsx';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/" replace />;
  }
  return children;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected App Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="live" element={<LiveVisitorsPage />} />
        <Route path="history" element={<VisitorHistoryPage />} />
        <Route path="websites" element={<WebsitesPage />} />
        <Route path="installation" element={<InstallationPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="events" element={<CustomEventsPage />} />
        <Route path="activity" element={<ActivityFeedPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="team" element={<TeamMembersPage />} />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="docs" element={<DocumentationPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
