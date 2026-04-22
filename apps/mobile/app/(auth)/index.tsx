import { useRef, useState } from 'react';

import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { normalizePhone } from '@muzgram/utils';

export default function PhoneEntryScreen() {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const inputRef = useRef<TextInput>(null);

  const handleContinue = async () => {
    if (!phone.trim() || !signInLoaded || !signUpLoaded) return;

    setIsLoading(true);
    setError(null);

    const normalizedPhone = normalizePhone(phone);

    try {
      // Try sign in first; if user doesn't exist, fall back to sign up
      try {
        await signIn.create({
          strategy: 'phone_code',
          identifier: normalizedPhone,
        });
      } catch {
        await signUp.create({ phoneNumber: normalizedPhone });
        await signUp.preparePhoneNumberVerification();
      }

      router.push({ pathname: '/(auth)/verify', params: { phone: normalizedPhone } });
    } catch (err: any) {
      setError(err.errors?.[0]?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
    >
      <View className="flex-1 justify-end px-6 pb-16">
        {/* Brand header */}
        <View className="mb-12">
          <Text className="text-4xl font-display text-brand-gold mb-3">Muzgram</Text>
          <Text className="text-text-primary text-2xl font-display leading-8">
            Your city.{'\n'}Your scene.{'\n'}Your people.
          </Text>
          <Text className="text-text-secondary text-base mt-3">
            Find halal spots, events, and your community — near you, right now.
          </Text>
        </View>

        {/* Phone input */}
        <View className="mb-4">
          <Text className="text-text-secondary text-sm mb-2">Phone number</Text>
          <View className="flex-row items-center bg-surface border border-surface-border rounded-card px-4 h-14">
            <Text className="text-text-secondary text-base mr-2">🇺🇸 +1</Text>
            <TextInput
              ref={inputRef}
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 000-0000"
              placeholderTextColor="#606060"
              keyboardType="phone-pad"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              className="flex-1 text-text-primary text-base"
              autoFocus
            />
          </View>
          {error && (
            <Text className="text-status-closed text-sm mt-2">{error}</Text>
          )}
        </View>

        <TouchableOpacity
          onPress={handleContinue}
          disabled={phone.length < 10 || isLoading}
          className="bg-brand-gold rounded-card h-14 items-center justify-center"
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#0D0D0D" />
          ) : (
            <Text className="text-text-inverse text-base font-display">Continue</Text>
          )}
        </TouchableOpacity>

        <Text className="text-text-muted text-xs text-center mt-6 leading-5">
          By continuing, you agree to Muzgram's Terms of Service and Privacy Policy.
          We'll send you a one-time code.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
