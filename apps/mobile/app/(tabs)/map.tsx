import { useCallback, useMemo, useRef, useState } from 'react';

import MapboxGL from '@rnmapbox/maps';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContentType, MapPin } from '@muzgram/types';
import { FEED_DEFAULT_RADIUS_KM } from '@muzgram/constants';

import { useMapPins } from '../../src/queries/feed.queries';
import { useLocationStore } from '../../src/stores/location.store';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');

const CATEGORY_PIN_COLORS: Record<string, string> = {
  eat: '#E07B39',
  go_out: '#9B59B6',
  connect: '#3498DB',
  event: '#D4A853',
};

export default function MapScreen() {
  const { location } = useLocationStore();
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [radiusKm, setRadiusKm] = useState(FEED_DEFAULT_RADIUS_KM);
  const cameraRef = useRef<MapboxGL.Camera>(null);

  const lat = location?.lat ?? 41.8781;
  const lng = location?.lng ?? -87.6298;

  const { data: pinsData } = useMapPins(lat, lng, radiusKm);
  const pins: MapPin[] = pinsData?.pages.flatMap((p: any) => p.data ?? p) ?? [];

  const geoJson: GeoJSON.FeatureCollection = useMemo(() => ({
    type: 'FeatureCollection',
    features: pins.map((pin) => ({
      type: 'Feature',
      id: pin.id,
      geometry: {
        type: 'Point',
        coordinates: [pin.location.lng, pin.location.lat],
      },
      properties: {
        id: pin.id,
        name: pin.name,
        type: pin.type,
        mainCategory: pin.mainCategory ?? 'connect',
        isFeatured: pin.isFeatured,
        color: pin.type === ContentType.EVENT
          ? CATEGORY_PIN_COLORS.event
          : CATEGORY_PIN_COLORS[pin.mainCategory ?? 'connect'] ?? '#D4A853',
      },
    })),
  }), [pins]);

  const handlePinPress = useCallback((event: any) => {
    const feature = event?.features?.[0];
    if (!feature) return;

    const pinId = feature.properties?.id;
    const pin = pins.find((p) => p.id === pinId);
    if (pin) setSelectedPin(pin);
  }, [pins]);

  return (
    <View className="flex-1 bg-background">
      <MapboxGL.MapView
        style={{ flex: 1 }}
        styleURL={process.env.EXPO_PUBLIC_MAPBOX_STYLE ?? MapboxGL.StyleURL.Dark}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled
      >
        <MapboxGL.Camera
          ref={cameraRef}
          centerCoordinate={[lng, lat]}
          zoomLevel={12}
          animationMode="flyTo"
        />

        {/* User location dot */}
        <MapboxGL.UserLocation visible animated />

        {/* Content pins */}
        {geoJson.features.length > 0 && (
          <MapboxGL.ShapeSource
            id="content-pins"
            shape={geoJson}
            onPress={handlePinPress}
          >
            <MapboxGL.CircleLayer
              id="pins-circle"
              style={{
                circleRadius: ['case', ['get', 'isFeatured'], 10, 7],
                circleColor: ['get', 'color'],
                circleStrokeWidth: ['case', ['get', 'isFeatured'], 2, 1],
                circleStrokeColor: '#0D0D0D',
                circleOpacity: 0.95,
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>

      {/* Radius toggle */}
      <SafeAreaView
        className="absolute top-0 left-0 right-0 px-4 pt-4 flex-row justify-end"
        edges={['top']}
      >
        {[5, 10, 20].map((km) => (
          <TouchableOpacity
            key={km}
            onPress={() => setRadiusKm(km)}
            className={`ml-2 px-3 py-1.5 rounded-pill border ${
              radiusKm === km
                ? 'bg-brand-gold border-brand-gold'
                : 'bg-background/80 border-surface-border'
            }`}
          >
            <Text
              className={`text-xs font-display ${radiusKm === km ? 'text-text-inverse' : 'text-text-primary'}`}
            >
              {km}km
            </Text>
          </TouchableOpacity>
        ))}
      </SafeAreaView>

      {/* Selected pin callout */}
      {selectedPin && (
        <View className="absolute bottom-28 left-4 right-4 bg-surface-DEFAULT border border-surface-border rounded-card p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-text-primary font-display text-base" numberOfLines={1}>
                {selectedPin.name}
              </Text>
              <Text className="text-text-muted text-xs mt-0.5">
                {selectedPin.type === ContentType.EVENT ? 'Event' : 'Place'}
                {selectedPin.isFeatured ? ' · Featured' : ''}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedPin(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="text-text-muted text-base">✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
