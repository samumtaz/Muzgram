import { memo, useCallback } from 'react';

import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
      className="mx-4 mb-3 bg-surface-DEFAULT rounded-card overflow-hidden border border-surface-border"
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

      <View style={{ padding: 12 }}>
        {/* Top row: Free + tags | save */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1, flexWrap: 'wrap' }}>
            {event.isFree && (
              <View style={{ backgroundColor: '#22c55e', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>Free</Text>
              </View>
            )}
            {[...event.tags].sort((a, b) => (a === 'entertainment' ? -1 : b === 'entertainment' ? 1 : 0)).slice(0, 2).map((tag) => {
              const meta = EVENT_TYPE_META[tag] ?? { icon: '📌', color: '#6b7280', bg: '#6b728020' };
              return (
                <View key={tag} style={[styles.typeBadge, { backgroundColor: meta.bg }]}>
                  <Text style={styles.typeBadgeIcon}>{meta.icon}</Text>
                  <Text style={[styles.typeBadgeText, { color: meta.color }]}>
                    {tag.charAt(0).toUpperCase() + tag.slice(1)}
                  </Text>
                </View>
              );
            })}
          </View>
          <TouchableOpacity
            onPress={() => onSave?.(ContentType.EVENT, event.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginLeft: 8 }}
          >
            <Text style={{ fontSize: 18, color: event.isSaved ? '#D4A853' : '#555' }}>
              {event.isSaved ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={{ color: '#F5F5F5', fontSize: 15, fontWeight: '700', marginBottom: 4 }} numberOfLines={2}>
          {event.title}
        </Text>

        {/* Date */}
        <Text style={{ color: '#D4A853', fontSize: 12, fontWeight: '600', marginBottom: 3 }}>{dateLabel}</Text>

        {/* Location */}
        {!event.isOnline ? (
          <Text style={{ color: '#A0A0A0', fontSize: 11 }} numberOfLines={1}>
            📍 {event.address}{distanceLabel ? ` · ${distanceLabel}` : ''}
          </Text>
        ) : (
          <Text style={{ color: '#A0A0A0', fontSize: 11 }}>🔗 Online event</Text>
        )}

        {/* Organizer */}
        {event.organizer && (
          <Text style={{ color: '#666', fontSize: 11, marginTop: 3 }} numberOfLines={1}>
            By {event.organizer.name}{isVerifiedOrganizer ? ' ✓' : ''}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

const EVENT_TYPE_META: Record<string, { icon: string; color: string; bg: string }> = {
  islamic:       { icon: '🕌', color: '#22c55e', bg: '#22c55e18' },
  ramadan:       { icon: '🌙', color: '#a78bfa', bg: '#a78bfa18' },
  eid:           { icon: '🎊', color: '#D4A853', bg: '#D4A85320' },
  networking:    { icon: '🤝', color: '#3b82f6', bg: '#3b82f618' },
  entertainment: { icon: '🎵', color: '#ec4899', bg: '#ec489918' },
  sports:        { icon: '⚽', color: '#f97316', bg: '#f9731618' },
  food:          { icon: '🍽', color: '#f59e0b', bg: '#f59e0b18' },
  charity:       { icon: '💝', color: '#ef4444', bg: '#ef444418' },
  family:        { icon: '👨‍👩‍👧', color: '#14b8a6', bg: '#14b8a618' },
  education:     { icon: '🎓', color: '#6366f1', bg: '#6366f118' },
  arts:          { icon: '🎨', color: '#c084fc', bg: '#c084fc18' },
  community:     { icon: '🌍', color: '#94a3b8', bg: '#94a3b818' },
};

const styles = StyleSheet.create({
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  typeBadgeIcon: { fontSize: 10 },
  typeBadgeText: { fontSize: 10, fontWeight: '600' },
});
