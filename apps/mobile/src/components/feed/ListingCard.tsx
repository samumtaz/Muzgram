import { memo } from 'react';

import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Text, TouchableOpacity, View } from 'react-native';

import { ContentType, Listing } from '@muzgram/types';
import { formatDistanceLabel, formatHoursLabel, isOpenNow } from '@muzgram/utils';

import { HalalBadge } from '../ui/HalalBadge';
import { CategoryPill } from '../ui/CategoryPill';

interface ListingCardProps {
  listing: Listing & { distanceKm?: number };
  onSave?: (contentType: ContentType, contentId: string) => void;
}

export const ListingCard = memo(function ListingCard({ listing, onSave }: ListingCardProps) {
  const router = useRouter();

  const openStatus = listing.hours ? isOpenNow(listing.hours) : null;
  const distanceLabel = listing.distanceKm != null
    ? formatDistanceLabel(listing.distanceKm)
    : null;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/listing/${listing.id}`)}
      activeOpacity={0.9}
      className="mx-4 mb-4 bg-surface-DEFAULT rounded-card overflow-hidden border border-surface-border"
    >
      {/* Thumbnail */}
      {listing.thumbnailUrl && (
        <Image
          source={{ uri: listing.thumbnailUrl }}
          className="w-full h-48"
          contentFit="cover"
          transition={200}
        />
      )}

      {/* Featured ribbon */}
      {listing.isFeatured && (
        <View className="absolute top-3 left-3 bg-brand-gold px-2 py-0.5 rounded-badge">
          <Text className="text-text-inverse text-xs font-display">Featured</Text>
        </View>
      )}

      {/* Content */}
      <View className="p-4">
        <View className="flex-row items-start justify-between mb-1">
          <Text className="text-text-primary text-base font-display flex-1 mr-2" numberOfLines={1}>
            {listing.name}
          </Text>

          {/* Save button */}
          <TouchableOpacity
            onPress={() => onSave?.(ContentType.LISTING, listing.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className={`text-xl ${listing.isSaved ? 'text-brand-gold' : 'text-text-muted'}`}>
              {listing.isSaved ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Meta row */}
        <View className="flex-row items-center gap-2 flex-wrap">
          <CategoryPill category={listing.category?.name ?? listing.mainCategory} />

          {listing.isHalalVerified && <HalalBadge />}

          {openStatus !== null && (
            <Text className={`text-xs font-display ${openStatus ? 'text-status-open' : 'text-status-closed'}`}>
              {openStatus ? 'Open' : 'Closed'}
            </Text>
          )}

          {distanceLabel && (
            <Text className="text-text-muted text-xs">{distanceLabel}</Text>
          )}
        </View>

        {/* Daily special */}
        {listing.currentSpecial && (
          <View className="mt-2 px-3 py-2 bg-background-elevated rounded-badge">
            <Text className="text-brand-gold text-xs font-display">
              Today's special: {listing.currentSpecial.title}
              {listing.currentSpecial.price ? ` · $${listing.currentSpecial.price}` : ''}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});
