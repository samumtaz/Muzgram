import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ContentType, CursorPage, Event } from '@muzgram/types';

import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

export const eventKeys = {
  detail: (id: string) => ['events', id] as const,
  slug: (slug: string) => ['events', 'slug', slug] as const,
  nearby: (cityId: string) => ['events', 'nearby', cityId] as const,
};

export function useEvent(id: string) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => api.get<Event>(`/events/${id}`, { token: token ?? undefined }),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useNearbyEvents(cityId: string | undefined) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: eventKeys.nearby(cityId ?? ''),
    queryFn: () =>
      api.get<CursorPage<Event>>(`/events?cityId=${cityId}&limit=6`, {
        token: token ?? undefined,
      }),
    enabled: !!cityId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRsvp() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: (eventId: string) =>
      api.post<{ attending: boolean }>(
        `/events/${eventId}/rsvp`,
        {},
        { token: token ?? undefined },
      ),
    onSuccess: (_data, eventId) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    },
  });
}

export function useToggleEventSave() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: (eventId: string) =>
      api.post<{ saved: boolean; savesCount: number }>(
        '/saves/toggle',
        { contentType: ContentType.EVENT, contentId: eventId },
        { token: token ?? undefined },
      ),
    onSuccess: (_data, eventId) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    },
  });
}
