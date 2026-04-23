import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { UserProfile } from '@muzgram/types';

const ONBOARDING_KEY = 'muzgram_onboarding_done';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isSignedIn: boolean;
  hasCompletedOnboarding: boolean;

  setUser: (user: UserProfile | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setOnboardingComplete: () => void;
  loadOnboardingState: () => Promise<void>;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isSignedIn: false,
  hasCompletedOnboarding: false,

  setUser: (user) => set({ user, isSignedIn: !!user }),
  setToken: (token) => set({ token }),
  setLoading: (isLoading) => set({ isLoading }),
  setOnboardingComplete: () => {
    AsyncStorage.setItem(ONBOARDING_KEY, '1').catch(() => {});
    set({ hasCompletedOnboarding: true });
  },
  loadOnboardingState: async () => {
    const val = await AsyncStorage.getItem(ONBOARDING_KEY).catch(() => null);
    set({ hasCompletedOnboarding: val === '1' });
  },
  signOut: () => set({ user: null, token: null, isSignedIn: false }),
}));
