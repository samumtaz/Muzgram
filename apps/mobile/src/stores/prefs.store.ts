import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const KEY = 'muzgram_prefs_v1';

interface PrefsState {
  showPrayerTimes: boolean;
  setShowPrayerTimes: (val: boolean) => void;
  _hydrated: boolean;
  hydrate: () => Promise<void>;
}

export const usePrefsStore = create<PrefsState>((set, get) => ({
  showPrayerTimes: true,
  _hydrated: false,

  setShowPrayerTimes: (val) => {
    set({ showPrayerTimes: val });
    AsyncStorage.getItem(KEY)
      .then((raw) => JSON.parse(raw ?? '{}'))
      .then((prefs) => AsyncStorage.setItem(KEY, JSON.stringify({ ...prefs, showPrayerTimes: val })))
      .catch(() => {});
  },

  hydrate: async () => {
    if (get()._hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const prefs = JSON.parse(raw);
        set({ showPrayerTimes: prefs.showPrayerTimes ?? true });
      }
    } catch {}
    set({ _hydrated: true });
  },
}));
