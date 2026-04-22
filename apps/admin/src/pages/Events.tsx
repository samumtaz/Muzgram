import { useQuery } from '@tanstack/react-query';
import { Event } from '@muzgram/types';
import { adminApi } from '../lib/api';

export function EventsPage() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['admin', 'events'],
    queryFn: () => adminApi.get<Event[]>('/events?limit=50'),
  });

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F5F5F5', marginBottom: 24 }}>Events</h1>
      {isLoading ? (
        <p style={{ color: '#606060' }}>Loading...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, backgroundColor: '#2A2A2A', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 100px 80px', padding: '10px 16px', backgroundColor: '#1A1A1A', color: '#606060', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            <span>Event</span>
            <span>Date</span>
            <span>Status</span>
            <span>Free</span>
          </div>
          {events.length === 0 ? (
            <div style={{ padding: 24, color: '#606060', textAlign: 'center', backgroundColor: '#1A1A1A' }}>
              No events found.
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 100px 80px', padding: '12px 16px', backgroundColor: '#1A1A1A', alignItems: 'center', gap: 8 }}>
                <div>
                  <div style={{ color: '#F5F5F5', fontSize: 14, fontWeight: 500 }}>{event.title}</div>
                  <div style={{ color: '#606060', fontSize: 12 }}>{event.address}</div>
                </div>
                <span style={{ color: '#A0A0A0', fontSize: 13 }}>
                  {new Date(event.startAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, backgroundColor: event.status === 'active' ? '#2ECC7120' : '#D4A85320', color: event.status === 'active' ? '#2ECC71' : '#D4A853', display: 'inline-block' }}>
                  {event.status}
                </span>
                <span style={{ color: event.isFree ? '#2ECC71' : '#A0A0A0', fontSize: 13 }}>
                  {event.isFree ? 'Free' : 'Paid'}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
