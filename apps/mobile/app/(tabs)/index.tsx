import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'expo-router';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import {
  ActivityIndicator,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContentType, FeedItem, ListingMainCategory } from '@muzgram/types';

import { useFeed, useToggleSave } from '../../src/queries/feed.queries';
import { useLocationStore } from '../../src/stores/location.store';
import { EventCard } from '../../src/components/feed/EventCard';
import { FeedSkeleton } from '../../src/components/feed/FeedSkeleton';
import { ListingCard } from '../../src/components/feed/ListingCard';
import { CommunityPostCard } from '../../src/components/feed/CommunityPostCard';
import { useLocationPermission } from '../../src/hooks/useLocationPermission';
import { screen, track } from '../../src/lib/analytics';

const CATEGORIES: { label: string; value: ListingMainCategory | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Eat', value: ListingMainCategory.EAT },
  { label: 'Go Out', value: ListingMainCategory.GO_OUT },
  { label: 'Connect', value: ListingMainCategory.CONNECT },
];

function interleaveFeatures(items: FeedItem[]): FeedItem[] {
  if (items.length === 0) return items;
  const featured = items.filter((i) => (i as any).isFeatured);
  const rest = items.filter((i) => !(i as any).isFeatured);
  const result = [...rest];
  if (featured[0]) result.splice(0, 0, featured[0]);
  if (featured[1] && result.length > 4) result.splice(3, 0, featured[1]);
  return result;
}

export default function FeedScreen() {
  const [activeCategory, setActiveCategory] = useState<ListingMainCategory | undefined>(undefined);
  const { location } = useLocationStore();
  const toggleSave = useToggleSave();
  const router = useRouter();
  const listRef = useRef<FlashListRef<FeedItem>>(null);

  useLocationPermission();

  const lat = location?.lat ?? 41.8781;
  const lng = location?.lng ?? -87.6298;

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, refetch } = useFeed(
    lat,
    lng,
    activeCategory,
  );

  const rawItems: FeedItem[] = data?.pages.flatMap((p) => p.data) ?? [];
  const allItems = interleaveFeatures(rawItems);

  useEffect(() => {
    screen('Feed');
    track('feed_opened');
  }, []);

  const handleCategoryChange = useCallback((cat: ListingMainCategory | undefined) => {
    setActiveCategory(cat);
    track('feed_category_filtered', { category: cat ?? 'all' });
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleSave = useCallback(
    (contentType: ContentType, contentId: string) => {
      toggleSave.mutate({ contentType, contentId });
    },
    [toggleSave],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: FeedItem; index: number }) => {
      if (item.itemType === ContentType.LISTING) {
        return <ListingCard listing={item as any} onSave={handleSave} position={index} />;
      }
      if (item.itemType === ContentType.EVENT) {
        return <EventCard event={item as any} onSave={handleSave} position={index} />;
      }
      return <CommunityPostCard post={item as any} onSave={handleSave} />;
    },
    [handleSave],
  );

  if (isLoading) return <FeedSkeleton />;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
        <Text className="text-brand-gold text-2xl font-display">Muzgram</Text>
        <TouchableOpacity
          onPress={() => router.push('/search' as any)}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 0 }}
        >
          <Text className="text-text-secondary text-xl">⌕</Text>
        </TouchableOpacity>
      </View>

      {/* Category filter pills */}
      <View className="flex-row px-4 gap-2 mb-3">
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.label}
            onPress={() => handleCategoryChange(cat.value)}
            className={`px-4 py-2 rounded-pill border ${
              activeCategory === cat.value
                ? 'bg-brand-gold border-brand-gold'
                : 'bg-transparent border-surface-border'
            }`}
            activeOpacity={0.7}
          >
            <Text
              className={`text-sm font-display ${
                activeCategory === cat.value ? 'text-text-inverse' : 'text-text-secondary'
              }`}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Feed list */}
      {!isLoading && allItems.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-text-secondary text-center text-base leading-6">
            Nothing near you yet.{'\n'}Check back soon — or add a spot you love.
          </Text>
        </View>
      ) : (
        <FlashList
          ref={listRef}
          data={allItems}
          renderItem={renderItem}
          keyExtractor={(item) => `${item.itemType}-${item.id}`}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              tintColor="#D4A853"
            />
          }
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color="#D4A853" className="py-4" />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
