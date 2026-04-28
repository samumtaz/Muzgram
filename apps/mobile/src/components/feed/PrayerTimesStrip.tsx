import { useEffect, useMemo, useState } from 'react';

import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import * as adhan from 'adhan';

import { useLocationStore } from '../../stores/location.store';

const PRAYER_NAMES: Record<string, string> = {
  fajr: 'Fajr',
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

export function PrayerTimesStrip({ onDismiss }: { onDismiss: () => void }) {
  const { location } = useLocationStore();
  const [now, setNow] = useState(Date.now());

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

  const upcoming = prayers.filter((p) => p.date.getTime() > now);
  const next = upcoming[0] ?? prayers[prayers.length - 1];
  const msUntilNext = next.date.getTime() - now;
  const isPast = msUntilNext <= 0;

  return (
    <View style={{
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: 10,
      backgroundColor: '#0F1A0F',
      borderWidth: 1,
      borderColor: '#22c55e30',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 7,
      overflow: 'hidden',
    }}>
      {/* Next prayer info */}
      <Text style={{ fontSize: 11 }}>🕌</Text>
      <View style={{ marginLeft: 5, marginRight: 8 }}>
        <Text style={{ color: '#22c55e', fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
          {next.label}
          <Text style={{ color: '#86efac', fontWeight: '400' }}>
            {isPast ? '' : `  ${formatCountdown(msUntilNext)}`}
          </Text>
        </Text>
      </View>

      {/* Divider */}
      <View style={{ width: 1, height: 18, backgroundColor: '#22c55e25', marginRight: 8 }} />

      {/* Prayer times — scrollable, fills remaining space */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ alignItems: 'center', gap: 12 }}
      >
        {prayers.map((p) => {
          const isNext = p.key === next.key;
          const isPrayed = p.date.getTime() < now;
          return (
            <View key={p.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              {isNext && (
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#22c55e' }} />
              )}
              <Text style={{
                fontSize: 10,
                fontWeight: isNext ? '700' : '400',
                color: isNext ? '#22c55e' : isPrayed ? '#3a5a3a' : '#86efac',
              }}>
                {p.label}
              </Text>
              <Text style={{
                fontSize: 10,
                color: isNext ? '#22c55e' : isPrayed ? '#3a5a3a' : '#5a8a5a',
              }}>
                {formatTime(p.date)}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Dismiss */}
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{ marginLeft: 8 }}
      >
        <Text style={{ color: '#4b7a4b', fontSize: 15, lineHeight: 16 }}>×</Text>
      </TouchableOpacity>
    </View>
  );
}
