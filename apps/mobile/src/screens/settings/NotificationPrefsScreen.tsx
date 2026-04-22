import { useState } from 'react';

import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';

interface NotifPrefs {
  new_event_nearby: boolean;
  listing_special: boolean;
  event_reminder: boolean;
  jummah_reminder: boolean;
}

const PREF_LABELS: Record<keyof NotifPrefs, { label: string; desc: string }> = {
  new_event_nearby: { label: 'Events Near You', desc: 'New events in your neighborhood' },
  listing_special: { label: 'Daily Specials', desc: 'Deals from saved businesses' },
  event_reminder: { label: 'Event Reminders', desc: '1 hour before saved events' },
  jummah_reminder: { label: 'Jummah Reminder', desc: 'Friday prayer time reminder' },
};

export function NotificationPrefsScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user) as any;

  const [prefs, setPrefs] = useState<NotifPrefs>({
    new_event_nearby: true,
    listing_special: true,
    event_reminder: true,
    jummah_reminder: true,
    ...((user?.notificationPrefs as NotifPrefs) ?? {}),
  });

  const { mutate: save } = useMutation({
    mutationFn: (updated: NotifPrefs) =>
      api.patch('/users/me/notification-prefs', updated, { token: token ?? undefined }),
  });

  const toggle = (key: keyof NotifPrefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    save(updated);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 pt-4 pb-4 flex-row items-center border-b border-surface-border">
        <Pressable onPress={() => router.back()} className="mr-3 p-1">
          <Text className="text-text-secondary text-2xl">‹</Text>
        </Pressable>
        <Text className="text-text-primary font-display text-xl">Notifications</Text>
      </View>

      <ScrollView className="px-4 pt-4">
        {(Object.keys(PREF_LABELS) as (keyof NotifPrefs)[]).map((key) => (
          <View
            key={key}
            className="flex-row items-center py-4 border-b border-surface-border"
          >
            <View className="flex-1 mr-4">
              <Text className="text-text-primary text-base">{PREF_LABELS[key].label}</Text>
              <Text className="text-text-muted text-sm mt-0.5">{PREF_LABELS[key].desc}</Text>
            </View>
            <Switch
              value={prefs[key]}
              onValueChange={() => toggle(key)}
              trackColor={{ false: '#374151', true: '#C9A84C' }}
              thumbColor="#fff"
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
