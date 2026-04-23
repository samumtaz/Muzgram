import { useState } from 'react';

import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '../../src/stores/auth.store';
import { useLocationStore } from '../../src/stores/location.store';

export default function PermissionsScreen() {
  const router = useRouter();
  const setLocation = useLocationStore((s) => s.setLocation);
  const setOnboardingComplete = useAuthStore((s) => s.setOnboardingComplete);
  const [locationGranted, setLocationGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const [requesting, setRequesting] = useState<'location' | 'notif' | null>(null);

  async function requestLocation() {
    setRequesting('location');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationGranted(true);
        const pos = await Location.getCurrentPositionAsync({});
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }
    } finally {
      setRequesting(null);
    }
  }

  async function requestNotifs() {
    setRequesting('notif');
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') setNotifGranted(true);
    } finally {
      setRequesting(null);
    }
  }

  function handleFinish() {
    setOnboardingComplete();
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView className="flex-1 bg-background px-6">
      {/* Back */}
      <TouchableOpacity onPress={() => router.back()} className="pt-4 pb-2 self-start">
        <Text className="text-text-muted text-sm">← Back</Text>
      </TouchableOpacity>

      <View className="flex-1 justify-center">
        <View className="mb-10">
          <Text className="text-text-primary text-2xl font-bold mb-1">One last thing</Text>
          <Text className="text-text-secondary text-sm">
            These permissions make Muzgram work its best.
          </Text>
        </View>

        {/* Location permission */}
        <View className="bg-surface border border-surface-border rounded-2xl p-4 mb-3">
          <View className="flex-row items-center gap-3 mb-3">
            <View className="w-10 h-10 bg-brand-gold/10 rounded-xl items-center justify-center">
              <Text className="text-xl">📍</Text>
            </View>
            <View className="flex-1">
              <Text className="text-text-primary font-semibold text-sm">Location</Text>
              <Text className="text-text-secondary text-xs mt-0.5">
                Find places and events near you
              </Text>
            </View>
            {locationGranted && <Text className="text-green-400 text-sm">✓ Allowed</Text>}
          </View>
          {!locationGranted && (
            <TouchableOpacity
              onPress={requestLocation}
              disabled={requesting === 'location'}
              className="bg-brand-gold/10 border border-brand-gold/40 rounded-xl py-2.5 items-center"
              activeOpacity={0.7}
            >
              <Text className="text-brand-gold font-medium text-sm">
                {requesting === 'location' ? 'Requesting…' : 'Allow Location'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notification permission */}
        <View className="bg-surface border border-surface-border rounded-2xl p-4 mb-8">
          <View className="flex-row items-center gap-3 mb-3">
            <View className="w-10 h-10 bg-brand-gold/10 rounded-xl items-center justify-center">
              <Text className="text-xl">🔔</Text>
            </View>
            <View className="flex-1">
              <Text className="text-text-primary font-semibold text-sm">Notifications</Text>
              <Text className="text-text-secondary text-xs mt-0.5">
                Event reminders and Jumu'ah alerts
              </Text>
            </View>
            {notifGranted && <Text className="text-green-400 text-sm">✓ Allowed</Text>}
          </View>
          {!notifGranted && (
            <TouchableOpacity
              onPress={requestNotifs}
              disabled={requesting === 'notif'}
              className="bg-brand-gold/10 border border-brand-gold/40 rounded-xl py-2.5 items-center"
              activeOpacity={0.7}
            >
              <Text className="text-brand-gold font-medium text-sm">
                {requesting === 'notif' ? 'Requesting…' : 'Allow Notifications'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View className="pb-6">
        <TouchableOpacity
          onPress={handleFinish}
          className="bg-brand-gold rounded-2xl py-4 items-center"
          activeOpacity={0.85}
        >
          <Text className="text-background font-bold text-base">Start Exploring</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
