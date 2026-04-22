import { useRouter } from 'expo-router';
import { ActivityIndicator, Linking, Pressable, SectionList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';

interface Lead {
  id: string;
  sender_phone: string;
  message: string | null;
  lead_type: 'call' | 'whatsapp' | 'message';
  status: 'new' | 'contacted' | 'converted' | 'dismissed';
  created_at: string;
}

const STATUS_COLORS: Record<Lead['status'], string> = {
  new: 'text-brand-gold',
  contacted: 'text-blue-400',
  converted: 'text-status-open',
  dismissed: 'text-text-muted',
};

const LEAD_ICONS: Record<Lead['lead_type'], string> = {
  call: '📞',
  whatsapp: '💬',
  message: '✉️',
};

export function BusinessLeadsScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();

  const { data, isLoading, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['leads', 'business'],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20', ...(pageParam && { cursor: pageParam }) });
      return api.get<{ items: Lead[]; meta: { cursor?: string } }>(`/leads?${params}`, {
        token: token ?? undefined,
      });
    },
    getNextPageParam: (last) => last.meta.cursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!token,
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/leads/${id}/status`, { status }, { token: token ?? undefined }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads', 'business'] }),
  });

  const leads = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 pt-4 pb-4 flex-row items-center border-b border-surface-border">
        <Pressable onPress={() => router.back()} className="mr-3 p-1">
          <Text className="text-text-secondary text-2xl">‹</Text>
        </Pressable>
        <Text className="text-text-primary font-display text-xl">Leads</Text>
        {leads.filter((l) => l.status === 'new').length > 0 && (
          <View className="ml-2 bg-brand-gold rounded-full px-2 py-0.5">
            <Text className="text-text-inverse text-xs font-display">
              {leads.filter((l) => l.status === 'new').length} new
            </Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#C9A84C" />
        </View>
      ) : leads.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-4">📥</Text>
          <Text className="text-text-primary font-display text-lg mb-2">No leads yet</Text>
          <Text className="text-text-muted text-sm text-center">
            When users tap Call or WhatsApp on your listing, their contact appears here.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={[{ data: leads }]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          renderItem={({ item }) => (
            <View className="bg-surface-elevated border border-surface-border rounded-card p-4 mb-3">
              <View className="flex-row items-start justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <Text className="text-xl">{LEAD_ICONS[item.lead_type]}</Text>
                  <Text className="text-text-primary font-medium">{item.sender_phone}</Text>
                </View>
                <Text className={`text-xs capitalize ${STATUS_COLORS[item.status]}`}>
                  {item.status}
                </Text>
              </View>

              {item.message && (
                <Text className="text-text-secondary text-sm mb-3">{item.message}</Text>
              )}

              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => Linking.openURL(`tel:${item.sender_phone}`)}
                  className="flex-1 py-2 rounded-pill border border-brand-gold items-center"
                >
                  <Text className="text-brand-gold text-sm">Call</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    Linking.openURL(
                      `whatsapp://send?phone=${item.sender_phone.replace(/\D/g, '')}`,
                    )
                  }
                  className="flex-1 py-2 rounded-pill border border-status-open items-center"
                >
                  <Text className="text-status-open text-sm">WhatsApp</Text>
                </Pressable>
                {item.status === 'new' && (
                  <Pressable
                    onPress={() => updateStatus({ id: item.id, status: 'contacted' })}
                    className="flex-1 py-2 rounded-pill bg-surface-DEFAULT items-center"
                  >
                    <Text className="text-text-secondary text-sm">Done</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
