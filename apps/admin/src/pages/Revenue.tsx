import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';

interface RevenueStats {
  mrr: number;
  arr: number;
  active_subscriptions: number;
  new_this_month: number;
  churned_this_month: number;
}

interface Payment {
  id: string;
  business_name: string;
  amount_cents: number;
  product: string;
  status: string;
  created_at: string;
}

const S = {
  page: { padding: 32 },
  h1: { fontSize: 24, fontWeight: 700 as const, color: '#F5F5F5', marginBottom: 4 },
  sub: { color: '#606060', fontSize: 14, marginBottom: 32 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 },
  card: { background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 12, padding: 20 },
  cardLabel: { color: '#606060', fontSize: 12, marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  cardValue: { fontSize: 32, fontWeight: 700 as const, color: '#D4A853' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, padding: '10px 12px', color: '#606060', fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: 0.5, borderBottom: '1px solid #2A2A2A' },
  td: { padding: '14px 12px', borderBottom: '1px solid #1A1A1A', color: '#D0D0D0', fontSize: 14 },
};

export function RevenuePage() {
  const { data: stats } = useQuery<RevenueStats>({
    queryKey: ['admin', 'revenue', 'stats'],
    queryFn: () => adminApi.get('/admin/revenue'),
  });

  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ['admin', 'revenue', 'payments'],
    queryFn: () => adminApi.get('/admin/revenue/payments'),
  });

  const fmt$ = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Revenue</h1>
      <p style={S.sub}>Stripe subscriptions and payment history</p>

      <div style={S.grid}>
        {[
          { label: 'MRR', value: stats ? fmt$(stats.mrr) : '—' },
          { label: 'ARR', value: stats ? fmt$(stats.arr) : '—' },
          { label: 'Active Subs', value: stats?.active_subscriptions ?? '—' },
          { label: 'New This Month', value: stats?.new_this_month ?? '—' },
          { label: 'Churned', value: stats?.churned_this_month ?? '—' },
        ].map((m) => (
          <div key={m.label} style={S.card}>
            <div style={S.cardLabel}>{m.label}</div>
            <div style={S.cardValue}>{m.value}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: '#F5F5F5', marginBottom: 16 }}>Recent Payments</h2>
      <table style={S.table}>
        <thead>
          <tr>{['Business', 'Product', 'Amount', 'Status', 'Date'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {payments.length === 0 ? (
            <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', color: '#606060' }}>No payments yet</td></tr>
          ) : payments.map((p) => (
            <tr key={p.id}>
              <td style={S.td}>{p.business_name}</td>
              <td style={S.td}>{p.product}</td>
              <td style={{ ...S.td, color: '#D4A853' }}>{fmt$(p.amount_cents)}</td>
              <td style={S.td}>
                <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: p.status === 'succeeded' ? '#0F2E0F' : '#2A1A1A', color: p.status === 'succeeded' ? '#4ADE80' : '#F87171' }}>
                  {p.status}
                </span>
              </td>
              <td style={{ ...S.td, color: '#606060' }}>{new Date(p.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
