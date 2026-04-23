import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import MapboxGL from '@rnmapbox/maps';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import {
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ContentType, ListingMainCategory, MapPin } from '@muzgram/types';
import { FEED_DEFAULT_RADIUS_KM } from '@muzgram/constants';
import { formatDistanceLabel } from '@muzgram/utils';

import { useMapPins } from '../../src/queries/feed.queries';
import { useLocationStore } from '../../src/stores/location.store';
import { HalalBadge } from '../../src/components/ui/HalalBadge';
import { track, screen } from '../../src/lib/analytics';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');

const CATEGORY_PIN_COLORS: Record<string, string> = {
  eat: '#E07B39',
  go_out: '#9B59B6',
  connect: '#3498DB',
  mosque: '#2ECC71',
  event: '#D4A853',
};

const CATEGORIES = [
  { label: 'All', value: undefined },
  { label: 'Eat', value: ListingMainCategory.EAT },
  { label: 'Go Out', value: ListingMainCategory.GO_OUT },
  { label: 'Connect', value: ListingMainCategory.CONNECT },
  { label: 'Mosques', value: 'mosque' as any },
];

const SNAP_POINTS = ['35%', '75%', '95%'];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapScreen() {
  const router = useRouter();
  const { location } = useLocationStore();
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [radiusKm, setRadiusKm] = useState(FEED_DEFAULT_RADIUS_KM);
  const [showSearchHere, setShowSearchHere] = useState(false);
  const [searchCenter, setSearchCenter] = useState<[number, number] | null>(null);

  const cameraRef = useRef<MapboxGL.Camera>(null);
  const sheetRef = useRef<BottomSheet>(null);
  const searchBtnOpacity = useRef(new Animated.Value(0)).current;

  const lat = location?.lat ?? 41.8781;
  const lng = location?.lng ?? -87.6298;
  const queryLat = searchCenter ? searchCenter[1] : lat;
  const queryLng = searchCenter ? searchCenter[0] : lng;

  const { data: pinsData, isFetching } = useMapPins(queryLat, queryLng, radiusKm);
  const allPins: MapPin[] = pinsData?.pages.flatMap((p: any) => p.data ?? p) ?? [];

  const pins = useMemo(() => {
    if (!activeCategory) return allPins;
    return allPins.filter((p) =>
      activeCategory === 'mosque'
        ? (p.mainCategory as string) === 'mosque'
        : p.mainCategory === activeCategory,
    );
  }, [allPins, activeCategory]);

  const geoJson: GeoJSON.FeatureCollection = useMemo(() => ({
    type: 'FeatureCollection',
    features: pins.map((pin) => ({
      type: 'Feature',
      id: pin.id,
      geometry: { type: 'Point', coordinates: [pin.location.lng, pin.location.lat] },
      properties: {
        id: pin.id,
        name: pin.name,
        type: pin.type,
        mainCategory: pin.mainCategory ?? 'connect',
        isFeatured: pin.isFeatured ?? false,
        color:
          pin.type === ContentType.EVENT
            ? CATEGORY_PIN_COLORS.event
            : CATEGORY_PIN_COLORS[pin.mainCategory ?? 'connect'] ?? '#D4A853',
      },
    })),
  }), [pins]);

  useEffect(() => {
    screen('Map');
    track('map_opened');
  }, []);

  const handleCategoryChange = useCallback((cat: string | undefined) => {
    setActiveCategory(cat);
    track('map_category_filtered', { category: cat ?? 'all' });
  }, []);

  const handlePinPress = useCallback((event: any) => {
    const feature = event?.features?.[0];
    if (!feature) return;

    // Cluster tap — zoom in
    if (feature.properties?.cluster) {
      const [clngCoord, clatCoord] = feature.geometry.coordinates;
      cameraRef.current?.setCamera({
        centerCoordinate: [clngCoord, clatCoord],
        zoomLevel: 14,
        animationMode: 'flyTo',
        animationDuration: 600,
      });
      return;
    }

    const pinId = feature.properties?.id;
    const pin = allPins.find((p) => p.id === pinId);
    if (!pin) return;

    setSelectedPin(pin);
    sheetRef.current?.snapToIndex(0);
    track('map_pin_tapped', { pinType: pin.type, pinId: pin.id });
  }, [allPins]);

  const handleCameraChanged = useCallback((state: any) => {
    const center = state?.properties?.center;
    if (!center) return;
    const dist = haversineKm(lat, lng, center[1], center[0]);
    if (dist > 2 && !showSearchHere) {
      setShowSearchHere(true);
      Animated.timing(searchBtnOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } else if (dist <= 2 && showSearchHere) {
      setShowSearchHere(false);
      Animated.timing(searchBtnOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [lat, lng, showSearchHere, searchBtnOpacity]);

  const handleSearchHere = useCallback(async () => {
    const cam = await (cameraRef.current as any)?.getCamera?.();
    if (cam?.centerCoordinate) {
      setSearchCenter(cam.centerCoordinate);
    }
    setShowSearchHere(false);
    Animated.timing(searchBtnOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  }, [searchBtnOpacity]);

  const flyToUser = useCallback(() => {
    cameraRef.current?.setCamera({
      centerCoordinate: [lng, lat],
      zoomLevel: 13,
      animationMode: 'flyTo',
      animationDuration: 800,
    });
  }, [lat, lng]);

  const distanceLabel = selectedPin
    ? formatDistanceLabel(
        haversineKm(lat, lng, selectedPin.location.lat, selectedPin.location.lng),
      )
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0D0D' }}>
      <MapboxGL.MapView
        style={{ flex: 1 }}
        styleURL={process.env.EXPO_PUBLIC_MAPBOX_STYLE ?? MapboxGL.StyleURL.Dark}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled
        onCameraChanged={handleCameraChanged}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          centerCoordinate={[lng, lat]}
          zoomLevel={12}
          animationMode="flyTo"
        />
        <MapboxGL.UserLocation visible animated />

        {geoJson.features.length > 0 && (
          <MapboxGL.ShapeSource
            id="content-pins"
            shape={geoJson}
            cluster
            clusterRadius={50}
            clusterMaxZoomLevel={13}
            onPress={handlePinPress}
          >
            {/* Cluster circles */}
            <MapboxGL.CircleLayer
              id="cluster-circle"
              filter={['has', 'point_count']}
              style={{
                circleRadius: ['step', ['get', 'point_count'], 20, 10, 28, 50, 36],
                circleColor: '#1A1A1A',
                circleStrokeWidth: 2,
                circleStrokeColor: '#D4A853',
              }}
            />
            {/* Cluster count */}
            <MapboxGL.SymbolLayer
              id="cluster-count"
              filter={['has', 'point_count']}
              style={{
                textField: '{point_count_abbreviated}',
                textSize: 13,
                textColor: '#D4A853',
                textFont: ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
              }}
            />
            {/* Individual pins */}
            <MapboxGL.CircleLayer
              id="pins-circle"
              filter={['!', ['has', 'point_count']]}
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

      {/* Category filter pills + location button */}
      <SafeAreaView
        style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
        edges={['top']}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 8 }}
            style={{ flex: 1 }}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.label}
                onPress={() => handleCategoryChange(cat.value as any)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 999,
                  borderWidth: 1,
                  backgroundColor:
                    activeCategory === cat.value ? '#D4A853' : 'rgba(13,13,13,0.85)',
                  borderColor: activeCategory === cat.value ? '#D4A853' : '#2A2A2A',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: activeCategory === cat.value ? '#0D0D0D' : '#A0A0A0',
                  }}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Current location button */}
          <TouchableOpacity
            onPress={flyToUser}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(13,13,13,0.90)',
              borderWidth: 1,
              borderColor: '#2A2A2A',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 8,
            }}
          >
            <Text style={{ fontSize: 16 }}>◎</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Search this area button */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 80,
          alignSelf: 'center',
          opacity: searchBtnOpacity,
          pointerEvents: showSearchHere ? 'auto' : 'none',
        }}
      >
        <TouchableOpacity
          onPress={handleSearchHere}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 16,
            paddingVertical: 9,
            borderRadius: 999,
            backgroundColor: '#D4A853',
          }}
        >
          {isFetching ? (
            <ActivityIndicator size="small" color="#0D0D0D" />
          ) : (
            <Text style={{ fontSize: 12 }}>🔍</Text>
          )}
          <Text style={{ color: '#0D0D0D', fontWeight: '700', fontSize: 13 }}>
            Search this area
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Bottom sheet */}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={SNAP_POINTS}
        enablePanDownToClose
        onClose={() => setSelectedPin(null)}
        backgroundStyle={{ backgroundColor: '#1A1A1A' }}
        handleIndicatorStyle={{ backgroundColor: '#3A3A3A' }}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          {selectedPin ? (
            <>
              {/* Mini card */}
              {(selectedPin as any).thumbnailUrl && (
                <Image
                  source={{ uri: (selectedPin as any).thumbnailUrl }}
                  style={{ width: '100%', height: 180, borderRadius: 12, marginBottom: 12 }}
                  contentFit="cover"
                />
              )}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: '#F5F5F5', fontSize: 18, fontWeight: '700', flex: 1, marginRight: 8 }} numberOfLines={2}>
                  {selectedPin.name}
                </Text>
                {(selectedPin as any).isHalalVerified && <HalalBadge />}
              </View>

              {distanceLabel && (
                <Text style={{ color: '#A0A0A0', fontSize: 13, marginBottom: 12 }}>
                  📍 {distanceLabel} away
                </Text>
              )}

              <TouchableOpacity
                onPress={() => {
                  sheetRef.current?.close();
                  const route = selectedPin.type === ContentType.EVENT
                    ? `/event/${selectedPin.id}`
                    : `/listing/${selectedPin.id}`;
                  router.push(route as any);
                }}
                style={{
                  backgroundColor: '#D4A853',
                  borderRadius: 999,
                  paddingVertical: 13,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#0D0D0D', fontWeight: '700', fontSize: 15 }}>
                  View Details
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            /* Default closed state — radius controls */
            <View style={{ paddingTop: 8 }}>
              <Text style={{ color: '#F5F5F5', fontWeight: '700', fontSize: 16, marginBottom: 12 }}>
                Search Radius
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[5, 10, 20, 40].map((km) => (
                  <TouchableOpacity
                    key={km}
                    onPress={() => setRadiusKm(km)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 999,
                      borderWidth: 1,
                      alignItems: 'center',
                      backgroundColor: radiusKm === km ? '#D4A853' : 'transparent',
                      borderColor: radiusKm === km ? '#D4A853' : '#2A2A2A',
                    }}
                  >
                    <Text style={{ color: radiusKm === km ? '#0D0D0D' : '#A0A0A0', fontWeight: '600', fontSize: 13 }}>
                      {km}km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}
