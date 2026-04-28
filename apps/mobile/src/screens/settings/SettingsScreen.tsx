import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePrefsStore } from '../../stores/prefs.store';

const SETTINGS_ROWS = [
  { label: 'Notification Preferences', emoji: '🔔', route: '/settings/notifications' },
  { label: 'Account', emoji: '👤', route: '/settings/account' },
];

export function SettingsScreen() {
  const router = useRouter();
  const { showPrayerTimes, setShowPrayerTimes, hydrate } = usePrefsStore();

  useEffect(() => { hydrate(); }, []);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 pt-4 pb-4 flex-row items-center border-b border-surface-border">
        <Pressable onPress={() => router.back()} className="mr-3 p-1">
          <Text className="text-text-secondary text-2xl">‹</Text>
        </Pressable>
        <Text className="text-text-primary font-display text-xl">Settings</Text>
      </View>

      <ScrollView className="px-4 pt-4">
        {/* Toggle rows */}
        <View className="flex-row items-center py-4 border-b border-surface-border">
          <Text className="text-xl mr-4">🕌</Text>
          <View className="flex-1">
            <Text className="text-text-primary text-base">Prayer Times</Text>
            <Text className="text-text-muted text-xs mt-0.5">Show daily prayer times on your feed</Text>
          </View>
          <Switch
            value={showPrayerTimes}
            onValueChange={setShowPrayerTimes}
            trackColor={{ false: '#2A2A2A', true: '#22c55e40' }}
            thumbColor={showPrayerTimes ? '#22c55e' : '#606060'}
          />
        </View>

        {/* Nav rows */}
        {SETTINGS_ROWS.map((row) => (
          <Pressable
            key={row.route}
            onPress={() => router.push(row.route as any)}
            className="flex-row items-center py-4 border-b border-surface-border"
          >
            <Text className="text-xl mr-4">{row.emoji}</Text>
            <Text className="text-text-primary text-base flex-1">{row.label}</Text>
            <Text className="text-text-muted">›</Text>
          </Pressable>
        ))}

        <View className="mt-8 items-center">
          <Text className="text-text-muted text-xs">Muzgram v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
