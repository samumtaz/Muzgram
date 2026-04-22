import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';

interface City {
  id: string; slug: string; name: string; state: string;
  launch_status: string; listing_count: number; event_count: number;
  is_active: boolean;
}

const S = {
  page: { padding: 32 },
  h1: { fontSize: 24, fontWeight: 700 as const, color: '#F5F5F5', marginBottom: 4 },
  sub: { color: '#606060', fontSize: 14, marginBottom: 32 },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, padding: '10px 12px', color: '#606060', fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: 0.5, borderBottom: '1px solid #2A2A2A' },
  td: { padding: '14px 12px', borderBottom: '1px solid #1A1A1A', color: '#D0D0D0', fontSize: 14 },
  badge: (active: boolean) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 as const,
    background: active ? '#0F2E0F' : '#2A1A1A', color: active ? '#4ADE80' : '#F87171',
  }),
  btn: (color: string) => ({
    padding: '4px 10px', borderRadius: 6, fontSize: 12, border: `1px solid ${color}`,
    color, background: 'transparent', cursor: 'pointer' as const,
  }),
  form: { background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 12, padding: 24, marginBottom: 32 },
  input: { width: '100%', background: '#111', border: '1px solid #2A2A2A', borderRadius: 8, padding: '8px 12px', color: '#F5F5F5', fontSize: 14, boxSizing: 'border-box' as const },
  label: { color: '#A0A0A0', fontSize: 12, display: 'block', marginBottom: 4 },
};

export function CitiesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', state: '' });

  const { data: cities = [], isLoading } = useQuery<City[]>({
    queryKey: ['admin', 'cities'],
    queryFn: () => adminApi.get('/admin/cities'),
  });

  const { mutate: toggleLaunch } = useMutation({
    mutationFn: (city: City) =>
      adminApi.patch(`/admin/cities/${city.id}`, {
        launch_status: city.launch_status === 'active' ? 'inactive' : 'active',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'cities'] }),
  });

  const { mutate: addCity, isPending } = useMutation({
    mutationFn: () => adminApi.post('/admin/cities', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'cities'] });
      setForm({ name: '', slug: '', state: '' });
      setShowForm(false);
    },
  });

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={S.h1}>Cities</h1>
          <p style={S.sub}>Manage active cities and launch status</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ padding: '8px 16px', background: '#D4A853', color: '#0D0D0D', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
          + Add City
        </button>
      </div>

      {showForm && (
        <div style={S.form}>
          <h3 style={{ color: '#F5F5F5', marginBottom: 16 }}>New City</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 16, marginBottom: 16 }}>
            {[['name', 'City Name', 'e.g. Chicago'], ['slug', 'Slug', 'e.g. chicago'], ['state', 'State (2-letter)', 'IL']].map(([k, label, ph]) => (
              <div key={k}>
                <label style={S.label}>{label}</label>
                <input style={S.input} placeholder={ph} value={(form as any)[k]}
                  onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
          </div>
          <button onClick={() => addCity()} disabled={isPending || !form.name || !form.slug}
            style={{ padding: '8px 20px', background: form.name && form.slug ? '#D4A853' : '#333', color: form.name && form.slug ? '#0D0D0D' : '#606060', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            {isPending ? 'Adding…' : 'Add City'}
          </button>
        </div>
      )}

      {isLoading ? <p style={{ color: '#606060' }}>Loading…</p> : (
        <table style={S.table}>
          <thead>
            <tr>{['City', 'State', 'Slug', 'Listings', 'Events', 'Status', ''].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {cities.map((city) => (
              <tr key={city.id}>
                <td style={S.td}>{city.name}</td>
                <td style={S.td}>{city.state}</td>
                <td style={{ ...S.td, color: '#606060', fontFamily: 'monospace' }}>{city.slug}</td>
                <td style={S.td}>{city.listing_count.toLocaleString()}</td>
                <td style={S.td}>{city.event_count.toLocaleString()}</td>
                <td style={S.td}>
                  <span style={S.badge(city.launch_status === 'active')}>{city.launch_status}</span>
                </td>
                <td style={S.td}>
                  <button onClick={() => toggleLaunch(city)}
                    style={S.btn(city.launch_status === 'active' ? '#F87171' : '#4ADE80')}>
                    {city.launch_status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
