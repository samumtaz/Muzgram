import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';

interface Ticket {
  id: string;
  subject: string;
  user_phone: string;
  status: 'open' | 'in_progress' | 'resolved';
  created_at: string;
  last_message_at: string;
  message_count: number;
}

const S = {
  page: { padding: 32 },
  h1: { fontSize: 24, fontWeight: 700 as const, color: '#F5F5F5', marginBottom: 4 },
  sub: { color: '#606060', fontSize: 14, marginBottom: 32 },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, padding: '10px 12px', color: '#606060', fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: 0.5, borderBottom: '1px solid #2A2A2A' },
  td: { padding: '14px 12px', borderBottom: '1px solid #1A1A1A', color: '#D0D0D0', fontSize: 14 },
};

const STATUS_STYLE: Record<Ticket['status'], { bg: string; color: string }> = {
  open: { bg: '#2A1A0F', color: '#F97316' },
  in_progress: { bg: '#0F1A2E', color: '#60A5FA' },
  resolved: { bg: '#0F2E0F', color: '#4ADE80' },
};

export function SupportPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'open' | 'all'>('open');

  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
    queryKey: ['admin', 'support', filter],
    queryFn: () => adminApi.get(`/admin/support-tickets?status=${filter === 'open' ? 'open,in_progress' : ''}`),
  });

  const { mutate: resolve } = useMutation({
    mutationFn: (id: string) => adminApi.patch(`/admin/support-tickets/${id}`, { status: 'resolved' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'support'] }),
  });

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Support Tickets</h1>
      <p style={S.sub}>User-submitted support requests</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['open', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 14px', borderRadius: 999, fontSize: 13, border: '1px solid', borderColor: filter === f ? '#D4A853' : '#2A2A2A', background: filter === f ? '#D4A85320' : 'transparent', color: filter === f ? '#D4A853' : '#A0A0A0', cursor: 'pointer', fontWeight: filter === f ? 600 : 400 }}>
            {f === 'open' ? 'Open' : 'All'}
          </button>
        ))}
      </div>

      {isLoading ? <p style={{ color: '#606060' }}>Loading…</p> : (
        <table style={S.table}>
          <thead>
            <tr>{['Subject', 'User', 'Messages', 'Status', 'Last Update', ''].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', color: '#606060' }}>No tickets</td></tr>
            ) : tickets.map((t) => (
              <tr key={t.id}>
                <td style={{ ...S.td, color: '#F5F5F5' }}>{t.subject}</td>
                <td style={S.td}>{t.user_phone}</td>
                <td style={{ ...S.td, color: '#606060' }}>{t.message_count}</td>
                <td style={S.td}>
                  <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, ...STATUS_STYLE[t.status] }}>
                    {t.status.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ ...S.td, color: '#606060' }}>{new Date(t.last_message_at).toLocaleDateString()}</td>
                <td style={S.td}>
                  {t.status !== 'resolved' && (
                    <button onClick={() => resolve(t.id)}
                      style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, border: '1px solid #4ADE80', color: '#4ADE80', background: 'transparent', cursor: 'pointer' }}>
                      Resolve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
