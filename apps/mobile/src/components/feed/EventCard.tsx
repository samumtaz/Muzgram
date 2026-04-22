import { memo } from 'react';

import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Text, TouchableOpacity, View } from 'react-native';

import { ContentType, Event } from '@muzgram/types';
import { formatDistanceLabel, formatEventDateLabel } from '@muzgram/utils';

interface EventCardProps {
  event: Event & { distanceKm?: number };
  onSave?: (contentType: ContentType, contentId: string) => void;
}

export const EventCard = memo(function EventCard({ event, onSave }: EventCardProps) {
  const router = useRouter();
  const dateLabel = formatEventDateLabel(event.startAt, event.endAt);
  const distanceLabel = event.distanceKm != null ? formatDistanceLabel(event.distanceKm) : null;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/event/${event.id}`)}
      activeOpacity={0.9}
      className="mx-4 mb-4 bg-surface-DEFAULT rounded-card overflow-hidden border border-surface-border"
    >
      {event.thumbnailUrl && (
        <Image
          source={{ uri: event.thumbnailUrl }}
          className="w-full h-44"
          contentFit="cover"
          transition={200}
        />
      )}

      {event.isFeatured && (
        <View className="absolute top-3 left-3 bg-brand-gold px-2 py-0.5 rounded-badge">
          <Text className="text-text-inverse text-xs font-display">Featured</Text>
        </View>
      )}

      {event.isFree && (
        <View className="absolute top-3 right-3 bg-status-open px-2 py-0.5 rounded-badge">
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

        <Text className="text-brand-gold text-sm font-display mb-1">{dateLabel}</Text>

        {!event.isOnline && (
          <Text className="text-text-secondary text-xs" numberOfLines={1}>
            📍 {event.address}
            {distanceLabel ? ` · ${distanceLabel}` : ''}
          </Text>
        )}

        {event.isOnline && (
          <Text className="text-text-secondary text-xs">🔗 Online event</Text>
        )}

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
