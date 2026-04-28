import { useEffect, useMemo, useState } from 'react';

import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import * as adhan from 'adhan';

import { useLocationStore } from '../../stores/location.store';

const PRAYER_NAMES: Record<string, string> = {
  fajr: 'Fajr',
  sunrise: 'Sunrise',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

const PRAYER_ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'now';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getPrayerTimes(lat: number, lng: number) {
  const coords = new adhan.Coordinates(lat, lng);
  const params = adhan.CalculationMethod.NorthAmerica();
  const date = new Date();
  return new adhan.PrayerTimes(coords, date, params);
}

function formatCitySlug(slug: string | null): string | null {
  if (!slug) return null;
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function PrayerTimesStrip({ onDismiss }: { onDismiss: () => void }) {
  const { location, citySlug } = useLocationStore();
  const [now, setNow] = useState(Date.now());
  const cityName = formatCitySlug(citySlug);

  // Tick every minute
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const lat = location?.lat ?? 41.9977;
  const lng = location?.lng ?? -87.6936;

  const times = useMemo(() => getPrayerTimes(lat, lng), [lat, lng]);

  const prayers = PRAYER_ORDER.map((key) => ({
    key,
    label: PRAYER_NAMES[key],
    date: times[key as keyof adhan.PrayerTimes] as Date,
  }));

  // Find current/next prayer
  const upcoming = prayers.filter((p) => p.date.getTime() > now);
  const next = upcoming[0] ?? prayers[prayers.length - 1];
  const msUntilNext = next.date.getTime() - now;
  const isPast = msUntilNext <= 0;

  return (
    <View style={{
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: 14,
      backgroundColor: '#0F1A0F',
      borderWidth: 1,
      borderColor: '#22c55e30',
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 }}>
        <Text style={{ fontSize: 13 }}>🕌</Text>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={{ color: '#22c55e', fontSize: 13, fontWeight: '700' }}>
            {isPast ? next.label : `${next.label} · ${formatTime(next.date)}`}
          </Text>
          <Text style={{ color: '#86efac', fontSize: 11, marginTop: 1 }}>
            {isPast ? 'Prayer time' : `in ${formatCountdown(msUntilNext)}`}
            {cityName ? <Text style={{ color: '#4b7a4b' }}>{`  ·  ${cityName}`}</Text> : null}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={{ color: '#4b7a4b', fontSize: 16, lineHeight: 18 }}>×</Text>
        </TouchableOpacity>
      </View>

      {/* Prayer times row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 10, gap: 16 }}
      >
        {prayers.map((p) => {
          const isNext = p.key === next.key;
          const isPrayed = p.date.getTime() < now;
          return (
            <View key={p.key} style={{ alignItems: 'center', gap: 3 }}>
              <Text style={{
                fontSize: 11,
                fontWeight: isNext ? '700' : '500',
                color: isNext ? '#22c55e' : isPrayed ? '#3a5a3a' : '#86efac',
              }}>
                {p.label}
              </Text>
              <Text style={{
                fontSize: 11,
                color: isNext ? '#22c55e' : isPrayed ? '#3a5a3a' : '#6b9e6b',
              }}>
                {formatTime(p.date)}
              </Text>
              {isNext && (
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#22c55e' }} />
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
