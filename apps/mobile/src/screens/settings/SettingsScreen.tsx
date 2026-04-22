import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SETTINGS_ROWS = [
  { label: 'Notification Preferences', emoji: '🔔', route: '/settings/notifications' },
  { label: 'Account', emoji: '👤', route: '/settings/account' },
];

export function SettingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 pt-4 pb-4 flex-row items-center border-b border-surface-border">
        <Pressable onPress={() => router.back()} className="mr-3 p-1">
          <Text className="text-text-secondary text-2xl">‹</Text>
        </Pressable>
        <Text className="text-text-primary font-display text-xl">Settings</Text>
      </View>

      <ScrollView className="px-4 pt-4">
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
