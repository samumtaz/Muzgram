import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';

interface NotifLog {
  id: string;
  user_id: string;
  idempotency_key: string;
  expo_ticket_id: string | null;
  delivery_status: string | null;
  created_at: string;
}

interface NotifStats {
  sent_today: number;
  delivery_rate: number;
  opt_in_rate: number;
}

const S = {
  page: { padding: 32 },
  h1: { fontSize: 24, fontWeight: 700 as const, color: '#F5F5F5', marginBottom: 4 },
  sub: { color: '#606060', fontSize: 14, marginBottom: 32 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 },
  card: { background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 12, padding: 20 },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, padding: '10px 12px', color: '#606060', fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: 0.5, borderBottom: '1px solid #2A2A2A' },
  td: { padding: '12px 12px', borderBottom: '1px solid #1A1A1A', color: '#D0D0D0', fontSize: 13 },
};

export function NotificationsLogPage() {
  const { data: stats } = useQuery<NotifStats>({
    queryKey: ['admin', 'notif-stats'],
    queryFn: () => adminApi.get('/admin/notification-stats'),
  });

  const { data: logs = [] } = useQuery<NotifLog[]>({
    queryKey: ['admin', 'notif-logs'],
    queryFn: () => adminApi.get('/admin/notification-logs'),
  });

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Notifications Log</h1>
      <p style={S.sub}>Push notification delivery history and rates</p>

      <div style={S.grid}>
        {[
          { label: 'Sent Today', value: stats?.sent_today ?? '—' },
          { label: 'Delivery Rate', value: stats ? `${stats.delivery_rate}%` : '—' },
          { label: 'Opt-In Rate', value: stats ? `${stats.opt_in_rate}%` : '—' },
        ].map((m) => (
          <div key={m.label} style={S.card}>
            <div style={{ color: '#606060', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#D4A853' }}>{m.value}</div>
          </div>
        ))}
      </div>

      <table style={S.table}>
        <thead>
          <tr>{['Time', 'User', 'Ticket ID', 'Status'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr><td colSpan={4} style={{ ...S.td, textAlign: 'center', color: '#606060' }}>No logs yet</td></tr>
          ) : logs.map((l) => (
            <tr key={l.id}>
              <td style={{ ...S.td, color: '#606060' }}>{new Date(l.created_at).toLocaleString()}</td>
              <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 11 }}>{l.user_id.slice(0, 8)}…</td>
              <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 11, color: '#A0A0A0' }}>
                {l.expo_ticket_id?.slice(0, 12) ?? '—'}
              </td>
              <td style={S.td}>
                <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: l.delivery_status === 'ok' ? '#0F2E0F' : '#2A1A1A',
                  color: l.delivery_status === 'ok' ? '#4ADE80' : '#F87171' }}>
                  {l.delivery_status ?? 'pending'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
