import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ContentType, CursorPage, FeedItem, ListingMainCategory } from '@muzgram/types';

import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

export const feedKeys = {
  all: ['feed'] as const,
  list: (lat: number, lng: number, category?: ListingMainCategory) =>
    ['feed', 'list', lat, lng, category] as const,
  mapPins: (lat: number, lng: number, radius: number) =>
    ['feed', 'map', lat, lng, radius] as const,
};

export function useFeed(lat: number, lng: number, category?: ListingMainCategory) {
  const token = useAuthStore((s) => s.token);

  return useInfiniteQuery({
    queryKey: feedKeys.list(lat, lng, category),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        ...(category && { category }),
        ...(pageParam && { cursor: pageParam }),
      });
      return api.get<CursorPage<FeedItem>>(`/feed?${params}`, { token: token ?? undefined });
    },
    getNextPageParam: (lastPage) => lastPage.meta.cursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: lat !== 0 && lng !== 0,
    staleTime: 60 * 1000,
  });
}

export function useMapPins(lat: number, lng: number, radiusKm: number) {
  const token = useAuthStore((s) => s.token);

  return useInfiniteQuery({
    queryKey: feedKeys.mapPins(lat, lng, radiusKm),
    queryFn: () => {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        radiusKm: radiusKm.toString(),
      });
      return api.get(`/feed/map?${params}`, { token: token ?? undefined });
    },
    getNextPageParam: () => undefined,
    initialPageParam: undefined,
    enabled: lat !== 0 && lng !== 0,
    staleTime: 2 * 60 * 1000,
  });
}

export function useToggleSave() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: ({ contentType, contentId }: { contentType: ContentType; contentId: string }) =>
      api.post<{ saved: boolean; savesCount: number }>(
        '/saves/toggle',
        { contentType, contentId },
        { token: token ?? undefined },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
    },
  });
}
