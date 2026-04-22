import { memo } from 'react';

import { Text, TouchableOpacity, View } from 'react-native';

import { SearchResultItem } from '../../queries/search.queries';
import { formatEventTime } from '../../lib/time';

const CATEGORY_ICONS: Record<string, string> = {
  eat: '🍽',
  go_out: '✦',
  connect: '◎',
  events: '📅',
  community: '💬',
};

interface SearchResultCardProps {
  item: SearchResultItem;
  onPress: (item: SearchResultItem) => void;
}

export const SearchResultCard = memo(function SearchResultCard({
  item,
  onPress,
}: SearchResultCardProps) {
  const isEvent = item.contentType === 'event';
  const displayName = item.item.name ?? item.item.title ?? '';
  const icon = CATEGORY_ICONS[item.mainCategory] ?? '◎';

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.75}
      className="flex-row items-center px-4 py-3 border-b border-surface-border"
    >
      {/* Category icon */}
      <View className="w-9 h-9 rounded-full bg-surface-elevated items-center justify-center mr-3">
        <Text className="text-base">{icon}</Text>
      </View>

      {/* Content */}
      <View className="flex-1">
        <Text className="text-text-primary text-sm font-display" numberOfLines={1}>
          {displayName}
        </Text>
        <View className="flex-row items-center gap-2 mt-0.5">
          {item.item.address && (
            <Text className="text-text-muted text-xs" numberOfLines={1}>
              {item.item.address}
            </Text>
          )}
          {isEvent && item.item.startAt && (
            <Text className="text-brand-gold text-xs font-display">
              {formatEventTime(item.item.startAt)}
            </Text>
          )}
          {item.item.isHalalVerified && (
            <Text className="text-status-open text-xs">✓ Halal</Text>
          )}
        </View>
      </View>

      {/* Featured dot */}
      {item.item.isFeatured && (
        <View className="w-2 h-2 rounded-full bg-brand-gold ml-2" />
      )}
    </TouchableOpacity>
  );
});
