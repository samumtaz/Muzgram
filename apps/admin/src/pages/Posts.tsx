import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CommunityPost } from '@muzgram/types';
import { adminApi } from '../lib/api';

type PostFilter = 'all' | 'active' | 'hidden';

const FILTER_TABS: { label: string; value: PostFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Hidden', value: 'hidden' },
];

export function PostsPage() {
  const [filter, setFilter] = useState<PostFilter>('all');
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['admin', 'posts', filter],
    queryFn: () =>
      adminApi.get<CommunityPost[]>(`/community-posts?limit=50${filter !== 'all' ? `&status=${filter}` : ''}`),
  });

  const hideMutation = useMutation({
    mutationFn: (postId: string) => adminApi.patch(`/community-posts/${postId}/hide`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] }),
  });

  const restoreMutation = useMutation({
    mutationFn: (postId: string) => adminApi.patch(`/community-posts/${postId}/restore`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (postId: string) => adminApi.delete(`/community-posts/${postId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] }),
  });

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F5F5F5', marginBottom: 24 }}>Community Posts</h1>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              backgroundColor: filter === tab.value ? '#D4A853' : '#2A2A2A',
              color: filter === tab.value ? '#0D0D0D' : '#A0A0A0',
              transition: 'background 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p style={{ color: '#606060' }}>Loading...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, backgroundColor: '#2A2A2A', borderRadius: 12, overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 140px 80px 80px 100px',
              padding: '10px 16px',
              backgroundColor: '#1A1A1A',
              color: '#606060',
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            <span>Post</span>
            <span>Author</span>
            <span>Reports</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {posts.length === 0 ? (
            <div style={{ padding: 24, color: '#606060', textAlign: 'center', backgroundColor: '#1A1A1A' }}>
              No posts found.
            </div>
          ) : (
            posts.map((post) => {
              const isHidden = (post as any).isHidden;
              const reportWeight = (post as any).reportWeight ?? 0;

              return (
                <div
                  key={post.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 140px 80px 80px 100px',
                    padding: '12px 16px',
                    backgroundColor: '#1A1A1A',
                    alignItems: 'center',
                    gap: 8,
                    opacity: isHidden ? 0.6 : 1,
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: '#F5F5F5',
                        fontSize: 14,
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 340,
                      }}
                    >
                      {(post as any).body}
                    </div>
                    <div style={{ color: '#606060', fontSize: 12, marginTop: 2 }}>
                      {new Date((post as any).createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  <span style={{ color: '#A0A0A0', fontSize: 13 }}>
                    {(post as any).author?.displayName ?? 'Unknown'}
                  </span>

                  <span
                    style={{
                      color: reportWeight >= 2 ? '#E74C3C' : reportWeight > 0 ? '#D4A853' : '#606060',
                      fontSize: 13,
                      fontWeight: reportWeight > 0 ? 600 : 400,
                    }}
                  >
                    {reportWeight.toFixed(1)}
                  </span>

                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 12,
                      display: 'inline-block',
                      backgroundColor: isHidden ? '#E74C3C20' : '#2ECC7120',
                      color: isHidden ? '#E74C3C' : '#2ECC71',
                    }}
                  >
                    {isHidden ? 'Hidden' : 'Active'}
                  </span>

                  <div style={{ display: 'flex', gap: 6 }}>
                    {isHidden ? (
                      <button
                        onClick={() => restoreMutation.mutate(post.id)}
                        disabled={restoreMutation.isPending}
                        style={actionBtn('#2ECC7120', '#2ECC71')}
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => hideMutation.mutate(post.id)}
                        disabled={hideMutation.isPending}
                        style={actionBtn('#D4A85320', '#D4A853')}
                      >
                        Hide
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (window.confirm('Permanently delete this post?')) {
                          deleteMutation.mutate(post.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      style={actionBtn('#E74C3C20', '#E74C3C')}
                    >
                      Del
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function actionBtn(bg: string, color: string): React.CSSProperties {
  return {
    padding: '3px 10px',
    borderRadius: 4,
    border: 'none',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: bg,
    color,
  };
}
