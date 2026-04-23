import { memo, useCallback } from 'react';

import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Share, Text, TouchableOpacity, View } from 'react-native';

import { ContentType, Listing } from '@muzgram/types';
import { formatDistanceLabel, isOpenNow } from '@muzgram/utils';
import { track } from '../../lib/analytics';

import { HalalBadge } from '../ui/HalalBadge';
import { CategoryPill } from '../ui/CategoryPill';

interface ListingCardProps {
  listing: Listing & { distanceKm?: number; primaryPhotoBlurHash?: string };
  onSave?: (contentType: ContentType, contentId: string) => void;
  position?: number;
}

export const ListingCard = memo(function ListingCard({ listing, onSave, position }: ListingCardProps) {
  const router = useRouter();

  const openStatus = listing.hours ? isOpenNow(listing.hours) : null;
  const distanceLabel = listing.distanceKm != null ? formatDistanceLabel(listing.distanceKm) : null;

  const handlePress = useCallback(() => {
    track('feed_item_tapped', {
      itemType: ContentType.LISTING,
      itemId: listing.id,
      isFeatured: listing.isFeatured,
      position,
    });
    router.push(`/listing/${listing.id}`);
  }, [listing.id, listing.isFeatured, position, router]);

  const handleShare = useCallback(() => {
    Share.share({
      message: `Check out ${listing.name} on Muzgram`,
      url: `https://muzgram.com/listing/${listing.slug ?? listing.id}`,
    });
  }, [listing.name, listing.slug, listing.id]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.9}
      className="mx-4 mb-4 bg-surface-DEFAULT rounded-card overflow-hidden border border-surface-border"
    >
      {/* Thumbnail with blurhash placeholder */}
      {listing.thumbnailUrl && (
        <Image
          source={{ uri: listing.thumbnailUrl }}
          placeholder={listing.primaryPhotoBlurHash ? { blurhash: listing.primaryPhotoBlurHash } : undefined}
          className="w-full h-48"
          contentFit="cover"
          transition={200}
        />
      )}

      {/* Featured ribbon — diagonal top-right */}
      {listing.isFeatured && (
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

      {/* Content */}
      <View className="p-4">
        <View className="flex-row items-start justify-between mb-1">
          <Text className="text-text-primary text-base font-display flex-1 mr-2" numberOfLines={1}>
            {listing.name}
          </Text>

          {/* Save + Share buttons */}
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={handleShare}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="text-text-muted text-base">↑</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onSave?.(ContentType.LISTING, listing.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className={`text-xl ${listing.isSaved ? 'text-brand-gold' : 'text-text-muted'}`}>
                {listing.isSaved ? '♥' : '♡'}
              </Text>
            </TouchableOpacity>
          </View>
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
