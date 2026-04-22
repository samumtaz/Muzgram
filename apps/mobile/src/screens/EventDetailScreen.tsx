import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useEvent, useToggleEventSave } from '../queries/events.queries';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: event, isLoading, isError } = useEvent(id!);
  const toggleSave = useToggleEventSave();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#C9A84C" />
      </SafeAreaView>
    );
  }

  if (isError || !event) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-text-primary text-center text-lg font-semibold mb-2">
          Couldn't load this event
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-brand-gold">Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  function handleDirections() {
    const { lat, lng } = event!.location;
    const label = encodeURIComponent(event!.address);
    const url =
      Platform.OS === 'ios'
        ? `maps://app?q=${label}&ll=${lat},${lng}`
        : `geo:${lat},${lng}?q=${label}`;
    Linking.openURL(url);
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `Check out ${event!.title} on Muzgram: https://muzgram.com/events/${event!.slug}`,
      });
    } catch {
      // user cancelled
    }
  }

  function handleTickets() {
    if (event?.ticketUrl) Linking.openURL(event.ticketUrl);
  }

  const isPast = event.endAt ? new Date(event.endAt) < new Date() : new Date(event.startAt) < new Date();
  const priceLabel = event.isFree ? 'Free' : event.ticketUrl ? 'Tickets available' : null;

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

        {/* Share button */}
        <TouchableOpacity
          onPress={handleShare}
          className="absolute top-4 right-4 z-10 bg-black/40 rounded-full w-9 h-9 items-center justify-center"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-white text-sm">⬆</Text>
        </TouchableOpacity>

        {/* Hero image */}
        <View className="w-full aspect-[16/9] bg-surface-elevated">
          {event.thumbnailUrl ? (
            <Image
              source={{ uri: event.thumbnailUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-5xl">🎉</Text>
            </View>
          )}
        </View>

        <View className="px-4 pt-4 pb-32">
          {/* Title + status */}
          <View className="mb-3">
            {isPast && (
              <View className="bg-surface-elevated border border-surface-border px-2 py-0.5 rounded-full self-start mb-2">
                <Text className="text-text-muted text-xs">Past Event</Text>
              </View>
            )}
            {event.isFeatured && !isPast && (
              <View className="bg-brand-gold/10 border border-brand-gold/40 px-2 py-0.5 rounded-full self-start mb-2">
                <Text className="text-brand-gold text-xs font-medium">Featured</Text>
              </View>
            )}
            <Text className="text-text-primary text-2xl font-bold leading-tight">
              {event.title}
            </Text>
          </View>

          {/* Date + time */}
          <View className="bg-surface border border-surface-border rounded-xl px-4 py-3 mb-4 gap-3">
            <View className="flex-row items-start gap-3">
              <View className="w-10 h-10 bg-brand-gold/10 rounded-lg items-center justify-center">
                <Text className="text-brand-gold text-xs font-bold">
                  {new Date(event.startAt).getDate()}
                </Text>
                <Text className="text-brand-gold text-[9px] uppercase">
                  {formatDateShort(event.startAt).split(' ')[0]}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-text-primary font-medium text-sm">
                  {formatDate(event.startAt)}
                </Text>
                {event.endAt && (
                  <Text className="text-text-muted text-xs mt-0.5">
                    Ends {formatDate(event.endAt)}
                  </Text>
                )}
                {event.isRecurring && (
                  <Text className="text-text-muted text-xs mt-0.5">Recurring event</Text>
                )}
              </View>
            </View>

            {/* Location */}
            <TouchableOpacity
              onPress={handleDirections}
              activeOpacity={0.7}
              className="flex-row items-start gap-3"
            >
              <View className="w-10 h-10 bg-surface-elevated rounded-lg items-center justify-center">
                <Text className="text-text-muted text-lg">📍</Text>
              </View>
              <View className="flex-1">
                <Text className="text-brand-gold text-sm font-medium">{event.address}</Text>
                {event.isOnline && (
                  <Text className="text-text-muted text-xs mt-0.5">Also available online</Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Price */}
            {priceLabel && (
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 bg-surface-elevated rounded-lg items-center justify-center">
                  <Text className="text-text-muted text-sm">🎫</Text>
                </View>
                <Text className="text-text-primary text-sm font-medium">{priceLabel}</Text>
              </View>
            )}
          </View>

          {/* Description */}
          {event.description && (
            <View className="mb-4">
              <Text className="text-text-primary font-semibold mb-2">About this event</Text>
              <Text className="text-text-secondary text-sm leading-relaxed">
                {event.description}
              </Text>
            </View>
          )}

          {/* Tags */}
          {event.tags.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mb-4">
              {event.tags.map((tag) => (
                <View
                  key={tag}
                  className="bg-surface border border-surface-border px-3 py-1 rounded-full"
                >
                  <Text className="text-text-secondary text-xs">#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Online link */}
          {event.isOnline && event.onlineUrl && (
            <TouchableOpacity
              onPress={() => Linking.openURL(event.onlineUrl!)}
              className="bg-surface border border-surface-border rounded-xl px-4 py-3 mb-4"
              activeOpacity={0.7}
            >
              <Text className="text-text-muted text-xs uppercase tracking-wide mb-0.5">
                Online Link
              </Text>
              <Text className="text-brand-gold text-sm underline" numberOfLines={1}>
                {event.onlineUrl}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Bottom fixed bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-background border-t border-surface-border px-4 py-3">
        <SafeAreaView edges={['bottom']}>
          <View className="flex-row gap-2">
            {!isPast && (
              <TouchableOpacity
                onPress={handleDirections}
                className="flex-1 bg-surface border border-surface-border rounded-xl py-3 items-center"
                activeOpacity={0.7}
              >
                <Text className="text-text-primary font-semibold text-sm">Directions</Text>
              </TouchableOpacity>
            )}
            {!isPast && event.ticketUrl && (
              <TouchableOpacity
                onPress={handleTickets}
                className="flex-1 bg-brand-gold rounded-xl py-3 items-center"
                activeOpacity={0.7}
              >
                <Text className="text-background font-semibold text-sm">Get Tickets</Text>
              </TouchableOpacity>
            )}
            {!isPast && !event.ticketUrl && event.isFree && (
              <View className="flex-1 bg-brand-gold/10 border border-brand-gold/40 rounded-xl py-3 items-center">
                <Text className="text-brand-gold font-semibold text-sm">Free Event</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => toggleSave.mutate(event.id)}
              className={`w-12 rounded-xl items-center justify-center border ${
                event.isSaved ? 'bg-brand-gold border-brand-gold' : 'bg-surface border-surface-border'
              }`}
              activeOpacity={0.7}
            >
              <Text className={event.isSaved ? 'text-background text-lg' : 'text-text-muted text-lg'}>
                {event.isSaved ? '♥' : '♡'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}
