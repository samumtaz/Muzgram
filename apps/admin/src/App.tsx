import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AdminLayout } from './components/layout/AdminLayout';
import { DashboardPage } from './pages/Dashboard';
import { EventsPage } from './pages/Events';
import { ListingsPage } from './pages/Listings';
import { ModerationQueuePage } from './pages/ModerationQueue';
import { PostsPage } from './pages/Posts';
import { UsersPage } from './pages/Users';

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
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="moderation" element={<ModerationQueuePage />} />
            <Route path="listings" element={<ListingsPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="posts" element={<PostsPage />} />
            <Route path="users" element={<UsersPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
