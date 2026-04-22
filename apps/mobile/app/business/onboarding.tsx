import { useState } from 'react';

import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '../../src/stores/auth.store';
import { useStartClaim } from '../../src/queries/business.queries';
import { api } from '../../src/lib/api';

export default function BusinessOnboardingScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const startClaim = useStartClaim();

  const [step, setStep] = useState<'search' | 'confirm' | 'done'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; name: string; address: string }[]>([]);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [searching, setSearching] = useState(false);

  async function handleSearch() {
    if (!query.trim() || !token) return;
    setSearching(true);
    try {
      const data = await api.get<{ data: { id: string; name: string; address: string }[] }>(
        `/listings?q=${encodeURIComponent(query)}&limit=10`,
        { token },
      );
      setResults(data?.data ?? []);
    } catch {
      Alert.alert('Error', 'Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  async function handleClaim() {
    if (!selected) return;
    try {
      await startClaim.mutateAsync(selected.id);
      setStep('done');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Claim request failed. Please try again.');
    }
  }

  if (step === 'done') {
    return (
      <SafeAreaView className="flex-1 bg-background px-6 items-center justify-center">
        <Text className="text-4xl mb-4">🎉</Text>
        <Text className="text-text-primary text-2xl font-bold text-center mb-2">
          Claim Submitted!
        </Text>
        <Text className="text-text-secondary text-center text-sm mb-8">
          We'll review your claim and verify it within 24 hours. You'll get a notification when it's approved.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/business/dashboard')}
          className="bg-brand-gold rounded-2xl py-4 px-8 items-center"
          activeOpacity={0.85}
        >
          <Text className="text-background font-bold text-base">Go to Dashboard</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-surface-border">
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text className="text-text-secondary text-sm">← Back</Text>
          </TouchableOpacity>
          <Text className="text-text-primary font-semibold ml-4">Claim Your Business</Text>
        </View>

        {step === 'search' && (
          <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
            <View className="py-6">
              <Text className="text-text-secondary text-sm mb-6">
                Search for your business by name to get started. Once claimed, you'll be able to manage your listing, respond to leads, and more.
              </Text>

              <View className="flex-row gap-2 mb-4">
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={handleSearch}
                  placeholder="Search by business name…"
                  placeholderTextColor="#6B7280"
                  returnKeyType="search"
                  className="flex-1 bg-surface border border-surface-border rounded-xl px-4 py-3 text-text-primary"
                />
                <TouchableOpacity
                  onPress={handleSearch}
                  disabled={searching}
                  className="bg-brand-gold rounded-xl px-4 items-center justify-center"
                  activeOpacity={0.7}
                >
                  {searching ? (
                    <ActivityIndicator color="#0D0D0D" />
                  ) : (
                    <Text className="text-background font-semibold">Search</Text>
                  )}
                </TouchableOpacity>
              </View>

              {results.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => {
                    setSelected(r);
                    setStep('confirm');
                  }}
                  className="bg-surface border border-surface-border rounded-xl px-4 py-3 mb-2"
                  activeOpacity={0.7}
                >
                  <Text className="text-text-primary font-medium">{r.name}</Text>
                  {r.address && (
                    <Text className="text-text-muted text-xs mt-0.5">{r.address}</Text>
                  )}
                </TouchableOpacity>
              ))}

              {results.length === 0 && !searching && query.trim().length > 0 && (
                <View className="items-center py-8">
                  <Text className="text-text-muted text-sm">No results found</Text>
                  <Text className="text-text-muted text-xs mt-1">
                    Can't find your business? Contact us to get it added.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}

        {step === 'confirm' && selected && (
          <View className="flex-1 px-4 py-6">
            <Text className="text-text-secondary text-sm mb-6">
              Confirm this is your business. We'll verify your ownership before activating your account.
            </Text>

            <View className="bg-surface border border-surface-border rounded-2xl p-4 mb-6">
              <Text className="text-text-primary font-bold text-lg">{selected.name}</Text>
            </View>

            <TouchableOpacity
              onPress={handleClaim}
              disabled={startClaim.isPending}
              className="bg-brand-gold rounded-2xl py-4 items-center mb-3"
              activeOpacity={0.85}
            >
              <Text className="text-background font-bold text-base">
                {startClaim.isPending ? 'Submitting…' : 'Yes, This Is My Business'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setSelected(null);
                setStep('search');
              }}
              className="py-3 items-center"
              activeOpacity={0.7}
            >
              <Text className="text-text-muted text-sm">Search again</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
