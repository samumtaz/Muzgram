import { ListingMainCategory } from '@muzgram/types';

// ─── Feed ─────────────────────────────────────────────────────────────────────

export const FEED_DEFAULT_RADIUS_KM = 40;
export const FEED_MAX_RADIUS_KM = 40;
export const FEED_DEFAULT_PAGE_SIZE = 20;
export const FEED_MAX_PAGE_SIZE = 50;

// Feed composition constraints (prevent any single type from dominating)
export const FEED_MAX_FEATURED_RATIO = 0.2;       // max 1-in-5 items are featured paid
export const FEED_MAX_COMMUNITY_POST_RATIO = 0.3; // max 30% are community posts
export const FEED_FEATURED_SCORE_BOOST = 200;

// ─── Feed Scoring Weights ────────────────────────────────────────────────────

export const FEED_SCORE = {
  // Recency decay — newer content scores higher
  RECENCY_HALF_LIFE_HOURS: 24,
  RECENCY_MAX: 100,
  // Proximity boost — content closer scores higher
  PROXIMITY_MAX: 80,
  PROXIMITY_WITHIN_1KM: 80,
  PROXIMITY_WITHIN_3KM: 60,
  PROXIMITY_WITHIN_5KM: 40,
  PROXIMITY_WITHIN_8KM: 20,
  // Content type boosts
  TYPE_EVENT_BOOST: 30,
  TYPE_LISTING_BOOST: 0,
  TYPE_POST_BOOST: 10,
  // Trust tier boosts
  TRUST_TIER_BOOST_PER_LEVEL: 10,
  // Engagement boost (saves, shares)
  ENGAGEMENT_SAVE_WEIGHT: 2,
  ENGAGEMENT_SHARE_WEIGHT: 5,
  ENGAGEMENT_MAX: 50,
  // Featured content bonus
  FEATURED_SCORE_BOOST: 200,
} as const;

// ─── Trust Tier ───────────────────────────────────────────────────────────────

export const TRUST_TIER = {
  // Weighted report threshold to trigger auto-hide
  AUTO_HIDE_THRESHOLD: 3.0,
  // Report weight per tier
  REPORT_WEIGHT: {
    [-1]: 0,   // BLOCKED — reports ignored
    [0]: 0.2,  // UNVERIFIED
    [1]: 0.5,  // TRUSTED
    [2]: 1.0,  // CONTRIBUTOR
    [3]: 1.5,  // VERIFIED_BUSINESS
    [4]: 2.0,  // VERIFIED_ORGANIZER
  },
  // Actions allowed per tier (minimum tier required)
  MIN_TIER_TO_POST: 0,          // anyone can post (queued for review)
  MIN_TIER_TO_AUTO_APPROVE: 2,  // CONTRIBUTOR+ gets auto-approved
  MIN_TIER_TO_REPORT: 1,        // TRUSTED+ can submit reports
} as const;

// ─── Notification ─────────────────────────────────────────────────────────────

export const NOTIFICATION = {
  MAX_PER_USER_PER_DAY: 3,
  QUIET_HOURS_START: 21,  // 9pm local time
  QUIET_HOURS_END: 7,     // 7am local time
  MAX_BODY_LENGTH: 150,
  NEARBY_RADIUS_KM: 8,
} as const;

// ─── Media ────────────────────────────────────────────────────────────────────

export const MEDIA = {
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/quicktime'],
  IMAGE_THUMBNAIL_WIDTH: 400,
  IMAGE_THUMBNAIL_HEIGHT: 300,
  PRESIGNED_URL_EXPIRY_SECONDS: 300, // 5 minutes
} as const;

// ─── Content Lifecycle ────────────────────────────────────────────────────────

export const TTL = {
  COMMUNITY_POST_DAYS: 7,
  DAILY_SPECIAL_HOURS: 24,
  FEATURED_DEFAULT_DAYS: 7,
  FEED_CACHE_SECONDS: 60,
  MAP_PINS_CACHE_SECONDS: 120,
} as const;

// ─── Categories ───────────────────────────────────────────────────────────────

export const EAT_SUBCATEGORIES = [
  { slug: 'restaurants', name: 'Restaurants', icon: 'utensils' },
  { slug: 'cafes', name: 'Cafés', icon: 'coffee' },
  { slug: 'bakeries', name: 'Bakeries & Sweets', icon: 'cake' },
  { slug: 'grocery', name: 'Grocery & Halal Meat', icon: 'shopping-basket' },
  { slug: 'catering', name: 'Catering', icon: 'truck' },
] as const;

export const GO_OUT_SUBCATEGORIES = [
  { slug: 'desi-parties', name: 'Desi Parties & Nightlife', icon: 'music' },
  { slug: 'bollywood-nights', name: 'Bollywood & Desi Nights', icon: 'disc' },
  { slug: 'concerts', name: 'Concerts & Live Music', icon: 'mic' },
  { slug: 'comedy-shows', name: 'Comedy Shows', icon: 'laugh' },
  { slug: 'arab-parties', name: 'Arab Cultural Events', icon: 'star-crescent' },
  { slug: 'cultural-festivals', name: 'Cultural Festivals', icon: 'globe' },
  { slug: 'eid-events', name: 'Eid Events', icon: 'moon' },
  { slug: 'iftar-dinners', name: 'Iftar Dinners', icon: 'moon-stars' },
  { slug: 'networking', name: 'Networking & Professional', icon: 'briefcase' },
  { slug: 'sports', name: 'Sports & Active', icon: 'running' },
  { slug: 'arts', name: 'Arts & Culture', icon: 'palette' },
  { slug: 'family', name: 'Family Events', icon: 'family' },
  { slug: 'tonight', name: 'Tonight', icon: 'clock' },
] as const;

export const CONNECT_SUBCATEGORIES = [
  { slug: 'financial', name: 'Financial Services', icon: 'landmark' },
  { slug: 'real-estate', name: 'Real Estate', icon: 'home' },
  { slug: 'legal', name: 'Legal Services', icon: 'balance-scale' },
  { slug: 'healthcare', name: 'Healthcare', icon: 'heart-pulse' },
  { slug: 'education', name: 'Education & Tutoring', icon: 'book-open' },
  { slug: 'tech', name: 'Technology', icon: 'laptop' },
  { slug: 'beauty', name: 'Beauty & Wellness', icon: 'sparkles' },
  { slug: 'auto', name: 'Auto Services', icon: 'car' },
] as const;

export const CATEGORY_MAP: Record<ListingMainCategory, typeof EAT_SUBCATEGORIES | typeof GO_OUT_SUBCATEGORIES | typeof CONNECT_SUBCATEGORIES> = {
  [ListingMainCategory.EAT]: EAT_SUBCATEGORIES,
  [ListingMainCategory.GO_OUT]: GO_OUT_SUBCATEGORIES,
  [ListingMainCategory.CONNECT]: CONNECT_SUBCATEGORIES,
};

// ─── Chicago Metro Clusters ───────────────────────────────────────────────────

export const CHICAGO_METRO_CLUSTERS = [
  {
    slug: 'devon-ave',
    name: 'Devon Ave / West Ridge',
    center: { lat: 41.9985, lng: -87.7062 },
    radiusKm: 5,
  },
  {
    slug: 'bridgeview',
    name: 'Bridgeview / Southwest Suburbs',
    center: { lat: 41.7397, lng: -87.8059 },
    radiusKm: 15,
  },
  {
    slug: 'schaumburg',
    name: 'Schaumburg / Northwest Suburbs',
    center: { lat: 42.0334, lng: -88.0834 },
    radiusKm: 15,
  },
  {
    slug: 'skokie',
    name: 'Skokie / North Suburbs',
    center: { lat: 42.0333, lng: -87.7333 },
    radiusKm: 8,
  },
  {
    slug: 'lombard-dupage',
    name: 'Lombard / DuPage Corridor',
    center: { lat: 41.8803, lng: -88.0075 },
    radiusKm: 15,
  },
  {
    slug: 'naperville-aurora',
    name: 'Naperville / Aurora / Bolingbrook',
    center: { lat: 41.7850, lng: -88.1470 },
    radiusKm: 15,
  },
  {
    slug: 'south-side',
    name: 'South Side Chicago',
    center: { lat: 41.7770, lng: -87.6512 },
    radiusKm: 10,
  },
] as const;

// ─── Brand Copy — Forbidden Phrases ──────────────────────────────────────────
// Used in automated brand compliance tests and content moderation scanning.
// These phrases violate brand identity (docs/18-brand-identity.md).

export const FORBIDDEN_BRAND_PHRASES = [
  'islamic events',
  'muslim events',
  'halal restaurants',
  'muslim community',
  'the ummah',
  'islamic food',
  'muslim app',
  'halal app',
] as const;

// ─── Rate Limiting ────────────────────────────────────────────────────────────

export const RATE_LIMIT = {
  UNAUTHENTICATED_RPM: 30,
  AUTHENTICATED_RPM: 120,
  POST_CREATION_RPM: 5,
  MEDIA_UPLOAD_RPM: 10,
} as const;

// ─── Monetization ─────────────────────────────────────────────────────────────

export const PRICING = {
  FEATURED_FEED_WEEKLY: 75,
  FEATURED_EVENT_BOOST: 25,
  FOUNDING_MEMBER_ONE_TIME: 149,
  FOUNDING_MEMBER_TOTAL_SLOTS: 20,
} as const;
