import { useQuery } from '@tanstack/react-query';

import { adminApi } from '../lib/api';

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div style={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 12, padding: 20 }}>
      <div style={{ color: '#606060', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: accent ?? '#F5F5F5' }}>{value.toLocaleString()}</div>
    </div>
  );
}

export function DashboardPage() {
  // In production: add a dedicated /admin/stats endpoint
  const { data: pending } = useQuery({
    queryKey: ['moderation', 'queue'],
    queryFn: () => adminApi.get<any>('/moderation/queue'),
  });

  const pendingCount = (pending?.listings?.length ?? 0) + (pending?.events?.length ?? 0) + (pending?.posts?.length ?? 0);

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F5F5F5', marginBottom: 4 }}>Dashboard</h1>
        <p style={{ color: '#606060', fontSize: 14 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Pending Review" value={pendingCount} accent={pendingCount > 0 ? '#D4A853' : undefined} />
        <StatCard label="Active Listings" value={0} />
        <StatCard label="Upcoming Events" value={0} />
        <StatCard label="Active Posts" value={0} />
        <StatCard label="Total Users" value={0} />
      </div>

      {pendingCount > 0 && (
        <div style={{ backgroundColor: '#D4A85315', border: '1px solid #D4A85340', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚠</span>
          <div>
            <div style={{ color: '#D4A853', fontWeight: 600, fontSize: 14 }}>
              {pendingCount} items need moderation review
            </div>
            <div style={{ color: '#A0A0A0', fontSize: 12, marginTop: 2 }}>
              Visit the Moderation Queue to approve or reject pending content.
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <h2 style={{ color: '#F5F5F5', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Quick actions</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Import listings (CSV)', emoji: '↑', action: () => {} },
            { label: 'Seed city data', emoji: '◎', action: () => {} },
            { label: 'Flush feed cache', emoji: '↺', action: () => {} },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, color: '#F5F5F5', cursor: 'pointer', fontSize: 13 }}
            >
              <span>{item.emoji}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
