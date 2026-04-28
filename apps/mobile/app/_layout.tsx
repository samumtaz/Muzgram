import { useEffect } from 'react';

import * as Sentry from '@sentry/react-native';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { initPostHog } from '../src/lib/analytics';

if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    enableNativeFramesTracking: false,
  });
}

initPostHog();
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '../src/styles/global.css';
import { useAuthStore } from '../src/stores/auth.store';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 60 * 1000,
    },
  },
});

const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  },
};

function RootLayoutNav() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { setToken, setLoading, hasCompletedOnboarding, loadOnboardingState } = useAuthStore();

  useEffect(() => {
    loadOnboardingState();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (isSignedIn) {
      if (inAuthGroup) {
        if (!hasCompletedOnboarding) {
          router.replace('/(onboarding)/welcome');
        } else {
          router.replace('/(tabs)');
        }
      } else if (!inOnboarding && !hasCompletedOnboarding) {
        router.replace('/(onboarding)/welcome');
      }
      getToken().then((t) => {
        setToken(t);
        setLoading(false);
        SplashScreen.hideAsync();
      });
    } else {
      if (!inAuthGroup) {
        router.replace('/(auth)');
      }
      setLoading(false);
      SplashScreen.hideAsync();
    }
  }, [isSignedIn, isLoaded, segments, hasCompletedOnboarding]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="listing/[id]" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="event/[id]" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="business/edit" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
      <Stack.Screen name="business/onboarding" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="business/leads" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="notifications/index" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="saves/index" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings/index" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings/notifications" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings/account" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="business/dashboard" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="business/claim" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
      <Stack.Screen name="create/event" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
      <Stack.Screen name="search/index" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="my-posts/index" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="report/index" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView className="flex-1">
          <RootLayoutNav />
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
