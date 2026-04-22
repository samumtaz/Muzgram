import { useState } from 'react';

import { useRouter } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EAT_SUBCATEGORIES, GO_OUT_SUBCATEGORIES, CONNECT_SUBCATEGORIES } from '@muzgram/constants';
import { ListingMainCategory } from '@muzgram/types';

const SECTIONS = [
  {
    title: 'Eat',
    mainCategory: ListingMainCategory.EAT,
    accent: 'text-category-eat',
    border: 'border-category-eat/30',
    categories: EAT_SUBCATEGORIES,
  },
  {
    title: 'Go Out',
    mainCategory: ListingMainCategory.GO_OUT,
    accent: 'text-category-go_out',
    border: 'border-category-go_out/30',
    categories: GO_OUT_SUBCATEGORIES,
  },
  {
    title: 'Connect',
    mainCategory: ListingMainCategory.CONNECT,
    accent: 'text-category-connect',
    border: 'border-category-connect/30',
    categories: CONNECT_SUBCATEGORIES,
  },
];

export default function ExploreScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 pt-2 pb-3">
        <Text className="text-text-primary text-2xl font-display">Explore</Text>
        <Text className="text-text-secondary text-sm mt-1">
          Find what you're looking for near you
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {SECTIONS.map((section) => (
          <View key={section.mainCategory} className="mb-6">
            <Text className={`px-4 text-lg font-display mb-3 ${section.accent}`}>
              {section.title}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            >
              {section.categories.map((cat) => (
                <TouchableOpacity
                  key={cat.slug}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)',
                      params: { category: section.mainCategory },
                    })
                  }
                  className={`bg-surface-DEFAULT border ${section.border} rounded-card px-4 py-3 min-w-32 items-center`}
                  activeOpacity={0.8}
                >
                  <Text className="text-text-primary text-sm font-display text-center" numberOfLines={2}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ))}

        {/* Quick links */}
        <View className="px-4 mt-2">
          <Text className="text-text-primary font-display mb-3">Quick finds</Text>
          <View className="flex-row flex-wrap gap-3">
            {[
              { label: 'Open now', emoji: '🟢' },
              { label: 'Halal verified', emoji: '✓' },
              { label: 'Free events', emoji: '🎟️' },
              { label: 'Tonight', emoji: '🌙' },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                className="bg-surface-DEFAULT border border-surface-border rounded-card px-4 py-3 flex-row items-center gap-2"
                activeOpacity={0.8}
              >
                <Text className="text-base">{item.emoji}</Text>
                <Text className="text-text-primary text-sm font-display">{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
