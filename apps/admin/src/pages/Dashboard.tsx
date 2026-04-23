import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '../lib/api';

interface AdminStats {
  active_listings: number;
  upcoming_events: number;
  active_posts: number;
  total_users: number;
  pending_moderation: number;
}

function StatCard({
  label,
  value,
  accent,
  loading,
}: {
  label: string;
  value: string | number;
  accent?: string;
  loading?: boolean;
}) {
  return (
    <div style={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 12, padding: 20 }}>
      <div style={{ color: '#606060', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: loading ? '#2A2A2A' : (accent ?? '#F5F5F5') }}>
        {loading ? '—' : value.toLocaleString()}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.get('/admin/stats'),
    staleTime: 60 * 1000,
  });

  const { data: pending, isLoading: modLoading } = useQuery({
    queryKey: ['moderation', 'queue'],
    queryFn: () => adminApi.get<any>('/moderation/queue'),
  });

  const pendingCount = stats?.pending_moderation
    ?? ((pending?.listings?.length ?? 0) + (pending?.events?.length ?? 0) + (pending?.posts?.length ?? 0));

  const flushCacheMutation = useMutation({
    mutationFn: () => adminApi.post('/admin/cache/flush', {}),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const isLoading = statsLoading || modLoading;

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F5F5F5', marginBottom: 4 }}>Dashboard</h1>
        <p style={{ color: '#606060', fontSize: 14 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard
          label="Pending Review"
          value={pendingCount}
          accent={pendingCount > 0 ? '#D4A853' : undefined}
          loading={isLoading}
        />
        <StatCard label="Active Listings" value={stats?.active_listings ?? 0} loading={isLoading} />
        <StatCard label="Upcoming Events" value={stats?.upcoming_events ?? 0} loading={isLoading} />
        <StatCard label="Community Posts" value={stats?.active_posts ?? 0} loading={isLoading} />
        <StatCard label="Total Users" value={stats?.total_users ?? 0} loading={isLoading} />
      </div>

      {pendingCount > 0 && (
        <div style={{
          backgroundColor: '#D4A85315',
          border: '1px solid #D4A85340',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 32,
        }}>
          <span style={{ fontSize: 20 }}>⚠</span>
          <div>
            <div style={{ color: '#D4A853', fontWeight: 600, fontSize: 14 }}>
              {pendingCount} item{pendingCount !== 1 ? 's' : ''} need moderation review
            </div>
            <div style={{ color: '#A0A0A0', fontSize: 12, marginTop: 2 }}>
              Visit the Moderation Queue to approve or reject pending content.
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 style={{ color: '#F5F5F5', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            {
              label: 'Flush feed cache',
              emoji: '↺',
              action: () => flushCacheMutation.mutate(),
              loading: flushCacheMutation.isPending,
            },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              disabled={item.loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                backgroundColor: '#1A1A1A',
                border: '1px solid #2A2A2A',
                borderRadius: 8,
                color: item.loading ? '#606060' : '#F5F5F5',
                cursor: item.loading ? 'not-allowed' : 'pointer',
                fontSize: 13,
              }}
            >
              <span>{item.emoji}</span>
              {item.loading ? 'Flushing…' : item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
