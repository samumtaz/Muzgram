import { useEffect } from 'react';

import * as Location from 'expo-location';

import { useAuthStore } from '../stores/auth.store';
import { useLocationStore } from '../stores/location.store';
import { api } from '../lib/api';

export function useLocationPermission() {
  const { setLocation, setPermissionGranted, setDetecting } = useLocationStore();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    let mounted = true;

    async function requestAndDetect() {
      setDetecting(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!mounted) return;

      if (status !== 'granted') {
        setPermissionGranted(false);
        setDetecting(false);
        return;
      }

      setPermissionGranted(true);

      try {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!mounted) return;

        const { latitude: lat, longitude: lng } = position.coords;
        setLocation({ lat, lng });

        // Update last known location on server (fire and forget)
        if (token) {
          api.patch('/users/me', { lastKnownLat: lat, lastKnownLng: lng }, { token })
            .catch(() => {}); // Non-critical
        }
      } finally {
        if (mounted) setDetecting(false);
      }
    }

    requestAndDetect();
    return () => { mounted = false; };
  }, []);
}
