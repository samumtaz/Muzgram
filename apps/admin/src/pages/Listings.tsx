import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { Listing, ListingStatus } from '@muzgram/types';

import { adminApi } from '../lib/api';

export function ListingsPage() {
  const [statusFilter, setStatusFilter] = useState<ListingStatus | 'all'>('all');

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['admin', 'listings', statusFilter],
    queryFn: () => adminApi.get<Listing[]>(
      `/listings?status=${statusFilter === 'all' ? '' : statusFilter}&limit=50`
    ),
  });

  const STATUS_FILTERS: Array<{ label: string; value: ListingStatus | 'all' }> = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: ListingStatus.PENDING },
    { label: 'Active', value: ListingStatus.ACTIVE },
    { label: 'Rejected', value: ListingStatus.REJECTED },
  ];

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F5F5F5' }}>Listings</h1>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: `1px solid ${statusFilter === f.value ? '#D4A853' : '#2A2A2A'}`,
              backgroundColor: statusFilter === f.value ? '#D4A85320' : 'transparent',
              color: statusFilter === f.value ? '#D4A853' : '#A0A0A0',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p style={{ color: '#606060' }}>Loading...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, backgroundColor: '#2A2A2A', borderRadius: 12, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 100px', padding: '10px 16px', backgroundColor: '#1A1A1A', color: '#606060', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            <span>Listing</span>
            <span>Category</span>
            <span>Status</span>
            <span>Claimed</span>
          </div>

          {listings.length === 0 ? (
            <div style={{ padding: 24, color: '#606060', textAlign: 'center', backgroundColor: '#1A1A1A' }}>
              No listings found.
            </div>
          ) : (
            listings.map((listing) => (
              <div key={listing.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 100px', padding: '12px 16px', backgroundColor: '#1A1A1A', alignItems: 'center', gap: 8 }}>
                <div>
                  <div style={{ color: '#F5F5F5', fontSize: 14, fontWeight: 500 }}>{listing.name}</div>
                  <div style={{ color: '#606060', fontSize: 12 }}>{listing.address}</div>
                </div>
                <span style={{ color: '#A0A0A0', fontSize: 13 }}>{listing.mainCategory}</span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 12,
                  backgroundColor: listing.status === 'active' ? '#2ECC7120' : '#D4A85320',
                  color: listing.status === 'active' ? '#2ECC71' : '#D4A853',
                  display: 'inline-block',
                }}>
                  {listing.status}
                </span>
                <span style={{ color: listing.isClaimed ? '#2ECC71' : '#606060', fontSize: 13 }}>
                  {listing.isClaimed ? 'Yes' : 'No'}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
