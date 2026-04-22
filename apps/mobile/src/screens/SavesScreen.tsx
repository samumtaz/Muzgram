import { useState } from 'react';

import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSaves } from '../queries/saves.queries';
import { ListingCard } from '../components/feed/ListingCard';
import { EventCard } from '../components/feed/EventCard';

const TABS = ['All', 'Places', 'Events'] as const;
type Tab = (typeof TABS)[number];

export function SavesScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('All');

  const contentType =
    tab === 'Places' ? 'listing' : tab === 'Events' ? 'event' : undefined;

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSaves(contentType);

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="px-4 pt-4 pb-2 flex-row items-center">
        <Pressable onPress={() => router.back()} className="mr-3 p-1">
          <Text className="text-text-secondary text-2xl">‹</Text>
        </Pressable>
        <Text className="text-text-primary font-display text-xl">Saved</Text>
      </View>

      {/* Tabs */}
      <View className="flex-row px-4 gap-2 pb-3">
        {TABS.map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full border ${
              tab === t
                ? 'bg-brand-gold border-brand-gold'
                : 'bg-transparent border-surface-border'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                tab === t ? 'text-text-inverse' : 'text-text-secondary'
              }`}
            >
              {t}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#C9A84C" />
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-4">♥</Text>
          <Text className="text-text-primary font-display text-lg mb-2 text-center">
            Nothing saved yet
          </Text>
          <Text className="text-text-muted text-sm text-center">
            Tap the heart on any listing or event to save it here.
          </Text>
        </View>
      ) : (
        <FlashList
          data={items}
          estimatedItemSize={120}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          renderItem={({ item }) =>
            item.type === 'listing' ? (
              <ListingCard listing={item.listing!} citySlug={item.listing!.city_slug} />
            ) : (
              <EventCard event={item.event!} citySlug={item.event!.city_slug} />
            )
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color="#C9A84C" className="py-4" />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
