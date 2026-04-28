import { useState } from 'react';

import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const INTERESTS = [
  { label: 'Halal Restaurants', emoji: '🍽', value: 'restaurants' },
  { label: 'Shawarma & Grills', emoji: '🥙', value: 'shawarma' },
  { label: 'Bakeries & Desserts', emoji: '🍰', value: 'desserts' },
  { label: 'Hookah Lounges', emoji: '💨', value: 'hookah' },
  { label: 'Concerts & Live Music', emoji: '🎵', value: 'concerts' },
  { label: 'Parties & Nightlife', emoji: '🎊', value: 'parties' },
  { label: 'Comedy Shows', emoji: '🎤', value: 'comedy' },
  { label: 'Muslim Events', emoji: '🎉', value: 'events' },
  { label: 'Eid Celebrations', emoji: '🌙', value: 'eid' },
  { label: 'Sports & Fitness', emoji: '⚽', value: 'sports' },
  { label: 'Islamic Classes', emoji: '📚', value: 'classes' },
  { label: 'Mosques', emoji: '🕌', value: 'mosques' },
  { label: 'Community Services', emoji: '🤝', value: 'services' },
  { label: 'Photography', emoji: '📸', value: 'photography' },
  { label: 'Business Directory', emoji: '💼', value: 'business' },
];

export default function InterestsScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(value: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-background px-6">
      {/* Back */}
      <TouchableOpacity onPress={() => router.back()} className="pt-4 pb-2 self-start">
        <Text className="text-text-muted text-sm">← Back</Text>
      </TouchableOpacity>

      <View className="mt-4 mb-6">
        <Text className="text-text-primary text-2xl font-bold mb-1">What's your vibe?</Text>
        <Text className="text-text-secondary text-sm">
          Pick anything that sounds like you. We'll personalize your feed.
        </Text>
      </View>

      <View className="flex-1">
        <View className="flex-row flex-wrap gap-2">
          {INTERESTS.map((interest) => {
            const active = selected.has(interest.value);
            return (
              <TouchableOpacity
                key={interest.value}
                onPress={() => toggle(interest.value)}
                className={`flex-row items-center gap-1.5 px-3 py-2 rounded-full border ${
                  active
                    ? 'bg-brand-gold border-brand-gold'
                    : 'bg-surface border-surface-border'
                }`}
                activeOpacity={0.7}
              >
                <Text className="text-sm">{interest.emoji}</Text>
                <Text
                  className={`text-sm font-medium ${
                    active ? 'text-background' : 'text-text-secondary'
                  }`}
                >
                  {interest.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View className="gap-3 pb-6">
        <TouchableOpacity
          onPress={() => router.push('/(onboarding)/permissions')}
          className="bg-brand-gold rounded-2xl py-4 items-center"
          activeOpacity={0.85}
        >
          <Text className="text-background font-bold text-base">Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/(onboarding)/permissions')}
          activeOpacity={0.7}
          className="py-3 items-center"
        >
          <Text className="text-text-muted text-sm">Skip</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
