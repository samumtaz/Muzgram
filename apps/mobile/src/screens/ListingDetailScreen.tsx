import { useEffect, useRef, useState } from 'react';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BusinessHours, ContentType, HalalCertification } from '@muzgram/types';
import { formatDistanceLabel, isOpenNow } from '@muzgram/utils';
import { useToggleSave } from '../queries/feed.queries';
import { useListing } from '../queries/listings.queries';
import { useListingEvents } from '../queries/events.queries';
import { useLocationStore } from '../stores/location.store';
import { HalalBadge } from '../components/ui/HalalBadge';
import { track } from '../lib/analytics';

const DAY_LABELS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function midnightCountdown() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = Math.floor((midnight.getTime() - now.getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

function getOpenStatus(hours: BusinessHours | undefined) {
  if (!hours) return null;
  const open = isOpenNow(hours);
  const today = DAY_LABELS[new Date().getDay()];
  const todayH = hours[today];
  if (open) return { open: true, label: 'Open Now', sub: todayH ? `${todayH.open} – ${todayH.close}` : '' };
  for (let i = 1; i <= 7; i++) {
    const idx = (new Date().getDay() + i) % 7;
    const dayH = hours[DAY_LABELS[idx]];
    if (dayH && !dayH.closed) {
      return { open: false, label: 'Closed', sub: `Opens ${DAY_SHORT[idx]} at ${dayH.open}` };
    }
  }
  return { open: false, label: 'Closed', sub: '' };
}

const ctaBtn: any = {
  flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4,
  paddingVertical: 12, borderRadius: 12, borderWidth: 1,
  backgroundColor: '#1A1A1A', borderColor: '#2A2A2A',
};
const ctaBtnText: any = { color: '#F5F5F5', fontSize: 11, fontWeight: '600' };
const sectionTitle: any = { color: '#F5F5F5', fontWeight: '700', fontSize: 16, marginBottom: 10 };

export function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { location } = useLocationStore();
  const { data: listing, isLoading, isError } = useListing(id!);
  const { data: eventsData } = useListingEvents(id);
  const toggleSave = useToggleSave();

  const [hoursOpen, setHoursOpen] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [descClamped, setDescClamped] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  const events = (eventsData as any)?.data ?? [];

  useEffect(() => {
    if (!listing) return;
    track('listing_viewed', {
      listingId: listing.id,
      category: listing.mainCategory,
      isFeatured: listing.isFeatured,
      hasSpecial: !!listing.currentSpecial,
    });
    setIsSaved(listing.isSaved ?? false);
  }, [listing?.id]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#D4A853" />
      </View>
    );
  }

  if (isError || !listing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#F5F5F5', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>
          Couldn't load this place
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#D4A853' }}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const today = DAY_LABELS[new Date().getDay()];
  const openStatus = getOpenStatus(listing.hours as any);
  const photos: string[] = listing.mediaUrls?.length ? listing.mediaUrls : listing.thumbnailUrl ? [listing.thumbnailUrl] : [];
  const saved = listing.isSaved ?? isSaved;

  const distKm = location
    ? haversineKm(location.lat, location.lng, listing.location.lat, listing.location.lng)
    : null;
  const distLabel = distKm != null ? formatDistanceLabel(distKm) : null;

  const halalLabel =
    listing.halalCertification === HalalCertification.SELF_CERTIFIED
      ? 'Owner-verified halal'
      : listing.halalCertification && listing.halalCertification !== HalalCertification.NONE
      ? `Halal — certified by ${listing.halalCertification}`
      : null;

  function handleCall() {
    track('listing_call_tapped', { listingId: listing!.id });
    if (listing?.phone) Linking.openURL(`tel:${listing.phone}`);
  }

  function handleWhatsApp() {
    track('listing_whatsapp_tapped', { listingId: listing!.id });
    if (listing?.phone) Linking.openURL(`https://wa.me/${listing.phone.replace(/\D/g, '')}`);
  }

  function handleDirections() {
    track('listing_directions_tapped', { listingId: listing!.id });
    const { lat, lng } = listing!.location;
    const label = encodeURIComponent(listing!.name);
    Linking.openURL(
      Platform.OS === 'ios'
        ? `maps://app?q=${label}&ll=${lat},${lng}`
        : `geo:${lat},${lng}?q=${label}`,
    );
  }

  function handleSave() {
    setIsSaved((v) => !v);
    toggleSave.mutate({ contentType: ContentType.LISTING, contentId: listing!.id });
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `Check out ${listing!.name} on Muzgram`,
        url: `https://muzgram.com/places/${listing!.slug ?? listing!.id}`,
      });
    } catch {}
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0D0D' }}>
      <ScrollView showsVerticalScrollIndicator={false} bounces style={{ flex: 1 }}>

        {/* ── 1. HERO IMAGE ── */}
        <View style={{ width: '100%', height: 280, backgroundColor: '#1A1A1A' }}>
          {photos.length > 0 ? (
            <ScrollView
              horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
                setPhotoIndex(idx);
              }}
              style={{ width: '100%', height: 280 }}
            >
              {photos.map((url, i) => (
                <TouchableOpacity key={i} activeOpacity={0.95} onPress={() => { setLightboxIndex(i); setLightboxVisible(true); }} style={{ width: 400, height: 280 }}>
                  <Image
                    source={{ uri: url }}
                    placeholder={(listing as any).primaryPhotoBlurHash ? { blurhash: (listing as any).primaryPhotoBlurHash } : undefined}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 56 }}>🍽</Text>
            </View>
          )}

          {/* Dots indicator */}
          {photos.length > 1 && (
            <View style={{ position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 5 }}>
              {photos.map((_, i) => (
                <View key={i} style={{ width: i === photoIndex ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i === photoIndex ? '#D4A853' : 'rgba(255,255,255,0.4)' }} />
              ))}
            </View>
          )}

          {/* Featured ribbon */}
          {listing.isFeatured && (
            <View style={{ position: 'absolute', top: 18, right: -24, width: 100, backgroundColor: '#D4A853', transform: [{ rotate: '35deg' }], alignItems: 'center', paddingVertical: 4, overflow: 'hidden' }}>
              <Text style={{ color: '#0D0D0D', fontSize: 10, fontWeight: '700' }}>★ Featured</Text>
            </View>
          )}

          {/* Halal badge overlay */}
          {listing.isHalalVerified && (
            <View style={{ position: 'absolute', bottom: 14, left: 14 }}>
              <HalalBadge size="sm" />
            </View>
          )}

          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ position: 'absolute', top: 52, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#fff', fontSize: 20, lineHeight: 22 }}>‹</Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 }}>

          {/* ── 2. HEADER ── */}
          <Text style={{ color: '#F5F5F5', fontSize: 26, fontWeight: '800', lineHeight: 32, marginBottom: 6 }}>
            {listing.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
            {listing.mainCategory && (
              <Text style={{ color: '#A0A0A0', fontSize: 13 }}>
                {listing.mainCategory.charAt(0).toUpperCase() + listing.mainCategory.slice(1).replace('_', ' ')}
                {(listing as any).category?.name ? ` · ${(listing as any).category.name}` : ''}
              </Text>
            )}
            {listing.neighborhood && (
              <>
                <Text style={{ color: '#3A3A3A' }}>·</Text>
                <Text style={{ color: '#A0A0A0', fontSize: 13 }}>{listing.neighborhood}</Text>
              </>
            )}
            {distLabel && (
              <>
                <Text style={{ color: '#3A3A3A' }}>·</Text>
                <Text style={{ color: '#A0A0A0', fontSize: 13 }}>{distLabel} away</Text>
              </>
            )}
          </View>

          {/* ── 3. STATUS BAR ── */}
          {openStatus && (
            <>
              <TouchableOpacity
                onPress={() => setHoursOpen((v) => !v)}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: hoursOpen ? 0 : 12 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: openStatus.open ? '#4CAF50' : '#F44336' }} />
                  <Text style={{ color: openStatus.open ? '#4CAF50' : '#F44336', fontWeight: '700', fontSize: 13 }}>{openStatus.label}</Text>
                  {openStatus.sub ? (
                    <>
                      <Text style={{ color: '#3A3A3A' }}>·</Text>
                      <Text style={{ color: '#A0A0A0', fontSize: 12 }}>{openStatus.sub}</Text>
                    </>
                  ) : null}
                </View>
                <Text style={{ color: '#606060', fontSize: 12 }}>{hoursOpen ? '▲' : '▼'} Hours</Text>
              </TouchableOpacity>

              {hoursOpen && listing.hours && (
                <View style={{ backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderTopWidth: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 12 }}>
                  {DAY_LABELS.map((day, i) => {
                    const h = (listing.hours as any)?.[day];
                    return (
                      <View key={day} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, opacity: day === today ? 1 : 0.55 }}>
                        <Text style={{ color: '#A0A0A0', fontSize: 13, width: 44 }}>{DAY_SHORT[i]}</Text>
                        <Text style={{ color: day === today ? '#F5F5F5' : '#A0A0A0', fontSize: 13 }}>
                          {!h || h.closed ? 'Closed' : `${h.open} – ${h.close}`}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {/* ── 4. DAILY SPECIAL BANNER ── */}
          {listing.currentSpecial && (
            <View style={{ backgroundColor: 'rgba(212,168,83,0.1)', borderWidth: 1, borderColor: 'rgba(212,168,83,0.35)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Text style={{ fontSize: 15 }}>📢</Text>
                <Text style={{ color: '#D4A853', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>Today's Special</Text>
                <Text style={{ color: '#606060', fontSize: 11, marginLeft: 'auto' }}>{midnightCountdown()}</Text>
              </View>
              <Text style={{ color: '#F5F5F5', fontWeight: '700', fontSize: 15 }}>{listing.currentSpecial.title}</Text>
              {listing.currentSpecial.description && (
                <Text style={{ color: '#A0A0A0', fontSize: 13, marginTop: 3 }}>{listing.currentSpecial.description}</Text>
              )}
              {listing.currentSpecial.price != null && (
                <Text style={{ color: '#D4A853', fontWeight: '700', marginTop: 6, fontSize: 15 }}>${listing.currentSpecial.price.toFixed(2)}</Text>
              )}
            </View>
          )}

          {/* ── 5. CTA BUTTONS ── */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
            {listing.phone && (
              <TouchableOpacity onPress={handleCall} style={ctaBtn} activeOpacity={0.7}>
                <Text style={{ fontSize: 18 }}>📞</Text>
                <Text style={ctaBtnText}>Call</Text>
              </TouchableOpacity>
            )}
            {listing.phone && (
              <TouchableOpacity onPress={handleWhatsApp} style={[ctaBtn, { borderColor: '#2D6A4F' }]} activeOpacity={0.7}>
                <Text style={{ fontSize: 18 }}>💬</Text>
                <Text style={[ctaBtnText, { color: '#4CAF50' }]}>WhatsApp</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleDirections} style={[ctaBtn, { backgroundColor: '#D4A853', borderColor: '#D4A853' }]} activeOpacity={0.7}>
              <Text style={{ fontSize: 18 }}>🗺</Text>
              <Text style={[ctaBtnText, { color: '#0D0D0D' }]}>Directions</Text>
            </TouchableOpacity>
            {listing.website && (
              <TouchableOpacity onPress={() => Linking.openURL(listing.website!)} style={ctaBtn} activeOpacity={0.7}>
                <Text style={{ fontSize: 18 }}>🌐</Text>
                <Text style={ctaBtnText}>Web</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── 6. ABOUT ── */}
          {listing.description && (
            <View style={{ marginBottom: 20 }}>
              <Text style={sectionTitle}>About</Text>
              <Text
                style={{ color: '#A0A0A0', fontSize: 14, lineHeight: 22 }}
                numberOfLines={descExpanded ? undefined : 3}
                onTextLayout={(e) => {
                  if (!descExpanded) setDescClamped(e.nativeEvent.lines.length >= 3);
                }}
              >
                {listing.description}
              </Text>
              {descClamped && (
                <TouchableOpacity onPress={() => setDescExpanded((v) => !v)}>
                  <Text style={{ color: '#D4A853', fontSize: 13, marginTop: 4 }}>
                    {descExpanded ? 'Show less' : 'Read more'}
                  </Text>
                </TouchableOpacity>
              )}
              {halalLabel && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: 'rgba(76,175,80,0.08)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' }}>
                  <Text style={{ color: '#4CAF50', fontSize: 13 }}>✓</Text>
                  <Text style={{ color: '#4CAF50', fontSize: 13 }}>{halalLabel}</Text>
                </View>
              )}
            </View>
          )}

          {/* ── 7. PHOTOS ── */}
          {photos.length > 1 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={sectionTitle}>Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {photos.map((url, i) => (
                  <TouchableOpacity key={i} activeOpacity={0.85} onPress={() => { setLightboxIndex(i); setLightboxVisible(true); }}>
                    <Image source={{ uri: url }} style={{ width: 112, height: 112, borderRadius: 10 }} contentFit="cover" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── 8. EVENTS HERE ── */}
          {events.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={sectionTitle}>Events Here</Text>
              {events.map((event: any) => (
                <TouchableOpacity
                  key={event.id}
                  onPress={() => router.push(`/event/${event.id}` as any)}
                  activeOpacity={0.85}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 12, padding: 12, marginBottom: 8 }}
                >
                  {event.thumbnailUrl ? (
                    <Image source={{ uri: event.thumbnailUrl }} style={{ width: 52, height: 52, borderRadius: 8 }} contentFit="cover" />
                  ) : (
                    <View style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' }}>
                      <Text>🎉</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#F5F5F5', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{event.title}</Text>
                    <Text style={{ color: '#D4A853', fontSize: 12, marginTop: 2 }}>
                      {new Date(event.startAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </Text>
                    {event.isFree && <Text style={{ color: '#4CAF50', fontSize: 11, marginTop: 1 }}>Free</Text>}
                  </View>
                  <Text style={{ color: '#606060', fontSize: 16 }}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── ADDRESS / CONTACT ── */}
          <View style={{ backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 12, padding: 14, marginBottom: 20, gap: 12 }}>
            {listing.address && (
              <TouchableOpacity onPress={handleDirections} activeOpacity={0.7}>
                <Text style={{ color: '#606060', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>Address</Text>
                <Text style={{ color: '#D4A853', fontSize: 13 }}>{listing.address}</Text>
              </TouchableOpacity>
            )}
            {listing.instagramHandle && (
              <TouchableOpacity onPress={() => Linking.openURL(`https://instagram.com/${listing.instagramHandle}`)} activeOpacity={0.7}>
                <Text style={{ color: '#606060', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>Instagram</Text>
                <Text style={{ color: '#D4A853', fontSize: 13 }}>@{listing.instagramHandle}</Text>
              </TouchableOpacity>
            )}
          </View>

        </View>
      </ScrollView>

      {/* ── 11. BOTTOM BAR ── */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#0D0D0D', borderTopWidth: 1, borderTopColor: '#1A1A1A', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <TouchableOpacity onPress={handleSave} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={{ fontSize: 24, color: saved ? '#D4A853' : '#606060' }}>{saved ? '♥' : '♡'}</Text>
            {(listing as any).savesCount != null && (
              <Text style={{ color: '#606060', fontSize: 13 }}>
                {(listing as any).savesCount + (saved && !listing.isSaved ? 1 : 0)}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={{ fontSize: 18, color: '#606060' }}>↑</Text>
            <Text style={{ color: '#606060', fontSize: 13 }}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDirections} activeOpacity={0.7} style={{ flex: 1, backgroundColor: '#D4A853', borderRadius: 999, paddingVertical: 13, alignItems: 'center' }}>
            <Text style={{ color: '#0D0D0D', fontWeight: '700', fontSize: 15 }}>Get Directions</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── LIGHTBOX ── */}
      <Modal visible={lightboxVisible} transparent animationType="fade" onRequestClose={() => setLightboxVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.96)' }}>
          <TouchableOpacity
            onPress={() => setLightboxVisible(false)}
            style={{ position: 'absolute', top: 56, right: 20, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#fff', fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
          <ScrollView
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            contentOffset={{ x: lightboxIndex * 400, y: 0 }}
            style={{ flex: 1 }}
            contentContainerStyle={{ alignItems: 'center' }}
          >
            {photos.map((url, i) => (
              <View key={i} style={{ width: 400, flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Image source={{ uri: url }} style={{ width: 400, height: 500 }} contentFit="contain" />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
