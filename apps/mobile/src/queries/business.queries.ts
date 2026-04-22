import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Listing } from '@muzgram/types';

import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

export enum LeadStatusMobile {
  NEW = 'new',
  VIEWED = 'viewed',
  RESPONDED = 'responded',
  CLOSED = 'closed',
  SPAM = 'spam',
}

export interface Lead {
  id: string;
  sender: { displayName: string | null; phone: string };
  message: string | null;
  status: LeadStatusMobile;
  createdAt: string;
}

export interface BusinessStats {
  views: number;
  saves: number;
  callTaps: number;
  whatsappTaps: number;
  leadsCount: number;
  viewsChangePercent: number;
}

export const businessKeys = {
  myListing: () => ['business', 'mine'] as const,
  leads: (status?: string) => ['business', 'leads', status] as const,
  stats: () => ['business', 'stats'] as const,
};

export function useMyListing() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: businessKeys.myListing(),
    queryFn: () =>
      api.get<{ data: Listing & { isClaimed: boolean } }>('/v1/listings/mine', {
        token: token ?? undefined,
      }),
    enabled: !!token,
    staleTime: 60_000,
  });
}

export function useMyLeads(status?: string) {
  const token = useAuthStore((s) => s.token);
  const { data: listing } = useMyListing();
  const listingId = listing?.data?.id;

  return useQuery({
    queryKey: businessKeys.leads(status),
    queryFn: async () => {
      const params = new URLSearchParams({
        business_id: listingId!,
        ...(status && status !== 'all' ? { status } : {}),
      });
      return api.get<{ data: Lead[]; meta: { cursor: string | null; hasMore: boolean } }>(
        `/v1/leads/inbox?${params}`,
        { token: token ?? undefined },
      );
    },
    enabled: !!token && !!listingId,
    staleTime: 30_000,
  });
}

export function useUpdateLeadStatus() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: LeadStatusMobile }) =>
      api.patch(`/v1/leads/${leadId}/status`, { status }, { token: token ?? undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessKeys.leads() });
    },
  });
}

export function useMyStats() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: businessKeys.stats(),
    queryFn: () =>
      api.get<{ data: BusinessStats }>('/v1/listings/mine/stats', {
        token: token ?? undefined,
      }),
    enabled: !!token,
    staleTime: 5 * 60_000,
  });
}

export function useStartClaim() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (listingId: string) =>
      api.post(
        '/v1/onboarding/business/start',
        { listingId },
        { token: token ?? undefined },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessKeys.myListing() });
    },
  });
}

export function useCheckoutSession() {
  const token = useAuthStore((s) => s.token);
  return useMutation({
    mutationFn: ({
      listingId,
      product,
      interval,
    }: {
      listingId: string;
      product: string;
      interval: string;
    }) =>
      api.post<{ url: string }>(
        '/v1/billing/checkout',
        { listingId, product, interval },
        { token: token ?? undefined },
      ),
  });
}
