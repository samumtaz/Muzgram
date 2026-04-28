import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Listing, ListingCategory } from '@muzgram/types';

import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

export const listingKeys = {
  detail: (id: string) => ['listings', id] as const,
  slug: (slug: string) => ['listings', 'slug', slug] as const,
  categories: ['listings', 'categories'] as const,
  trending: (lat: number, lng: number) => ['feed', 'trending', lat, lng] as const,
};

export function useListing(id: string) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: listingKeys.detail(id),
    queryFn: () => api.get<Listing>(`/listings/${id}`, { token: token ?? undefined }),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useListingCategories() {
  return useQuery({
    queryKey: listingKeys.categories,
    queryFn: () => api.get<ListingCategory[]>('/listings/categories'),
    staleTime: 60 * 60 * 1000, // Categories rarely change
  });
}

export function useClaimListing() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: (listingId: string) =>
      api.post(`/listings/${listingId}/claim`, {}, { token: token ?? undefined }),
    onSuccess: (_data, listingId) => {
      queryClient.invalidateQueries({ queryKey: listingKeys.detail(listingId) });
    },
  });
}

export function useCreateDailySpecial() {
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: ({ listingId, ...body }: { listingId: string; title: string; description?: string; price?: number }) =>
      api.put(`/listings/${listingId}/special`, body, { token: token ?? undefined }),
  });
}

export function useCheckIn() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listingId, lat, lng }: { listingId: string; lat?: number; lng?: number }) =>
      api.post<{ success?: boolean; alreadyCheckedIn?: boolean; checkinsCount: number }>(
        `/listings/${listingId}/checkin`,
        { lat, lng },
        { token: token ?? undefined },
      ),
    onSuccess: (_data, { listingId }) => {
      queryClient.invalidateQueries({ queryKey: listingKeys.detail(listingId) });
    },
  });
}

export function useTrending(lat: number, lng: number) {
  return useQuery({
    queryKey: listingKeys.trending(lat, lng),
    queryFn: async () => {
      const res = await api.get<any>(`/feed/trending?lat=${lat}&lng=${lng}&radiusKm=40`);
      // API wraps in { data: { listings, events } }
      return (res as any)?.data ?? res as { listings: any[]; events: any[] };
    },
    staleTime: 5 * 60 * 1000,
    enabled: lat !== 0 && lng !== 0,
  });
}
