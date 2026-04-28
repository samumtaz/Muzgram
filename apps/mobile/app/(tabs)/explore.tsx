import { useState } from 'react';

import { useRouter } from 'expo-router';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EAT_SUBCATEGORIES, GO_OUT_SUBCATEGORIES, CONNECT_SUBCATEGORIES } from '@muzgram/constants';
import { ListingMainCategory } from '@muzgram/types';
import { useTrending } from '../../src/queries/listings.queries';

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

const CITY_LAT = 41.9977;
const CITY_LNG = -87.6936;

export default function ExploreScreen() {
  const router = useRouter();
  const { data: trending, isLoading: trendingLoading } = useTrending(CITY_LAT, CITY_LNG);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 pt-2 pb-3">
        <Text className="text-text-primary text-2xl font-display">Explore</Text>
        <Text className="text-text-secondary text-sm mt-1">
          Find what you're looking for near you
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* 🔥 Trending this week */}
        <View className="mb-6">
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }}>
            <Text style={{ color: '#F5F5F5', fontSize: 17, fontWeight: '700' }}>🔥 Trending this week</Text>
          </View>
          {trendingLoading ? (
            <ActivityIndicator color="#D4A853" style={{ marginLeft: 16 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              {[...(trending?.listings ?? []), ...(trending?.events ?? [])].map((item: any) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push((item.itemType === 'event' ? `/event/${item.id}` : `/listing/${item.id}`) as any)}
                  activeOpacity={0.85}
                  style={{ width: 160, backgroundColor: '#1A1A1A', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#2A2A2A' }}
                >
                  {item.thumbnailUrl ? (
                    <Image source={{ uri: item.thumbnailUrl }} style={{ width: '100%', height: 90 }} resizeMode="cover" />
                  ) : (
                    <View style={{ width: '100%', height: 90, backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 28 }}>{item.itemType === 'event' ? '🗓' : '📍'}</Text>
                    </View>
                  )}
                  <View style={{ padding: 10 }}>
                    <Text style={{ color: '#F5F5F5', fontSize: 12, fontWeight: '700', marginBottom: 3 }} numberOfLines={2}>
                      {item.name}
                    </Text>
                    {item.checkinsCount > 0 && (
                      <Text style={{ color: '#D4A853', fontSize: 10 }}>📍 {item.checkinsCount} check-ins</Text>
                    )}
                    {item.savesCount > 0 && (
                      <Text style={{ color: '#606060', fontSize: 10 }}>♥ {item.savesCount} saves</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
              {(!trending?.listings?.length && !trending?.events?.length) && (
                <Text style={{ color: '#606060', fontSize: 13, paddingVertical: 20 }}>Check back soon — trending spots appear here</Text>
              )}
            </ScrollView>
          )}
        </View>
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
