import { useEffect, useState } from 'react';

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

import { useAuthStore } from '../../stores/auth.store';
import { useMyListing } from '../../queries/business.queries';
import { api } from '../../lib/api';

interface EditForm {
  name: string;
  description: string;
  phone: string;
  website: string;
  instagramHandle: string;
  address: string;
}

export function BusinessEditScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const { data, isLoading } = useMyListing();
  const listing = data?.data;

  const [form, setForm] = useState<EditForm>({
    name: '',
    description: '',
    phone: '',
    website: '',
    instagramHandle: '',
    address: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (listing) {
      setForm({
        name: listing.name ?? '',
        description: listing.description ?? '',
        phone: listing.phone ?? '',
        website: listing.website ?? '',
        instagramHandle: listing.instagramHandle ?? '',
        address: listing.address ?? '',
      });
    }
  }, [listing]);

  function field(key: keyof EditForm) {
    return {
      value: form[key],
      onChangeText: (text: string) => setForm((f) => ({ ...f, [key]: text })),
    };
  }

  async function handleSave() {
    if (!listing?.id || !token) return;
    setSaving(true);
    try {
      await api.patch(
        `/listings/${listing.id}`,
        {
          name: form.name.trim() || undefined,
          description: form.description.trim() || undefined,
          phone: form.phone.trim() || undefined,
          website: form.website.trim() || undefined,
          instagramHandle: form.instagramHandle.trim() || undefined,
          address: form.address.trim() || undefined,
        },
        { token },
      );
      Alert.alert('Saved', 'Your business info has been updated.');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#C9A84C" />
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
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-surface-border">
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text className="text-text-secondary text-sm">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-text-primary font-semibold">Edit Business</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text className={`font-semibold text-sm ${saving ? 'text-text-muted' : 'text-brand-gold'}`}>
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          <View className="py-6 gap-5">
            {/* Business Name */}
            <View>
              <Text className="text-text-muted text-xs uppercase tracking-wide mb-1.5">
                Business Name
              </Text>
              <TextInput
                {...field('name')}
                placeholder="Your business name"
                placeholderTextColor="#6B7280"
                className="bg-surface border border-surface-border rounded-xl px-4 py-3 text-text-primary"
              />
            </View>

            {/* Description */}
            <View>
              <Text className="text-text-muted text-xs uppercase tracking-wide mb-1.5">
                Description
              </Text>
              <TextInput
                {...field('description')}
                placeholder="Tell people about your business…"
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="bg-surface border border-surface-border rounded-xl px-4 py-3 text-text-primary min-h-[100px]"
              />
            </View>

            {/* Phone */}
            <View>
              <Text className="text-text-muted text-xs uppercase tracking-wide mb-1.5">
                Phone Number
              </Text>
              <TextInput
                {...field('phone')}
                placeholder="+1 (312) 555-0100"
                placeholderTextColor="#6B7280"
                keyboardType="phone-pad"
                className="bg-surface border border-surface-border rounded-xl px-4 py-3 text-text-primary"
              />
            </View>

            {/* Website */}
            <View>
              <Text className="text-text-muted text-xs uppercase tracking-wide mb-1.5">
                Website
              </Text>
              <TextInput
                {...field('website')}
                placeholder="https://yourbusiness.com"
                placeholderTextColor="#6B7280"
                keyboardType="url"
                autoCapitalize="none"
                className="bg-surface border border-surface-border rounded-xl px-4 py-3 text-text-primary"
              />
            </View>

            {/* Instagram */}
            <View>
              <Text className="text-text-muted text-xs uppercase tracking-wide mb-1.5">
                Instagram Handle
              </Text>
              <View className="flex-row items-center bg-surface border border-surface-border rounded-xl overflow-hidden">
                <View className="px-3 py-3 border-r border-surface-border">
                  <Text className="text-text-muted">@</Text>
                </View>
                <TextInput
                  {...field('instagramHandle')}
                  placeholder="yourbusiness"
                  placeholderTextColor="#6B7280"
                  autoCapitalize="none"
                  className="flex-1 px-3 py-3 text-text-primary"
                />
              </View>
            </View>

            {/* Address */}
            <View>
              <Text className="text-text-muted text-xs uppercase tracking-wide mb-1.5">
                Address
              </Text>
              <TextInput
                {...field('address')}
                placeholder="123 Main St, Chicago, IL 60601"
                placeholderTextColor="#6B7280"
                className="bg-surface border border-surface-border rounded-xl px-4 py-3 text-text-primary"
              />
            </View>

            <View className="h-8" />
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
