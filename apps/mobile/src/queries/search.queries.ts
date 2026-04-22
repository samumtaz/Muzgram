import { useQuery } from '@tanstack/react-query';

import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { useLocationStore } from '../stores/location.store';

export interface SearchSuggestion {
  id: string;
  name: string;
  type: 'listing' | 'event';
  slug: string;
  mainCategory?: string;
}

export interface SearchResultItem {
  contentType: 'listing' | 'event' | 'post';
  relevanceScore: number;
  mainCategory: string;
  item: {
    id: string;
    name?: string;
    title?: string;
    slug: string;
    address?: string;
    thumbnailUrl?: string | null;
    isFeatured?: boolean;
    isHalalVerified?: boolean;
    startAt?: string;
    isFree?: boolean;
    distanceM?: number | null;
  };
  highlights: {
    name: string | null;
    description: string | null;
  };
}

export interface SearchResponse {
  query: string;
  resultLabel: string;
  results: SearchResultItem[];
  tabs: {
    all: number;
    food: number;
    events: number;
    services: number;
    community: number;
  };
}

export const searchKeys = {
  suggestions: (q: string, cityId: string) => ['search', 'suggest', q, cityId] as const,
  results: (q: string, cityId: string, type: string) => ['search', 'results', q, cityId, type] as const,
};

export function useSearchSuggestions(query: string) {
  const token = useAuthStore((s) => s.token);
  const { citySlug: cityId } = useLocationStore();

  return useQuery({
    queryKey: searchKeys.suggestions(query, cityId ?? ''),
    queryFn: () => {
      const params = new URLSearchParams({ q: query, city_id: cityId ?? '' });
      return api.get<{ suggestions: SearchSuggestion[] }>(
        `/v1/search/suggest?${params}`,
        { token: token ?? undefined },
      );
    },
    enabled: query.length >= 2 && !!cityId,
    staleTime: 120_000,
  });
}

export function useSearch(query: string, type: string = 'all') {
  const token = useAuthStore((s) => s.token);
  const { cityId, location } = useLocationStore();

  return useQuery({
    queryKey: searchKeys.results(query, cityId ?? '', type),
    queryFn: () => {
      const params = new URLSearchParams({
        q: query,
        city_id: cityId ?? '',
        ...(type !== 'all' ? { category: type } : {}),
        ...(location ? { lat: location.lat.toString(), lng: location.lng.toString() } : {}),
      });
      return api.get<SearchResponse>(`/v1/search?${params}`, { token: token ?? undefined });
    },
    enabled: query.length >= 2 && !!cityId,
    staleTime: 60_000,
  });
}
