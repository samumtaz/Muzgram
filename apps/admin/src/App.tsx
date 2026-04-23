import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AdminLayout } from './components/layout/AdminLayout';
import { RequireAuth } from './components/RequireAuth';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { EventsPage } from './pages/Events';
import { ListingsPage } from './pages/Listings';
import { ModerationQueuePage } from './pages/ModerationQueue';
import { PostsPage } from './pages/Posts';
import { UsersPage } from './pages/Users';
import { CitiesPage } from './pages/Cities';
import { RevenuePage } from './pages/Revenue';
import { VerificationsPage } from './pages/Verifications';
import { AuditLogsPage } from './pages/AuditLogs';
import { SupportPage } from './pages/Support';
import { LeadsPage } from './pages/Leads';
import { NotificationsLogPage } from './pages/NotificationsLog';
import { AdminSettingsPage } from './pages/AdminSettings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30 * 1000 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<AdminLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="moderation" element={<ModerationQueuePage />} />
              <Route path="listings" element={<ListingsPage />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="posts" element={<PostsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="verifications" element={<VerificationsPage />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="revenue" element={<RevenuePage />} />
              <Route path="cities" element={<CitiesPage />} />
              <Route path="notifications-log" element={<NotificationsLogPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="support" element={<SupportPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
