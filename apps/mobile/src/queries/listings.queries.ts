import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Listing, ListingCategory } from '@muzgram/types';

import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

export const listingKeys = {
  detail: (id: string) => ['listings', id] as const,
  slug: (slug: string) => ['listings', 'slug', slug] as const,
  categories: ['listings', 'categories'] as const,
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
