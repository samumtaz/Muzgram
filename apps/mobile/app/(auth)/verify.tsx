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
  const { signIn, setActive: setSignInActive } = useSignIn();
  const { signUp, setActive: setSignUpActive } = useSignUp();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const completeSignIn = async (otp: string) => {
    const result = await signIn!.attemptFirstFactor({ strategy: 'phone_code', code: otp });
    console.log('[verify] signIn result status:', result.status);
    if (result.status === 'complete') {
      await setSignInActive!({ session: result.createdSessionId });
      router.replace('/(tabs)');
    } else {
      throw new Error(`Sign-in incomplete: ${result.status}`);
    }
  };

  const completeSignUp = async (otp: string) => {
    const result = await signUp!.attemptPhoneNumberVerification({ code: otp });
    console.log('[verify] signUp result status:', result.status, 'missing:', result.missingFields);

    if (result.status === 'complete') {
      await setSignUpActive!({ session: result.createdSessionId });
      router.replace('/(tabs)');
    } else {
      const missing = result.missingFields ?? [];
      throw new Error(`__missing__:${missing.join(',')}`);
    }
  };

  const handleVerify = async (otp: string) => {
    if (otp.length !== OTP_LENGTH) return;
    setIsLoading(true);
    setError(null);

    try {
      console.log('[verify] signIn.status:', signIn?.status, 'signUp.status:', signUp?.status);

      if (signIn?.status === 'needs_first_factor') {
        await completeSignIn(otp);
        return;
      }

      if (signUp?.status === 'missing_requirements') {
        await completeSignUp(otp);
        return;
      }

      // Fall back: try signUp first, then signIn
      if (signUp) {
        await completeSignUp(otp);
      } else {
        await completeSignIn(otp);
      }
    } catch (err: any) {
      const clerkCode = err?.errors?.[0]?.code;
      const clerkMsg = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message;
      const plainMsg = err?.message ?? '';

      // Phone already verified — try to finalize the signUp session
      if (clerkCode === 'already_verified' || clerkCode === 'verification_already_verified') {
        if (signUp?.status === 'complete' && signUp.createdSessionId) {
          await setSignUpActive!({ session: signUp.createdSessionId });
          router.replace('/(tabs)');
        }
        return;
      }

      if (plainMsg.startsWith('__missing__:')) {
        const fields = plainMsg.replace('__missing__:', '');
        setError(`Setup incomplete — still needs: ${fields}. Check Clerk dashboard config.`);
      } else {
        setError(clerkMsg ?? plainMsg ?? 'Invalid code. Please try again.');
      }
      setCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setResendCooldown(30);
    setError(null);
    try {
      if (signUp?.status === 'missing_requirements') {
        await signUp.preparePhoneNumberVerification();
      } else if (signIn) {
        await signIn.create({ strategy: 'phone_code', identifier: phone });
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message;
      setError(msg ?? 'Could not resend code.');
    }
  };

  const handleCodeChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setCode(cleaned);
    if (cleaned.length === OTP_LENGTH) handleVerify(cleaned);
  };

  return (
    <View className="flex-1 bg-background px-6">
      <TouchableOpacity onPress={() => router.back()} className="mt-16 mb-8 self-start">
        <Text className="text-text-secondary text-base">← Back</Text>
      </TouchableOpacity>

      <Text className="text-text-primary text-2xl font-display mb-2">Enter the code</Text>
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

      {isLoading && <ActivityIndicator color="#D4A853" className="mb-4" />}

      <TouchableOpacity
        onPress={handleResend}
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
