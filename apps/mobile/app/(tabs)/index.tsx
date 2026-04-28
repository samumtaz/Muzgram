import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContentType, FeedItem, ListingMainCategory } from '@muzgram/types';
import { formatEventDateLabel, isOpenNow } from '@muzgram/utils';

import { useFeed, useToggleSave } from '../../src/queries/feed.queries';
import { EventCard } from '../../src/components/feed/EventCard';
import { FeedSkeleton } from '../../src/components/feed/FeedSkeleton';
import { ListingCard } from '../../src/components/feed/ListingCard';
import { CommunityPostCard } from '../../src/components/feed/CommunityPostCard';
import { PrayerTimesStrip } from '../../src/components/feed/PrayerTimesStrip';
import { useLocationPermission } from '../../src/hooks/useLocationPermission';
import { useAuthStore } from '../../src/stores/auth.store';
import { usePrefsStore } from '../../src/stores/prefs.store';
import { screen, track } from '../../src/lib/analytics';

type FeedFilter = ListingMainCategory | 'events' | 'open_now' | undefined;

const CATEGORIES: { label: string; value: FeedFilter }[] = [
  { label: 'All', value: undefined },
  { label: 'Open Now', value: 'open_now' },
  { label: 'Eat', value: ListingMainCategory.EAT },
  { label: 'Go Out', value: ListingMainCategory.GO_OUT },
  { label: 'Connect', value: ListingMainCategory.CONNECT },
  { label: 'Events', value: 'events' },
];

const EVENT_TYPE_FILTERS: { label: string; icon: string; value: string | null }[] = [
  { label: 'All Events',    icon: '✦', value: null },
  { label: 'Entertainment', icon: '🎵', value: 'entertainment' },
  { label: 'Islamic',       icon: '🕌', value: 'islamic' },
  { label: 'Ramadan',       icon: '🌙', value: 'ramadan' },
  { label: 'Eid',           icon: '🎊', value: 'eid' },
  { label: 'Networking',    icon: '🤝', value: 'networking' },
  { label: 'Food',        icon: '🍽', value: 'food' },
  { label: 'Sports',      icon: '⚽', value: 'sports' },
  { label: 'Charity',     icon: '💝', value: 'charity' },
  { label: 'Family',      icon: '👨‍👩‍👧', value: 'family' },
  { label: 'Education',   icon: '🎓', value: 'education' },
  { label: 'Arts',        icon: '🎨', value: 'arts' },
  { label: 'Community',   icon: '🌍', value: 'community' },
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

function UpcomingEventsCarousel({ events, onSave }: { events: FeedItem[]; onSave: (type: ContentType, id: string) => void }) {
  const router = useRouter();
  if (events.length === 0) return null;

  return (
    <View className="mb-4">
      <Text className="text-text-primary text-base font-display px-4 mb-3">
        🗓 Upcoming Events
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {events.map((event) => {
          const e = event as any;
          const dateLabel = formatEventDateLabel(e.startAt ?? e.start_at, e.endAt ?? e.end_at);
          return (
            <TouchableOpacity
              key={event.id}
              onPress={() => {
                track('event_carousel_tapped', { eventId: event.id });
                router.push(`/event/${event.id}` as any);
              }}
              activeOpacity={0.88}
              style={{
                width: 220,
                backgroundColor: '#1A1A1A',
                borderRadius: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: '#2A2A2A',
              }}
            >
              {e.thumbnailUrl && (
                <Image
                  source={{ uri: e.thumbnailUrl }}
                  style={{ width: '100%', height: 110 }}
                  contentFit="cover"
                />
              )}
              <View style={{ padding: 10 }}>
                {e.isFree && (
                  <View style={{ alignSelf: 'flex-start', backgroundColor: '#22c55e', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>Free</Text>
                  </View>
                )}
                <Text style={{ color: '#F5F5F5', fontSize: 13, fontWeight: '700', marginBottom: 3 }} numberOfLines={2}>
                  {e.title}
                </Text>
                <Text style={{ color: '#D4A853', fontSize: 11, fontWeight: '600' }} numberOfLines={1}>
                  {dateLabel}
                </Text>
                {e.address && (
                  <Text style={{ color: '#A0A0A0', fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                    📍 {e.address}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => onSave(ContentType.EVENT, event.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, padding: 5 }}
              >
                <Text style={{ fontSize: 14, color: (e.isSaved ? '#D4A853' : '#fff') }}>
                  {e.isSaved ? '♥' : '♡'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function FeedScreen() {
  const [activeFilter, setActiveFilter] = useState<FeedFilter>(undefined);
  const [activeEventType, setActiveEventType] = useState<string | null>(null);
  const [prayerDismissed, setPrayerDismissed] = useState(false);
  const { showPrayerTimes, hydrate } = usePrefsStore();
  const toggleSave = useToggleSave();

  useEffect(() => { hydrate(); }, []);
  const router = useRouter();
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const listRef = useRef<FlashListRef<FeedItem>>(null);

  useLocationPermission();

  const lat = 41.9977;
  const lng = -87.6936;

  // Pass listing category to API; events + open_now are client-side only
  const apiCategory = (activeFilter === 'events' || activeFilter === 'open_now')
    ? undefined
    : activeFilter as ListingMainCategory | undefined;

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, refetch } = useFeed(
    lat,
    lng,
    apiCategory,
  );

  const rawItems: FeedItem[] = data?.pages.flatMap((p) => p.data) ?? [];

  // Events for the top carousel — always from full feed regardless of filter
  const upcomingEvents = rawItems.filter((i) => i.itemType === ContentType.EVENT);

  // Items shown in the main list
  // For Eat/Go Out/Connect: API already filtered by category, use rawItems directly
  let filteredItems = rawItems;
  if (activeFilter === 'events') {
    filteredItems = rawItems.filter((i) => i.itemType === ContentType.EVENT);
    if (activeEventType) {
      filteredItems = filteredItems.filter((i) => ((i as any).tags ?? []).includes(activeEventType));
    }
  } else if (activeFilter === 'open_now') {
    filteredItems = rawItems.filter((i) =>
      i.itemType === ContentType.LISTING && isOpenNow((i as any).businessHours)
    );
  }
  const allItems = interleaveFeatures(filteredItems);

  useEffect(() => {
    screen('Feed');
    track('feed_opened');
  }, []);

  const handleFilterChange = useCallback((filter: FeedFilter) => {
    setActiveFilter(filter);
    setActiveEventType(null);
    track('feed_category_filtered', { category: filter ?? 'all' });
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleSave = useCallback(
    (contentType: ContentType, contentId: string) => {
      if (!isSignedIn) {
        Alert.alert(
          'Sign in to save',
          'Create a free Muzgram account to save your favourite places and events.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Sign In', onPress: () => router.push('/(auth)' as any) },
          ],
        );
        return;
      }
      toggleSave.mutate({ contentType, contentId });
    },
    [toggleSave, isSignedIn, router],
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

      {/* Prayer times strip */}
      {showPrayerTimes && !prayerDismissed && (
        <PrayerTimesStrip onDismiss={() => setPrayerDismissed(true)} />
      )}

      {/* Category filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10, alignItems: 'center' }}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.label}
            onPress={() => handleFilterChange(cat.value)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 7,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: activeFilter === cat.value ? '#D4A853' : '#2A2A2A',
              backgroundColor: activeFilter === cat.value ? '#D4A853' : 'transparent',
            }}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: activeFilter === cat.value ? '#111' : '#A0A0A0',
              }}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Event type sub-filter — only when Events tab active */}
      {activeFilter === 'events' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, flexShrink: 0 }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 10, alignItems: 'center' }}
        >
          {EVENT_TYPE_FILTERS.map((f) => {
            const isActive = activeEventType === f.value;
            return (
              <TouchableOpacity
                key={f.label}
                onPress={() => setActiveEventType(f.value)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: isActive ? '#D4A853' : '#2A2A2A',
                  backgroundColor: isActive ? '#D4A85322' : 'transparent',
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 12 }}>{f.icon}</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: isActive ? '#D4A853' : '#A0A0A0' }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Create Event CTA — only on Events tab */}
      {activeFilter === 'events' && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
          <TouchableOpacity
            onPress={() => {
              if (!isSignedIn) {
                router.push('/(auth)' as any);
                return;
              }
              router.push('/create/event' as any);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 11,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#D4A853',
              backgroundColor: '#D4A85314',
            }}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#D4A853', fontSize: 14 }}>＋</Text>
            <Text style={{ color: '#D4A853', fontSize: 13, fontWeight: '700' }}>Create an Event</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Upcoming events carousel — outside FlashList to avoid gap bugs */}
      {activeFilter === undefined && upcomingEvents.length > 0 && (
        <UpcomingEventsCarousel events={upcomingEvents} onSave={handleSave} />
      )}

      {/* Feed list */}
      {allItems.length === 0 ? (
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
          estimatedItemSize={280}
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
