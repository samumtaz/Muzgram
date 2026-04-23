import { memo, useCallback } from 'react';

import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Text, TouchableOpacity, View } from 'react-native';

import { ContentType, Event } from '@muzgram/types';
import { formatDistanceLabel, formatEventDateLabel } from '@muzgram/utils';
import { track } from '../../lib/analytics';

interface Organizer {
  name: string;
  trustTier?: number;
}

interface EventCardProps {
  event: Event & { distanceKm?: number; coverPhotoBlurHash?: string; organizer?: Organizer };
  onSave?: (contentType: ContentType, contentId: string) => void;
  position?: number;
}

export const EventCard = memo(function EventCard({ event, onSave, position }: EventCardProps) {
  const router = useRouter();
  const dateLabel = formatEventDateLabel(event.startAt, event.endAt);
  const distanceLabel = event.distanceKm != null ? formatDistanceLabel(event.distanceKm) : null;
  const isVerifiedOrganizer = (event.organizer?.trustTier ?? 0) >= 3;

  const handlePress = useCallback(() => {
    track('feed_item_tapped', {
      itemType: ContentType.EVENT,
      itemId: event.id,
      isFeatured: event.isFeatured,
      position,
    });
    router.push(`/event/${event.id}`);
  }, [event.id, event.isFeatured, position, router]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.9}
      className="mx-4 mb-4 bg-surface-DEFAULT rounded-card overflow-hidden border border-surface-border"
    >
      {/* Cover image with blurhash placeholder */}
      {event.thumbnailUrl && (
        <Image
          source={{ uri: event.thumbnailUrl }}
          placeholder={event.coverPhotoBlurHash ? { blurhash: event.coverPhotoBlurHash } : undefined}
          className="w-full h-44"
          contentFit="cover"
          transition={200}
        />
      )}

      {/* Featured ribbon — diagonal top-right */}
      {event.isFeatured && (
        <View
          style={{
            position: 'absolute',
            top: 14,
            right: -22,
            width: 90,
            backgroundColor: '#D4A853',
            transform: [{ rotate: '35deg' }],
            alignItems: 'center',
            paddingVertical: 3,
          }}
        >
          <Text style={{ color: '#0D0D0D', fontSize: 10, fontWeight: '700' }}>★ Featured</Text>
        </View>
      )}

      {/* Free badge */}
      {event.isFree && (
        <View className="absolute top-3 left-3 bg-status-open px-2 py-0.5 rounded-badge">
          <Text className="text-white text-xs font-display">Free</Text>
        </View>
      )}

      <View className="p-4">
        <View className="flex-row items-start justify-between mb-1">
          <Text className="text-text-primary text-base font-display flex-1 mr-2" numberOfLines={2}>
            {event.title}
          </Text>
          <TouchableOpacity
            onPress={() => onSave?.(ContentType.EVENT, event.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className={`text-xl ${event.isSaved ? 'text-brand-gold' : 'text-text-muted'}`}>
              {event.isSaved ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date */}
        <Text className="text-brand-gold text-sm font-display mb-1">{dateLabel}</Text>

        {/* Location */}
        {!event.isOnline && (
          <Text className="text-text-secondary text-xs mb-1" numberOfLines={1}>
            📍 {event.address}{distanceLabel ? ` · ${distanceLabel}` : ''}
          </Text>
        )}
        {event.isOnline && (
          <Text className="text-text-secondary text-xs mb-1">🔗 Online event</Text>
        )}

        {/* Organizer */}
        {event.organizer && (
          <View className="flex-row items-center gap-1 mt-1">
            <Text className="text-text-muted text-xs">By {event.organizer.name}</Text>
            {isVerifiedOrganizer && (
              <Text className="text-brand-gold text-xs">✓</Text>
            )}
          </View>
        )}

        {/* Tags */}
        {event.tags.length > 0 && (
          <View className="flex-row flex-wrap gap-1 mt-2">
            {event.tags.slice(0, 3).map((tag) => (
              <View key={tag} className="bg-background-elevated px-2 py-0.5 rounded-badge">
                <Text className="text-text-muted text-xs">{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});
