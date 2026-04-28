import { useRef, useState } from 'react';

import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
      try {
        // Try sign-up first (new user path)
        await signUp.create({ phoneNumber: normalizedPhone });
        await signUp.preparePhoneNumberVerification();
      } catch (signUpErr: any) {
        const code = signUpErr?.errors?.[0]?.code;
        // User already exists — switch to sign-in OTP
        if (code === 'form_identifier_exists' || code === 'identifier_already_signed_in') {
          await signIn.create({ strategy: 'phone_code', identifier: normalizedPhone });
        } else {
          throw signUpErr;
        }
      }
      router.push({ pathname: '/(auth)/verify', params: { phone: normalizedPhone } });
    } catch (err: any) {
      const clerkErr = err?.errors?.[0];
      setError(clerkErr?.longMessage ?? clerkErr?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        {/* ── Hero ─────────────────────────────────────── */}
        <View style={styles.hero}>
          {/* Decorative rings */}
          <View style={styles.ring3} />
          <View style={styles.ring2} />
          <View style={styles.ring1} />

          {/* Crescent glyph */}
          <Text style={styles.crescent}>☪</Text>

          {/* Brand */}
          <Text style={styles.brand}>Muzgram</Text>
          <Text style={styles.tagline}>Your city. Your scene. Your people.</Text>

          {/* Live badge */}
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>NOW LIVE</Text>
          </View>
        </View>

        {/* ── City chips ───────────────────────────────── */}
        <View style={styles.citiesSection}>
          <Text style={styles.cityLabel}>NOW LIVE IN</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 24, paddingTop: 4 }}
          >
            {[
              { name: 'Chicago', flag: '🏙' },
              { name: 'Dearborn', flag: '🕌' },
              { name: 'Detroit', flag: '🏭' },
              { name: 'Grand Rapids', flag: '🌊' },
              { name: 'Milwaukee', flag: '🍺' },
              { name: 'Indianapolis', flag: '🏎' },
            ].map((city) => (
              <View key={city.name} style={styles.cityChip}>
                <Text style={styles.cityChipFlag}>{city.flag}</Text>
                <Text style={styles.cityChipName}>{city.name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── Form ─────────────────────────────────────── */}
        <View style={styles.form}>
          <Text style={styles.formHeading}>Get started</Text>
          <Text style={styles.formSub}>
            Find halal spots, events, and your community.
          </Text>

          <Text style={styles.inputLabel}>Phone number</Text>
          <View style={styles.inputRow}>
            <Text style={styles.flag}>🇺🇸 +1</Text>
            <TextInput
              ref={inputRef}
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 000-0000"
              placeholderTextColor="#606060"
              keyboardType="phone-pad"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              style={styles.textInput}
              autoFocus
            />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            onPress={handleContinue}
            disabled={phone.length < 10 || isLoading}
            style={[styles.btn, phone.length < 10 && styles.btnDisabled]}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#0D0D0D" />
            ) : (
              <Text style={styles.btnText}>Continue →</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.legal}>
            By continuing you agree to our Terms & Privacy Policy.
            A one-time code will be sent to your number.
          </Text>

          {__DEV__ && (
            <TouchableOpacity
              onPress={() => router.replace('/(tabs)' as any)}
              style={styles.guestBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.guestBtnText}>⚙ Dev: skip auth</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const GOLD = '#D4A853';
const GOLD_DIM = '#A07830';
const BG = '#0D0D0D';
const SURFACE = '#1A1A1A';
const BORDER = '#2A2A2A';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  kav: { flex: 1 },

  /* Hero */
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 280,
  },
  ring1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: GOLD + '30',
  },
  ring2: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: GOLD + '18',
  },
  ring3: {
    position: 'absolute',
    width: 290,
    height: 290,
    borderRadius: 145,
    borderWidth: 1,
    borderColor: GOLD + '0C',
  },
  crescent: {
    fontSize: 52,
    marginBottom: 14,
    color: GOLD,
  },
  brand: {
    fontSize: 42,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: '#A0A0A0',
    letterSpacing: 0.3,
    marginBottom: 20,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GOLD + '18',
    borderWidth: 1,
    borderColor: GOLD + '40',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2ECC71',
  },
  liveText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  /* Cities */
  citiesSection: {
    marginBottom: 6,
    paddingLeft: 24,
  },
  cityLabel: {
    fontSize: 10,
    color: GOLD_DIM,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  cityChipFlag: { fontSize: 14 },
  cityChipName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F5F5F5',
  },

  /* Form */
  form: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 20,
  },
  formHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 4,
  },
  formSub: {
    fontSize: 13,
    color: '#A0A0A0',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    color: '#A0A0A0',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 14,
  },
  flag: {
    fontSize: 15,
    color: '#A0A0A0',
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#F5F5F5',
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 13,
    marginBottom: 10,
  },
  btn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnText: {
    color: '#0D0D0D',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  legal: {
    fontSize: 11,
    color: '#606060',
    textAlign: 'center',
    lineHeight: 17,
  },
  guestBtn: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 8,
  },
  guestBtnText: {
    fontSize: 13,
    color: '#606060',
    fontWeight: '500',
  },
});
