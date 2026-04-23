import { useCallback } from 'react';

import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import {
  ActivityIndicator,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatDistanceToNow } from '../lib/time';
import {
  AppNotification,
  useMarkAllRead,
  useMarkRead,
  useNotifications,
} from '../queries/notifications.queries';
import { useNotificationsStore } from '../stores/notifications.store';

const NOTIF_ICONS: Record<string, string> = {
  new_event_nearby: '📍',
  listing_special: '⭐',
  event_reminder: '🔔',
  post_save: '♥',
  jummah_reminder: '🕌',
  system: 'ℹ',
};

const CONTENT_ROUTES: Record<string, (slug: string) => string> = {
  listing: (slug) => `/listing/${slug}`,
  event: (slug) => `/event/${slug}`,
  post: (slug) => `/post/${slug}`,
};

export function NotificationsScreen() {
  const router = useRouter();
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const markAllRead = useMarkAllRead();
  const markRead = useMarkRead();

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, refetch } =
    useNotifications();

  const allNotifs: AppNotification[] =
    data?.pages.flatMap((p) => p.data) ?? [];

  const handleTap = useCallback(
    (notif: AppNotification) => {
      if (!notif.isRead) markRead.mutate(notif.id);
      if (notif.linkedContentType && notif.linkedContentSlug) {
        const route = CONTENT_ROUTES[notif.linkedContentType]?.(notif.linkedContentSlug);
        if (route) router.push(route as any);
      }
    },
    [markRead, router],
  );

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => {
      const icon = NOTIF_ICONS[item.type] ?? '🔔';
      const timeLabel = formatDistanceToNow(item.createdAt);
      const isLinked = !!(item.linkedContentType && item.linkedContentSlug);

      return (
        <TouchableOpacity
          onPress={() => handleTap(item)}
          activeOpacity={0.8}
          className={`flex-row items-start px-4 py-3 border-b border-surface-border ${
            !item.isRead ? 'bg-surface-elevated' : 'bg-background'
          }`}
        >
          {/* Unread dot + icon */}
          <View className="w-10 items-center pt-0.5">
            {!item.isRead && (
              <View className="absolute top-1 left-0 w-2 h-2 rounded-full bg-brand-gold" />
            )}
            <Text className="text-lg">{icon}</Text>
          </View>

          {/* Body */}
          <View className="flex-1 mr-2">
            <Text
              className={`text-sm leading-5 ${
                !item.isRead ? 'text-text-primary' : 'text-text-secondary'
              }`}
              numberOfLines={2}
            >
              {item.body}
            </Text>
            <Text className="text-text-muted text-xs mt-1">{timeLabel}</Text>
          </View>

          {/* Chevron */}
          {isLinked && (
            <Text className="text-text-muted text-base self-center">›</Text>
          )}
        </TouchableOpacity>
      );
    },
    [handleTap],
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center" edges={['top']}>
        <ActivityIndicator color="#D4A853" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-2 pb-3 border-b border-surface-border">
        <Text className="text-text-primary text-xl font-display">Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 0 }}
          >
            <Text className="text-brand-gold text-sm font-display">
              {markAllRead.isPending ? 'Clearing…' : 'Mark all read'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {allNotifs.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 gap-3">
          <Text className="text-4xl">✓</Text>
          <Text className="text-text-secondary text-center text-base">
            You're all caught up
          </Text>
        </View>
      ) : (
        <FlashList
          data={allNotifs}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
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
