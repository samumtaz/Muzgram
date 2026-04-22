import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

export interface SaveItem {
  id: string;
  type: 'listing' | 'event';
  created_at: string;
  listing?: {
    id: string; slug: string; name: string; main_category: string;
    primary_photo_url: string | null; neighborhood: string | null;
    address: string | null; is_featured: boolean; save_count: number;
    city_slug: string; subcategory_name: string | null;
  };
  event?: {
    id: string; slug: string; title: string; start_at: string;
    cover_photo_url: string | null; price_cents: number | null;
    is_featured: boolean; venue_name: string | null; neighborhood: string | null;
    city_slug: string;
  };
}

export const saveKeys = {
  all: ['saves'] as const,
  list: (contentType?: string) => ['saves', 'list', contentType] as const,
};

export function useSaves(contentType?: string) {
  const token = useAuthStore((s) => s.token);
  return useInfiniteQuery({
    queryKey: saveKeys.list(contentType),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({
        ...(contentType && { type: contentType }),
        ...(pageParam && { cursor: pageParam }),
        limit: '20',
      });
      return api.get<{ items: SaveItem[]; meta: { cursor?: string } }>(
        `/saves?${params}`,
        { token: token ?? undefined },
      );
    },
    getNextPageParam: (last) => last.meta.cursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUnsave() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (saveId: string) =>
      api.delete(`/saves/${saveId}`, { token: token ?? undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: saveKeys.all });
    },
  });
}
