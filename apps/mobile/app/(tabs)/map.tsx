import { useCallback, useEffect, useRef, useState, useMemo } from 'react';

import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import {
  Animated,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ContentType, ListingMainCategory, MapPin } from '@muzgram/types';
import { formatDistanceLabel } from '@muzgram/utils';

import { useMapPins } from '../../src/queries/feed.queries';
import { useLocationStore } from '../../src/stores/location.store';
import { HalalBadge } from '../../src/components/ui/HalalBadge';
import { track, screen } from '../../src/lib/analytics';

const CATEGORY_PIN_COLORS: Record<string, string> = {
  eat: '#E07B39',
  go_out: '#9B59B6',
  connect: '#3498DB',
  mosque: '#2ECC71',
  event: '#D4A853',
};

const CATEGORIES = [
  { label: 'All',           value: undefined },
  { label: 'Events',        value: 'event' as any },
  { label: 'Eat',           value: ListingMainCategory.EAT },
  { label: 'Go Out',        value: ListingMainCategory.GO_OUT },
  { label: 'Connect',       value: ListingMainCategory.CONNECT },
  { label: 'Mosques',       value: 'mosque' as any },
];

const SNAP_POINTS = ['35%', '75%', '95%'];

// Chicago Devon Ave — active city center for data queries
const CITY_LAT = 41.9977;
const CITY_LNG = -87.6936;

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#181818' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d3d3d' }] },
];

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

const hasMapKey = Platform.OS !== 'android' || !!process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

export default function MapScreen() {
  const router = useRouter();
  const { location } = useLocationStore();

  if (!hasMapKey) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>🗺️</Text>
        <Text style={{ color: '#F5F5F5', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>Map coming soon</Text>
        <Text style={{ color: '#A0A0A0', fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
          Add a Google Maps API key to enable the map view on Android.{'\n'}Enable "Maps SDK for Android" in Google Cloud Console.
        </Text>
      </SafeAreaView>
    );
  }
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [radiusKm, setRadiusKm] = useState(25);
  const [showSearchHere, setShowSearchHere] = useState(false);
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mapType, setMapType] = useState<'standard' | 'hybrid'>('standard');

  const mapRef = useRef<MapView>(null);
  const sheetRef = useRef<BottomSheet>(null);
  const searchBtnOpacity = useRef(new Animated.Value(0)).current;
  const lastRegionRef = useRef<Region | null>(null);

  // User GPS — used for the blue dot, distance display, and fly-to-me button
  const userLat = location?.lat ?? CITY_LAT;
  const userLng = location?.lng ?? CITY_LNG;

  // Query center — always starts at city launch location so emulator GPS doesn't break it
  // Moves to wherever the user taps "Search this area"
  const queryLat = searchCenter?.lat ?? CITY_LAT;
  const queryLng = searchCenter?.lng ?? CITY_LNG;

  const { data: allPins = [], isFetching } = useMapPins(queryLat, queryLng, radiusKm);

  const pins = useMemo(() => {
    if (!activeCategory) return allPins;
    if (activeCategory === 'event') return allPins.filter((p) => p.type === ContentType.EVENT);
    if (activeCategory === 'mosque') {
      return allPins.filter((p) => {
        const slug: string = (p as any).categorySlug ?? '';
        return slug.includes('mosque') || slug.includes('masjid') || slug.includes('islamic');
      });
    }
    return allPins.filter((p) => p.mainCategory === activeCategory);
  }, [allPins, activeCategory]);

  useEffect(() => {
    screen('Map');
    track('map_opened');
  }, []);

  const handleCategoryChange = useCallback((cat: string | undefined) => {
    setActiveCategory(cat);
    track('map_category_filtered', { category: cat ?? 'all' });
  }, []);

  const handlePinPress = useCallback((pin: MapPin) => {
    setSelectedPin(pin);
    sheetRef.current?.snapToIndex(0);
    track('map_pin_tapped', { pinType: pin.type, pinId: pin.id });
  }, []);

  const showSearchHereRef = useRef(false);

  const handleRegionChangeComplete = useCallback((region: Region) => {
    lastRegionRef.current = region;
    const dist = haversineKm(CITY_LAT, CITY_LNG, region.latitude, region.longitude);
    if (dist > 2 && !showSearchHereRef.current) {
      showSearchHereRef.current = true;
      setShowSearchHere(true);
      Animated.timing(searchBtnOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } else if (dist <= 2 && showSearchHereRef.current) { // back near city center
      showSearchHereRef.current = false;
      setShowSearchHere(false);
      Animated.timing(searchBtnOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [searchBtnOpacity]);

  const handleSearchHere = useCallback(() => {
    if (lastRegionRef.current) {
      setSearchCenter({ lat: lastRegionRef.current.latitude, lng: lastRegionRef.current.longitude });
    }
    showSearchHereRef.current = false;
    setShowSearchHere(false);
    Animated.timing(searchBtnOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  }, [searchBtnOpacity]);

  const flyToUser = useCallback(() => {
    mapRef.current?.animateToRegion(
      { latitude: userLat, longitude: userLng, latitudeDelta: 0.05, longitudeDelta: 0.05 },
      800,
    );
  }, [userLat, userLng]);

  const zoomIn = useCallback(() => {
    const r = lastRegionRef.current;
    if (!r) return;
    mapRef.current?.animateToRegion(
      { ...r, latitudeDelta: r.latitudeDelta / 2, longitudeDelta: r.longitudeDelta / 2 },
      300,
    );
  }, []);

  const zoomOut = useCallback(() => {
    const r = lastRegionRef.current;
    if (!r) return;
    mapRef.current?.animateToRegion(
      { ...r, latitudeDelta: Math.min(r.latitudeDelta * 2, 90), longitudeDelta: Math.min(r.longitudeDelta * 2, 90) },
      300,
    );
  }, []);

  const distanceLabel = selectedPin
    ? formatDistanceLabel(
        haversineKm(userLat, userLng, Number(selectedPin.location.lat), Number(selectedPin.location.lng)),
      )
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0D0D' }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        customMapStyle={mapType === 'hybrid' ? undefined : DARK_MAP_STYLE}
        initialRegion={{
          latitude: CITY_LAT,
          longitude: CITY_LNG,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
        mapType={mapType}
        zoomEnabled
        scrollEnabled
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {pins.slice(0, 80).map((pin) => {
          const color =
            pin.type === ContentType.EVENT
              ? CATEGORY_PIN_COLORS.event
              : CATEGORY_PIN_COLORS[pin.mainCategory ?? 'connect'] ?? '#D4A853';
          return (
            <Marker
              key={pin.id}
              coordinate={{ latitude: Number(pin.location.lat), longitude: Number(pin.location.lng) }}
              onPress={() => handlePinPress(pin)}
              tracksViewChanges={false}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View
                style={{
                  width: pin.isFeatured ? 20 : 14,
                  height: pin.isFeatured ? 20 : 14,
                  borderRadius: 999,
                  backgroundColor: color,
                  borderWidth: pin.isFeatured ? 2 : 1,
                  borderColor: '#0D0D0D',
                }}
              />
            </Marker>
          );
        })}
      </MapView>

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

      {/* Zoom buttons — vertical stack, right side, vertically centered */}
      <View
        style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: [{ translateY: -44 }],
          borderRadius: 12,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: '#2A2A2A',
        }}
      >
        <TouchableOpacity
          onPress={zoomIn}
          style={{ width: 40, height: 44, backgroundColor: 'rgba(13,13,13,0.90)', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#F5F5F5', fontSize: 22, lineHeight: 26 }}>+</Text>
        </TouchableOpacity>
        <View style={{ height: 1, backgroundColor: '#2A2A2A' }} />
        <TouchableOpacity
          onPress={zoomOut}
          style={{ width: 40, height: 44, backgroundColor: 'rgba(13,13,13,0.90)', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#F5F5F5', fontSize: 22, lineHeight: 26 }}>−</Text>
        </TouchableOpacity>
      </View>

      {/* Map/Satellite toggle — bottom-right corner */}
      <SafeAreaView
        style={{ position: 'absolute', bottom: 0, right: 0 }}
        edges={['bottom']}
      >
        <TouchableOpacity
          onPress={() => setMapType((t) => t === 'standard' ? 'hybrid' : 'standard')}
          style={{
            margin: 16,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 10,
            backgroundColor: mapType === 'hybrid' ? '#D4A853' : 'rgba(13,13,13,0.90)',
            borderWidth: 1,
            borderColor: mapType === 'hybrid' ? '#D4A853' : '#2A2A2A',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Text style={{ fontSize: 14 }}>🛰</Text>
          <Text style={{ color: mapType === 'hybrid' ? '#0D0D0D' : '#A0A0A0', fontSize: 12, fontWeight: '600' }}>
            {mapType === 'hybrid' ? 'Map' : 'Satellite'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Search this area button */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 130,
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

              {(selectedPin as any).startAt && (
                <Text style={{ color: '#D4A853', fontSize: 13, fontWeight: '600', marginBottom: 4 }}>
                  📅 {new Date((selectedPin as any).startAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </Text>
              )}
              {(selectedPin as any).address && (
                <Text style={{ color: '#A0A0A0', fontSize: 13, marginBottom: 4 }} numberOfLines={1}>
                  📍 {(selectedPin as any).address}{distanceLabel ? ` · ${distanceLabel}` : ''}
                </Text>
              )}
              {!(selectedPin as any).address && distanceLabel && (
                <Text style={{ color: '#A0A0A0', fontSize: 13, marginBottom: 4 }}>
                  📍 {distanceLabel} away
                </Text>
              )}
              {((selectedPin as any).isFree || ((selectedPin as any).tags ?? []).length > 0) && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12, marginTop: 4 }}>
                  {(selectedPin as any).isFree && (
                    <View style={{ backgroundColor: '#22c55e22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
                      <Text style={{ color: '#22c55e', fontSize: 11, fontWeight: '600' }}>Free</Text>
                    </View>
                  )}
                  {((selectedPin as any).tags ?? []).slice(0, 2).map((tag: string) => (
                    <View key={tag} style={{ backgroundColor: '#ec489918', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
                      <Text style={{ color: '#ec4899', fontSize: 11, fontWeight: '600' }}>
                        {tag.charAt(0).toUpperCase() + tag.slice(1)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {(selectedPin as any).organizerName && (
                <Text style={{ color: '#A0A0A0', fontSize: 12, marginBottom: 12 }}>
                  By {(selectedPin as any).organizerName}
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
