import { BusinessHours, DayHours, GeoPoint } from '@muzgram/types';

// ─── Geo Utils ────────────────────────────────────────────────────────────────

const EARTH_RADIUS_KM = 6371;

export function haversineDistance(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const chord =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(chord));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function formatDistanceLabel(km: number): string {
  if (km < 0.5) return 'Right here';
  if (km < 1) return `${Math.round(km * 1000)}m away`;
  if (km < 10) return `${km.toFixed(1)}km away`;
  return `${Math.round(km)}km away`;
}

// ─── Slug Utils ───────────────────────────────────────────────────────────────

export function generateSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateListingSlug(name: string, city: string): string {
  return `${generateSlug(name)}-${generateSlug(city)}`;
}

export function generateEventSlug(title: string, dateStr: string): string {
  const date = new Date(dateStr);
  const datePart = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return `${generateSlug(title)}-${datePart}`;
}

// ─── Business Hours Utils ─────────────────────────────────────────────────────

const DAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

type DayName = (typeof DAY_NAMES)[number];

export function isOpenNow(hours: BusinessHours, now: Date = new Date()): boolean {
  const dayName = DAY_NAMES[now.getDay()] as DayName;
  const dayHours = hours[dayName] as DayHours | null;

  if (!dayHours || dayHours.closed) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = timeStringToMinutes(dayHours.open);
  const closeMinutes = timeStringToMinutes(dayHours.close);

  // Handles midnight crossover (e.g., open 10:00, close 02:00)
  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

export function timeStringToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatHoursLabel(hours: BusinessHours, now: Date = new Date()): string {
  const open = isOpenNow(hours, now);
  const dayName = DAY_NAMES[now.getDay()] as DayName;
  const dayHours = hours[dayName] as DayHours | null;

  if (!dayHours || dayHours.closed) {
    return open ? 'Open' : 'Closed today';
  }

  const closeLabel = dayHours.close;
  return open ? `Open · Closes ${formatTimeDisplay(closeLabel)}` : `Closed · Opens ${formatTimeDisplay(dayHours.open)}`;
}

function formatTimeDisplay(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${period}` : `${hour}:${String(m).padStart(2, '0')}${period}`;
}

// ─── Feed Scoring Utils ───────────────────────────────────────────────────────

import { FEED_SCORE } from '@muzgram/constants';

export interface FeedScoreFactors {
  ageHours: number;
  distanceKm: number;
  contentTypeBoost: number;
  trustTier: number;
  savesCount: number;
  sharesCount: number;
  isFeatured: boolean;
}

export function computeFeedScore(factors: FeedScoreFactors): number {
  const recency = computeRecencyScore(factors.ageHours);
  const proximity = computeProximityScore(factors.distanceKm);
  const engagement = Math.min(
    factors.savesCount * FEED_SCORE.ENGAGEMENT_SAVE_WEIGHT +
    factors.sharesCount * FEED_SCORE.ENGAGEMENT_SHARE_WEIGHT,
    FEED_SCORE.ENGAGEMENT_MAX,
  );
  const trust = factors.trustTier * FEED_SCORE.TRUST_TIER_BOOST_PER_LEVEL;
  const featured = factors.isFeatured ? FEED_SCORE.FEATURED_SCORE_BOOST : 0;

  return recency + proximity + factors.contentTypeBoost + trust + engagement + featured;
}

function computeRecencyScore(ageHours: number): number {
  const halfLife = FEED_SCORE.RECENCY_HALF_LIFE_HOURS;
  return FEED_SCORE.RECENCY_MAX * Math.pow(0.5, ageHours / halfLife);
}

function computeProximityScore(distanceKm: number): number {
  if (distanceKm <= 1) return FEED_SCORE.PROXIMITY_WITHIN_1KM;
  if (distanceKm <= 3) return FEED_SCORE.PROXIMITY_WITHIN_3KM;
  if (distanceKm <= 5) return FEED_SCORE.PROXIMITY_WITHIN_5KM;
  if (distanceKm <= 8) return FEED_SCORE.PROXIMITY_WITHIN_8KM;
  return 0;
}

// ─── Cursor Pagination Utils ──────────────────────────────────────────────────

export function encodeCursor(data: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

export function decodeCursor<T extends Record<string, unknown>>(cursor: string): T {
  return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as T;
}

// ─── Media Key Utils ──────────────────────────────────────────────────────────

export function buildMediaKey(
  context: 'listing' | 'event' | 'post' | 'avatar',
  ownerId: string,
  filename: string,
): string {
  const ext = filename.split('.').pop() ?? 'jpg';
  const hash = Math.random().toString(36).substring(2, 10);
  return `${context}/${ownerId}/${hash}.${ext}`;
}

// ─── String Utils ─────────────────────────────────────────────────────────────

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
  return `+${digits}`;
}

// ─── Date Utils ───────────────────────────────────────────────────────────────

export function isEventUpcoming(startAt: string): boolean {
  return new Date(startAt) > new Date();
}

export function formatEventDateLabel(startAt: string, endAt?: string | null): string {
  const start = new Date(startAt);
  const now = new Date();

  const isToday = start.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = start.toDateString() === tomorrow.toDateString();

  const timeLabel = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) return `Today · ${timeLabel}`;
  if (isTomorrow) return `Tomorrow · ${timeLabel}`;

  return start.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
