import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ContentType, ListingStatus, EventStatus, PostStatus } from '@muzgram/types';

import { adminApi } from '../lib/api';

interface PendingContent {
  listings: any[];
  events: any[];
  posts: any[];
}

const statusStyle = (status: string) => ({
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 12,
  backgroundColor:
    status === 'pending' ? '#A0700020' :
    status === 'active' ? '#2ECC7120' :
    '#E74C3C20',
  color:
    status === 'pending' ? '#D4A853' :
    status === 'active' ? '#2ECC71' :
    '#E74C3C',
  border: `1px solid currentColor`,
});

export function ModerationQueuePage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['moderation', 'queue'],
    queryFn: () => adminApi.get<PendingContent>('/moderation/queue'),
    refetchInterval: 30 * 1000,
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: {
      contentType: ContentType;
      contentId: string;
      action: 'approve' | 'reject';
      reason?: string;
    }) => adminApi.post('/moderation/review', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation', 'queue'] });
    },
  });

  const handleAction = (
    contentType: ContentType,
    contentId: string,
    action: 'approve' | 'reject',
  ) => {
    reviewMutation.mutate({ contentType, contentId, action });
  };

  if (isLoading) return <PageShell title="Moderation Queue"><p style={{ color: '#A0A0A0' }}>Loading...</p></PageShell>;

  const total = (data?.listings.length ?? 0) + (data?.events.length ?? 0) + (data?.posts.length ?? 0);

  return (
    <PageShell title={`Moderation Queue (${total})`}>
      <Section title="Listings" items={data?.listings ?? []} contentType={ContentType.LISTING} onAction={handleAction} />
      <Section title="Events" items={data?.events ?? []} contentType={ContentType.EVENT} onAction={handleAction} />
      <Section title="Community Posts" items={data?.posts ?? []} contentType={ContentType.POST} onAction={handleAction} />
    </PageShell>
  );
}

function Section({
  title,
  items,
  contentType,
  onAction,
}: {
  title: string;
  items: any[];
  contentType: ContentType;
  onAction: (type: ContentType, id: string, action: 'approve' | 'reject') => void;
}) {
  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ color: '#A0A0A0', fontSize: 13, fontWeight: 500, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
        {title} ({items.length})
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item) => (
          <div key={item.id} style={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
            {item.thumbnailUrl && (
              <img src={item.thumbnailUrl} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: '#F5F5F5', fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name ?? item.title ?? item.body?.slice(0, 80)}
              </div>
              <div style={{ color: '#606060', fontSize: 12 }}>
                {item.address ?? item.neighborhood ?? contentType}
                {' · '}
                {new Date(item.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => onAction(contentType, item.id, 'approve')}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #2ECC71', backgroundColor: '#2ECC7115', color: '#2ECC71', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                Approve
              </button>
              <button
                onClick={() => onAction(contentType, item.id, 'reject')}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #E74C3C', backgroundColor: '#E74C3C15', color: '#E74C3C', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F5F5F5', marginBottom: 24 }}>{title}</h1>
      {children}
    </div>
  );
}
