import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';

interface Verification {
  id: string;
  business_name: string;
  contact_name: string;
  contact_phone: string;
  submission_date: string;
  status: 'pending' | 'approved' | 'rejected';
  doc_urls: string[];
  notes: string | null;
}

const S = {
  page: { padding: 32 },
  h1: { fontSize: 24, fontWeight: 700 as const, color: '#F5F5F5', marginBottom: 4 },
  sub: { color: '#606060', fontSize: 14, marginBottom: 32 },
  card: { background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 12, padding: 20, marginBottom: 16 },
  row: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  label: { color: '#606060', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4 },
  val: { color: '#F5F5F5', fontSize: 14 },
  btnRow: { display: 'flex', gap: 8, marginTop: 16 },
};

const btn = (color: string, bg: string) => ({
  padding: '6px 16px', borderRadius: 8, fontSize: 13, border: 'none',
  background: bg, color, cursor: 'pointer' as const, fontWeight: 600 as const,
});

export function VerificationsPage() {
  const qc = useQueryClient();

  const { data: verifications = [], isLoading } = useQuery<Verification[]>({
    queryKey: ['admin', 'verifications'],
    queryFn: () => adminApi.get('/admin/verifications'),
  });

  const { mutate: decide } = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      adminApi.patch(`/admin/verifications/${id}`, { status, notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'verifications'] }),
  });

  const pending = verifications.filter((v) => v.status === 'pending');
  const reviewed = verifications.filter((v) => v.status !== 'pending');

  const renderCard = (v: Verification) => (
    <div key={v.id} style={S.card}>
      <div style={S.row}>
        <div>
          <div style={{ color: '#F5F5F5', fontSize: 16, fontWeight: 600 }}>{v.business_name}</div>
          <div style={{ color: '#A0A0A0', fontSize: 13, marginTop: 2 }}>
            {v.contact_name} · {v.contact_phone}
          </div>
        </div>
        <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
          background: v.status === 'pending' ? '#2A2010' : v.status === 'approved' ? '#0F2E0F' : '#2A1A1A',
          color: v.status === 'pending' ? '#D4A853' : v.status === 'approved' ? '#4ADE80' : '#F87171' }}>
          {v.status}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' as const }}>
        {[{ label: 'Submitted', val: new Date(v.submission_date).toLocaleDateString() }].map(({ label, val }) => (
          <div key={label}>
            <div style={S.label}>{label}</div>
            <div style={S.val}>{val}</div>
          </div>
        ))}
      </div>

      {v.doc_urls.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={S.label}>Documents</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
            {v.doc_urls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener" style={{ color: '#D4A853', fontSize: 13 }}>
                View Doc {i + 1} ↗
              </a>
            ))}
          </div>
        </div>
      )}

      {v.status === 'pending' && (
        <div style={S.btnRow}>
          <button onClick={() => decide({ id: v.id, status: 'approved' })} style={btn('#0D0D0D', '#4ADE80')}>
            ✓ Approve
          </button>
          <button onClick={() => decide({ id: v.id, status: 'rejected' })} style={btn('#F5F5F5', '#F87171')}>
            ✗ Reject
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Business Verifications</h1>
      <p style={S.sub}>Review and approve business listing claims</p>

      {isLoading ? <p style={{ color: '#606060' }}>Loading…</p> : (
        <>
          {pending.length > 0 && (
            <div>
              <h2 style={{ fontSize: 14, color: '#D4A853', marginBottom: 16 }}>
                Pending ({pending.length})
              </h2>
              {pending.map(renderCard)}
            </div>
          )}
          {reviewed.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <h2 style={{ fontSize: 14, color: '#606060', marginBottom: 16 }}>
                Reviewed ({reviewed.length})
              </h2>
              {reviewed.map(renderCard)}
            </div>
          )}
          {verifications.length === 0 && (
            <p style={{ color: '#606060' }}>No verification requests yet.</p>
          )}
        </>
      )}
    </div>
  );
}
