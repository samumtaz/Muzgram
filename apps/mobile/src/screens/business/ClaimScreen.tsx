import { useState } from 'react';

import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSearchSuggestions, SearchSuggestion } from '../../queries/search.queries';
import { useStartClaim } from '../../queries/business.queries';

type Step = 'search' | 'confirm' | 'pending';

export function ClaimScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('search');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SearchSuggestion | null>(null);

  const { data: suggestions, isLoading: searchLoading } = useSearchSuggestions(query);
  const startClaim = useStartClaim();

  const handleSelect = (s: SearchSuggestion) => {
    setSelected(s);
    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!selected) return;
    try {
      await startClaim.mutateAsync(selected.id);
      setStep('pending');
    } catch {
      Alert.alert('Error', 'Could not submit claim. Please try again.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 pt-2 pb-4 border-b border-surface-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-text-secondary text-base">‹ Back</Text>
        </TouchableOpacity>
        <Text className="text-text-primary text-xl font-display">Claim Your Business</Text>
      </View>

      {step === 'search' && (
        <View className="flex-1 px-4 pt-6">
          <Text className="text-text-secondary text-sm mb-4 leading-5">
            Search for your business below. We'll verify ownership and activate your dashboard.
          </Text>

          {/* Search input */}
          <View className="flex-row items-center bg-surface-elevated rounded-xl px-3 h-11 border border-surface-border mb-3">
            <Text className="text-text-muted mr-2">⌕</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Enter your business name…"
              placeholderTextColor="#606060"
              autoCapitalize="words"
              className="flex-1 text-text-primary text-sm"
            />
            {searchLoading && <ActivityIndicator size="small" color="#D4A853" />}
          </View>

          {/* Suggestions */}
          {suggestions?.suggestions?.map((s) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => handleSelect(s)}
              className="flex-row items-center py-3 border-b border-surface-border"
              activeOpacity={0.8}
            >
              <View className="flex-1">
                <Text className="text-text-primary text-sm font-display">{s.name}</Text>
                <Text className="text-text-muted text-xs capitalize mt-0.5">{s.type}</Text>
              </View>
              <Text className="text-brand-gold text-sm">Select →</Text>
            </TouchableOpacity>
          ))}

          {query.length >= 2 && suggestions?.suggestions?.length === 0 && !searchLoading && (
            <Text className="text-text-muted text-sm text-center mt-6">
              Not found? Email us at support@muzgram.com and we'll add it.
            </Text>
          )}
        </View>
      )}

      {step === 'confirm' && selected && (
        <View className="flex-1 px-4 pt-6">
          <Text className="text-text-secondary text-sm mb-6 leading-5">
            Confirm this is your business. We'll review your claim within 24 hours.
          </Text>

          {/* Business card */}
          <View className="bg-surface-DEFAULT rounded-xl p-4 border border-surface-border mb-6">
            <Text className="text-text-primary font-display text-base">{selected.name}</Text>
            <Text className="text-text-muted text-xs capitalize mt-1">{selected.type}</Text>
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={startClaim.isPending}
            className="bg-brand-gold py-4 rounded-pill items-center mb-3"
            activeOpacity={0.85}
          >
            {startClaim.isPending ? (
              <ActivityIndicator color="#0D0D0D" />
            ) : (
              <Text className="text-text-inverse font-display text-base">
                Yes, this is my business
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setStep('search')}
            className="py-3 items-center"
          >
            <Text className="text-text-secondary text-sm">Search again</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'pending' && (
        <View className="flex-1 items-center justify-center px-8 gap-4">
          <Text className="text-4xl">✓</Text>
          <Text className="text-text-primary text-xl font-display text-center">
            Claim Submitted
          </Text>
          <Text className="text-text-secondary text-sm text-center leading-6">
            Your claim is under review. We'll notify you within 24 hours once approved.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-surface-DEFAULT px-6 py-3 rounded-pill border border-surface-border mt-2"
          >
            <Text className="text-text-primary font-display">Back to Profile</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
