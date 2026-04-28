import { useState } from 'react';

import { useRouter } from 'expo-router';
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '../../src/stores/auth.store';
import { api } from '../../src/lib/api';

const CHICAGO_NEIGHBORHOODS = [
  'Rogers Park', 'Edgewater', 'Uptown', 'Lincoln Square', 'Devon Ave',
  'Albany Park', 'Irving Park', 'Logan Square', 'Humboldt Park', 'West Town',
  'Pilsen', 'Bridgeport', 'Hyde Park', 'Bronzeville', 'South Shore',
  'Orland Park', 'Skokie', 'Evanston', 'Oak Park', 'Schaumburg',
  'Lombard', 'Naperville', 'Aurora', 'Bolingbrook', 'Downers Grove',
];

export default function NeighborhoodScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleContinue() {
    const neighborhood = custom.trim() || selected.join(', ');
    if (neighborhood && token) {
      setSaving(true);
      try {
        await api.patch('/users/me', { neighborhood }, { token });
      } catch {
        // non-blocking — user can set later
      } finally {
        setSaving(false);
      }
    }
    router.push('/(onboarding)/interests');
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView className="flex-1 px-6">
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} className="pt-4 pb-2 self-start">
          <Text className="text-text-muted text-sm">← Back</Text>
        </TouchableOpacity>

        <View className="flex-1">
          <View className="mb-8 mt-4">
            <Text className="text-text-primary text-2xl font-bold mb-1">Your neighborhood</Text>
            <Text className="text-text-secondary text-sm">
              We'll show you what's nearby first.
            </Text>
          </View>

          {/* Quick pick chips */}
          <View className="flex-row flex-wrap gap-2 mb-6">
            {CHICAGO_NEIGHBORHOODS.map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => {
                  setSelected((prev) =>
                    prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]
                  );
                  setCustom('');
                }}
                className={`px-3 py-1.5 rounded-full border ${
                  selected.includes(n) && !custom
                    ? 'bg-brand-gold border-brand-gold'
                    : 'bg-surface border-surface-border'
                }`}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-sm ${
                    selected.includes(n) && !custom ? 'text-background font-semibold' : 'text-text-secondary'
                  }`}
                >
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom input */}
          <TextInput
            value={custom}
            onChangeText={(t) => {
              setCustom(t);
              setSelected([]);
            }}
            placeholder="Or type your neighborhood / suburb…"
            placeholderTextColor="#6B7280"
            className="bg-surface border border-surface-border rounded-xl px-4 py-3 text-text-primary"
          />
        </View>

        <View className="gap-3 pb-6">
          <TouchableOpacity
            onPress={handleContinue}
            disabled={saving}
            className="bg-brand-gold rounded-2xl py-4 items-center"
            activeOpacity={0.85}
          >
            <Text className="text-background font-bold text-base">
              {saving ? 'Saving…' : 'Continue'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(onboarding)/interests')}
            activeOpacity={0.7}
            className="py-3 items-center"
          >
            <Text className="text-text-muted text-sm">Skip</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
