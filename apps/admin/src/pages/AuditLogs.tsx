import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';

interface AuditLog {
  id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id: string | null;
  ip_address: string | null;
  created_at: string;
}

const S = {
  page: { padding: 32 },
  h1: { fontSize: 24, fontWeight: 700 as const, color: '#F5F5F5', marginBottom: 4 },
  sub: { color: '#606060', fontSize: 14, marginBottom: 32 },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, padding: '10px 12px', color: '#606060', fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: 0.5, borderBottom: '1px solid #2A2A2A' },
  td: { padding: '12px 12px', borderBottom: '1px solid #1A1A1A', color: '#D0D0D0', fontSize: 13 },
};

export function AuditLogsPage() {
  const [search, setSearch] = useState('');

  const { data, fetchNextPage, hasNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['admin', 'audit-logs', search],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({
        limit: '50',
        ...(search && { action: search }),
        ...(pageParam && { cursor: pageParam }),
      });
      return adminApi.get<{ items: AuditLog[]; meta: { cursor?: string } }>(`/admin/audit-logs?${params}`);
    },
    getNextPageParam: (last: any) => last?.meta?.cursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });

  const logs = data?.pages.flatMap((p: any) => p.items ?? []) ?? [];

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Audit Logs</h1>
      <p style={S.sub}>Read-only history of all admin actions</p>

      <input
        placeholder="Filter by action…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, padding: '8px 12px', color: '#F5F5F5', fontSize: 14, width: 280, marginBottom: 20 }}
      />

      {isLoading ? <p style={{ color: '#606060' }}>Loading…</p> : (
        <>
          <table style={S.table}>
            <thead>
              <tr>{['Time', 'Actor', 'Role', 'Action', 'Target', 'IP'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {logs.map((log: AuditLog) => (
                <tr key={log.id}>
                  <td style={{ ...S.td, color: '#606060', whiteSpace: 'nowrap' as const }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 11 }}>{log.actor_id.slice(0, 8)}…</td>
                  <td style={S.td}>{log.actor_role}</td>
                  <td style={{ ...S.td, color: '#D4A853', fontFamily: 'monospace', fontSize: 12 }}>{log.action}</td>
                  <td style={{ ...S.td, color: '#A0A0A0', fontSize: 12 }}>
                    {log.target_type}{log.target_id ? ` · ${log.target_id.slice(0, 8)}…` : ''}
                  </td>
                  <td style={{ ...S.td, color: '#606060', fontSize: 11 }}>{log.ip_address ?? '—'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', color: '#606060' }}>No audit logs yet</td></tr>
              )}
            </tbody>
          </table>
          {hasNextPage && (
            <button onClick={() => fetchNextPage()}
              style={{ marginTop: 16, padding: '8px 20px', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, color: '#A0A0A0', cursor: 'pointer', fontSize: 13 }}>
              Load more
            </button>
          )}
        </>
      )}
    </div>
  );
}
