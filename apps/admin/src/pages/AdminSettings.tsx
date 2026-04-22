import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';

interface Settings {
  founding_member_slots: number;
  founding_member_price_usd: number;
  feed_default_radius_km: number;
  rate_limit_max: number;
  moderation_auto_approve: boolean;
}

const S = {
  page: { padding: 32 },
  h1: { fontSize: 24, fontWeight: 700 as const, color: '#F5F5F5', marginBottom: 4 },
  sub: { color: '#606060', fontSize: 14, marginBottom: 32 },
  section: { background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 12, padding: 24, marginBottom: 24 },
  sTitle: { fontSize: 15, fontWeight: 600 as const, color: '#F5F5F5', marginBottom: 16 },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #1D1D1D' },
  label: { color: '#D0D0D0', fontSize: 14 },
  desc: { color: '#606060', fontSize: 12, marginTop: 2 },
  input: { background: '#111', border: '1px solid #2A2A2A', borderRadius: 8, padding: '6px 10px', color: '#F5F5F5', fontSize: 14, width: 100, textAlign: 'right' as const },
};

export function AdminSettingsPage() {
  const qc = useQueryClient();

  const { data: settings } = useQuery<Settings>({
    queryKey: ['admin', 'settings'],
    queryFn: () => adminApi.get('/admin/settings'),
  });

  const [local, setLocal] = useState<Partial<Settings>>({});
  const merged = { ...settings, ...local } as Settings;

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => adminApi.patch('/admin/settings', local),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
      setLocal({});
    },
  });

  const fields: { key: keyof Settings; label: string; desc: string; type: 'number' | 'toggle' }[] = [
    { key: 'founding_member_slots', label: 'Founding Member Slots', desc: 'Total available founding member spots', type: 'number' },
    { key: 'founding_member_price_usd', label: 'Founding Member Price ($)', desc: 'One-time founding member fee', type: 'number' },
    { key: 'feed_default_radius_km', label: 'Default Feed Radius (km)', desc: 'Default search radius for feed', type: 'number' },
    { key: 'rate_limit_max', label: 'Rate Limit (req/min)', desc: 'Max requests per minute per IP', type: 'number' },
    { key: 'moderation_auto_approve', label: 'Auto-Approve Content', desc: 'Skip manual review for low-risk content', type: 'toggle' },
  ];

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={S.h1}>Settings</h1>
          <p style={S.sub}>Platform configuration and feature flags</p>
        </div>
        {Object.keys(local).length > 0 && (
          <button onClick={() => save()} disabled={isPending}
            style={{ padding: '8px 20px', background: '#D4A853', color: '#0D0D0D', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
            {isPending ? 'Saving…' : 'Save Changes'}
          </button>
        )}
      </div>

      <div style={S.section}>
        <div style={S.sTitle}>Platform Config</div>
        {fields.map((f) => (
          <div key={f.key} style={S.row}>
            <div>
              <div style={S.label}>{f.label}</div>
              <div style={S.desc}>{f.desc}</div>
            </div>
            {f.type === 'toggle' ? (
              <button
                onClick={() => setLocal((l) => ({ ...l, [f.key]: !merged[f.key] }))}
                style={{ width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: merged[f.key] ? '#C9A84C' : '#374151', position: 'relative' as const, transition: 'background 0.2s' }}>
                <span style={{ display: 'block', width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3, left: merged[f.key] ? 23 : 3, transition: 'left 0.2s' }} />
              </button>
            ) : (
              <input
                type="number"
                style={S.input}
                value={merged[f.key] as number ?? ''}
                onChange={(e) => setLocal((l) => ({ ...l, [f.key]: Number(e.target.value) }))}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
