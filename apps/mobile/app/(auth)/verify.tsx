import { useEffect, useRef, useState } from 'react';

import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const OTP_LENGTH = 6;

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(30);
  const router = useRouter();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = async (otp: string) => {
    if (otp.length !== OTP_LENGTH) return;

    setIsLoading(true);
    setError(null);

    try {
      // Attempt sign-in verification first
      if (signIn?.status === 'needs_first_factor') {
        const result = await signIn.attemptFirstFactor({
          strategy: 'phone_code',
          code: otp,
        });
        if (result.status === 'complete') {
          router.replace('/(tabs)');
          return;
        }
      }

      // Attempt sign-up verification
      if (signUp?.status === 'missing_requirements') {
        const result = await signUp.attemptPhoneNumberVerification({ code: otp });
        if (result.status === 'complete') {
          router.replace('/(tabs)');
          return;
        }
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message ?? 'Invalid code. Please try again.');
      setCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setCode(cleaned);
    if (cleaned.length === OTP_LENGTH) {
      handleVerify(cleaned);
    }
  };

  return (
    <View className="flex-1 bg-background px-6">
      <TouchableOpacity
        onPress={() => router.back()}
        className="mt-16 mb-8 self-start"
      >
        <Text className="text-text-secondary text-base">← Back</Text>
      </TouchableOpacity>

      <Text className="text-text-primary text-2xl font-display mb-2">
        Enter the code
      </Text>
      <Text className="text-text-secondary text-base mb-8">
        We sent a 6-digit code to{'\n'}
        <Text className="text-text-primary">{phone}</Text>
      </Text>

      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={handleCodeChange}
        keyboardType="number-pad"
        maxLength={OTP_LENGTH}
        autoFocus
        className="text-center text-text-primary text-4xl tracking-widest bg-surface border border-surface-border rounded-card py-4 mb-4"
        placeholderTextColor="#606060"
        placeholder="——————"
      />

      {error && (
        <Text className="text-status-closed text-sm text-center mb-4">{error}</Text>
      )}

      {isLoading && (
        <ActivityIndicator color="#D4A853" className="mb-4" />
      )}

      <TouchableOpacity
        onPress={() => {
          setResendCooldown(30);
          // Re-trigger the OTP send
        }}
        disabled={resendCooldown > 0}
        className="items-center mt-4"
      >
        <Text className={resendCooldown > 0 ? 'text-text-muted' : 'text-brand-gold'}>
          {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
