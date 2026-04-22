import { useState } from 'react';

import { useRouter } from 'expo-router';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, Switch, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

export function CreateEventScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('');
  const [ticketUrl, setTicketUrl] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [onlineUrl, setOnlineUrl] = useState('');

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () => {
      const startAt = new Date(`${startDate}T${startTime || '00:00'}:00`).toISOString();
      return api.post('/events', {
        title: title.trim(),
        description: description.trim(),
        address: isOnline ? 'Online' : address.trim(),
        startAt,
        isFree,
        priceCents: isFree ? 0 : Math.round(parseFloat(price || '0') * 100),
        ticketUrl: ticketUrl.trim() || undefined,
        isOnline,
        onlineUrl: isOnline ? onlineUrl.trim() : undefined,
      }, { token: token ?? undefined });
    },
    onSuccess: () => {
      Alert.alert('Event submitted!', 'Your event will be reviewed and published shortly.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: () => Alert.alert('Error', 'Could not create event. Please try again.'),
  });

  const canSubmit = title.trim() && description.trim() && startDate && (isOnline || address.trim());

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 pt-4 pb-4 flex-row items-center border-b border-surface-border">
        <Pressable onPress={() => router.back()} className="mr-3 p-1">
          <Text className="text-text-secondary text-2xl">‹</Text>
        </Pressable>
        <Text className="text-text-primary font-display text-xl">Create Event</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView className="px-4 pt-4" keyboardShouldPersistTaps="handled">
          {[
            { label: 'Event Title', value: title, onChange: setTitle, placeholder: 'e.g. Eid Bazaar 2026' },
            { label: 'Description', value: description, onChange: setDescription, placeholder: 'Tell people what to expect...', multiline: true },
          ].map((field) => (
            <View key={field.label} className="mb-4">
              <Text className="text-text-muted text-xs uppercase tracking-wide mb-1.5">{field.label}</Text>
              <TextInput
                className="bg-surface-elevated border border-surface-border rounded-card p-3 text-text-primary"
                placeholder={field.placeholder}
                placeholderTextColor="#6B7280"
                value={field.value}
                onChangeText={field.onChange}
                multiline={field.multiline}
                style={field.multiline ? { minHeight: 80, textAlignVertical: 'top' } : undefined}
              />
            </View>
          ))}

          <View className="mb-4 flex-row gap-3">
            <View className="flex-1">
              <Text className="text-text-muted text-xs uppercase tracking-wide mb-1.5">Date</Text>
              <TextInput
                className="bg-surface-elevated border border-surface-border rounded-card p-3 text-text-primary"
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#6B7280"
                value={startDate}
                onChangeText={setStartDate}
              />
            </View>
            <View className="flex-1">
              <Text className="text-text-muted text-xs uppercase tracking-wide mb-1.5">Time</Text>
              <TextInput
                className="bg-surface-elevated border border-surface-border rounded-card p-3 text-text-primary"
                placeholder="HH:MM"
                placeholderTextColor="#6B7280"
                value={startTime}
                onChangeText={setStartTime}
              />
            </View>
          </View>

          <View className="flex-row items-center justify-between mb-4 py-2">
            <Text className="text-text-primary">Online Event</Text>
            <Switch value={isOnline} onValueChange={setIsOnline}
              trackColor={{ false: '#374151', true: '#C9A84C' }} thumbColor="#fff" />
          </View>

          {isOnline ? (
            <View className="mb-4">
              <Text className="text-text-muted text-xs uppercase tracking-wide mb-1.5">Online Link</Text>
              <TextInput
                className="bg-surface-elevated border border-surface-border rounded-card p-3 text-text-primary"
                placeholder="https://zoom.us/..."
                placeholderTextColor="#6B7280"
                value={onlineUrl}
                onChangeText={setOnlineUrl}
                autoCapitalize="none"
              />
            </View>
          ) : (
            <View className="mb-4">
              <Text className="text-text-muted text-xs uppercase tracking-wide mb-1.5">Location</Text>
              <TextInput
                className="bg-surface-elevated border border-surface-border rounded-card p-3 text-text-primary"
                placeholder="Full address"
                placeholderTextColor="#6B7280"
                value={address}
                onChangeText={setAddress}
              />
            </View>
          )}

          <View className="flex-row items-center justify-between mb-4 py-2">
            <Text className="text-text-primary">Free Event</Text>
            <Switch value={isFree} onValueChange={setIsFree}
              trackColor={{ false: '#374151', true: '#C9A84C' }} thumbColor="#fff" />
          </View>

          {!isFree && (
            <View className="mb-4">
              <Text className="text-text-muted text-xs uppercase tracking-wide mb-1.5">Ticket Price ($)</Text>
              <TextInput
                className="bg-surface-elevated border border-surface-border rounded-card p-3 text-text-primary"
                placeholder="25.00"
                placeholderTextColor="#6B7280"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
            </View>
          )}

          <View className="mb-4">
            <Text className="text-text-muted text-xs uppercase tracking-wide mb-1.5">Ticket Link (optional)</Text>
            <TextInput
              className="bg-surface-elevated border border-surface-border rounded-card p-3 text-text-primary"
              placeholder="https://eventbrite.com/..."
              placeholderTextColor="#6B7280"
              value={ticketUrl}
              onChangeText={setTicketUrl}
              autoCapitalize="none"
            />
          </View>

          <Pressable
            onPress={() => canSubmit && submit()}
            disabled={!canSubmit || isPending}
            className={`py-3 rounded-pill items-center mb-8 ${canSubmit ? 'bg-brand-gold' : 'bg-surface-elevated'}`}
          >
            {isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className={`font-semibold ${canSubmit ? 'text-text-inverse' : 'text-text-muted'}`}>
                Submit Event
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
