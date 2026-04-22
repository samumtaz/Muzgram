import { Text, View } from 'react-native';

// Quiet, non-preachy halal certification badge.
// Emerald shield — visible but not prominent.
export function HalalBadge({ size = 'sm' }: { size?: 'xs' | 'sm' | 'md' }) {
  const textSize = size === 'xs' ? 'text-[9px]' : size === 'sm' ? 'text-xs' : 'text-sm';
  const padding = size === 'xs' ? 'px-1.5 py-0.5' : 'px-2 py-0.5';

  return (
    <View className={`flex-row items-center bg-brand-emerald/10 rounded-badge ${padding} border border-brand-emerald/30`}>
      <Text className={`text-brand-emerald font-display ${textSize}`}>✓ Halal</Text>
    </View>
  );
}
