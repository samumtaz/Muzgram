import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { CursorPage } from '@muzgram/types';

import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { useNotificationsStore } from '../stores/notifications.store';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  linkedContentType: string | null;
  linkedContentId: string | null;
  linkedContentSlug: string | null;
  createdAt: string;
}

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => ['notifications', 'list'] as const,
};

export function useNotifications() {
  const token = useAuthStore((s) => s.token);
  const setUnreadCount = useNotificationsStore((s) => s.setUnreadCount);

  return useInfiniteQuery({
    queryKey: notificationKeys.list(),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        ...(pageParam ? { cursor: pageParam } : {}),
        limit: '30',
      });
      const result = await api.get<CursorPage<AppNotification> & { unreadCount: number }>(
        `/v1/notifications?${params}`,
        { token: token ?? undefined },
      );
      setUnreadCount(result.unreadCount ?? 0);
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.meta.cursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!token,
    staleTime: 30 * 1000,
  });
}

export function useMarkAllRead() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const clearUnread = useNotificationsStore((s) => s.clearUnread);

  return useMutation({
    mutationFn: () =>
      api.post('/v1/notifications/read-all', {}, { token: token ?? undefined }),
    onSuccess: () => {
      clearUnread();
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkRead() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const decrementUnread = useNotificationsStore((s) => s.decrementUnread);

  return useMutation({
    mutationFn: (notifId: string) =>
      api.patch(`/v1/notifications/${notifId}/read`, {}, { token: token ?? undefined }),
    onSuccess: () => {
      decrementUnread(1);
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
