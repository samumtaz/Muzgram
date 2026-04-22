import { useState } from 'react';

import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContentType, HalalCertification } from '@muzgram/types';
import { useToggleSave } from '../queries/feed.queries';
import { useListing } from '../queries/listings.queries';

const DAY_LABELS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function HalalBadge({ cert }: { cert: HalalCertification }) {
  if (cert === HalalCertification.NONE) return null;
  const label =
    cert === HalalCertification.SELF_CERTIFIED
      ? 'Self-Certified Halal'
      : `Halal — ${cert.toUpperCase()}`;
  return (
    <View className="flex-row items-center gap-1 bg-green-900/30 border border-green-700/50 px-2 py-1 rounded-full self-start">
      <Text className="text-green-400 text-xs font-medium">{label}</Text>
    </View>
  );
}

function HoursRow() {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity onPress={() => setExpanded((v) => !v)} activeOpacity={0.7}>
      <View className="flex-row items-center justify-between py-2">
        <Text className="text-text-primary font-medium">Hours</Text>
        <Text className="text-text-muted text-sm">{expanded ? '▲' : '▼'}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: listing, isLoading, isError } = useListing(id!);
  const toggleSave = useToggleSave();
  const [hoursOpen, setHoursOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#C9A84C" />
      </SafeAreaView>
    );
  }

  if (isError || !listing) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-text-primary text-center text-lg font-semibold mb-2">
          Couldn't load this place
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-brand-gold">Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const today = DAY_LABELS[new Date().getDay()];
  const todayHours = listing.hours?.[today as keyof typeof listing.hours];

  function handleCall() {
    if (listing?.phone) Linking.openURL(`tel:${listing.phone}`);
  }

  function handleWhatsApp() {
    if (listing?.phone) {
      const num = listing.phone.replace(/\D/g, '');
      Linking.openURL(`https://wa.me/${num}`);
    }
  }

  function handleDirections() {
    if (!listing) return;
    const { lat, lng } = listing.location;
    const label = encodeURIComponent(listing.name);
    const url =
      Platform.OS === 'ios'
        ? `maps://app?q=${label}&ll=${lat},${lng}`
        : `geo:${lat},${lng}?q=${label}`;
    Linking.openURL(url);
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `Check out ${listing!.name} on Muzgram: https://muzgram.com/places/${listing!.slug}`,
      });
    } catch {
      // user cancelled
    }
  }

  function handleSave() {
    if (!listing) return;
    setIsSaved((v) => !v);
    toggleSave.mutate({ contentType: ContentType.LISTING, contentId: listing.id });
  }

  const saved = listing.isSaved ?? isSaved;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} bounces className="flex-1">
        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute top-4 left-4 z-10 bg-black/40 rounded-full w-9 h-9 items-center justify-center"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-white text-base">‹</Text>
        </TouchableOpacity>

        {/* Hero image */}
        <View className="w-full aspect-[16/9] bg-surface-elevated">
          {listing.thumbnailUrl ? (
            <Image
              source={{ uri: listing.thumbnailUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-5xl">🍽</Text>
            </View>
          )}
        </View>

        <View className="px-4 pt-4 pb-32">
          {/* Daily special banner */}
          {listing.currentSpecial && (
            <View className="bg-brand-gold/10 border border-brand-gold/40 rounded-xl p-3 mb-4">
              <Text className="text-brand-gold text-xs font-semibold uppercase tracking-wide mb-0.5">
                Today's Special
              </Text>
              <Text className="text-text-primary font-semibold">
                {listing.currentSpecial.title}
              </Text>
              {listing.currentSpecial.description && (
                <Text className="text-text-secondary text-sm mt-0.5">
                  {listing.currentSpecial.description}
                </Text>
              )}
              {listing.currentSpecial.price != null && (
                <Text className="text-brand-gold font-bold mt-1">
                  ${listing.currentSpecial.price.toFixed(2)}
                </Text>
              )}
            </View>
          )}

          {/* Name + badges */}
          <View className="mb-3">
            <Text className="text-text-primary text-2xl font-bold leading-tight">
              {listing.name}
            </Text>
            {listing.neighborhood && (
              <Text className="text-text-secondary text-sm mt-0.5">
                {listing.neighborhood}
              </Text>
            )}
            <View className="flex-row flex-wrap gap-2 mt-2">
              <HalalBadge cert={listing.halalCertification} />
              {listing.isFeatured && (
                <View className="bg-brand-gold/10 border border-brand-gold/40 px-2 py-1 rounded-full">
                  <Text className="text-brand-gold text-xs font-medium">Featured</Text>
                </View>
              )}
            </View>
          </View>

          {/* Description */}
          {listing.description && (
            <Text className="text-text-secondary text-sm leading-relaxed mb-4">
              {listing.description}
            </Text>
          )}

          {/* Hours accordion */}
          {listing.hours && (
            <View className="bg-surface border border-surface-border rounded-xl px-4 py-1 mb-4">
              <TouchableOpacity
                onPress={() => setHoursOpen((v) => !v)}
                activeOpacity={0.7}
                className="flex-row items-center justify-between py-2"
              >
                <View className="flex-row items-center gap-2">
                  <Text className="text-text-primary font-medium">Hours</Text>
                  {todayHours && !todayHours.closed && (
                    <Text className="text-green-400 text-xs">
                      {todayHours.open} – {todayHours.close}
                    </Text>
                  )}
                  {todayHours?.closed && (
                    <Text className="text-red-400 text-xs">Closed today</Text>
                  )}
                </View>
                <Text className="text-text-muted">{hoursOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {hoursOpen &&
                DAY_LABELS.map((day) => {
                  const h = listing.hours?.[day as keyof typeof listing.hours];
                  return (
                    <View
                      key={day}
                      className={`flex-row justify-between py-1.5 ${day === today ? 'opacity-100' : 'opacity-60'}`}
                    >
                      <Text className="text-text-secondary text-sm capitalize w-28">{day}</Text>
                      <Text className="text-text-primary text-sm">
                        {!h || h.closed ? 'Closed' : `${h.open} – ${h.close}`}
                      </Text>
                    </View>
                  );
                })}
            </View>
          )}

          {/* Contact info */}
          <View className="bg-surface border border-surface-border rounded-xl px-4 py-3 mb-4 gap-2">
            {listing.address && (
              <TouchableOpacity onPress={handleDirections} activeOpacity={0.7}>
                <Text className="text-text-muted text-xs uppercase tracking-wide">Address</Text>
                <Text className="text-brand-gold text-sm mt-0.5">{listing.address}</Text>
              </TouchableOpacity>
            )}
            {listing.website && (
              <TouchableOpacity
                onPress={() => Linking.openURL(listing.website!)}
                activeOpacity={0.7}
              >
                <Text className="text-text-muted text-xs uppercase tracking-wide">Website</Text>
                <Text className="text-brand-gold text-sm mt-0.5 underline" numberOfLines={1}>
                  {listing.website.replace(/^https?:\/\//, '')}
                </Text>
              </TouchableOpacity>
            )}
            {listing.instagramHandle && (
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(`https://instagram.com/${listing.instagramHandle}`)
                }
                activeOpacity={0.7}
              >
                <Text className="text-text-muted text-xs uppercase tracking-wide">Instagram</Text>
                <Text className="text-brand-gold text-sm mt-0.5">@{listing.instagramHandle}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Media grid */}
          {listing.mediaUrls.length > 1 && (
            <View className="mb-4">
              <Text className="text-text-primary font-semibold mb-2">Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {listing.mediaUrls.slice(0, 8).map((url, i) => (
                    <View
                      key={i}
                      className="w-28 h-28 rounded-xl overflow-hidden bg-surface-elevated"
                    >
                      <Image
                        source={{ uri: url }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom fixed bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-background border-t border-surface-border px-4 py-3">
        <SafeAreaView edges={['bottom']}>
          <View className="flex-row gap-2">
            {listing.phone && (
              <TouchableOpacity
                onPress={handleCall}
                className="flex-1 bg-surface border border-surface-border rounded-xl py-3 items-center"
                activeOpacity={0.7}
              >
                <Text className="text-text-primary font-semibold text-sm">Call</Text>
              </TouchableOpacity>
            )}
            {listing.phone && (
              <TouchableOpacity
                onPress={handleWhatsApp}
                className="flex-1 bg-green-900/30 border border-green-700/50 rounded-xl py-3 items-center"
                activeOpacity={0.7}
              >
                <Text className="text-green-400 font-semibold text-sm">WhatsApp</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleDirections}
              className="flex-1 bg-brand-gold rounded-xl py-3 items-center"
              activeOpacity={0.7}
            >
              <Text className="text-background font-semibold text-sm">Directions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              className={`w-12 rounded-xl items-center justify-center border ${
                saved ? 'bg-brand-gold border-brand-gold' : 'bg-surface border-surface-border'
              }`}
              activeOpacity={0.7}
            >
              <Text className={saved ? 'text-background text-lg' : 'text-text-muted text-lg'}>
                {saved ? '♥' : '♡'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}
