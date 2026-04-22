import { useState } from 'react';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

const REASONS = [
  { value: 'not_halal', label: 'Not actually halal' },
  { value: 'misinformation', label: 'Wrong information' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'spam', label: 'Spam or fake listing' },
  { value: 'duplicate', label: 'Duplicate listing' },
  { value: 'other', label: 'Other' },
];

export function ReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ contentType?: string; contentId?: string }>();
  const token = useAuthStore((s) => s.token);

  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () =>
      api.post('/reports', {
        contentType: params.contentType ?? 'listing',
        contentId: params.contentId,
        reason,
        notes: notes.trim() || undefined,
      }, { token: token ?? undefined }),
    onSuccess: () => {
      Alert.alert('Report submitted', 'Thanks for letting us know. We\'ll review it.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: () => {
      Alert.alert('Error', 'Could not submit report. Please try again.');
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 pt-4 pb-4 flex-row items-center border-b border-surface-border">
        <Pressable onPress={() => router.back()} className="mr-3 p-1">
          <Text className="text-text-secondary text-2xl">‹</Text>
        </Pressable>
        <Text className="text-text-primary font-display text-xl">Report</Text>
      </View>

      <ScrollView className="px-4 pt-6">
        <Text className="text-text-secondary text-sm mb-4">
          What's wrong with this content?
        </Text>

        {REASONS.map((r) => (
          <Pressable
            key={r.value}
            onPress={() => setReason(r.value)}
            className={`flex-row items-center py-4 px-4 mb-2 rounded-card border ${
              reason === r.value
                ? 'border-brand-gold bg-brand-gold/10'
                : 'border-surface-border bg-surface-elevated'
            }`}
          >
            <View
              className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                reason === r.value ? 'border-brand-gold' : 'border-text-muted'
              }`}
            >
              {reason === r.value && (
                <View className="w-2.5 h-2.5 rounded-full bg-brand-gold" />
              )}
            </View>
            <Text className="text-text-primary">{r.label}</Text>
          </Pressable>
        ))}

        <TextInput
          className="mt-4 bg-surface-elevated border border-surface-border rounded-card p-3 text-text-primary min-h-[80px]"
          placeholder="Additional details (optional)"
          placeholderTextColor="#6B7280"
          multiline
          value={notes}
          onChangeText={setNotes}
          textAlignVertical="top"
        />

        <Pressable
          onPress={() => reason && submit()}
          disabled={!reason || isPending}
          className={`mt-6 py-3 rounded-pill items-center ${
            reason ? 'bg-brand-gold' : 'bg-surface-elevated'
          }`}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              className={`font-semibold ${reason ? 'text-text-inverse' : 'text-text-muted'}`}
            >
              Submit Report
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
