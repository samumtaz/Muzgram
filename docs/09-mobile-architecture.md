# Muzgram — React Native Expo App Architecture (MVP)

> Last updated: 2026-04-21
> Stack: Expo SDK 53 · Expo Router v3 · TanStack Query v5 · Zustand v5 · NativeWind v4 · New Architecture
> Monorepo location: `apps/mobile/`

---

## 1. Library Choices & Reasoning

### Core Runtime
| Library | Version | Why |
|---|---|---|
| **Expo SDK** | 53 | New Architecture (Fabric + TurboModules) enabled by default. Single config for iOS + Android. OTA updates. |
| **Expo Router** | v3 | File-based routing (App Router paradigm). Typed routes. Deep links auto-wired. No navigation boilerplate. |
| **React Native** | 0.77 | New Arch stable. Better JSI performance. No bridge overhead on hot paths. |
| **TypeScript** | 5.6 | Strict mode. Types shared from `packages/types` monorepo package. |

### Navigation
| Library | Why |
|---|---|
| **Expo Router v3** | File-based routing with typed routes, shared element transitions, deep links, and native stack. Replaces React Navigation boilerplate entirely. |

### Server State
| Library | Why |
|---|---|
| **TanStack Query v5** | Automatic caching, deduplication, background refetch, infinite queries for paginated feeds, optimistic mutations. The correct tool for API-driven data. |

### Client State
| Library | Why |
|---|---|
| **Zustand v5** | Minimal boilerplate. No provider. Supports immer middleware for immutable updates. DevTools via Reactotron. Persisted stores via MMKV. |

### Styling
| Library | Why |
|---|---|
| **NativeWind v4** | Tailwind CSS in React Native. CSS Variables for theming. No StyleSheet verbosity. Works with Expo Router. Dark mode at the config level. |

### Lists & Performance
| Library | Why |
|---|---|
| **@shopify/flash-list** | 10× faster than FlatList. Handles feed lists of 200+ items at 60fps. RecyclerListView under the hood. Required for Now Feed and Explore. |

### Images
| Library | Why |
|---|---|
| **expo-image** | Replaces `react-native-fast-image`. Built-in `blurhash` placeholder, progressive loading, disk caching, resize modes. Zero config. |

### Animations
| Library | Why |
|---|---|
| **react-native-reanimated** | v3. Runs on UI thread — no bridge overhead. `useSharedValue`, `withSpring`, `withTiming`. Used for card press, pin select, skeleton shimmer, tab transitions. |
| **react-native-gesture-handler** | v2. Required by Reanimated. Native gesture recognition. Used for swipe-to-dismiss, bottom sheet gestures. |

### Maps
| Library | Why |
|---|---|
| **@rnmapbox/maps** | Mapbox GL. Custom dark tile style matching our design system. Custom SVG markers. Clustering API. Camera control. |

### Bottom Sheet
| Library | Why |
|---|---|
| **@gorhom/bottom-sheet** | v5. Fully native-driven. 3-snap-point map sheet (35%/75%/95%). Compatible with Reanimated v3 and gesture handler v2. |

### Auth
| Library | Why |
|---|---|
| **@clerk/clerk-expo** | Official Clerk SDK for Expo. Handles phone OTP, session management, token refresh. SecureStore integration built-in. |

### Storage
| Library | Why |
|---|---|
| **react-native-mmkv** | 10× faster than AsyncStorage. Used for Zustand persist, feed cache snapshots, search history, saved pin IDs. |
| **expo-secure-store** | Clerk JWT storage. Encrypted on device. Never in MMKV or AsyncStorage. |

### Forms
| Library | Why |
|---|---|
| **react-hook-form** | v7. Minimal re-renders. Controller pattern for custom inputs. `useForm` + `handleSubmit` + `formState`. |
| **zod** | v3. Schema-first validation. Schemas defined once, shared with backend (via `packages/types`). `zodResolver` bridges to RHF. |

### Location
| Library | Why |
|---|---|
| **expo-location** | GPS with permission flow. `watchPositionAsync` for live tracking. `reverseGeocodeAsync` as fallback. |

### Notifications
| Library | Why |
|---|---|
| **expo-notifications** | Expo Push token management. Foreground notification handler. Deep link routing on notification tap. |

### Media
| Library | Why |
|---|---|
| **expo-image-picker** | Camera + gallery access. Client-side compression option. Returns `localUri`. |
| **expo-file-system** | Upload via presigned URL. `FileSystem.uploadAsync` with PUT method. Progress callback for upload bar. |

### Sharing
| Library | Why |
|---|---|
| **react-native-share** | WhatsApp deep link sharing. Native share sheet. |
| **expo-clipboard** | Copy deep link to clipboard. |

### Feedback & UX
| Library | Why |
|---|---|
| **expo-haptics** | Impact feedback on button press, save toggle. Selection feedback on chip tap. Notification feedback on success. |
| **expo-blur** | Glass morphism tab bar, map filter bar. `BlurView` with `tint: 'dark'`. |
| **expo-linear-gradient** | Card gradient overlays. |

### Error Tracking
| Library | Why |
|---|---|
| **@sentry/react-native** | Error boundaries, unhandled promise rejections, performance tracing. Expo-integrated sourcemaps. |

### Dev Tools
| Library | Why |
|---|---|
| **Reactotron** | Zustand DevTools, TanStack Query inspection, network request logging — in dev only. |
| **@testing-library/react-native** | Unit and integration tests for hooks and components. |

---

## 2. Folder Structure — `apps/mobile/`

```
apps/mobile/
│
├── app/                              # Expo Router route files (thin wrappers only — no logic)
│   ├── _layout.tsx                   # Root layout: fonts, providers, auth gate, Sentry
│   ├── +not-found.tsx                # 404 route
│   │
│   ├── (auth)/                       # Auth group — no tab bar
│   │   ├── _layout.tsx               # Stack navigator, slide-up transition
│   │   ├── index.tsx                 # → PhoneScreen
│   │   ├── otp.tsx                   # → OTPScreen
│   │   ├── location.tsx              # → LocationScreen
│   │   └── name.tsx                  # → NameScreen (optional, skippable)
│   │
│   ├── (tabs)/                       # Main tab navigator
│   │   ├── _layout.tsx               # Custom floating pill tab bar
│   │   ├── index.tsx                 # → NowFeedScreen
│   │   ├── map.tsx                   # → MapScreen
│   │   ├── explore.tsx               # → ExploreScreen
│   │   └── profile.tsx               # → ProfileScreen
│   │
│   ├── create/                       # Create flow (modal stack)
│   │   ├── _layout.tsx               # Modal presentation, slide-up
│   │   ├── index.tsx                 # → CreatePickerScreen (choose type)
│   │   ├── event.tsx                 # → CreateEventScreen
│   │   ├── business.tsx              # → CreateBusinessScreen
│   │   └── post.tsx                  # → CreatePostScreen
│   │
│   ├── business/
│   │   └── [id].tsx                  # → BusinessDetailScreen
│   │
│   ├── event/
│   │   └── [id].tsx                  # → EventDetailScreen
│   │
│   ├── post/
│   │   └── [id].tsx                  # → PostDetailScreen
│   │
│   ├── user/
│   │   └── [id].tsx                  # → PublicUserProfileScreen
│   │
│   ├── saved.tsx                     # → SavedScreen (from profile tab)
│   ├── notifications.tsx             # → NotificationsScreen
│   ├── search.tsx                    # → SearchScreen
│   │
│   └── settings/
│       ├── _layout.tsx
│       ├── index.tsx                 # → SettingsScreen
│       ├── profile.tsx               # → EditProfileScreen
│       ├── neighborhood.tsx          # → NeighborhoodPickerScreen
│       └── notifications.tsx         # → NotificationPrefsScreen
│
│
├── src/
│   │
│   ├── screens/                      # Screen components — imported by app/ routes
│   │   ├── auth/
│   │   │   ├── PhoneScreen.tsx
│   │   │   ├── OTPScreen.tsx
│   │   │   ├── LocationScreen.tsx
│   │   │   └── NameScreen.tsx
│   │   ├── feed/
│   │   │   └── NowFeedScreen.tsx
│   │   ├── map/
│   │   │   └── MapScreen.tsx
│   │   ├── explore/
│   │   │   └── ExploreScreen.tsx
│   │   ├── profile/
│   │   │   ├── ProfileScreen.tsx
│   │   │   ├── EditProfileScreen.tsx
│   │   │   ├── PublicUserProfileScreen.tsx
│   │   │   └── SavedScreen.tsx
│   │   ├── content/
│   │   │   ├── BusinessDetailScreen.tsx
│   │   │   ├── EventDetailScreen.tsx
│   │   │   └── PostDetailScreen.tsx
│   │   ├── create/
│   │   │   ├── CreatePickerScreen.tsx
│   │   │   ├── CreateEventScreen.tsx
│   │   │   ├── CreateBusinessScreen.tsx
│   │   │   └── CreatePostScreen.tsx
│   │   ├── search/
│   │   │   └── SearchScreen.tsx
│   │   ├── notifications/
│   │   │   └── NotificationsScreen.tsx
│   │   └── settings/
│   │       ├── SettingsScreen.tsx
│   │       ├── NeighborhoodPickerScreen.tsx
│   │       └── NotificationPrefsScreen.tsx
│   │
│   ├── components/
│   │   ├── ui/                       # Atoms — primitive building blocks
│   │   │   ├── Button.tsx
│   │   │   ├── IconButton.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Chip.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Tag.tsx
│   │   │   ├── Divider.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── Shimmer.tsx
│   │   │   ├── Toggle.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── layout/                   # Layout primitives
│   │   │   ├── Screen.tsx            # SafeAreaView + bg.primary, handles keyboard
│   │   │   ├── Row.tsx               # Flexbox row with gap prop
│   │   │   ├── Stack.tsx             # Flexbox column with gap prop
│   │   │   ├── Spacer.tsx            # Flex: 1 spacer
│   │   │   └── KeyboardAware.tsx     # KeyboardAvoidingView wrapper
│   │   │
│   │   ├── typography/
│   │   │   ├── Heading.tsx           # h1-h4 variants
│   │   │   ├── Body.tsx              # bodyLg, body, bodySm
│   │   │   ├── Caption.tsx           # label, caption
│   │   │   └── index.ts
│   │   │
│   │   ├── cards/                    # Feed card molecules
│   │   │   ├── FeaturedCard.tsx      # Full-width, 200px image, gradient overlay
│   │   │   ├── CompactCard.tsx       # 80×80 thumbnail + content
│   │   │   ├── EventCard.tsx         # Event variant with date chip
│   │   │   ├── PostCard.tsx          # Text + optional image, author row
│   │   │   ├── ServiceCard.tsx       # Service provider with languages + response time
│   │   │   ├── SpecialCard.tsx       # Daily special "SPECIAL TODAY" banner
│   │   │   ├── CardSkeleton.tsx      # Shimmer skeleton per card type
│   │   │   └── index.ts
│   │   │
│   │   ├── navigation/
│   │   │   ├── TabBar.tsx            # Custom floating pill tab bar
│   │   │   ├── Header.tsx            # Transparent header with location + actions
│   │   │   ├── BackButton.tsx        # Glass pill back button (over images)
│   │   │   └── FloatingActionButton.tsx  # + create button
│   │   │
│   │   ├── map/
│   │   │   ├── BusinessPin.tsx       # Teardrop SVG pin (food/services)
│   │   │   ├── EventPin.tsx          # Teardrop SVG pin (events)
│   │   │   ├── ClusterPin.tsx        # Circle with count
│   │   │   ├── UserLocationDot.tsx   # Pulsing blue dot
│   │   │   ├── MapFilterBar.tsx      # Glass pill category chips over map
│   │   │   ├── RecenterButton.tsx    # Gold FAB bottom right
│   │   │   └── MapBottomSheet.tsx    # @gorhom/bottom-sheet wrapper (35/75/95%)
│   │   │
│   │   ├── feed/
│   │   │   ├── LiveNowStrip.tsx      # Horizontal scroll live events + open restaurants
│   │   │   ├── CategoryChips.tsx     # Horizontal filter chips
│   │   │   ├── FeedList.tsx          # FlashList wrapper with pull-to-refresh
│   │   │   ├── FeedHeader.tsx        # Location row + notification bell + search
│   │   │   ├── FeaturedInjector.tsx  # Injects featured cards at positions 0 and 1
│   │   │   └── EmptyFeed.tsx         # Empty state with seed card prompts
│   │   │
│   │   ├── business/
│   │   │   ├── HalalBadge.tsx        # Shield icon + certification label + color
│   │   │   ├── OpenStatusPill.tsx    # "Open until 10PM" / "Closed" / "Closes in 47m"
│   │   │   ├── BusinessHours.tsx     # 7-day hours grid
│   │   │   ├── ContactRow.tsx        # [Call] [Directions] [WhatsApp] action row
│   │   │   ├── ClaimBanner.tsx       # "Is this your business? Claim it free"
│   │   │   └── DailySpecialBanner.tsx # "SPECIAL TODAY" overlay banner
│   │   │
│   │   ├── forms/
│   │   │   ├── TextField.tsx         # RHF-controlled text input
│   │   │   ├── TextArea.tsx          # Multiline with char count
│   │   │   ├── SelectField.tsx       # Native picker / bottom sheet picker
│   │   │   ├── DateTimeField.tsx     # Date + time picker
│   │   │   ├── HoursEditor.tsx       # 7-day schedule editor (day toggle + time pickers)
│   │   │   ├── LocationField.tsx     # Address input + map preview
│   │   │   ├── ImageUploadPicker.tsx # Multi-image selector with upload progress
│   │   │   └── FormError.tsx         # Field error display
│   │   │
│   │   ├── feedback/
│   │   │   ├── ErrorBoundary.tsx     # React error boundary with Sentry capture
│   │   │   ├── ErrorState.tsx        # Full-screen error with retry
│   │   │   ├── InlineError.tsx       # Small error within a section
│   │   │   ├── SkeletonFeed.tsx      # 5x CardSkeleton for feed loading
│   │   │   ├── SkeletonDetail.tsx    # Hero + details skeleton
│   │   │   ├── EmptyState.tsx        # Illustration + message + CTA
│   │   │   ├── OfflineBanner.tsx     # "You're offline — showing cached content"
│   │   │   └── ToastManager.tsx      # In-app foreground toast (not system notif)
│   │   │
│   │   └── modals/
│   │       ├── ShareModal.tsx        # WhatsApp + copy link + native share
│   │       ├── ReportModal.tsx       # Report content bottom sheet
│   │       ├── ConfirmModal.tsx      # Destructive action confirmation
│   │       └── NeighborhoodSheet.tsx # Pick neighborhood from bottom sheet
│   │
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── auth/
│   │   │   ├── useAuth.ts            # Clerk session, user data, role helpers
│   │   │   └── useOnboarding.ts      # Onboarding step state + navigation
│   │   │
│   │   ├── location/
│   │   │   ├── useLocation.ts        # GPS permission, watch position, last known
│   │   │   └── useNeighborhood.ts    # Resolved neighborhood from GPS or manual
│   │   │
│   │   ├── feed/
│   │   │   ├── useNowFeed.ts         # Infinite TanStack Query for Now Feed
│   │   │   ├── useExploreFeed.ts     # Infinite TanStack Query for Explore
│   │   │   └── useLiveStrip.ts       # Live Now strip data (polling every 60s)
│   │   │
│   │   ├── content/
│   │   │   ├── useBusiness.ts        # GET /v1/businesses/:id with ETag
│   │   │   ├── useEvent.ts           # GET /v1/events/:id
│   │   │   ├── usePost.ts            # GET /v1/posts/:id
│   │   │   ├── useToggleSave.ts      # Optimistic save/unsave mutation
│   │   │   ├── useSavesCheck.ts      # Batch save-state check for feed pages
│   │   │   └── useContactTap.ts      # Logs contact tap + opens phone/WhatsApp
│   │   │
│   │   ├── map/
│   │   │   ├── useMapPins.ts         # GET /v1/map/pins on viewport change
│   │   │   ├── useMapCamera.ts       # Camera state, re-center logic
│   │   │   └── usePinPreview.ts      # Fetch lightweight pin preview on tap
│   │   │
│   │   ├── create/
│   │   │   ├── useCreateEvent.ts     # Mutation + optimistic + invalidation
│   │   │   ├── useCreateBusiness.ts
│   │   │   └── useCreatePost.ts
│   │   │
│   │   ├── media/
│   │   │   ├── useImagePicker.ts     # expo-image-picker with compression
│   │   │   └── useUpload.ts          # Presign → upload → confirm flow
│   │   │
│   │   ├── notifications/
│   │   │   └── useNotifications.ts   # Token registration, foreground handler, deep link
│   │   │
│   │   └── shared/
│   │       ├── useDebounce.ts        # Debounced value (search, map viewport)
│   │       ├── useScrollHeader.ts    # Header opacity on scroll position
│   │       ├── useHaptics.ts         # Typed haptic feedback shortcuts
│   │       ├── useDeepLink.ts        # muzgram:// URL handling
│   │       ├── useNetworkStatus.ts   # Online/offline detection
│   │       ├── useAppState.ts        # App foreground/background detection
│   │       └── useAnalytics.ts       # Analytics event batch queueing
│   │
│   │
│   ├── api/                          # API layer
│   │   ├── client.ts                 # Base fetch with auth header + retry
│   │   ├── queryClient.ts            # TanStack QueryClient config
│   │   ├── queryKeys.ts              # Key factory (type-safe, hierarchical)
│   │   └── endpoints/               # Raw API call functions (not hooks)
│   │       ├── auth.ts
│   │       ├── feed.ts
│   │       ├── businesses.ts
│   │       ├── events.ts
│   │       ├── posts.ts
│   │       ├── map.ts
│   │       ├── saves.ts
│   │       ├── leads.ts
│   │       ├── media.ts
│   │       ├── notifications.ts
│   │       ├── search.ts
│   │       ├── geo.ts
│   │       ├── reports.ts
│   │       └── analytics.ts
│   │
│   │
│   ├── store/                        # Zustand stores
│   │   ├── authStore.ts
│   │   ├── locationStore.ts
│   │   ├── feedStore.ts
│   │   ├── mapStore.ts
│   │   ├── notifStore.ts
│   │   ├── analyticsStore.ts         # Event batch queue before flush
│   │   └── index.ts                  # Re-exports all stores
│   │
│   │
│   ├── lib/                          # Pure utilities (no React deps)
│   │   ├── formatters.ts             # Distance, time, money, phone display
│   │   ├── halalBadge.ts             # halal_status → { label, color, icon }
│   │   ├── openStatus.ts             # operating_hours + timezone → isOpenNow, label
│   │   ├── feedScore.ts              # Recency + proximity score (matches server)
│   │   ├── deepLinks.ts              # muzgram://business/id URL constructors
│   │   ├── countdownLabel.ts         # starts_at → "Tonight!", "In 3 days", "Past"
│   │   ├── avatarColor.ts            # user_id hash → deterministic color
│   │   ├── validators.ts             # Shared Zod schemas (phone, address, coords)
│   │   └── analytics.ts             # Event name constants + property builders
│   │
│   │
│   ├── constants/
│   │   ├── theme.ts                  # Re-export from packages/constants
│   │   ├── categories.ts             # Category → { label, color, icon }
│   │   ├── queryKeys.ts              # TanStack Query key factory
│   │   ├── routes.ts                 # Typed Expo Router paths
│   │   └── chicago.ts                # Neighborhoods, bounds, default center
│   │
│   │
│   └── types/
│       ├── api.ts                    # Response types (extends packages/types)
│       ├── navigation.ts             # Expo Router typed params
│       ├── feed.ts                   # FeedItem discriminated union
│       └── index.ts
│
│
├── assets/
│   ├── fonts/                        # (unused — all via @expo-google-fonts)
│   ├── images/
│   │   ├── logo.png
│   │   ├── logo-dark.png
│   │   └── onboarding-map.png        # Onboarding location screen illustration
│   └── animations/
│       └── (Lottie files — none in MVP, placeholder)
│
├── app.json
├── babel.config.js
├── metro.config.js
├── tailwind.config.js                # NativeWind v4 config
├── tsconfig.json
└── package.json
```

---

## 3. Navigation Architecture — Expo Router v3

### Why Expo Router v3 over React Navigation directly

- File-based routing: the route IS the file — no separate navigator config files
- Deep links are automatically handled — `muzgram://event/abc123` routes to `app/event/[id].tsx`
- Typed routes (`href: '/business/550e8400'`) — TypeScript catches broken links at compile time
- Shared element transitions are first-class (MMP ready)
- Stack/Tab/Modal layouts are configured in `_layout.tsx` collocated with routes

### Full Navigation Tree

```
Root _layout.tsx
│   Providers: Clerk, QueryClient, Sentry, SafeArea, Toast
│   Auth gate: if !session → redirect (auth), else → redirect (tabs)
│
├── (auth)/
│   Stack: slide-up, no header
│   ├── index      [phone]        → enter phone number
│   ├── otp        [otp]          → 6-digit OTP entry
│   ├── location   [location]     → GPS prompt or neighborhood picker
│   └── name       [name]         → optional first name (skip button)
│
├── (tabs)/
│   Custom TabBar (TabBar.tsx — floating pill, glass blur)
│   Tabs: Feed | Map | Explore | Profile
│   [+] FAB center: navigates to /create (modal, not a tab)
│   │
│   ├── index      [Now Feed]     → NowFeedScreen
│   │     Stack: transparent header, fade in
│   │
│   ├── map        [Map]          → MapScreen
│   │     No header. Full-screen Mapbox.
│   │
│   ├── explore    [Explore]      → ExploreScreen
│   │     Stack: transparent header
│   │
│   └── profile    [Profile]      → ProfileScreen
│         Stack: standard header
│
├── create/             (modal stack — presented over tabs)
│   ├── index           → CreatePickerScreen (choose: Event / Business / Post)
│   ├── event           → CreateEventScreen
│   ├── business        → CreateBusinessScreen
│   └── post            → CreatePostScreen
│
├── business/[id]       → BusinessDetailScreen (native push from any tab)
├── event/[id]          → EventDetailScreen
├── post/[id]           → PostDetailScreen
├── user/[id]           → PublicUserProfileScreen
├── saved               → SavedScreen
├── search              → SearchScreen
├── notifications       → NotificationsScreen
│
└── settings/
    ├── index           → SettingsScreen
    ├── profile         → EditProfileScreen
    ├── neighborhood    → NeighborhoodPickerScreen
    └── notifications   → NotificationPrefsScreen
```

### Route file pattern — thin wrapper

```typescript
// app/business/[id].tsx — this is ALL that goes in a route file
import { useLocalSearchParams } from 'expo-router';
import { BusinessDetailScreen } from '@/screens/content/BusinessDetailScreen';

export default function BusinessDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BusinessDetailScreen businessId={id} />;
}
```

All logic, hooks, and UI live in `src/screens/`. Route files are navigation addresses only.

### Deep Link Routing

```typescript
// app.json
{
  "expo": {
    "scheme": "muzgram",
    "intentFilters": [
      {
        "action": "VIEW",
        "data": [{ "scheme": "muzgram" }]
      }
    ]
  }
}
```

Expo Router auto-maps:
- `muzgram://business/550e8400` → `app/business/[id].tsx`
- `muzgram://event/abc123` → `app/event/[id].tsx`
- `muzgram://leads` → `app/(tabs)/profile.tsx` with leads param

---

## 4. Screen Inventory

| Screen | Route | Data Source | Auth |
|---|---|---|---|
| Phone Entry | `(auth)/` | Clerk SDK | No |
| OTP Verification | `(auth)/otp` | Clerk SDK | No |
| Location Setup | `(auth)/location` | `GET /v1/geo/reverse` + neighborhoods | No |
| Name Setup | `(auth)/name` | `PATCH /v1/onboarding/profile` | Yes |
| Now Feed | `(tabs)/` | `GET /v1/feed/now` (infinite) | Yes |
| Map | `(tabs)/map` | `GET /v1/map/pins` | No (public pins) |
| Explore | `(tabs)/explore` | `GET /v1/feed/explore` (infinite) | No |
| Profile | `(tabs)/profile` | `GET /v1/users/me` | Yes |
| Create Picker | `create/` | — | Yes |
| Create Event | `create/event` | `POST /v1/events` | Yes |
| Create Business | `create/business` | `POST /v1/businesses` | Yes |
| Create Post | `create/post` | `POST /v1/posts` | Yes |
| Business Detail | `business/[id]` | `GET /v1/businesses/:id` + ETag | No |
| Event Detail | `event/[id]` | `GET /v1/events/:id` | No |
| Post Detail | `post/[id]` | `GET /v1/posts/:id` | No |
| Public User Profile | `user/[id]` | `GET /v1/users/:id` | Yes |
| Saved Items | `saved` | `GET /v1/saves` (infinite) | Yes |
| Search | `search` | `GET /v1/search` | Yes |
| Notifications | `notifications` | `GET /v1/notifications` (infinite) | Yes |
| Settings | `settings/` | `GET /v1/users/me` | Yes |
| Edit Profile | `settings/profile` | `PATCH /v1/users/me` | Yes |
| Neighborhood Picker | `settings/neighborhood` | `GET /v1/geo/neighborhoods` | Yes |
| Notification Prefs | `settings/notifications` | `PATCH /v1/notifications/preferences` | Yes |

---

## 5. Shared Component Architecture

### Atomic Design Hierarchy

```
Atoms         → ui/ + layout/ + typography/
Molecules     → cards/ + business/ + map pins + form fields
Organisms     → feed/, navigation/, modals/, feedback/
Screens       → screens/ (assembled from organisms + molecules)
```

### Critical Component Specifications

#### `<FeedList />` — the most-used component
```typescript
interface FeedListProps {
  data: FeedItem[];
  onEndReached: () => void;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  ListHeaderComponent?: React.ReactElement;
  estimatedItemSize?: number;  // FlashList performance hint
}
```
Uses `FlashList` internally. `estimatedItemSize={220}` for compact cards, `{280}` for featured.  Never uses `FlatList`.

#### `<FeaturedCard />` — hero card at feed top
```typescript
interface FeaturedCardProps {
  item: BusinessFeedItem | EventFeedItem;
  onPress: () => void;
  onSave: () => void;
  isSaved: boolean;
  testID?: string;
}
```
- Full-width, 200px image, `expo-image` with `blurhash` placeholder
- Gradient overlay via `expo-linear-gradient`
- Category chip top-left, featured gold badge top-right
- Save button with optimistic toggle animation (Reanimated spring)

#### `<HalalBadge />` — certification display
```typescript
type HalalStatus = 'ifanca_certified' | 'isna_certified' | 'zabiha_certified' |
                   'self_declared' | 'muslim_owned' | 'unknown';

interface HalalBadgeProps {
  status: HalalStatus;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}
```
Config-driven — badge appearance pulled from `src/lib/halalBadge.ts`:
```typescript
const HALAL_BADGE_CONFIG: Record<HalalStatus, BadgeConfig> = {
  ifanca_certified: { label: 'IFANCA Certified', color: colors.accent.emerald, icon: 'ShieldCheck', trust: 4 },
  isna_certified:   { label: 'ISNA Certified',   color: colors.accent.emerald, icon: 'ShieldCheck', trust: 3 },
  zabiha_certified: { label: 'Zabiha Certified', color: colors.accent.emerald, icon: 'ShieldCheck', trust: 3 },
  self_declared:    { label: 'Self-Declared',    color: colors.accent.gold,    icon: 'Shield',      trust: 2 },
  muslim_owned:     { label: 'Muslim Owned',     color: colors.accent.sky,     icon: 'Star',        trust: 1 },
  unknown:          { label: 'Status Unknown',   color: colors.text.muted,     icon: 'ShieldOff',   trust: 0 },
};
```

#### `<TabBar />` — custom floating pill tab bar
```typescript
// Rendered by Expo Router's tabBar prop in (tabs)/_layout.tsx
// Not a standard bottom tab bar — floating, glass, pill-shaped
```
- `BlurView` background with `tint: 'dark'` and `intensity: 80`
- `Animated.View` with spring on active indicator
- FAB center (+) button navigates to `/create` as modal
- `expo-haptics` `ImpactFeedbackStyle.Light` on every tap

#### `<Skeleton />` and `<Shimmer />`
```typescript
// Shimmer is a base component — Skeleton uses it
// Shimmer: Reanimated sharedValue drives translateX on a gradient overlay
// Never show spinners — always skeletons. Rule from design system.
```

#### `<ErrorBoundary />` — catches render errors
```typescript
// Wraps each screen section independently
// On error: Sentry.captureException, show <ErrorState /> with retry
// Does NOT catch async errors — those are handled by TanStack Query
```

---

## 6. State Management — Zustand v5

**Rule:** Zustand stores hold client-side state only. Server data lives in TanStack Query cache. No duplication between the two.

### `authStore.ts`
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { MMKVStorage } from '@/lib/mmkvStorage';

interface AuthUser {
  id: string;
  clerkUserId: string;
  phone: string;
  role: 'user' | 'business_owner' | 'moderator' | 'admin' | 'super_admin';
  status: 'active' | 'suspended' | 'banned';
  displayName: string | null;
  avatarUrl: string | null;
  avatarInitials: string;
  avatarColor: string;
  neighborhoodId: string | null;
  cityId: string | null;
  onboardingCompleted: boolean;
  autoApproveEvents: boolean;
  autoApprovePosts: boolean;
  unreadNotificationCount: number;
}

interface AuthStore {
  user: AuthUser | null;
  isAdmin: () => boolean;
  isBusinessOwner: () => boolean;
  setUser: (user: AuthUser) => void;
  updateUser: (partial: Partial<AuthUser>) => void;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    immer((set, get) => ({
      user: null,
      isAdmin: () => ['admin', 'super_admin', 'moderator'].includes(get().user?.role ?? ''),
      isBusinessOwner: () => get().user?.role === 'business_owner',
      setUser: (user) => set((state) => { state.user = user; }),
      updateUser: (partial) => set((state) => {
        if (state.user) Object.assign(state.user, partial);
      }),
      setUnreadCount: (count) => set((state) => {
        if (state.user) state.user.unreadNotificationCount = count;
      }),
      incrementUnreadCount: () => set((state) => {
        if (state.user) state.user.unreadNotificationCount += 1;
      }),
      clearAuth: () => set((state) => { state.user = null; }),
    })),
    { name: 'auth', storage: createJSONStorage(() => MMKVStorage) }
  )
);
```

### `locationStore.ts`
```typescript
interface LocationStore {
  // Current GPS position (may differ from home neighborhood)
  currentLat: number | null;
  currentLng: number | null;
  locationPermission: 'granted' | 'denied' | 'undetermined';
  isUsingLastKnown: boolean;

  // Resolved neighborhood (from GPS or manual selection)
  viewingNeighborhoodId: string | null;
  viewingCityId: string;

  setCurrentPosition: (lat: number, lng: number) => void;
  setLocationPermission: (status: 'granted' | 'denied' | 'undetermined') => void;
  setViewingNeighborhood: (neighborhoodId: string | null, cityId: string) => void;
  setUsingLastKnown: (value: boolean) => void;
}

// Persisted via MMKV — last known location survives app restart
// Default city: 'chicago', default center: Devon Ave
```

### `feedStore.ts`
```typescript
interface FeedStore {
  activeCategory: 'all' | 'food' | 'events' | 'services' | 'community';
  setActiveCategory: (cat: FeedStore['activeCategory']) => void;

  // Tracks which feed item IDs we've already logged as "viewed" to analytics
  viewedItemIds: Set<string>;
  markViewed: (id: string) => void;
  clearViewed: () => void;
}
// NOT persisted — feed is always fresh from server
```

### `mapStore.ts`
```typescript
interface MapCamera {
  lat: number;
  lng: number;
  zoom: number;
}

interface MapStore {
  camera: MapCamera;
  activeCategory: 'all' | 'food' | 'events' | 'services' | 'community';
  selectedPinId: string | null;
  selectedPinType: 'business' | 'event' | null;
  bottomSheetSnap: 0 | 1 | 2;  // 35% | 75% | 95%

  setCamera: (camera: Partial<MapCamera>) => void;
  setActiveCategory: (cat: MapStore['activeCategory']) => void;
  selectPin: (id: string, type: 'business' | 'event') => void;
  clearSelection: () => void;
  setBottomSheetSnap: (snap: 0 | 1 | 2) => void;
}
```

### `notifStore.ts`
```typescript
interface NotifStore {
  expoPushToken: string | null;
  deviceId: string | null;
  setToken: (token: string, deviceId: string) => void;
  clearToken: () => void;
}
// expoPushToken persisted via MMKV
// Re-registered on every app open (Expo token can change)
```

### `analyticsStore.ts`
```typescript
interface AnalyticsEvent {
  eventName: string;
  properties: Record<string, unknown>;
  occurredAt: string;
  sessionId: string;
}

interface AnalyticsStore {
  sessionId: string;
  queue: AnalyticsEvent[];
  enqueue: (event: Omit<AnalyticsEvent, 'sessionId' | 'occurredAt'>) => void;
  flush: () => AnalyticsEvent[];  // Returns queue and clears it
}
// Flushed every 30s via useAnalytics hook + on app background
// No persistence — lost events on crash are acceptable
```

---

## 7. API Layer — TanStack Query v5

### `api/client.ts` — authenticated fetch
```typescript
import { getToken } from '@clerk/clerk-expo';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL + '/v1';

async function apiFetch<T>(
  path: string,
  options: RequestInit & { idempotencyKey?: string } = {}
): Promise<T> {
  const token = await getToken();
  const { idempotencyKey, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-App-Version': APP_VERSION,
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(idempotencyKey && { 'X-Idempotency-Key': idempotencyKey }),
    ...(fetchOptions.headers as Record<string, string>),
  };

  const response = await fetch(`${BASE_URL}${path}`, { ...fetchOptions, headers });

  if (!response.ok) {
    const problem = await response.json();  // RFC 9457 Problem Details
    throw new ApiError(problem);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export class ApiError extends Error {
  type: string;
  status: number;
  detail: string;
  correlationId: string;
  fieldErrors?: Array<{ field: string; code: string; message: string }>;

  constructor(problem: ProblemDetails) {
    super(problem.title);
    this.type = problem.type;
    this.status = problem.status;
    this.detail = problem.detail;
    this.correlationId = problem.correlationId;
    this.fieldErrors = problem.errors;
  }
}
```

### `api/queryKeys.ts` — hierarchical key factory
```typescript
export const queryKeys = {
  feed: {
    all: ['feed'] as const,
    now: (params: FeedNowParams) => ['feed', 'now', params] as const,
    explore: (params: ExploreParams) => ['feed', 'explore', params] as const,
    live: (params: LiveParams) => ['feed', 'live', params] as const,
  },
  businesses: {
    all: ['businesses'] as const,
    detail: (id: string) => ['businesses', id] as const,
    stats: (id: string) => ['businesses', id, 'stats'] as const,
    dailySpecials: (id: string) => ['businesses', id, 'daily-specials'] as const,
  },
  events: {
    all: ['events'] as const,
    detail: (id: string) => ['events', id] as const,
  },
  posts: {
    all: ['posts'] as const,
    detail: (id: string) => ['posts', id] as const,
  },
  map: {
    pins: (bounds: BoundsParams) => ['map', 'pins', bounds] as const,
    preview: (type: string, id: string) => ['map', 'preview', type, id] as const,
  },
  saves: {
    list: (type?: string) => ['saves', type ?? 'all'] as const,
    check: (items: SaveCheckItem[]) => ['saves', 'check', items] as const,
  },
  restaurants: {
    list: (params: RestaurantParams) => ['restaurants', params] as const,
    openNow: (params: OpenNowParams) => ['restaurants', 'open-now', params] as const,
  },
  services: {
    list: (params: ServiceParams) => ['services', params] as const,
    detail: (id: string) => ['services', id] as const,
  },
  geo: {
    neighborhoods: (cityId: string) => ['geo', 'neighborhoods', cityId] as const,
    reverse: (lat: number, lng: number) => ['geo', 'reverse', lat, lng] as const,
  },
  notifications: {
    list: () => ['notifications'] as const,
    preferences: () => ['notifications', 'preferences'] as const,
  },
  users: {
    me: () => ['users', 'me'] as const,
    public: (id: string) => ['users', id] as const,
    content: (type?: string) => ['users', 'me', 'content', type ?? 'all'] as const,
  },
  search: {
    results: (params: SearchParams) => ['search', params] as const,
  },
  leads: {
    inbox: (businessId?: string) => ['leads', 'inbox', businessId] as const,
  },
} as const;
```

### `api/queryClient.ts` — global client configuration
```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,           // 1 minute — data is fresh for 1 min
      gcTime: 5 * 60_000,          // 5 minutes — keep in cache 5 min after unmount
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,  // Mobile apps don't have "windows"
      refetchOnReconnect: true,     // Refetch when coming back online
    },
    mutations: {
      retry: false,
      onError: (error) => {
        if (error instanceof ApiError && error.status === 401) {
          // Token expired — trigger Clerk re-auth
          useAuthStore.getState().clearAuth();
        }
      },
    },
  },
});
```

### Hook pattern — infinite query
```typescript
// hooks/feed/useNowFeed.ts
export function useNowFeed(params: FeedNowParams) {
  return useInfiniteQuery({
    queryKey: queryKeys.feed.now(params),
    queryFn: ({ pageParam }) => feedApi.getNowFeed({ ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasMore ? lastPage.meta.cursor : undefined,
    enabled: !!params.lat && !!params.lng && !!params.cityId,
    staleTime: 60_000,
  });
}
```

### Hook pattern — optimistic mutation (save toggle)
```typescript
// hooks/content/useToggleSave.ts
export function useToggleSave() {
  const queryClient = useQueryClient();
  const { trigger: haptic } = useHaptics();

  return useMutation({
    mutationFn: ({ targetType, targetId, isSaved }: ToggleSaveArgs) =>
      isSaved
        ? savesApi.unsave(targetType, targetId)
        : savesApi.save({ target_type: targetType, target_id: targetId }),

    onMutate: async ({ targetType, targetId, isSaved }) => {
      haptic('selection');

      // Cancel any outgoing refetches for this item
      await queryClient.cancelQueries({ queryKey: queryKeys.saves.check([{ targetType, targetId }]) });

      // Snapshot previous value
      const previous = queryClient.getQueryData(queryKeys.saves.check([{ targetType, targetId }]));

      // Optimistically toggle
      queryClient.setQueryData(
        queryKeys.saves.check([{ targetType, targetId }]),
        (old: SaveCheckResponse) => ({
          ...old,
          data: old.data.map((item) =>
            item.target_id === targetId ? { ...item, is_saved: !isSaved } : item
          ),
        })
      );

      return { previous };
    },

    onError: (_, __, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.saves.check([{ targetType: '', targetId: '' }]), context.previous);
      }
    },

    onSettled: () => {
      // Invalidate the full saves list
      queryClient.invalidateQueries({ queryKey: queryKeys.saves.list() });
    },
  });
}
```

### Query invalidation strategy
```typescript
// After content creation — invalidate feed and relevant lists
queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
queryClient.invalidateQueries({ queryKey: queryKeys.events.all });

// After profile update — invalidate user data only
queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });

// After admin approval — content appears in feed
queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
queryClient.invalidateQueries({ queryKey: queryKeys.businesses.all });
```

---

## 8. Styling System — NativeWind v4

### Why NativeWind v4 over StyleSheet

- Tailwind class names are shorter to read and write than `StyleSheet.create` objects
- CSS variables for theming — one dark mode config, no conditional checks throughout components
- Consistent spacing and sizing from the design system
- Co-located with JSX — no jumping between component and styles file
- Auto-complete in VS Code with Tailwind CSS IntelliSense

### `tailwind.config.js`
```javascript
module.exports = {
  content: ['./app/**/*.{js,tsx}', './src/**/*.{js,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: {
          primary:   '#080C14',
          secondary: '#0F1520',
          card:      '#141C2A',
          elevated:  '#1A2332',
          overlay:   '#1E2A3D',
        },
        accent: {
          gold:    '#F59E0B',
          emerald: '#10B981',
          indigo:  '#6366F1',
          rose:    '#F43F5E',
          sky:     '#38BDF8',
        },
        text: {
          primary:   '#F1F5F9',
          secondary: '#94A3B8',
          muted:     '#475569',
          inverse:   '#080C14',
        },
        category: {
          food:      '#10B981',
          events:    '#6366F1',
          services:  '#F59E0B',
          community: '#F43F5E',
          mosque:    '#8B5CF6',
        },
      },
      borderRadius: {
        sm: '8px', md: '14px', lg: '20px', xl: '28px', '2xl': '36px',
      },
      fontFamily: {
        display: ['PlusJakartaSans_700Bold', 'PlusJakartaSans_800ExtraBold'],
        body:    ['Inter_400Regular', 'Inter_500Medium', 'Inter_600SemiBold'],
      },
    },
  },
  plugins: [],
};
```

### Usage patterns
```tsx
// Button component — NativeWind v4
export function Button({ label, onPress, variant = 'primary' }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'h-[52px] rounded-full items-center justify-center px-6',
        variant === 'primary' && 'bg-accent-gold active:opacity-90',
        variant === 'secondary' && 'bg-bg-elevated border border-border-default',
        variant === 'destructive' && 'bg-red-500',
      )}
    >
      <Text className={cn(
        'font-body font-semibold text-base',
        variant === 'primary' && 'text-text-inverse',
        variant !== 'primary' && 'text-text-primary',
      )}>
        {label}
      </Text>
    </Pressable>
  );
}
```

### `cn()` utility (clsx + tailwind-merge)
```typescript
// src/lib/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

### Typography components — prevent raw Text usage
```tsx
// All text in the app goes through these components.
// Direct <Text> usage is banned (ESLint rule).

<Heading level="h2">Sabri Nihari</Heading>
<Body size="sm" color="secondary">2501 W Devon Ave</Body>
<Caption>ISNA Certified</Caption>
```

### Reanimated integration with NativeWind
```tsx
import Animated from 'react-native-reanimated';
// Animated.View accepts className via NativeWind's AnimatedView wrapper
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
```

---

## 9. Form Validation — React Hook Form v7 + Zod v3

### Shared Zod schemas — defined once, used everywhere
```typescript
// src/lib/validators.ts
import { z } from 'zod';

export const phoneSchema = z
  .string()
  .regex(/^\+1[2-9]\d{9}$/, 'Enter a valid US phone number');

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const createEventSchema = z.object({
  title: z.string().min(3, 'Title too short').max(120, 'Max 120 characters'),
  category: z.enum(['community', 'religious', 'educational', 'fundraiser', 'family',
                    'youth', 'women', 'sports', 'cultural', 'business_networking',
                    'ramadan', 'eid', 'other']),
  starts_at: z.date().min(new Date(), 'Date must be in the future'),
  ends_at: z.date().optional(),
  address: z.string().min(5).max(300),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  city_id: z.string(),
  neighborhood_id: z.string(),
  is_free: z.boolean(),
  price_label: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
  external_link: z.string().url('Must be a valid URL').optional().or(z.literal('')),
}).refine(
  (data) => data.is_free || !!data.price_label,
  { message: 'Price label required for paid events', path: ['price_label'] }
).refine(
  (data) => !data.ends_at || data.ends_at > data.starts_at,
  { message: 'End time must be after start time', path: ['ends_at'] }
);

export const createPostSchema = z.object({
  body: z.string().min(1, 'Post cannot be empty').max(500, 'Max 500 characters'),
  category: z.enum(['community', 'food_tip', 'notice', 'question', 'recommend']),
  neighborhood_id: z.string(),
  city_id: z.string(),
});
```

### Form pattern in screen
```tsx
// screens/create/CreateEventScreen.tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEventSchema } from '@/lib/validators';

type CreateEventForm = z.infer<typeof createEventSchema>;

export function CreateEventScreen() {
  const { mutate, isPending } = useCreateEvent();

  const { control, handleSubmit, formState: { errors } } = useForm<CreateEventForm>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      category: 'community',
      is_free: true,
    },
  });

  const onSubmit = (data: CreateEventForm) => {
    mutate(data, {
      onSuccess: () => router.back(),
      onError: (error) => {
        if (error instanceof ApiError && error.fieldErrors) {
          // Map server field errors back to form
          error.fieldErrors.forEach(({ field, message }) =>
            setError(field as keyof CreateEventForm, { message })
          );
        }
      },
    });
  };

  return (
    <Screen>
      <KeyboardAware>
        <Controller
          control={control}
          name="title"
          render={({ field }) => (
            <TextField
              label="Event Title"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.title?.message}
              maxLength={120}
              showCharCount
            />
          )}
        />
        {/* ...other fields */}
        <Button
          label={isPending ? 'Submitting...' : 'Submit for Review'}
          onPress={handleSubmit(onSubmit)}
          disabled={isPending}
        />
      </KeyboardAware>
    </Screen>
  );
}
```

### Server error → form error bridging
API returns RFC 9457 `errors[]` array. On mutation error, map field errors back to RHF via `setError`. This makes server-side validation (duplicate check, outside coverage, etc.) appear inline on the form field — not as a generic toast.

---

## 10. Location & Map Integration Strategy

### Location Permission Flow
```typescript
// hooks/location/useLocation.ts
export function useLocation() {
  const { setCurrentPosition, setLocationPermission, setUsingLastKnown } = useLocationStore();

  const requestAndWatch = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status === 'granted' ? 'granted' : 'denied');

    if (status !== 'granted') return;

    // Get initial position fast
    const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setCurrentPosition(initial.coords.latitude, initial.coords.longitude);

    // Watch for position changes (>100m movement triggers feed re-sort)
    const subscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, distanceInterval: 100 },
      (position) => {
        setCurrentPosition(position.coords.latitude, position.coords.longitude);
        setUsingLastKnown(false);
      }
    );

    return () => subscription.remove();
  }, []);

  return { requestAndWatch };
}
```

**Location permission strategy:**
1. Request on onboarding location screen (`(auth)/location`)
2. If denied → show neighborhood picker (hardcoded Chicago list)
3. If granted → auto-resolve to nearest neighborhood via `GET /v1/geo/reverse`
4. Last known GPS persisted in MMKV → available immediately on next app open
5. "Using last known location" banner shown if GPS unavailable on feed open

### Mapbox Integration
```typescript
// screens/map/MapScreen.tsx (simplified)
import MapboxGL from '@rnmapbox/maps';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN!);

export function MapScreen() {
  const { camera, setCamera, selectPin } = useMapStore();
  const { currentLat, currentLng } = useLocationStore();

  // Debounce viewport changes (300ms) before fetching pins
  const debouncedBounds = useDebounce(visibleBounds, 300);
  const { data: pinsData } = useMapPins(debouncedBounds);

  return (
    <View className="flex-1">
      <MapboxGL.MapView
        style={{ flex: 1 }}
        styleURL={MUZGRAM_MAP_STYLE_URL}
        onRegionDidChange={(region) => setCamera({
          lat: region.geometry.coordinates[1],
          lng: region.geometry.coordinates[0],
          zoom: region.properties.zoomLevel,
        })}
        compassEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <MapboxGL.Camera
          zoomLevel={camera.zoom}
          centerCoordinate={[camera.lng, camera.lat]}
          animationMode="flyTo"
          animationDuration={300}
        />

        {/* User location dot */}
        <MapboxGL.UserLocation visible animated />

        {/* Business pins */}
        {pinsData?.data.mode === 'pins' && pinsData.data.pins.map((pin) => (
          <MapboxGL.MarkerView key={pin.id} coordinate={[pin.lng, pin.lat]}>
            <BusinessPin
              category={pin.category}
              isFeatured={pin.is_featured}
              isLive={pin.is_live}
              isSelected={selectedPinId === pin.id}
              onPress={() => selectPin(pin.id, pin.content_type)}
            />
          </MapboxGL.MarkerView>
        ))}

        {/* Cluster pins */}
        {pinsData?.data.mode === 'clusters' && pinsData.data.clusters.map((cluster, i) => (
          <MapboxGL.MarkerView key={i} coordinate={[cluster.lng, cluster.lat]}>
            <ClusterPin count={cluster.count} dominantType={cluster.dominant_type} />
          </MapboxGL.MarkerView>
        ))}
      </MapboxGL.MapView>

      <MapFilterBar />
      <RecenterButton onPress={() => /* flyTo user location */ undefined} />

      {/* Bottom sheet — slides up on pin tap */}
      <MapBottomSheet
        isVisible={!!selectedPinId}
        contentType={selectedPinType}
        contentId={selectedPinId}
        onDismiss={() => clearSelection()}
      />
    </View>
  );
}
```

### Map Performance Rules
1. **Never render pins with `FlatList`** — use `MapboxGL.ShapeSource` + `SymbolLayer` for >50 pins
2. **Debounce viewport changes 300ms** before fetching new pins
3. **Pin tap → fetch lightweight preview** (`GET /v1/map/pin/:type/:id`) — not full detail
4. **Full detail only on swipe-up** (75% snap point)
5. **Hard cap 200 pins** — API enforces, client shows cluster fallback
6. **Cache pins in TanStack Query for 2 minutes** — viewport changes are frequent

---

## 11. Media Upload Strategy

```typescript
// hooks/media/useUpload.ts
export function useUpload() {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'compressing' | 'uploading' | 'confirming' | 'done'>('idle');

  const upload = useCallback(async (args: UploadArgs): Promise<MediaAsset> => {
    setPhase('compressing');

    // Step 0: Client-side resize to max 1200px (before presign — ensures size_bytes is accurate)
    const manipulated = await ImageManipulator.manipulateAsync(
      args.localUri,
      [{ resize: { width: 1200 } }],
      { compress: 0.85, format: SaveFormat.JPEG }
    );

    const fileInfo = await FileSystem.getInfoAsync(manipulated.uri, { size: true });
    const sizeBytes = fileInfo.exists ? fileInfo.size : 0;

    setPhase('uploading');
    setProgress(0);

    // Step 1: Get presigned URL
    const { data: presign } = await mediaApi.presign({
      owner_type: args.ownerType,
      owner_id: args.ownerId,
      mime_type: 'image/jpeg',
      size_bytes: sizeBytes,
      purpose: args.purpose,
    });

    // Step 2: Upload directly to R2 (Cloudflare) via presigned PUT
    await FileSystem.uploadAsync(presign.upload_url, manipulated.uri, {
      httpMethod: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(sizeBytes),
      },
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      sessionType: FileSystem.FileSystemSessionType.FOREGROUND,
    });
    // (progress tracked via uploadAsync callback in full implementation)

    setPhase('confirming');

    // Step 3: Confirm upload — creates DB record
    const { data: asset } = await mediaApi.confirm({
      key: presign.key,
      owner_type: args.ownerType,
      owner_id: args.ownerId,
      purpose: args.purpose,
      sort_order: args.sortOrder ?? 1,
    });

    setPhase('done');
    return asset;
  }, []);

  return { upload, progress, phase };
}
```

### `<ImageUploadPicker />` component
- Shows grid of selected images + add button
- Uses `expo-image-picker` with `allowsMultipleSelection: true` (max 5)
- Progress bar per image during upload
- `expo-image` preview with `blurhash` placeholder during upload
- On upload failure: shows retry button on individual image tile, not full form error

---

## 12. Push Notification Integration

### Token Registration
```typescript
// hooks/notifications/useNotifications.ts
export function useNotifications() {
  const { setToken } = useNotifStore();
  const { mutate: registerToken } = useRegisterPushToken();

  const registerForPushNotifications = useCallback(async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    const deviceId = await Application.getIosIdForVendorAsync()
      ?? await Application.androidId
      ?? uuid();

    setToken(token.data, deviceId);
    registerToken({ token: token.data, deviceId, platform: Platform.OS });
  }, []);

  // Foreground notification handler — show in-app toast, not system notification
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      useAuthStore.getState().incrementUnreadCount();
      ToastManager.show({
        title: notification.request.content.title ?? '',
        body: notification.request.content.body ?? '',
        deepLink: notification.request.content.data?.deepLink as string,
      });
    });
    return () => subscription.remove();
  }, []);

  // Deep link on notification tap
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const deepLink = response.notification.request.content.data?.deepLink as string;
      if (deepLink) router.push(deepLink.replace('muzgram:/', ''));
    });
    return () => subscription.remove();
  }, []);

  return { registerForPushNotifications };
}
```

### Notification types → in-app behavior
| Notification Type | Foreground | Background (tap) |
|---|---|---|
| `nearby_event` | Toast with event title | Navigate to `/event/:id` |
| `lead_received` | Toast "New enquiry from X" | Navigate to `/saved` (leads tab) |
| `event_cancelled` | Toast "Event cancelled: X" | Navigate to `/saved` |
| `listing_approved` | Toast "Your listing is live!" | Navigate to `/business/:id` |
| `event_day_reminder` | Toast with event name | Navigate to `/event/:id` |

---

## 13. Offline / Error / Loading Strategy

### The three states — never mixed up

```
Loading → skeleton (never spinner in feeds)
Error   → error state with retry button
Offline → cached data + OfflineBanner
```

### Offline detection
```typescript
// hooks/shared/useNetworkStatus.ts
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });
    return unsubscribe;
  }, []);

  return { isOnline };
}
```

When offline:
- TanStack Query serves cached data (within `gcTime`)
- `<OfflineBanner />` floats below the header: "You're offline — showing cached content"
- Map shows last-rendered tiles (Mapbox offline cache)
- Mutations are blocked with user-facing message: "Connect to internet to post"
- Analytics events are queued in store and flushed on reconnect

### Loading states — always skeletons
```tsx
// Every feed has this pattern — no exceptions
function NowFeedScreen() {
  const { data, isLoading, isError, refetch } = useNowFeed(params);

  if (isLoading) return <SkeletonFeed />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return <FeedList data={data} />;
}
```

### Error granularity
- **Network error** → `<ErrorState message="Check your connection" />`
- **API 404** → `<ErrorState message="This content is no longer available" />`
- **API 403** → `<ErrorState message="You don't have access to this" />` (rare)
- **API 5xx** → `<ErrorState message="Something went wrong — we're on it" />`
- **Render error** → `<ErrorBoundary>` catches, sends to Sentry, shows generic error

### `<ErrorState />` props
```typescript
interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  illustration?: 'disconnected' | 'empty' | 'forbidden';
  actionLabel?: string;
}
```

### Empty states — contextual
```typescript
// Not a generic "no results" — each empty state is specific
const EMPTY_STATE_CONFIG = {
  now_feed:     { message: "Today looks quiet near you", cta: "Browse all of Chicago" },
  explore_food: { message: "No food listings here yet", cta: "Know a halal spot? Add it!" },
  saved_events: { message: "No saved events", cta: "Explore upcoming events" },
  saved_all:    { message: "Nothing saved yet", cta: "Browse the feed" },
  search:       { message: "No results", cta: "Try searching all of Chicago" },
};
```

---

## 14. Analytics Integration

### Event queueing pattern
```typescript
// hooks/shared/useAnalytics.ts
export function useAnalytics() {
  const { enqueue } = useAnalyticsStore();
  const sessionId = useAnalyticsStore((s) => s.sessionId);

  const track = useCallback((eventName: string, properties: Record<string, unknown> = {}) => {
    enqueue({ eventName, properties });
  }, [enqueue]);

  return { track };
}

// Usage in any component:
const { track } = useAnalytics();
track('feed_card_tapped', { target_type: 'business', target_id: id, position: index });
```

### Automatic flush
```typescript
// In root _layout.tsx:
useEffect(() => {
  // Flush every 30 seconds
  const interval = setInterval(flushAnalytics, 30_000);

  // Flush on app background
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'background') flushAnalytics();
  });

  return () => { clearInterval(interval); subscription.remove(); };
}, []);
```

### View tracking via FlashList viewport
```typescript
// FeedList.tsx — tracks items that entered the viewport
<FlashList
  onViewableItemsChanged={({ viewableItems }) => {
    viewableItems.forEach(({ item }) => {
      if (!viewedIds.has(item.feed_item_id)) {
        markViewed(item.feed_item_id);
        track('feed_card_viewed', {
          target_type: item.content_type,
          target_id: item.item.id,
          is_featured: item.is_featured,
        });
      }
    });
  }}
  viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
/>
```

---

## 15. Performance Conventions

### Never use `FlatList` for any feed
Always use `FlashList` from `@shopify/flash-list`. Provide `estimatedItemSize` accurately:
- Compact card: `estimatedItemSize={88}`
- Feature card: `estimatedItemSize={268}`
- Post card: `estimatedItemSize={120}`

### Image loading — always `expo-image` with `blurhash`
```tsx
<Image
  source={{ uri: coverPhotoUrl }}
  placeholder={{ blurhash: item.blurhash ?? DEFAULT_BLURHASH }}
  contentFit="cover"
  transition={300}
  style={{ width: '100%', height: 200 }}
  recyclingKey={item.id}  // Prevents image flicker in FlashList
/>
```

### Card press animation — Reanimated (UI thread only)
```tsx
function CardPressable({ onPress, children }: CardPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.97, SPRING_SNAPPY); }}
      onPressOut={() => { scale.value = withSpring(1, SPRING_SNAPPY); }}
      onPress={onPress}
    >
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
```

### Memo strategy
```typescript
// Memo only when:
// 1. Component re-renders frequently from parent state changes (feed items in a FlashList)
// 2. The component has expensive computation

const FeaturedCard = memo(function FeaturedCard({ item, onPress, isSaved, onSave }) {
  // ...
}, (prev, next) => prev.item.id === next.item.id && prev.isSaved === next.isSaved);

// Do NOT memo every component by default — premature optimization
```

### Prefetch on hover/focus
```typescript
// When user starts scrolling toward a card, prefetch its detail
const onViewableItemsChanged = ({ viewableItems }) => {
  viewableItems.forEach(({ item }) => {
    // Prefetch detail for items near the bottom of the visible list
    queryClient.prefetchQuery({
      queryKey: queryKeys.businesses.detail(item.item.id),
      queryFn: () => businessesApi.getById(item.item.id),
      staleTime: 2 * 60_000,
    });
  });
};
```

---

## 16. Code Conventions & Rules

### ESLint rules (enforced)
```json
{
  "rules": {
    "no-direct-text": "error",         // Must use <Body>, <Heading>, <Caption>
    "no-flatlist": "error",            // Must use FlashList
    "no-async-storage": "error",       // Must use MMKV or SecureStore
    "no-console": "warn",              // Use logger.ts instead
    "no-inline-styles": "warn",        // Must use NativeWind classes
    "import/no-cycle": "error"         // No circular imports
  }
}
```

### Naming conventions
```
Screens:      PascalCase + Screen suffix     → NowFeedScreen.tsx
Components:   PascalCase                     → FeaturedCard.tsx
Hooks:        camelCase + use prefix         → useToggleSave.ts
Stores:       camelCase + Store suffix       → authStore.ts
API functions: camelCase                     → feedApi.getNowFeed()
Types:        PascalCase                     → FeedItem, BusinessDetail
Zod schemas:  camelCase + Schema suffix      → createEventSchema
```

### Import aliases
```json
// tsconfig.json paths
{
  "@/*": ["./src/*"],
  "@screens/*": ["./src/screens/*"],
  "@components/*": ["./src/components/*"],
  "@hooks/*": ["./src/hooks/*"],
  "@api/*": ["./src/api/*"],
  "@store/*": ["./src/store/*"],
  "@lib/*": ["./src/lib/*"],
  "@constants/*": ["./src/constants/*"],
  "@types/*": ["./src/types/*"]
}
```

### Component file structure (within each file)
```typescript
// 1. Imports (external → internal, alphabetical)
// 2. Types / interfaces
// 3. Constants (outside component, no recomputation)
// 4. Component function
//   a. Hooks (store, query, state)
//   b. Derived values (useMemo if expensive)
//   c. Handlers (useCallback)
//   d. Effects (useEffect, keep minimal)
//   e. Return JSX
// 5. Styles (if not NativeWind — only for dynamic values)
// 6. export default / named export
```

### No prop drilling beyond 2 levels
If a prop needs to travel 3+ levels, move it to Zustand store or TanStack Query context.

---

## 17. Future-Proofing Decisions

These choices require extra thought now but save painful migrations later:

**1. Expo Router typed routes — never use string literals**
```typescript
// Wrong — breaks silently when route renames
router.push('/bussiness/123');  // typo undetected

// Right — TypeScript error on build if route doesn't exist
router.push({ pathname: '/business/[id]', params: { id: '123' } });
```

**2. FlashList `keyExtractor` must be globally unique**
Feed items mix businesses, events, and posts. Use `feed_item_id` (`550e8400::business`), not just `id`. This prevents React reconciliation collisions when the same business appears in both feed and map.

**3. Zod schemas in `packages/types` (not in mobile)**
When you add backend validation, the Zod schema goes in the shared package. Mobile imports the same schema for form validation. Zero drift between client and server validation logic.

**4. TanStack Query key factory — exhaustive params**
Include ALL variables that affect the response in the query key:
```typescript
// Wrong — category change doesn't invalidate cache
queryKeys.feed.now({ lat, lng, cityId });

// Right — category is part of the key
queryKeys.feed.now({ lat: roundTo3(lat), lng: roundTo3(lng), cityId, category });
```

**5. `roundTo3()` on lat/lng in query keys**
GPS coordinates change constantly. Rounding to 3 decimal places (~100m) groups nearby positions into the same cache key. Without this, every GPS update triggers a new API request.

**6. Analytics event names as constants (not strings)**
```typescript
// Wrong — "feed_crd_tapped" typo goes undetected
track('feed_crd_tapped', {...});

// Right — TypeScript error on undefined event
import { EVENTS } from '@/lib/analytics';
track(EVENTS.FEED_CARD_TAPPED, {...});
```

**7. Separate screens from route files — always**
When Expo Router v4 ships with React Server Components in React Native, screen components will migrate without touching route files. The thin wrapper pattern makes this zero-cost.

**8. NativeWind CSS variables ready for white-label**
The Tailwind config uses CSS variables for all colors. When you white-label Muzgram for another city/brand, swap the CSS variable values in one place. No component changes.

**9. `useNetworkStatus` abstraction — not direct NetInfo**
NetInfo is the current library. When Expo eventually ships a built-in network API, swap the implementation in one hook file. All components that use `const { isOnline } = useNetworkStatus()` are unaffected.

**10. Map library abstraction layer**
`@rnmapbox/maps` is the current implementation. There's a thin `MapView` wrapper in `components/map/` that exposes only what Muzgram needs. If we need to swap to Google Maps for certain markets, the wrapper is the only file to change.

**11. Notifications — never send directly from components**
All notification triggers go through the Bull queue on the server. The mobile app only registers tokens and handles received notifications. This means notification logic can change (new types, quiet hours, digest mode) without app releases.

**12. MSW (Mock Service Worker) for Expo**
Wire up `msw/native` in dev from day one. Lets you develop screens without running the API server. Particularly valuable for the create flows and admin screens which are hard to test with live data.

---

## 18. My Additions & Enhancements

Things not in the original product spec that I'm recommending you build from day one:

**1. `useScrollHeader` hook for transparent → solid header on scroll**
The Now Feed and Explore headers should be transparent at the top and become solid as you scroll down. Reanimated `useScrollViewOffset` + `useAnimatedStyle` + `interpolate`. Hook is reusable across all list screens.

**2. `useHaptics` typed shortcut hook**
Rather than importing expo-haptics everywhere:
```typescript
const { tap, success, error, selection } = useHaptics();
// tap()       → ImpactFeedbackStyle.Light
// success()   → NotificationFeedbackType.Success
// error()     → NotificationFeedbackType.Error
// selection() → selectionAsync
```
Haptics on: save toggle, tab switch, OTP digit entry, form submit, pin selection, pull-to-refresh trigger.

**3. `avatarColor.ts` — deterministic color from user_id**
```typescript
export function getAvatarColor(userId: string): string {
  const palette = [
    '#E07B39', '#3B6978', '#6355A4', '#2C7873',
    '#C0392B', '#1A8A73', '#7B68EE', '#FF6B6B',
  ];
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
}
```
Every user always gets the same color. Profile photos are optional — initials + color is always ready.

**4. WhatsApp share with pre-filled message**
```typescript
// lib/deepLinks.ts
export function shareToWhatsApp(item: BusinessDetail | EventDetail): void {
  const link = `muzgram://business/${item.id}`;
  const text = item.type === 'business'
    ? `Check out ${item.name} on Muzgram 🌙 ${link}`
    : `${item.title} is happening near you! 🌙 ${link}`;

  Linking.openURL(`whatsapp://send?text=${encodeURIComponent(text)}`);
  track(EVENTS.SHARE_TAPPED, { target_id: item.id, channel: 'whatsapp' });
}
```
WhatsApp is the primary social sharing channel for this community — it gets a dedicated shortcut, not a generic share sheet.

**5. `countdownLabel.ts` — event urgency with color coding**
```typescript
export function getEventCountdown(startsAt: Date): { label: string; urgency: 'high' | 'medium' | 'low' | 'past' } {
  const now = new Date();
  const diffMs = startsAt.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) return { label: 'Past', urgency: 'past' };
  if (diffDays === 0) return { label: 'Today!', urgency: 'high' };
  if (diffDays === 1) return { label: 'Tomorrow', urgency: 'medium' };
  if (diffDays <= 7) return { label: `In ${diffDays} days`, urgency: 'low' };
  return { label: format(startsAt, 'MMM d'), urgency: 'low' };
}
```

**6. Skeleton shimmer as a design commitment, not an afterthought**
Every screen has a skeleton designed alongside its loaded state. `SkeletonFeed`, `SkeletonCard`, `SkeletonDetail` are in the component library from week 1. This means the app always feels fast — loading is never jarring. The shimmer animation runs on the UI thread (Reanimated).

**7. `useAppState` for smart cache refresh**
```typescript
// When app comes back to foreground after >5 minutes in background,
// invalidate the feed cache so user sees fresh content immediately.
useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active' && wasInBackground && backgroundDuration > 5 * 60_000) {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
    }
  });
  return () => subscription.remove();
}, []);
```

**8. Sentry performance tracing on feed loads**
```typescript
// Wrap every feed query in a Sentry transaction
// Gives you P50/P95 feed load times — the most important performance metric
const transaction = Sentry.startTransaction({ name: 'feed.now.load' });
try {
  await feedApi.getNowFeed(params);
} finally {
  transaction.finish();
}
```

**9. Expo Updates for OTA hotfixes**
Wire up `expo-updates` from day one. Critical bug fixes (wrong API URL, broken feed render, push notification failure) can be shipped without an App Store review. For MVP with a small user base, this is the fastest path from bug-report to fix.

**10. `MMKV` storage for search history**
Last 5 searches stored locally (not on server — privacy). Cleared on app uninstall. Shows on search screen before user types. `MMKV.set('search_history', JSON.stringify(history))` — instant read/write.

---

*Architecture designed for: Devon Ave launch. 500 users. 8 screens. 8 weeks. Scales to 50K MAU without a rewrite.*
