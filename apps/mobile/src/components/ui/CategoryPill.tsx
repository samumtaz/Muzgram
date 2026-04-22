import { Text, View } from 'react-native';

import { ListingMainCategory } from '@muzgram/types';

const CATEGORY_COLORS: Record<string, string> = {
  eat: 'bg-category-eat/10 text-category-eat border-category-eat/30',
  go_out: 'bg-category-go_out/10 text-category-go_out border-category-go_out/30',
  connect: 'bg-category-connect/10 text-category-connect border-category-connect/30',
};

interface CategoryPillProps {
  category: string;
  mainCategory?: ListingMainCategory;
}

export function CategoryPill({ category, mainCategory }: CategoryPillProps) {
  const colorClass = mainCategory ? (CATEGORY_COLORS[mainCategory] ?? 'bg-surface-border text-text-secondary border-surface-border') : 'bg-background-elevated text-text-muted border-surface-border';

  return (
    <View className={`px-2 py-0.5 rounded-badge border ${colorClass}`}>
      <Text className={`text-xs font-display ${colorClass.split(' ')[1]}`} numberOfLines={1}>
        {category}
      </Text>
    </View>
  );
}
