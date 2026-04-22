// ─── Enums ────────────────────────────────────────────────────────────────────

export enum UserRole {
  USER = 'user',
  BUSINESS_OWNER = 'business_owner',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

export enum UserTrustTier {
  BLOCKED = -1,
  UNVERIFIED = 0,
  TRUSTED = 1,
  CONTRIBUTOR = 2,
  VERIFIED_BUSINESS = 3,
  VERIFIED_ORGANIZER = 4,
}

export enum ListingStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  REJECTED = 'rejected',
}

export enum EventStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum PostStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  HIDDEN = 'hidden',
  REMOVED = 'removed',
}

export enum ContentType {
  LISTING = 'listing',
  EVENT = 'event',
  POST = 'post',
}

export enum ListingMainCategory {
  EAT = 'eat',
  GO_OUT = 'go_out',
  CONNECT = 'connect',
}

export enum HalalCertification {
  IFANCA = 'ifanca',
  HCA = 'hca',
  ISWA = 'iswa',
  SELF_CERTIFIED = 'self_certified',
  NONE = 'none',
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
}

export enum NotificationChannel {
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum NotificationType {
  NEW_EVENT_NEARBY = 'new_event_nearby',
  LISTING_SPECIAL = 'listing_special',
  EVENT_REMINDER = 'event_reminder',
  POST_SAVE = 'post_save',
  JUMMAH_REMINDER = 'jummah_reminder',
  SYSTEM = 'system',
}

export enum ReportReason {
  SPAM = 'spam',
  INAPPROPRIATE = 'inappropriate',
  MISINFORMATION = 'misinformation',
  NOT_HALAL = 'not_halal',
  DUPLICATE = 'duplicate',
  OTHER = 'other',
}

// ─── Geo ──────────────────────────────────────────────────────────────────────

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoRadius {
  center: GeoPoint;
  radiusKm: number;
}

export interface BoundingBox {
  northEast: GeoPoint;
  southWest: GeoPoint;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface CursorPage<T> {
  data: T[];
  meta: {
    cursor: string | null;
    hasMore: boolean;
    total?: number;
  };
}

export interface CursorPageQuery {
  cursor?: string;
  limit?: number;
}

// ─── API Response Envelope ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

// RFC 9457 Problem Details
export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors?: FieldError[];
}

export interface FieldError {
  field: string;
  message: string;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  clerkUserId: string;
  phone: string;
  displayName: string | null;
  avatarUrl: string | null;
  trustTier: UserTrustTier;
  neighborhood: string | null;
  citySlug: string | null;
  isActive: boolean;
  createdAt: string;
}

// ─── City ─────────────────────────────────────────────────────────────────────

export interface City {
  id: string;
  slug: string;
  name: string;
  state: string;
  country: string;
  center: GeoPoint;
  isActive: boolean;
}

// ─── Listing ──────────────────────────────────────────────────────────────────

export interface ListingCategory {
  id: string;
  slug: string;
  name: string;
  mainCategory: ListingMainCategory;
  parentId: string | null;
  iconName: string;
  sortOrder: number;
}

export interface Listing {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  mainCategory: ListingMainCategory;
  categoryId: string;
  category: ListingCategory;
  cityId: string;
  address: string;
  neighborhood: string | null;
  location: GeoPoint;
  phone: string | null;
  website: string | null;
  instagramHandle: string | null;
  halalCertification: HalalCertification;
  certificationBody: string | null;
  isHalalVerified: boolean;
  hours: BusinessHours | null;
  status: ListingStatus;
  isClaimed: boolean;
  isFeatured: boolean;
  featuredUntil: string | null;
  trustScore: number;
  mediaUrls: string[];
  thumbnailUrl: string | null;
  savesCount: number;
  isSaved?: boolean;
  distanceKm?: number;
  currentSpecial?: DailySpecial | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessHours {
  monday: DayHours | null;
  tuesday: DayHours | null;
  wednesday: DayHours | null;
  thursday: DayHours | null;
  friday: DayHours | null;
  saturday: DayHours | null;
  sunday: DayHours | null;
}

export interface DayHours {
  open: string;   // HH:mm
  close: string;  // HH:mm
  closed?: boolean;
}

export interface DailySpecial {
  id: string;
  listingId: string;
  title: string;
  description: string | null;
  price: number | null;
  expiresAt: string;
  createdAt: string;
}

// ─── Event ────────────────────────────────────────────────────────────────────

export interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  category: ListingCategory;
  organizerId: string;
  organizerType: 'user' | 'listing';
  listingId: string | null;
  cityId: string;
  address: string;
  location: GeoPoint;
  startAt: string;
  endAt: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  isOnline: boolean;
  onlineUrl: string | null;
  isFree: boolean;
  ticketUrl: string | null;
  status: EventStatus;
  isFeatured: boolean;
  featuredUntil: string | null;
  mediaUrls: string[];
  thumbnailUrl: string | null;
  savesCount: number;
  isSaved?: boolean;
  distanceKm?: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Community Post ───────────────────────────────────────────────────────────

export interface CommunityPost {
  id: string;
  authorId: string;
  author: Pick<UserProfile, 'id' | 'displayName' | 'avatarUrl' | 'trustTier'>;
  body: string;
  mediaUrls: string[];
  linkedListingId: string | null;
  linkedListing?: Pick<Listing, 'id' | 'name' | 'thumbnailUrl'> | null;
  linkedEventId: string | null;
  cityId: string;
  location: GeoPoint | null;
  neighborhood: string | null;
  status: PostStatus;
  savesCount: number;
  isSaved?: boolean;
  expiresAt: string;
  createdAt: string;
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

export type FeedItem =
  | ({ itemType: ContentType.LISTING } & Listing)
  | ({ itemType: ContentType.EVENT } & Event)
  | ({ itemType: ContentType.POST } & CommunityPost);

export interface FeedQuery {
  lat: number;
  lng: number;
  radiusKm?: number;
  category?: ListingMainCategory;
  cursor?: string;
  limit?: number;
}

// ─── Map ──────────────────────────────────────────────────────────────────────

export interface MapPin {
  id: string;
  type: ContentType;
  location: GeoPoint;
  name: string;
  thumbnailUrl: string | null;
  mainCategory?: ListingMainCategory;
  isHalalVerified?: boolean;
  isFeatured: boolean;
}

// ─── Save ─────────────────────────────────────────────────────────────────────

export interface Save {
  id: string;
  userId: string;
  contentType: ContentType;
  contentId: string;
  createdAt: string;
}

// ─── Media Upload ─────────────────────────────────────────────────────────────

export interface PresignedUploadUrl {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresAt: string;
}

export interface MediaUploadRequest {
  contentType: string;
  contentLength: number;
  context: 'listing' | 'event' | 'post' | 'avatar';
}
