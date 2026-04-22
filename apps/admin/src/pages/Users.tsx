import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserTrustTier } from '@muzgram/types';
import { adminApi } from '../lib/api';

const TRUST_TIER_LABELS: Record<number, string> = {
  [-1]: 'Blocked',
  [0]: 'Unverified',
  [1]: 'Trusted',
  [2]: 'Contributor',
  [3]: 'Verified Business',
  [4]: 'Verified Organizer',
};

const TRUST_TIER_COLORS: Record<number, { bg: string; color: string }> = {
  [-1]: { bg: '#E74C3C20', color: '#E74C3C' },
  [0]: { bg: '#60606020', color: '#606060' },
  [1]: { bg: '#3498DB20', color: '#3498DB' },
  [2]: { bg: '#2ECC7120', color: '#2ECC71' },
  [3]: { bg: '#9B59B620', color: '#9B59B6' },
  [4]: { bg: '#D4A85320', color: '#D4A853' },
};

export function UsersPage() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'users', search],
    queryFn: () =>
      adminApi.get<any[]>(`/users?limit=50${search ? `&q=${encodeURIComponent(search)}` : ''}`),
  });

  const trustMutation = useMutation({
    mutationFn: ({ userId, tier }: { userId: string; tier: UserTrustTier }) =>
      adminApi.patch(`/users/${userId}/trust-tier`, { trustTier: tier }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F5F5F5' }}>Users</h1>
        <input
          type="text"
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #2A2A2A',
            backgroundColor: '#1A1A1A',
            color: '#F5F5F5',
            fontSize: 14,
            width: 260,
            outline: 'none',
          }}
        />
      </div>

      {isLoading ? (
        <p style={{ color: '#606060' }}>Loading...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, backgroundColor: '#2A2A2A', borderRadius: 12, overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 160px 120px 80px 160px',
              padding: '10px 16px',
              backgroundColor: '#1A1A1A',
              color: '#606060',
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            <span>User</span>
            <span>Phone</span>
            <span>Joined</span>
            <span>Trust</span>
            <span>Set Tier</span>
          </div>

          {users.length === 0 ? (
            <div style={{ padding: 24, color: '#606060', textAlign: 'center', backgroundColor: '#1A1A1A' }}>
              No users found.
            </div>
          ) : (
            users.map((user) => {
              const tier: number = user.trustTier ?? 0;
              const tierStyle = TRUST_TIER_COLORS[tier] ?? TRUST_TIER_COLORS[0];

              return (
                <div
                  key={user.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 160px 120px 80px 160px',
                    padding: '12px 16px',
                    backgroundColor: '#1A1A1A',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ color: '#F5F5F5', fontSize: 14, fontWeight: 500 }}>
                      {user.displayName ?? 'Unnamed User'}
                    </div>
                    <div style={{ color: '#606060', fontSize: 12, marginTop: 1 }}>{user.id.slice(0, 8)}…</div>
                  </div>

                  <span style={{ color: '#A0A0A0', fontSize: 13 }}>{user.phone ?? '—'}</span>

                  <span style={{ color: '#606060', fontSize: 13 }}>
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
                      : '—'}
                  </span>

                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      display: 'inline-block',
                      backgroundColor: tierStyle.bg,
                      color: tierStyle.color,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {TRUST_TIER_LABELS[tier]}
                  </span>

                  <select
                    value={tier}
                    onChange={(e) =>
                      trustMutation.mutate({ userId: user.id, tier: Number(e.target.value) as UserTrustTier })
                    }
                    disabled={trustMutation.isPending}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: '1px solid #2A2A2A',
                      backgroundColor: '#0D0D0D',
                      color: '#A0A0A0',
                      fontSize: 12,
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    {Object.entries(TRUST_TIER_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
