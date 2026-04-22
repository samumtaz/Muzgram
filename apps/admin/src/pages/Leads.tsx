import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';

interface LeadStats {
  total_today: number;
  total_this_week: number;
  delivery_rate: number;
  top_businesses: { name: string; lead_count: number }[];
}

const S = {
  page: { padding: 32 },
  h1: { fontSize: 24, fontWeight: 700 as const, color: '#F5F5F5', marginBottom: 4 },
  sub: { color: '#606060', fontSize: 14, marginBottom: 32 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 },
  card: { background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 12, padding: 20 },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, padding: '10px 12px', color: '#606060', fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: 0.5, borderBottom: '1px solid #2A2A2A' },
  td: { padding: '14px 12px', borderBottom: '1px solid #1A1A1A', color: '#D0D0D0', fontSize: 14 },
};

export function LeadsPage() {
  const { data: stats } = useQuery<LeadStats>({
    queryKey: ['admin', 'leads'],
    queryFn: () => adminApi.get('/admin/leads'),
  });

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Leads</h1>
      <p style={S.sub}>Lead volume analytics and delivery stats</p>

      <div style={S.grid}>
        {[
          { label: 'Today', value: stats?.total_today ?? '—', color: '#D4A853' },
          { label: 'This Week', value: stats?.total_this_week ?? '—', color: '#D4A853' },
          { label: 'Delivery Rate', value: stats ? `${stats.delivery_rate}%` : '—', color: '#4ADE80' },
        ].map((m) => (
          <div key={m.label} style={S.card}>
            <div style={{ color: '#606060', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: '#F5F5F5', marginBottom: 16 }}>Top Businesses by Leads</h2>
      <table style={S.table}>
        <thead>
          <tr>{['Business', 'Leads Received'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {(stats?.top_businesses ?? []).length === 0 ? (
            <tr><td colSpan={2} style={{ ...S.td, textAlign: 'center', color: '#606060' }}>No data yet</td></tr>
          ) : stats?.top_businesses.map((b) => (
            <tr key={b.name}>
              <td style={S.td}>{b.name}</td>
              <td style={{ ...S.td, color: '#D4A853' }}>{b.lead_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
