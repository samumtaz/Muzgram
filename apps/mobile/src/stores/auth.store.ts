import { create } from 'zustand';

import { UserProfile } from '@muzgram/types';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isSignedIn: boolean;

  setUser: (user: UserProfile | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isSignedIn: false,

  setUser: (user) => set({ user, isSignedIn: !!user }),
  setToken: (token) => set({ token }),
  setLoading: (isLoading) => set({ isLoading }),
  signOut: () => set({ user: null, token: null, isSignedIn: false }),
}));
