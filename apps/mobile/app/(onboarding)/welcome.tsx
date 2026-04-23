import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '../../src/stores/auth.store';

export default function WelcomeScreen() {
  const router = useRouter();
  const setOnboardingComplete = useAuthStore((s) => s.setOnboardingComplete);

  return (
    <SafeAreaView className="flex-1 bg-background px-6">
      <View className="flex-1 justify-center items-center">
        <Text className="text-5xl mb-4">🌙</Text>
        <Text className="text-text-primary text-3xl font-bold text-center mb-2">
          Welcome to Muzgram
        </Text>
        <Text className="text-text-secondary text-base text-center max-w-xs leading-relaxed">
          Find halal restaurants, Muslim events, and community businesses near you.
        </Text>
      </View>

      <View className="gap-3 pb-6">
        <TouchableOpacity
          onPress={() => router.push('/(onboarding)/neighborhood')}
          className="bg-brand-gold rounded-2xl py-4 items-center"
          activeOpacity={0.85}
        >
          <Text className="text-background font-bold text-base">Get Started</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setOnboardingComplete();
            router.replace('/(tabs)');
          }}
          activeOpacity={0.7}
          className="py-3 items-center"
        >
          <Text className="text-text-muted text-sm">Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
