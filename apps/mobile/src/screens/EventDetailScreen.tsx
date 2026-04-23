import { useEffect, useState } from 'react';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useEvent, useToggleEventSave } from '../queries/events.queries';
import { track, screen } from '../lib/analytics';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatFull(iso: string) {
  const d = new Date(iso);
  return `${DAY[d.getDay()]}, ${MONTH[d.getMonth()]} ${d.getDate()} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function formatShortDate(iso: string) {
  const d = new Date(iso);
  return { day: d.getDate(), month: MONTH[d.getMonth()] };
}

function countdown(iso: string): string | null {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0 || diff > 24 * 3600 * 1000) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `Starts in ${h}h ${m}m` : `Starts in ${m}m`;
}

const sectionTitle: any = { color: '#F5F5F5', fontWeight: '700', fontSize: 16, marginBottom: 10 };

export function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: event, isLoading, isError } = useEvent(id!);
  const toggleSave = useToggleEventSave();
  const [descExpanded, setDescExpanded] = useState(false);
  const [descClamped, setDescClamped] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!event) return;
    screen('EventDetail');
    track('event_viewed', {
      eventId: event.id,
      isFeatured: event.isFeatured,
      isFree: event.isFree,
    });
    setIsSaved(event.isSaved ?? false);
  }, [event?.id]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#D4A853" />
      </View>
    );
  }

  if (isError || !event) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#F5F5F5', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>
          Couldn't load this event
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#D4A853' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPast = new Date(event.endAt ?? event.startAt) < new Date();
  const countdownLabel = countdown(event.startAt);
  const priceLabel = event.isFree ? 'Free' : event.ticketUrl ? 'Tickets required' : null;
  const { day, month } = formatShortDate(event.startAt);
  const saved = event.isSaved ?? isSaved;
  const organizer = (event as any).organizer;
  const isVerifiedOrganizer = (organizer?.trustTier ?? 0) >= 3;

  function handleDirections() {
    track('event_directions_tapped', { eventId: event!.id });
    const { lat, lng } = event!.location;
    const label = encodeURIComponent(event!.address ?? '');
    Linking.openURL(
      Platform.OS === 'ios'
        ? `maps://app?q=${label}&ll=${lat},${lng}`
        : `geo:${lat},${lng}?q=${label}`,
    );
  }

  function handleTickets() {
    track('event_tickets_tapped', { eventId: event!.id });
    if (event?.ticketUrl) Linking.openURL(event.ticketUrl);
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `Check out ${event!.title} on Muzgram`,
        url: `https://muzgram.com/events/${(event as any).slug ?? event!.id}`,
      });
    } catch {}
  }

  function handleSave() {
    setIsSaved((v) => !v);
    toggleSave.mutate(event!.id);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0D0D' }}>
      <ScrollView showsVerticalScrollIndicator={false} bounces style={{ flex: 1 }}>

        {/* ── HERO ── */}
        <View style={{ width: '100%', height: 280, backgroundColor: '#1A1A1A' }}>
          {event.thumbnailUrl ? (
            <Image
              source={{ uri: event.thumbnailUrl }}
              placeholder={(event as any).coverPhotoBlurHash ? { blurhash: (event as any).coverPhotoBlurHash } : undefined}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(212,168,83,0.08)' }}>
              <Text style={{ fontSize: 64 }}>🎉</Text>
            </View>
          )}

          {/* Featured ribbon */}
          {event.isFeatured && (
            <View style={{ position: 'absolute', top: 18, right: -24, width: 100, backgroundColor: '#D4A853', transform: [{ rotate: '35deg' }], alignItems: 'center', paddingVertical: 4 }}>
              <Text style={{ color: '#0D0D0D', fontSize: 10, fontWeight: '700' }}>★ Featured</Text>
            </View>
          )}

          {/* Free badge overlay */}
          {event.isFree && (
            <View style={{ position: 'absolute', bottom: 14, left: 14, backgroundColor: '#4CAF50', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Free</Text>
            </View>
          )}

          {/* Past event overlay */}
          {isPast && (
            <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999 }}>
                <Text style={{ color: '#A0A0A0', fontWeight: '700', fontSize: 13 }}>Past Event</Text>
              </View>
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

          {/* ── COUNTDOWN BADGE ── */}
          {countdownLabel && (
            <View style={{ backgroundColor: 'rgba(212,168,83,0.12)', borderWidth: 1, borderColor: 'rgba(212,168,83,0.4)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 10 }}>
              <Text style={{ color: '#D4A853', fontWeight: '700', fontSize: 12 }}>⏱ {countdownLabel}</Text>
            </View>
          )}

          {/* ── TITLE ── */}
          <Text style={{ color: '#F5F5F5', fontSize: 26, fontWeight: '800', lineHeight: 32, marginBottom: 12 }}>
            {event.title}
          </Text>

          {/* ── DATE / LOCATION / PRICE CARD ── */}
          <View style={{ backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 14, padding: 14, marginBottom: 16, gap: 14 }}>

            {/* Date */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, backgroundColor: 'rgba(212,168,83,0.1)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#D4A853', fontWeight: '800', fontSize: 16, lineHeight: 18 }}>{day}</Text>
                <Text style={{ color: '#D4A853', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>{month}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#F5F5F5', fontWeight: '600', fontSize: 14 }}>{formatFull(event.startAt)}</Text>
                {event.endAt && (
                  <Text style={{ color: '#606060', fontSize: 12, marginTop: 2 }}>Ends {formatFull(event.endAt)}</Text>
                )}
                {event.isRecurring && (
                  <Text style={{ color: '#A0A0A0', fontSize: 12, marginTop: 2 }}>🔁 Recurring event</Text>
                )}
              </View>
            </View>

            {/* Location */}
            {!event.isOnline && event.address && (
              <TouchableOpacity onPress={handleDirections} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 44, height: 44, backgroundColor: '#222', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20 }}>📍</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#D4A853', fontSize: 14, fontWeight: '500' }}>{event.address}</Text>
                  <Text style={{ color: '#606060', fontSize: 11, marginTop: 2 }}>Tap for directions</Text>
                </View>
              </TouchableOpacity>
            )}

            {event.isOnline && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 44, height: 44, backgroundColor: '#222', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20 }}>🔗</Text>
                </View>
                <Text style={{ color: '#A0A0A0', fontSize: 14 }}>Online event</Text>
              </View>
            )}

            {/* Price */}
            {priceLabel && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 44, height: 44, backgroundColor: '#222', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20 }}>🎫</Text>
                </View>
                <Text style={{ color: event.isFree ? '#4CAF50' : '#F5F5F5', fontSize: 14, fontWeight: '600' }}>{priceLabel}</Text>
              </View>
            )}
          </View>

          {/* ── ORGANIZER ── */}
          {organizer && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 12, padding: 12, marginBottom: 16 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 16 }}>👤</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#606060', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 }}>Organized by</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ color: '#F5F5F5', fontWeight: '600', fontSize: 14 }}>{organizer.name}</Text>
                  {isVerifiedOrganizer && (
                    <Text style={{ color: '#D4A853', fontSize: 13 }}>✓</Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* ── ABOUT ── */}
          {event.description && (
            <View style={{ marginBottom: 16 }}>
              <Text style={sectionTitle}>About this event</Text>
              <Text
                style={{ color: '#A0A0A0', fontSize: 14, lineHeight: 22 }}
                numberOfLines={descExpanded ? undefined : 4}
                onTextLayout={(e) => {
                  if (!descExpanded) setDescClamped(e.nativeEvent.lines.length >= 4);
                }}
              >
                {event.description}
              </Text>
              {descClamped && (
                <TouchableOpacity onPress={() => setDescExpanded((v) => !v)}>
                  <Text style={{ color: '#D4A853', fontSize: 13, marginTop: 4 }}>
                    {descExpanded ? 'Show less' : 'Read more'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── TAGS ── */}
          {event.tags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {event.tags.map((tag) => (
                <View key={tag} style={{ backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                  <Text style={{ color: '#A0A0A0', fontSize: 12 }}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── ONLINE LINK ── */}
          {event.isOnline && event.onlineUrl && (
            <TouchableOpacity
              onPress={() => Linking.openURL(event.onlineUrl!)}
              activeOpacity={0.7}
              style={{ backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 12, padding: 14, marginBottom: 16 }}
            >
              <Text style={{ color: '#606060', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>Online Link</Text>
              <Text style={{ color: '#D4A853', fontSize: 13 }} numberOfLines={1}>{event.onlineUrl}</Text>
            </TouchableOpacity>
          )}

        </View>
      </ScrollView>

      {/* ── BOTTOM BAR ── */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#0D0D0D', borderTopWidth: 1, borderTopColor: '#1A1A1A', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>

          {/* Save */}
          <TouchableOpacity onPress={handleSave} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={{ fontSize: 24, color: saved ? '#D4A853' : '#606060' }}>{saved ? '♥' : '♡'}</Text>
            {(event as any).savesCount != null && (
              <Text style={{ color: '#606060', fontSize: 13 }}>
                {(event as any).savesCount + (saved && !event.isSaved ? 1 : 0)}
              </Text>
            )}
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity onPress={handleShare} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={{ fontSize: 18, color: '#606060' }}>↑</Text>
            <Text style={{ color: '#606060', fontSize: 13 }}>Share</Text>
          </TouchableOpacity>

          {/* Primary CTA */}
          {!isPast && event.ticketUrl ? (
            <TouchableOpacity onPress={handleTickets} activeOpacity={0.7} style={{ flex: 1, backgroundColor: '#D4A853', borderRadius: 999, paddingVertical: 13, alignItems: 'center' }}>
              <Text style={{ color: '#0D0D0D', fontWeight: '700', fontSize: 15 }}>Get Tickets</Text>
            </TouchableOpacity>
          ) : !isPast ? (
            <TouchableOpacity onPress={handleDirections} activeOpacity={0.7} style={{ flex: 1, backgroundColor: '#D4A853', borderRadius: 999, paddingVertical: 13, alignItems: 'center' }}>
              <Text style={{ color: '#0D0D0D', fontWeight: '700', fontSize: 15 }}>Get Directions</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1, borderRadius: 999, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A' }}>
              <Text style={{ color: '#606060', fontSize: 15 }}>Event Ended</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
