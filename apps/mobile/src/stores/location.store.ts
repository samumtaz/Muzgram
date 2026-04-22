import { create } from 'zustand';

import { GeoPoint } from '@muzgram/types';

interface LocationState {
  location: GeoPoint | null;
  citySlug: string | null;
  permissionGranted: boolean;
  isDetecting: boolean;

  setLocation: (location: GeoPoint) => void;
  setCitySlug: (slug: string | null) => void;
  setPermissionGranted: (granted: boolean) => void;
  setDetecting: (detecting: boolean) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  location: null,
  citySlug: null,
  permissionGranted: false,
  isDetecting: false,

  setLocation: (location) => set({ location }),
  setCitySlug: (citySlug) => set({ citySlug }),
  setPermissionGranted: (permissionGranted) => set({ permissionGranted }),
  setDetecting: (isDetecting) => set({ isDetecting }),
}));
