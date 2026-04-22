# Muzgram — REST API Design

> Last updated: 2026-04-21
> Base URL: `https://api.muzgram.com/v1`
> Standard: OpenAPI 3.1 · RFC 9457 Errors · IETF Rate-Limit Headers · RFC 5988 Links

---

## Global Conventions

### Versioning
All routes are prefixed `/v1/`. When a breaking change ships, `/v2/` routes are added alongside v1 — never removed until min-app-version enforcement clears the old clients.

### Authentication
```
Authorization: Bearer <clerk_session_jwt>
X-App-Version: 1.0.0          # Required on every request. Logged for version gating.
X-Idempotency-Key: <uuid-v4>  # Required on all POST requests that create resources.
```

Routes marked **Public** skip auth. All others require a valid Clerk JWT.

### Response Envelope

**Single resource:**
```json
{ "data": { ... } }
```

**Collection:**
```json
{
  "data": [ ... ],
  "meta": { "cursor": "eyJsYXN0...", "hasMore": true, "total": null },
  "links": { "next": "https://api.muzgram.com/v1/feed/now?cursor=eyJsYXN0..." }
}
```

**Empty (delete / mark-read):** `204 No Content` — no body.

### Error Format — RFC 9457 Problem Details
```json
{
  "type": "https://api.muzgram.com/errors/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "One or more fields failed validation.",
  "instance": "/v1/businesses",
  "correlationId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "errors": [
    { "field": "name", "code": "max_length", "message": "must not exceed 120 characters" }
  ]
}
```

**Standard error `type` URIs:**
| `type` slug | HTTP | Meaning |
|---|---|---|
| `/errors/validation-error` | 422 | Body/query param failed validation |
| `/errors/unauthorized` | 401 | Missing or invalid JWT |
| `/errors/forbidden` | 403 | Valid JWT, insufficient role |
| `/errors/not-found` | 404 | Resource does not exist (or soft-deleted) |
| `/errors/conflict` | 409 | Duplicate resource or state conflict |
| `/errors/rate-limited` | 429 | Rate limit exceeded |
| `/errors/account-suspended` | 403 | User account suspended |
| `/errors/account-banned` | 403 | User account permanently banned |
| `/errors/outside-coverage` | 422 | Location outside supported city |
| `/errors/content-pending` | 409 | Content still under admin review |
| `/errors/lead-limit-exceeded` | 429 | Max 3 leads to same provider per 7 days |
| `/errors/post-limit-exceeded` | 429 | Max 5 community posts per hour |
| `/errors/media-too-large` | 422 | File exceeds 10 MB limit |
| `/errors/media-type-forbidden` | 422 | MIME type not allowed |
| `/errors/claim-already-pending` | 409 | Business already has a pending claim |
| `/errors/event-cancelled` | 409 | Cannot modify a cancelled event |
| `/errors/idempotency-conflict` | 409 | Same idempotency key, different body |

### Pagination
Cursor-based throughout. Offset used only in admin tables (where exact page jumps are needed).

```
GET /v1/feed/now?cursor=eyJsYXN0U2NvcmUiOjg1fQ&limit=20
```

Cursors are opaque base64-encoded JSON. Never construct them — always follow the `links.next` URL.

Default limit: **20**. Max limit: **50** (enforced server-side, silently capped).

### Rate Limit Headers (IETF draft-ietf-httpapi-ratelimit-headers)
Every response includes:
```
RateLimit-Limit: 1000
RateLimit-Remaining: 987
RateLimit-Reset: 1745366400
RateLimit-Policy: "global";l=1000;w=60
```

Auth endpoints have stricter policies:
```
RateLimit-Policy: "otp";l=5;w=300, "global";l=1000;w=60
```

On 429: `Retry-After: 47` (seconds until window resets).

### Conditional Requests
Frequently-read single resources (business profile, event detail) return `ETag` headers. Mobile clients should send `If-None-Match` on subsequent reads — server returns `304 Not Modified` when content is unchanged.

```
# First request:
GET /v1/businesses/550e8400
→ ETag: "33a64df551425fcc"
   Cache-Control: private, max-age=60

# Subsequent request:
GET /v1/businesses/550e8400
If-None-Match: "33a64df551425fcc"
→ 304 Not Modified (no body transferred)
```

For **optimistic concurrency on updates:**
```
PATCH /v1/businesses/550e8400
If-Match: "33a64df551425fcc"
→ 412 Precondition Failed   (another update happened first)
→ 200 OK + new ETag         (update applied)
```

### Sparse Fieldsets
Any GET endpoint accepts `?fields[]=` to reduce payload:
```
GET /v1/restaurants?fields[]=id&fields[]=name&fields[]=is_open_now&fields[]=distance_label
```

### Common Query Parameters (on all list endpoints)
| Param | Type | Default | Notes |
|---|---|---|---|
| `limit` | integer | 20 | Max 50 |
| `cursor` | string | — | Opaque pagination cursor |
| `sort` | string | endpoint-specific | `-created_at` = desc, `distance` = asc |
| `fields[]` | string[] | all | Sparse fieldset |

### Standard Response Headers
```
X-Correlation-Id: f47ac10b-58cc-4372-a567-0e02b2c3d479   # Trace end-to-end
Content-Type: application/json; charset=utf-8
Vary: Authorization, Accept-Encoding
```

---

## 1. Auth

### `POST /v1/auth/session`
> **MVP** · Public (JWT still required — Clerk validates OTP) · Idempotent: Yes

**Purpose:** Called immediately after Clerk OTP verification. Upserts the user record. Returns `201` on first login, `200` on subsequent logins.

**Headers**
| Header | Required |
|---|---|
| Authorization | Yes — Clerk JWT from OTP success |
| X-App-Version | Yes |
| X-Idempotency-Key | Yes |

**Response `201 Created` / `200 OK`**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clerk_user_id": "user_2abc123",
    "phone": "+13125550100",
    "role": "user",
    "status": "active",
    "onboarding_completed": false,
    "city_id": null,
    "neighborhood_id": null,
    "created_at": "2026-04-21T14:30:00.000Z"
  }
}
```

**Response Headers on 201:**
```
Location: /v1/users/550e8400-e29b-41d4-a716-446655440000
Content-Location: /v1/auth/me
```

**Validation**
- Clerk JWT must be valid and non-expired
- `sub` claim maps to `users.clerk_user_id` (auto-created if absent)

**Errors**
| Status | `type` | When |
|---|---|---|
| 401 | `/errors/unauthorized` | JWT invalid, expired, or missing |
| 403 | `/errors/account-suspended` | User suspended |
| 403 | `/errors/account-banned` | User permanently banned |

---

### `GET /v1/auth/me`
> **MVP** · Bearer Token

**Purpose:** Authenticated user's own session data — role, status, onboarding state. Cached in Redis 5 min. Called on every app launch to rehydrate the auth store.

**Response `200 OK`**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "phone": "+13125550100",
    "role": "user",
    "status": "active",
    "display_name": "Yusuf A.",
    "avatar_url": "https://media.muzgram.com/avatars/550e8400/avatar.jpg",
    "neighborhood": { "id": "west-ridge", "name": "West Ridge" },
    "city": { "id": "chicago", "name": "Chicago" },
    "onboarding_completed": true,
    "auto_approve_events": false,
    "auto_approve_posts": false,
    "unread_notification_count": 3,
    "created_at": "2026-04-21T14:30:00.000Z"
  }
}
```

**Errors**
| Status | `type` | When |
|---|---|---|
| 401 | `/errors/unauthorized` | No or invalid JWT |
| 403 | `/errors/account-suspended` | Session valid but account suspended |

---

### `POST /v1/auth/push-tokens`
> **MVP** · Bearer Token · Idempotent: Yes

**Purpose:** Register or update an Expo push token for the current device. Called after Expo.getExpoPushTokenAsync() on app start. Safe to call multiple times — upserts by `device_id`.

**Body**
```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "device_id": "A1B2C3D4-E5F6-7890-ABCD-EF1234567890",
  "platform": "ios"
}
```

**Validation**
- `token` — required, must start with `ExponentPushToken[`
- `device_id` — required, max 128 chars (iOS `identifierForVendor` or Android `ANDROID_ID`)
- `platform` — required, enum: `ios | android`

**Response `201 Created`**
```json
{ "data": { "registered": true, "device_id": "A1B2C3D4..." } }
```

**Errors**
| Status | `type` | When |
|---|---|---|
| 422 | `/errors/validation-error` | Invalid token format |

---

### `DELETE /v1/auth/push-tokens/:deviceId`
> **MVP** · Bearer Token

**Purpose:** Deregister push token on logout. Marks token inactive in `push_tokens` — no more pushes to this device.

**Response:** `204 No Content`

---

### `DELETE /v1/auth/session`
> **MVP** · Bearer Token

**Purpose:** Logout. Inserts a `user_sessions` end record. Does not invalidate the Clerk JWT (stateless) — mobile must discard the token locally.

**Response:** `204 No Content`

---

### `DELETE /v1/auth/account`
> **MVP** · Bearer Token · Idempotent: Yes

**Purpose:** Initiate account deletion. Enqueues a Bull job with a **30-second delay** — any authenticated request within that window cancels the job. After 30 seconds, `deleted_at` is set. Full hard delete runs 30 days later via cron.

**Body**
```json
{ "reason": "not_useful" }
```

**Validation**
- `reason` — optional, enum: `not_useful | privacy | switching_app | other`

**Response `202 Accepted`**
```json
{
  "data": {
    "status": "deletion_scheduled",
    "grace_period_seconds": 30,
    "hard_delete_at": "2026-05-21T14:30:00.000Z",
    "message": "Make any request within 30 seconds to cancel deletion."
  }
}
```

**Errors**
| Status | `type` | When |
|---|---|---|
| 409 | `/errors/conflict` | Account already scheduled for deletion |

---

## 2. Onboarding

### `GET /v1/onboarding/status`
> **MVP** · Bearer Token

**Purpose:** Returns the user's current onboarding state. Mobile uses this to resume mid-onboarding after app kill.

**Response `200 OK`**
```json
{
  "data": {
    "step": "location",
    "completed_steps": ["phone_verified"],
    "remaining_steps": ["location", "profile"],
    "is_complete": false
  }
}
```

---

### `PATCH /v1/onboarding/location`
> **MVP** · Bearer Token

**Purpose:** Set the user's home city and neighborhood (step 3 of onboarding). Accepts either GPS coordinates (auto-resolved to nearest neighborhood) or a manual `neighborhood_id`.

**Body — Option A (GPS):**
```json
{ "lat": 41.9989, "lng": -87.6939 }
```

**Body — Option B (manual picker):**
```json
{ "neighborhood_id": "west-ridge" }
```

**Validation**
- One of `{ lat + lng }` or `{ neighborhood_id }` required — not both
- `lat` — float, -90 to 90
- `lng` — float, -180 to 180
- `neighborhood_id` — must exist in `neighborhoods` table for an active city

**Response `200 OK`**
```json
{
  "data": {
    "city": { "id": "chicago", "name": "Chicago" },
    "neighborhood": { "id": "west-ridge", "name": "West Ridge" },
    "next_step": "profile"
  }
}
```

**Errors**
| Status | `type` | When |
|---|---|---|
| 422 | `/errors/outside-coverage` | Coordinates resolve to unsupported city |
| 404 | `/errors/not-found` | `neighborhood_id` not found |

---

### `PATCH /v1/onboarding/profile`
> **MVP** · Bearer Token

**Purpose:** Set display name (step 4, optional/skippable). Calling with empty body completes onboarding without a name.

**Body**
```json
{ "display_name": "Yusuf" }
```

**Validation**
- `display_name` — optional, string, 1–40 chars, profanity-checked async (queues a `FLAG_DISPLAY_NAME` Bull job if flagged — doesn't block the response)

**Response `200 OK`**
```json
{
  "data": {
    "onboarding_completed": true,
    "display_name": "Yusuf",
    "next_step": null
  }
}
```

---

## 3. Users

### `GET /v1/users/me`
> **MVP** · Bearer Token

**Purpose:** Full user profile including stats. The profile screen's primary data source.

**Response `200 OK`**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "display_name": "Yusuf A.",
    "avatar_url": "https://media.muzgram.com/avatars/550e8400/avatar.jpg",
    "avatar_initials": "YA",
    "avatar_color": "#3B6978",
    "bio": "Local to West Ridge. Halal food hunter.",
    "neighborhood": { "id": "west-ridge", "name": "West Ridge" },
    "city": { "id": "chicago", "name": "Chicago" },
    "role": "user",
    "stats": {
      "posts_count": 12,
      "events_count": 3,
      "saves_count": 47
    },
    "member_since": "2026-04-21T14:30:00.000Z"
  }
}
```

**Response Headers:**
```
ETag: "a9b8c7d6e5f4"
Cache-Control: private, max-age=30
```

---

### `PATCH /v1/users/me`
> **MVP** · Bearer Token

**Purpose:** Update own profile. Only provided fields are updated (PATCH semantics). `avatar_url` is set via the media upload flow — not directly patchable here.

**Body**
```json
{
  "display_name": "Yusuf A.",
  "bio": "Local to West Ridge. Halal food hunter.",
  "neighborhood_id": "west-ridge"
}
```

**Validation**
- `display_name` — optional, 1–40 chars
- `bio` — optional, max 160 chars
- `neighborhood_id` — optional, must exist in current city's neighborhoods
- Rate limit: 10 profile updates per hour (Redis counter — `ratelimit:profile:{user_id}`)

**Response `200 OK`** — returns updated user object (same shape as `GET /v1/users/me`)

**Errors**
| Status | `type` | When |
|---|---|---|
| 422 | `/errors/validation-error` | Validation failed |
| 429 | `/errors/rate-limited` | >10 profile updates in 1 hour |

---

### `GET /v1/users/:id`
> **MVP** · Bearer Token

**Purpose:** Public profile view. Shows only publicly visible fields. Used when tapping a post author's name.

**Response `200 OK`**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "display_name": "Yusuf A.",
    "avatar_url": "https://media.muzgram.com/avatars/550e8400/avatar.jpg",
    "avatar_initials": "YA",
    "avatar_color": "#3B6978",
    "neighborhood": { "id": "west-ridge", "name": "West Ridge" },
    "stats": { "posts_count": 12, "events_count": 3 },
    "member_since": "2026-04-21T14:30:00.000Z"
  }
}
```

**Errors**
| Status | `type` | When |
|---|---|---|
| 404 | `/errors/not-found` | User deleted or doesn't exist |

---

### `GET /v1/users/me/content`
> **MVP** · Bearer Token

**Purpose:** Paginated list of the current user's posts and events. Profile screen "My Posts" / "My Events" tabs.

**Query Params**
| Param | Type | Default | Values |
|---|---|---|---|
| `type` | string | all | `posts \| events \| all` |
| `cursor` | string | — | Opaque |
| `limit` | integer | 20 | Max 50 |

**Response `200 OK`**
```json
{
  "data": [
    {
      "id": "...",
      "content_type": "event",
      "title": "Iftar Dinner at Islamic Foundation",
      "status": "approved",
      "created_at": "2026-04-21T14:30:00.000Z"
    }
  ],
  "meta": { "cursor": "eyJ...", "hasMore": false }
}
```

---

## 4. Geo / Locations

### `GET /v1/geo/cities`
> **MVP** · Public

**Purpose:** List all active (launched) cities. Used in onboarding to show coverage and in "Muzgram coming to your city" banner logic.

**Response `200 OK`**
```json
{
  "data": [
    {
      "id": "chicago",
      "name": "Chicago",
      "state": "IL",
      "country": "US",
      "timezone": "America/Chicago",
      "center": { "lat": 41.8781, "lng": -87.6298 },
      "is_active": true
    }
  ]
}
```

**Response Headers:**
```
Cache-Control: public, max-age=3600
```

---

### `GET /v1/geo/neighborhoods`
> **MVP** · Public

**Purpose:** Neighborhoods for the city picker in onboarding and profile settings.

**Query Params**
| Param | Type | Required | Notes |
|---|---|---|---|
| `city_id` | string | Yes | e.g., `chicago` |

**Response `200 OK`**
```json
{
  "data": [
    { "id": "west-ridge", "name": "West Ridge", "city_id": "chicago" },
    { "id": "rogers-park", "name": "Rogers Park", "city_id": "chicago" },
    { "id": "skokie", "name": "Skokie", "city_id": "chicago" }
  ]
}
```

**Response Headers:** `Cache-Control: public, max-age=86400`

**Errors**
| Status | `type` | When |
|---|---|---|
| 404 | `/errors/not-found` | `city_id` not found |

---

### `GET /v1/geo/reverse`
> **MVP** · Bearer Token

**Purpose:** Convert GPS coordinates to nearest neighborhood. Cached in Redis by rounded coordinates (3 decimal places ≈ 100m grid).

**Query Params**
| Param | Type | Required |
|---|---|---|
| `lat` | float | Yes |
| `lng` | float | Yes |

**Response `200 OK`**
```json
{
  "data": {
    "city": { "id": "chicago", "name": "Chicago" },
    "neighborhood": { "id": "west-ridge", "name": "West Ridge" },
    "is_supported": true,
    "distance_from_center_meters": 420
  }
}
```

**Errors**
| Status | `type` | When |
|---|---|---|
| 422 | `/errors/outside-coverage` | Coordinates not in any supported city |

---

### `POST /v1/geo/geocode`
> **MVP** · Bearer Token · Idempotent: Yes

**Purpose:** Convert a text address to lat/lng coordinates. Proxies Mapbox Geocoding API — Mapbox secret key never leaves the server. Results cached in Redis 30 days.

**Body**
```json
{ "address": "2501 W Devon Ave, Chicago, IL 60659", "city_id": "chicago" }
```

**Response `200 OK`**
```json
{
  "data": {
    "lat": 41.9989,
    "lng": -87.6939,
    "formatted_address": "2501 W Devon Ave, Chicago, IL 60659, USA",
    "neighborhood_id": "west-ridge",
    "confidence": "high"
  }
}
```

**Errors**
| Status | `type` | When |
|---|---|---|
| 422 | `/errors/outside-coverage` | Address not in supported city |
| 422 | `/errors/validation-error` | Address too short or unresolvable |

---

## 5. Businesses (Owner CRUD)

> All food types (restaurant, cafe, bakery, etc.) and service providers share this CRUD. Discovery-only endpoints are split under `/v1/restaurants` and `/v1/services`.

### `GET /v1/businesses`
> **MVP** · Bearer Token

**Purpose:** List businesses with filters. Used by business owners to view their own listings and by admin. General browse uses `/v1/restaurants` or `/v1/services`.

**Query Params**
| Param | Type | Default | Notes |
|---|---|---|---|
| `city_id` | string | user's city | Required unless admin |
| `category` | string | all | `food \| service \| all` |
| `status` | string | approved | `pending \| approved \| rejected \| all` (admin only) |
| `owner_id` | string | — | Filter to one owner (own businesses) |
| `sort` | string | `-created_at` | `distance \| -created_at \| name` |
| `lat` | float | — | Required when `sort=distance` |
| `lng` | float | — | Required when `sort=distance` |
| `cursor` | string | — | |
| `limit` | integer | 20 | |

**Response `200 OK`**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Sabri Nihari",
      "slug": "sabri-nihari-west-ridge",
      "business_type": "restaurant",
      "halal_status": "isna_certified",
      "halal_status_label": "ISNA Certified",
      "is_open_now": true,
      "next_status_change": "Closes at 10:00 PM",
      "is_featured": false,
      "is_claimed": true,
      "cover_photo_url": "https://media.muzgram.com/businesses/550e8400/cover.jpg",
      "address": "2501 W Devon Ave, Chicago, IL 60659",
      "coordinates": { "lat": 41.9989, "lng": -87.6939 },
      "neighborhood": { "id": "west-ridge", "name": "West Ridge" },
      "status": "approved",
      "save_count": 142,
      "created_at": "2026-04-01T00:00:00.000Z"
    }
  ],
  "meta": { "cursor": "eyJ...", "hasMore": true },
  "links": { "next": "https://api.muzgram.com/v1/businesses?cursor=eyJ..." }
}
```

---

### `GET /v1/businesses/:id`
> **MVP** · Public (approved content) · Bearer Token (own pending content)

**Purpose:** Full business profile. Primary data source for the business detail screen and map bottom sheet.

**Query Params**
| Param | Type | Notes |
|---|---|---|
| `lat` | float | If provided, adds `distance_meters` and `distance_label` to response |
| `lng` | float | Required with `lat` |
| `include[]` | string | `photos \| hours \| daily_specials \| restaurant_details \| service_details` |

**Response `200 OK`**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Sabri Nihari",
    "slug": "sabri-nihari-west-ridge",
    "business_type": "restaurant",
    "halal_status": "isna_certified",
    "halal_status_label": "ISNA Certified",
    "halal_cert_details": "ISNA certification #4421, expires Dec 2026",
    "description": "Chicago institution since 1990. Famous for slow-cooked nihari and haleem.",
    "phone": "+17736767474",
    "website": "https://sabrinihari.com",
    "instagram": "@sabrinihari",
    "whatsapp": "+17736767474",
    "address": "2501 W Devon Ave, Chicago, IL 60659",
    "coordinates": { "lat": 41.9989, "lng": -87.6939 },
    "neighborhood": { "id": "west-ridge", "name": "West Ridge" },
    "city": { "id": "chicago", "name": "Chicago" },
    "is_open_now": true,
    "next_status_change": "Closes at 10:00 PM",
    "is_temporarily_closed": false,
    "is_featured": false,
    "is_claimed": true,
    "cover_photo_url": "https://media.muzgram.com/businesses/550e8400/cover.jpg",
    "logo_url": null,
    "distance_meters": 322,
    "distance_label": "0.2 mi away",
    "save_count": 142,
    "contact_tap_count": 87,
    "status": "approved",
    "photos": [
      { "id": "...", "url": "https://media.muzgram.com/businesses/550e8400/1.jpg", "sort_order": 1 }
    ],
    "hours": {
      "monday":    { "open": "11:00", "close": "22:00", "closed": false },
      "tuesday":   { "open": "11:00", "close": "22:00", "closed": false },
      "wednesday": { "open": "11:00", "close": "22:00", "closed": false },
      "thursday":  { "open": "11:00", "close": "22:00", "closed": false },
      "friday":    { "open": "11:00", "close": "23:00", "closed": false },
      "saturday":  { "open": "10:00", "close": "23:00", "closed": false },
      "sunday":    { "open": "10:00", "close": "22:00", "closed": false }
    },
    "daily_specials": [],
    "created_at": "2026-04-01T00:00:00.000Z",
    "updated_at": "2026-04-21T00:00:00.000Z"
  }
}
```

**Response Headers:**
```
ETag: "33a64df551425fcc"
Cache-Control: public, max-age=60
```

**Errors**
| Status | `type` | When |
|---|---|---|
| 404 | `/errors/not-found` | Business not found or soft-deleted |
| 403 | `/errors/forbidden` | Pending business requested by non-owner |

---

### `POST /v1/businesses`
> **MVP** · Bearer Token · Idempotent: Yes (X-Idempotency-Key)

**Purpose:** Create a new business listing. All new listings start as `status: "pending"` (admin review queue). Business owners with `auto_approve` flag skip the queue.

**Body**
```json
{
  "name": "Al-Khyam Bakery",
  "business_type": "bakery",
  "halal_status": "self_declared",
  "description": "Fresh halal breads and pastries baked daily on Devon Ave.",
  "phone": "+17731234567",
  "website": "https://alkhyambakery.com",
  "instagram": "@alkhyambakery",
  "address": "2755 W Devon Ave, Chicago, IL 60659",
  "lat": 41.9991,
  "lng": -87.6970,
  "neighborhood_id": "west-ridge",
  "city_id": "chicago",
  "hours": {
    "monday":    { "open": "07:00", "close": "20:00", "closed": false },
    "tuesday":   { "open": "07:00", "close": "20:00", "closed": false },
    "wednesday": { "open": "07:00", "close": "20:00", "closed": false },
    "thursday":  { "open": "07:00", "close": "20:00", "closed": false },
    "friday":    { "open": "07:00", "close": "21:00", "closed": false },
    "saturday":  { "open": "07:00", "close": "21:00", "closed": false },
    "sunday":    { "open": "closed", "close": null, "closed": true }
  }
}
```

**Validation**
- `name` — required, 2–120 chars
- `business_type` — required, enum (see schema enums)
- `halal_status` — required, enum: `ifanca_certified | isna_certified | zabiha_certified | self_declared | muslim_owned | unknown`
- `address` — required, max 300 chars
- `lat` / `lng` — required, valid coordinates within supported city bounds
- `neighborhood_id` — required, must exist in `city_id`
- `city_id` — required, must be active city
- `phone` — optional, E.164 format
- `description` — optional, max 1000 chars
- `hours` — optional, all 7 days if provided; `open`/`close` in `HH:MM` 24h format

**Response `201 Created`**
```json
{
  "data": {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "name": "Al-Khyam Bakery",
    "status": "pending",
    "message": "Your listing is under review. We aim to approve within 4 hours."
  }
}
```

**Response Headers:** `Location: /v1/businesses/7c9e6679-7425-40de-944b-e07fc1f90ae7`

**Errors**
| Status | `type` | When |
|---|---|---|
| 422 | `/errors/validation-error` | Field validation failed |
| 422 | `/errors/outside-coverage` | Coordinates outside Chicago bounds |
| 409 | `/errors/conflict` | Same idempotency key with different body |

---

### `PATCH /v1/businesses/:id`
> **MVP** · Bearer Token (owner or admin)

**Purpose:** Update a business listing. Minor edits (phone, hours, photos) go live immediately. Major edits (name, address, halal status) revert status to `pending` and notify admin.

**Headers**
| Header | Notes |
|---|---|
| `If-Match` | Recommended — ETag from last GET for optimistic concurrency |

**Body** — partial (any subset of POST fields)
```json
{
  "phone": "+17731234568",
  "is_temporarily_closed": true
}
```

**Major fields (trigger re-review):** `name`, `address`, `lat`, `lng`, `halal_status`

**Response `200 OK`** — updated business object

**Errors**
| Status | `type` | When |
|---|---|---|
| 403 | `/errors/forbidden` | Not owner or admin |
| 404 | `/errors/not-found` | Business not found |
| 409 | `/errors/content-pending` | Already under admin review — cannot edit |
| 412 | `/errors/precondition-failed` | ETag mismatch — concurrent update detected |

---

### `DELETE /v1/businesses/:id`
> **MVP** · Bearer Token (owner or admin)

**Purpose:** Soft-delete a business listing. Sets `deleted_at = NOW()`. Cron hard-deletes after 30 days. Admin can restore within 24 hours.

**Response:** `204 No Content`

---

### `POST /v1/businesses/:id/claim`
> **MVP** · Bearer Token · Idempotent: Yes

**Purpose:** Initiate business ownership claim. Creates a `business_claims` record. Admin verifies (calls business phone or checks website) within 24 hours. Returns 202 — async operation.

**Body**
```json
{
  "claimant_name": "Yusuf Hassan",
  "claimant_phone": "+13125550200",
  "claimant_role": "owner",
  "notes": "I am the owner — you can verify by calling the business landline."
}
```

**Validation**
- `claimant_name` — required, 2–100 chars
- `claimant_phone` — required, E.164 format
- `claimant_role` — required, enum: `owner | manager | authorized_rep`

**Response `202 Accepted`**
```json
{
  "data": {
    "claim_id": "abc123...",
    "status": "pending",
    "message": "Your claim is under review. We will notify you within 24 hours.",
    "expected_resolution": "2026-04-22T14:30:00.000Z"
  }
}
```

**Response Headers:** `Retry-After: 86400`

**Errors**
| Status | `type` | When |
|---|---|---|
| 409 | `/errors/claim-already-pending` | Business already has pending claim |
| 409 | `/errors/conflict` | User already owns a different claimed business |

---

### `GET /v1/businesses/:id/stats`
> **MVP** · Bearer Token (owner or admin only)

**Purpose:** Business performance stats for the owner portal. "Social proof" before launching analytics dashboard.

**Response `200 OK`**
```json
{
  "data": {
    "period": "last_7_days",
    "views": 214,
    "saves": 18,
    "contact_taps": 23,
    "leads": 4,
    "saves_total": 142
  }
}
```

---

### `POST /v1/businesses/:id/daily-specials`
> **MVP** · Bearer Token (owner or admin)

**Purpose:** Post today's special. Expires at midnight. Appears as "SPECIAL TODAY" banner in feed.

**Body**
```json
{
  "title": "Friday Nihari Special — $8.99",
  "description": "Full bowl with naan. Today only.",
  "photo_key": "media/businesses/550e8400/specials/uuid.jpg"
}
```

**Validation**
- `title` — required, max 100 chars
- `description` — optional, max 300 chars
- `photo_key` — optional, must be a confirmed media_asset key owned by this business

**Response `201 Created`**
```json
{
  "data": {
    "id": "...",
    "title": "Friday Nihari Special — $8.99",
    "expires_at": "2026-04-21T23:59:59.000Z"
  }
}
```

---

## 6. Restaurants (Discovery)

> Read-only endpoints returning businesses filtered to food types: `restaurant | cafe | bakery | grocery | butcher | catering | food_truck | dessert`. Full detail is fetched from `GET /v1/businesses/:id`.

### `GET /v1/restaurants`
> **MVP** · Public

**Purpose:** Browse halal food businesses near a location. The Explore tab "Food" chip and Halal Radar screen both call this.

**Query Params**
| Param | Type | Default | Notes |
|---|---|---|---|
| `city_id` | string | user's city | |
| `lat` | float | — | Required for proximity sort |
| `lng` | float | — | Required for proximity sort |
| `radius_meters` | integer | 8000 | Max 24000 |
| `sub_type` | string | all | `restaurant \| cafe \| bakery \| grocery \| butcher \| catering \| food_truck \| dessert` |
| `halal_cert` | string | all | `certified_only \| any` |
| `open_now` | boolean | false | Filter to currently open |
| `sort` | string | `distance` | `distance \| -updated_at` |
| `cursor` | string | — | |
| `limit` | integer | 20 | |

**Response `200 OK`**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Sabri Nihari",
      "business_type": "restaurant",
      "cuisine_hint": "Pakistani",
      "halal_status": "isna_certified",
      "halal_badge": { "label": "ISNA Certified", "color": "green", "icon": "shield-check" },
      "is_open_now": true,
      "open_status_label": "Open until 10:00 PM",
      "cover_photo_url": "https://media.muzgram.com/businesses/550e8400/cover.jpg",
      "address": "2501 W Devon Ave",
      "distance_meters": 322,
      "distance_label": "0.2 mi away",
      "is_featured": false,
      "save_count": 142,
      "has_daily_special": true
    }
  ],
  "meta": { "cursor": "eyJ...", "hasMore": true },
  "links": { "next": "https://api.muzgram.com/v1/restaurants?cursor=eyJ..." }
}
```

**Response Headers:**
```
Cache-Control: private, max-age=60
```

---

### `GET /v1/restaurants/open-now`
> **MVP** · Bearer Token

**Purpose:** Halal Radar — "I'm hungry right now." Returns open food businesses within 1 mile, distance-sorted. No pagination. Hard-capped at 30 results. No category filter — shows everything open.

**Query Params**
| Param | Type | Required |
|---|---|---|
| `lat` | float | Yes |
| `lng` | float | Yes |
| `radius_meters` | integer | Optional, default 1609 (1 mile), max 4828 (3 miles) |

**Response `200 OK`**
```json
{
  "data": [
    {
      "id": "...",
      "name": "Ghareeb Nawaz",
      "business_type": "restaurant",
      "halal_status": "self_declared",
      "halal_badge": { "label": "Self-Declared Halal", "color": "amber" },
      "is_open_now": true,
      "open_status_label": "Open until 1:00 AM",
      "distance_meters": 98,
      "distance_label": "Right here",
      "cover_photo_url": "https://media.muzgram.com/businesses/.../cover.jpg",
      "phone": "+17731234567",
      "coordinates": { "lat": 41.9990, "lng": -87.6941 }
    }
  ],
  "meta": { "count": 8, "radius_meters": 1609 }
}
```

---

## 7. Services (Discovery)

### `GET /v1/services`
> **MVP** · Public

**Purpose:** Browse local Muslim service providers. Explore tab "Services" chip. Same structure as restaurants endpoint — filtered to `service_provider` business type.

**Query Params**
| Param | Type | Default | Notes |
|---|---|---|---|
| `city_id` | string | user's city | |
| `lat` | float | — | For proximity sort |
| `lng` | float | — | |
| `radius_meters` | integer | 24000 | Services have wider radius (you drive) |
| `sub_category` | string | all | See `service_category` enum in schema |
| `sort` | string | `distance` | `distance \| -updated_at` |
| `cursor` | string | — | |

**Response `200 OK`**
```json
{
  "data": [
    {
      "id": "...",
      "name": "Halal Home Finance LLC",
      "business_type": "service_provider",
      "service_category": "mortgage",
      "service_category_label": "Halal Mortgage",
      "cover_photo_url": null,
      "logo_url": "https://media.muzgram.com/businesses/.../logo.jpg",
      "address": "6550 N Lincoln Ave, Chicago, IL",
      "distance_meters": 2100,
      "distance_label": "1.3 mi away",
      "languages": ["English", "Urdu", "Arabic"],
      "response_time": "Within 24 hours",
      "is_accepting_clients": true,
      "save_count": 34
    }
  ],
  "meta": { "cursor": "eyJ...", "hasMore": false }
}
```

---

### `GET /v1/services/:id`
> **MVP** · Public

**Purpose:** Full service provider profile. Same as `GET /v1/businesses/:id` with service-specific fields included by default.

**Response** — same shape as `GET /v1/businesses/:id` plus:
```json
{
  "data": {
    "...": "...(all business fields)...",
    "service_details": {
      "service_category": "mortgage",
      "languages": ["English", "Urdu"],
      "service_area": "Chicago Metro + suburbs",
      "response_time": "Within 24 hours",
      "is_accepting_clients": true,
      "consultation": "Free initial consultation"
    }
  }
}
```

---

## 8. Events

### `GET /v1/events`
> **MVP** · Public

**Query Params**
| Param | Type | Default | Notes |
|---|---|---|---|
| `city_id` | string | user's city | |
| `lat` | float | — | For proximity sort |
| `lng` | float | — | |
| `radius_meters` | integer | 16000 | Events have wider catchment |
| `category` | string | all | See `event_category` enum |
| `time_window` | string | `upcoming` | `today \| this_week \| upcoming` |
| `free_only` | boolean | false | |
| `sort` | string | `starts_at` | `starts_at \| distance \| -created_at` |
| `cursor` | string | — | |

**Response `200 OK`**
```json
{
  "data": [
    {
      "id": "...",
      "title": "Iftar Dinner & Fundraiser — CIOGC",
      "category": "fundraiser",
      "category_label": "Fundraiser",
      "cover_image_url": "https://media.muzgram.com/events/.../cover.jpg",
      "starts_at": "2026-04-21T20:30:00.000Z",
      "ends_at": "2026-04-21T23:00:00.000Z",
      "starts_at_label": "Tonight, 8:30 PM",
      "is_free": false,
      "price_label": "Suggested $25",
      "is_featured": false,
      "venue_name": "Islamic Foundation of Villa Park",
      "address": "300 W Highridge Rd, Villa Park, IL",
      "distance_meters": 28000,
      "distance_label": "17.4 mi away",
      "organizer": { "id": "...", "display_name": "CIOGC Events" },
      "save_count": 67,
      "is_cancelled": false,
      "external_link": "https://ciogc.org/events/iftar-2026"
    }
  ],
  "meta": { "cursor": "eyJ...", "hasMore": true }
}
```

---

### `GET /v1/events/:id`
> **MVP** · Public

**Response `200 OK`**
```json
{
  "data": {
    "id": "...",
    "title": "Iftar Dinner & Fundraiser — CIOGC",
    "description": "Join us for our annual iftar dinner and fundraiser...",
    "category": "fundraiser",
    "cover_image_url": "https://media.muzgram.com/events/.../cover.jpg",
    "starts_at": "2026-04-21T20:30:00.000Z",
    "ends_at": "2026-04-21T23:00:00.000Z",
    "timezone": "America/Chicago",
    "is_free": false,
    "price_label": "Suggested $25",
    "external_link": "https://ciogc.org/events/iftar-2026",
    "venue_name": "Islamic Foundation of Villa Park",
    "address": "300 W Highridge Rd, Villa Park, IL 60181",
    "coordinates": { "lat": 41.9799, "lng": -87.9736 },
    "organizer": {
      "id": "...",
      "display_name": "CIOGC Events",
      "avatar_url": null
    },
    "is_cancelled": false,
    "is_featured": false,
    "save_count": 67,
    "status": "approved",
    "created_at": "2026-04-18T09:00:00.000Z"
  }
}
```

**Response Headers:** `ETag: "a7b8c9d0"` · `Cache-Control: public, max-age=120`

---

### `POST /v1/events`
> **MVP** · Bearer Token · Idempotent: Yes

**Body**
```json
{
  "title": "Muslim Professionals Networking Night",
  "category": "business_networking",
  "description": "Monthly networking for Chicago Muslim professionals. Light halal refreshments provided.",
  "starts_at": "2026-05-05T18:30:00.000Z",
  "ends_at": "2026-05-05T21:00:00.000Z",
  "is_free": true,
  "price_label": null,
  "external_link": "https://eventbrite.com/...",
  "venue_name": "The Chicago Cultural Center",
  "address": "78 E Washington St, Chicago, IL 60602",
  "lat": 41.8832,
  "lng": -87.6249,
  "neighborhood_id": "the-loop",
  "city_id": "chicago",
  "cover_image_key": "media/events/uuid/cover.jpg"
}
```

**Validation**
- `title` — required, 3–120 chars
- `category` — required, enum (see schema)
- `starts_at` — required, must be in the future (ISO 8601)
- `ends_at` — optional, must be after `starts_at`
- `address` — required, max 300 chars
- `lat` / `lng` — required, within active city bounds
- `city_id` — required, active city
- `is_free` — required, boolean
- `price_label` — required when `is_free = false`, max 50 chars
- `cover_image_key` — optional, confirmed media_asset key
- `external_link` — optional, valid URL, max 500 chars
- `description` — optional, max 500 chars

**Response `201 Created`**
```json
{
  "data": {
    "id": "...",
    "title": "Muslim Professionals Networking Night",
    "status": "pending",
    "message": "Your event is under review. We aim to approve within 1 hour."
  }
}
```

**Errors**
| Status | `type` | When |
|---|---|---|
| 422 | `/errors/validation-error` | Field validation failed |
| 422 | `/errors/outside-coverage` | Coordinates outside supported city |

---

### `PATCH /v1/events/:id`
> **MVP** · Bearer Token (owner or admin)

Partial update. All fields optional. Changing `starts_at` on an approved event reverts to `pending` (requires re-approval).

**Response `200 OK`** — updated event object.

---

### `DELETE /v1/events/:id`
> **MVP** · Bearer Token (owner or admin)

Soft-delete. Sets `deleted_at`.

**Response:** `204 No Content`

---

### `POST /v1/events/:id/cancel`
> **MVP** · Bearer Token (owner or admin) · Idempotent: Yes

**Purpose:** Mark event as cancelled. Triggers push notification to all users who saved it. Cannot undo via API (admin-only override).

**Body**
```json
{ "reason": "Venue unavailable due to weather." }
```

**Validation**
- `reason` — optional, max 200 chars

**Response `200 OK`**
```json
{
  "data": {
    "id": "...",
    "is_cancelled": true,
    "cancelled_at": "2026-04-21T14:30:00.000Z",
    "savers_notified": 67
  }
}
```

**Errors**
| Status | `type` | When |
|---|---|---|
| 409 | `/errors/event-cancelled` | Event already cancelled |

---

## 9. Posts (Community Posts)

### `GET /v1/posts`
> **MVP** · Public

**Query Params**
| Param | Type | Default | Notes |
|---|---|---|---|
| `city_id` | string | user's city | |
| `neighborhood_id` | string | — | Filter to specific neighborhood |
| `category` | string | all | `community \| food_tip \| notice \| question \| recommend` |
| `lat` | float | — | For proximity sort |
| `lng` | float | — | |
| `sort` | string | `-created_at` | `-created_at \| distance` |
| `cursor` | string | — | |

**Response `200 OK`**
```json
{
  "data": [
    {
      "id": "...",
      "body": "Just tried Noon O Kabab's new lamb chops — absolutely incredible. Worth every penny. Highly recommend for a special dinner.",
      "category": "recommend",
      "category_label": "Recommendation",
      "photo_url": "https://media.muzgram.com/posts/.../photo.jpg",
      "neighborhood": { "id": "west-ridge", "name": "West Ridge" },
      "author": {
        "id": "...",
        "display_name": "Sarah M.",
        "avatar_initials": "SM",
        "avatar_color": "#E07B39"
      },
      "created_at": "2026-04-21T12:00:00.000Z",
      "expires_at": "2026-04-28T12:00:00.000Z",
      "time_label": "2 hours ago",
      "status": "approved"
    }
  ],
  "meta": { "cursor": "eyJ...", "hasMore": true }
}
```

---

### `GET /v1/posts/:id`
> **MVP** · Public

**Response `200 OK`** — same as collection item, no additional fields in MVP.

---

### `POST /v1/posts`
> **MVP** · Bearer Token · Idempotent: Yes

**Rate limit:** 5 posts per hour per user. Returns 429 with `Retry-After` if exceeded.

**Body**
```json
{
  "body": "Anyone know a halal caterer for 200 people? Wedding in July. West Ridge area preferred.",
  "category": "question",
  "photo_key": null,
  "neighborhood_id": "west-ridge",
  "city_id": "chicago"
}
```

**Validation**
- `body` — required, 1–500 chars, no HTML
- `category` — required, enum: `community | food_tip | notice | question | recommend`
- `neighborhood_id` — required, must be in `city_id`
- `city_id` — required, active city
- `photo_key` — optional, confirmed media_asset key

**Response `201 Created`**
```json
{
  "data": {
    "id": "...",
    "status": "pending",
    "expires_at": "2026-04-28T12:00:00.000Z",
    "message": "Your post is under review."
  }
}
```

**Errors**
| Status | `type` | When |
|---|---|---|
| 429 | `/errors/post-limit-exceeded` | >5 posts in 1 hour |

---

### `PATCH /v1/posts/:id`
> **MVP** · Bearer Token (own post only, while `status = 'pending'`)

**Body** — `body` and/or `category` only. Cannot edit after approval.

**Errors**
| Status | `type` | When |
|---|---|---|
| 403 | `/errors/forbidden` | Post already approved — cannot edit |

---

### `DELETE /v1/posts/:id`
> **MVP** · Bearer Token (owner or admin)

**Response:** `204 No Content`

---

## 10. Feed

### `GET /v1/feed/now`
> **MVP** · Bearer Token

**Purpose:** The Now Feed. Mixed content (businesses, events, community posts) scored by `recency + proximity + featured_boost`. Featured slots are injected at positions 1 and 2. Cursor is keyset-based on `(score DESC, id)` — immune to featured slot changes between pages.

**Query Params**
| Param | Type | Required | Notes |
|---|---|---|---|
| `lat` | float | Yes | User's current GPS |
| `lng` | float | Yes | |
| `city_id` | string | Yes | |
| `category` | string | No | `food \| events \| services \| community \| all` |
| `cursor` | string | No | Opaque. Follow `links.next`. |
| `limit` | integer | No | Default 20, max 50 |

**Response `200 OK`**
```json
{
  "data": [
    {
      "feed_item_id": "550e8400::business",
      "content_type": "business",
      "is_featured": true,
      "featured_placement": "feed_featured",
      "score": 285,
      "item": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Sabri Nihari",
        "business_type": "restaurant",
        "halal_status": "isna_certified",
        "halal_badge": { "label": "ISNA Certified", "color": "green" },
        "is_open_now": true,
        "open_status_label": "Open until 10:00 PM",
        "cover_photo_url": "https://media.muzgram.com/businesses/550e8400/cover.jpg",
        "address": "2501 W Devon Ave",
        "distance_meters": 322,
        "distance_label": "0.2 mi away",
        "save_count": 142,
        "has_daily_special": true,
        "daily_special_title": "Friday Nihari Special — $8.99"
      }
    },
    {
      "feed_item_id": "abc123::event",
      "content_type": "event",
      "is_featured": false,
      "score": 142,
      "item": {
        "id": "abc123",
        "title": "Iftar Dinner & Fundraiser",
        "category": "fundraiser",
        "cover_image_url": "https://media.muzgram.com/events/abc123/cover.jpg",
        "starts_at": "2026-04-21T20:30:00.000Z",
        "starts_at_label": "Tonight, 8:30 PM",
        "is_free": false,
        "venue_name": "Islamic Foundation",
        "distance_label": "0.8 mi away",
        "save_count": 67
      }
    }
  ],
  "meta": {
    "cursor": "eyJsYXN0U2NvcmUiOjE0MiwibGFzdElkIjoiYWJjMTIzIn0",
    "hasMore": true,
    "generated_at": "2026-04-21T14:30:00.000Z"
  },
  "links": {
    "next": "https://api.muzgram.com/v1/feed/now?cursor=eyJ...&lat=41.9989&lng=-87.6939&city_id=chicago"
  }
}
```

**Response Headers:**
```
Cache-Control: private, max-age=60
```

**Errors**
| Status | `type` | When |
|---|---|---|
| 422 | `/errors/validation-error` | Missing `lat`, `lng`, or `city_id` |
| 422 | `/errors/outside-coverage` | City not active |

---

### `GET /v1/feed/explore`
> **MVP** · Public

**Purpose:** Explore tab — browse all approved content by category. Not time-gated. Sorted by proximity + recency (no score weighting).

**Query Params** — same as `/v1/feed/now` plus:
| Param | Type | Notes |
|---|---|---|
| `sub_category` | string | Sub-filter within category (e.g., `cafe` within `food`) |
| `sort` | string | `distance` (default) or `-created_at` |

**Response** — same envelope as `/v1/feed/now`. Featured items still injected at top.

---

### `GET /v1/feed/live`
> **MVP** · Bearer Token

**Purpose:** "Live Now" horizontal strip on the home screen. Returns events happening right now + restaurants open right now + community posts from the last 2 hours. Maximum 15 items. No pagination.

**Query Params**
| Param | Type | Required |
|---|---|---|
| `lat` | float | Yes |
| `lng` | float | Yes |
| `city_id` | string | Yes |
| `radius_meters` | integer | No, default 4800 |

**Response `200 OK`**
```json
{
  "data": [
    {
      "live_type": "event_happening_now",
      "id": "...",
      "title": "Youth Basketball at CIOGC",
      "category_color": "#4A90D9",
      "starts_at": "2026-04-21T14:00:00.000Z",
      "ends_at": "2026-04-21T17:00:00.000Z",
      "distance_label": "0.4 mi away"
    },
    {
      "live_type": "restaurant_open",
      "id": "...",
      "name": "Ghareeb Nawaz",
      "business_type": "restaurant",
      "close_status_label": "Open for 6 more hours",
      "distance_label": "Right here"
    }
  ],
  "meta": { "count": 2, "generated_at": "2026-04-21T14:30:00.000Z" }
}
```

---

## 11. Map

### `GET /v1/map/pins`
> **MVP** · Public

**Purpose:** All map pins within a viewport bounding box. Lightweight — no descriptions or photos. Tap → fetch detail from `/v1/businesses/:id` or `/v1/events/:id`.

**Query Params**
| Param | Type | Required | Notes |
|---|---|---|---|
| `north` | float | Yes | Viewport bounds |
| `south` | float | Yes | |
| `east` | float | Yes | |
| `west` | float | Yes | |
| `city_id` | string | Yes | |
| `category` | string | No | `food \| events \| services \| community \| all` |

**Response `200 OK`**

If pin count ≤ 200, returns raw pins. If count > 200, returns cluster cells.

**Raw pins:**
```json
{
  "data": {
    "mode": "pins",
    "pins": [
      {
        "id": "550e8400-...",
        "content_type": "business",
        "name": "Sabri Nihari",
        "lat": 41.9989,
        "lng": -87.6939,
        "category": "restaurant",
        "pin_color": "#E07B39",
        "is_featured": false,
        "is_live": true,
        "halal_status": "isna_certified"
      },
      {
        "id": "abc123",
        "content_type": "event",
        "name": "Iftar Dinner & Fundraiser",
        "lat": 41.9921,
        "lng": -87.6878,
        "category": "fundraiser",
        "pin_color": "#4A90D9",
        "is_featured": true,
        "is_live": false,
        "starts_at": "2026-04-21T20:30:00.000Z"
      }
    ],
    "count": 2
  }
}
```

**Cluster cells (when count > 200):**
```json
{
  "data": {
    "mode": "clusters",
    "clusters": [
      { "lat": 41.9985, "lng": -87.6935, "count": 47, "dominant_type": "restaurant" }
    ]
  }
}
```

**Response Headers:** `Cache-Control: private, max-age=120`

---

### `GET /v1/map/pin/:contentType/:id`
> **MVP** · Public

**Purpose:** Quick preview card for map bottom sheet (35% snap point). Returns only what the preview card needs — not the full detail. Avoids fetching full business profile until user swipes up.

**Path params:** `contentType` = `business | event | post`

**Response `200 OK`**
```json
{
  "data": {
    "id": "550e8400-...",
    "content_type": "business",
    "name": "Sabri Nihari",
    "subtitle": "Pakistani · ISNA Certified · Open now",
    "cover_photo_url": "https://media.muzgram.com/businesses/550e8400/cover.jpg",
    "distance_label": "0.2 mi away",
    "cta_primary": { "label": "Directions", "action": "directions", "lat": 41.9989, "lng": -87.6939 },
    "cta_secondary": { "label": "View Details", "action": "navigate", "path": "/businesses/550e8400-..." },
    "is_saved": false
  }
}
```

---

## 12. Saves

### `GET /v1/saves`
> **MVP** · Bearer Token

**Purpose:** Saved items screen — paginated list of all saved content with countdown labels for events.

**Query Params**
| Param | Type | Default | Notes |
|---|---|---|---|
| `type` | string | all | `business \| event \| post \| all` |
| `cursor` | string | — | |
| `limit` | integer | 20 | |

**Response `200 OK`**
```json
{
  "data": [
    {
      "save_id": "...",
      "saved_at": "2026-04-20T10:00:00.000Z",
      "target_type": "event",
      "target_id": "abc123",
      "item": {
        "id": "abc123",
        "title": "Iftar Dinner & Fundraiser",
        "cover_image_url": "https://media.muzgram.com/events/abc123/cover.jpg",
        "starts_at": "2026-04-21T20:30:00.000Z",
        "countdown_label": "Tonight!",
        "countdown_urgency": "high",
        "is_cancelled": false,
        "status": "approved"
      }
    },
    {
      "save_id": "...",
      "saved_at": "2026-04-19T08:00:00.000Z",
      "target_type": "business",
      "target_id": "550e8400-...",
      "item": {
        "id": "550e8400-...",
        "name": "Sabri Nihari",
        "cover_photo_url": "https://media.muzgram.com/businesses/550e8400/cover.jpg",
        "is_open_now": true,
        "status": "approved"
      }
    }
  ],
  "meta": { "cursor": "eyJ...", "hasMore": false }
}
```

**Countdown urgency labels:**
- `today` → "Today!" (rose/pulse)
- `tomorrow` → "Tomorrow" (amber)
- `within_week` → "In 3 days"
- `passed` → "Past" (grayed, archived to bottom)

---

### `POST /v1/saves`
> **MVP** · Bearer Token · Idempotent: Yes

**Body**
```json
{ "target_type": "event", "target_id": "abc123" }
```

**Validation**
- `target_type` — required, enum: `business | event | post`
- `target_id` — required, UUID, target must exist and be `approved`

**Response `201 Created`**
```json
{
  "data": { "save_id": "...", "target_type": "event", "target_id": "abc123", "saved_at": "2026-04-21T14:30:00.000Z" }
}
```

**Errors**
| Status | `type` | When |
|---|---|---|
| 404 | `/errors/not-found` | Target content not found |
| 409 | `/errors/conflict` | Already saved (idempotent — return 200 with existing save instead) |

> **Design note:** On duplicate save, return `200 OK` with the existing save record rather than `409`. This simplifies mobile optimistic UI.

---

### `DELETE /v1/saves/:targetType/:targetId`
> **MVP** · Bearer Token

**Response:** `204 No Content`

---

### `GET /v1/saves/check`
> **MVP** · Bearer Token

**Purpose:** Batch-check saved status for multiple items. Called when rendering a feed page to set initial save button state. Single-item check is also supported.

**Query Params**
```
?items[0][type]=business&items[0][id]=550e8400
&items[1][type]=event&items[1][id]=abc123
```

**Response `200 OK`**
```json
{
  "data": [
    { "target_type": "business", "target_id": "550e8400-...", "is_saved": true, "save_id": "..." },
    { "target_type": "event", "target_id": "abc123", "is_saved": false, "save_id": null }
  ]
}
```

---

## 13. Leads

### `POST /v1/leads`
> **MVP** · Bearer Token · Idempotent: Yes

**Purpose:** Submit a service enquiry. Rate limited to 3 leads from same user to same provider per 7-day rolling window (Redis sorted set).

**Body**
```json
{
  "business_id": "7c9e6679-...",
  "message": "Looking for halal mortgage advice for a home purchase in Skokie. Please call me."
}
```

**Validation**
- `business_id` — required, must be an active service provider (not restaurant)
- `message` — optional, max 150 chars, no HTML
- User's phone (from auth) is automatically attached — no need to submit

**Response `201 Created`**
```json
{
  "data": {
    "lead_id": "...",
    "status": "submitted",
    "message": "Your enquiry was sent. Halal Home Finance LLC will contact you directly."
  }
}
```

**Errors**
| Status | `type` | When |
|---|---|---|
| 404 | `/errors/not-found` | Business not found |
| 409 | `/errors/conflict` | Business is not a service provider |
| 429 | `/errors/lead-limit-exceeded` | >3 leads to same business in 7 days |

---

### `GET /v1/leads/inbox`
> **MVP** · Bearer Token · Roles: `business_owner, admin`

**Purpose:** Business owner's incoming lead inbox.

**Query Params**
| Param | Type | Default |
|---|---|---|
| `business_id` | string | owner's business (auto from auth) |
| `status` | string | `all` |
| `cursor` | string | — |

**Response `200 OK`**
```json
{
  "data": [
    {
      "id": "...",
      "sender": {
        "display_name": "Omar H.",
        "phone": "+13125550300"
      },
      "message": "Looking for halal mortgage advice for a home purchase in Skokie.",
      "is_read": false,
      "submitted_at": "2026-04-21T13:45:00.000Z"
    }
  ],
  "meta": { "cursor": "eyJ...", "hasMore": false, "unread_count": 1 }
}
```

---

### `PATCH /v1/leads/:id/read`
> **MVP** · Bearer Token (lead recipient only)

**Response:** `204 No Content`

---

## 14. Media

### `POST /v1/media/presign`
> **MVP** · Bearer Token · Idempotent: Yes

**Purpose:** Step 1 of upload flow. Returns a pre-signed R2 PUT URL. Mobile uploads directly to R2 — API server never buffers file bytes.

**Body**
```json
{
  "owner_type": "business",
  "owner_id": "550e8400-...",
  "mime_type": "image/jpeg",
  "size_bytes": 2048000,
  "purpose": "cover_photo"
}
```

**Validation**
- `owner_type` — required, enum: `business | event | post | avatar`
- `owner_id` — required, UUID — user must own or be admin of this resource
- `mime_type` — required, must be: `image/jpeg | image/png | image/webp | image/heic`
- `size_bytes` — required, max 10,485,760 (10 MB)
- `purpose` — optional, enum: `cover_photo | logo | gallery | avatar | post_photo | special_photo`

**Response `200 OK`**
```json
{
  "data": {
    "key": "media/businesses/550e8400/7c9e6679.jpg",
    "upload_url": "https://upload.muzgram-r2.com/media/businesses/550e8400/7c9e6679.jpg?X-Amz-Signature=...",
    "public_url": "https://media.muzgram.com/media/businesses/550e8400/7c9e6679.jpg",
    "upload_method": "PUT",
    "expires_at": "2026-04-21T14:35:00.000Z",
    "required_headers": {
      "Content-Type": "image/jpeg",
      "Content-Length": "2048000"
    }
  }
}
```

**Errors**
| Status | `type` | When |
|---|---|---|
| 422 | `/errors/media-too-large` | `size_bytes` > 10 MB |
| 422 | `/errors/media-type-forbidden` | MIME type not in allowed list |
| 403 | `/errors/forbidden` | User doesn't own `owner_id` resource |

---

### `POST /v1/media/confirm`
> **MVP** · Bearer Token · Idempotent: Yes

**Purpose:** Step 2. Called after successful R2 PUT. Creates `media_assets` DB record. If `purpose = 'cover_photo'`, also updates the parent resource's `cover_photo_url`.

**Body**
```json
{
  "key": "media/businesses/550e8400/7c9e6679.jpg",
  "owner_type": "business",
  "owner_id": "550e8400-...",
  "purpose": "cover_photo",
  "sort_order": 1
}
```

**Response `201 Created`**
```json
{
  "data": {
    "id": "...",
    "key": "media/businesses/550e8400/7c9e6679.jpg",
    "public_url": "https://media.muzgram.com/media/businesses/550e8400/7c9e6679.jpg",
    "purpose": "cover_photo",
    "sort_order": 1,
    "created_at": "2026-04-21T14:31:00.000Z"
  }
}
```

**Errors**
| Status | `type` | When |
|---|---|---|
| 404 | `/errors/not-found` | `key` does not exist in R2 (upload failed or not yet done) |
| 409 | `/errors/conflict` | `key` already confirmed |

---

### `DELETE /v1/media/:id`
> **MVP** · Bearer Token (owner or admin)

**Purpose:** Delete media asset from DB and purge from R2.

**Response:** `204 No Content`

---

## 15. Search

### `GET /v1/search`
> **MVP** · Bearer Token

**Purpose:** Full-text search across businesses, events, and community posts. PostgreSQL `tsvector` + GIN index. Results ranked by `ts_rank × proximity_weight`. Query sanitized with `plainto_tsquery`.

**Query Params**
| Param | Type | Required | Notes |
|---|---|---|---|
| `q` | string | Yes | Min 2 chars, max 100 chars |
| `city_id` | string | Yes | |
| `category` | string | No | `food \| events \| services \| community \| all` |
| `lat` | float | No | Enables proximity re-ranking |
| `lng` | float | No | |
| `radius_meters` | integer | No | Default: no radius restriction |
| `limit` | integer | No | Default 20, max 50 |

**Response `200 OK`**
```json
{
  "data": {
    "query": "nihari devon",
    "result_label": "8 results near West Ridge",
    "results": [
      {
        "content_type": "business",
        "relevance_score": 0.94,
        "item": {
          "id": "550e8400-...",
          "name": "Sabri Nihari",
          "business_type": "restaurant",
          "address": "2501 W Devon Ave",
          "halal_status": "isna_certified",
          "distance_label": "0.2 mi away",
          "is_open_now": true
        },
        "highlights": {
          "name": "<mark>Nihari</mark>",
          "description": "Famous for slow-cooked <mark>nihari</mark>..."
        }
      }
    ],
    "tabs": {
      "all": 8,
      "food": 5,
      "events": 2,
      "services": 1,
      "community": 0
    }
  }
}
```

**Validation**
- `q` — required, 2–100 chars; special characters stripped before `plainto_tsquery`
- `city_id` — required

**Errors**
| Status | `type` | When |
|---|---|---|
| 422 | `/errors/validation-error` | `q` too short (<2 chars) or missing |

---

## 16. Notifications

### `GET /v1/notifications/preferences`
> **MVP** · Bearer Token

**Response `200 OK`**
```json
{
  "data": {
    "nearby_events": true,
    "event_day_reminder": true,
    "lead_received": true,
    "event_cancelled": true,
    "listing_approved": true,
    "quiet_hours_enabled": true,
    "quiet_start": "22:00",
    "quiet_end": "07:00",
    "timezone": "America/Chicago"
  }
}
```

---

### `PATCH /v1/notifications/preferences`
> **MVP** · Bearer Token

**Body** — any subset of preference fields
```json
{
  "nearby_events": false,
  "quiet_start": "21:00"
}
```

**Validation**
- All boolean fields — optional booleans
- `quiet_start` / `quiet_end` — `HH:MM` 24-hour format

**Response `200 OK`** — updated preferences object.

---

### `GET /v1/notifications`
> **MVP** · Bearer Token

**Purpose:** Notification history. Used for the notification bell badge count and (MMP) in-app notification center.

**Query Params**
| Param | Type | Default |
|---|---|---|
| `status` | string | `all` (`all \| unread`) |
| `limit` | integer | 50 |
| `cursor` | string | — |

**Response `200 OK`**
```json
{
  "data": [
    {
      "id": "...",
      "type": "nearby_event",
      "title": "Iftar Bazaar near you",
      "body": "A community iftar bazaar is happening 0.8 mi from you today.",
      "deep_link": "muzgram://event/abc123",
      "is_read": false,
      "created_at": "2026-04-21T08:00:00.000Z"
    }
  ],
  "meta": { "cursor": "eyJ...", "hasMore": false, "unread_count": 3 }
}
```

---

### `PATCH /v1/notifications/:id/read`
> **MVP** · Bearer Token

**Response:** `204 No Content`

---

### `POST /v1/notifications/read-all`
> **MVP** · Bearer Token · Idempotent: Yes

**Response:** `204 No Content`

---

## 17. Reports

### `POST /v1/reports`
> **MVP** · Bearer Token · Idempotent: Yes

**Purpose:** Report inappropriate content. Triggers `CHECK_REPORT_THRESHOLD` Bull job — auto-suspends content on 3rd report within 24 hours.

**Body**
```json
{
  "target_type": "business",
  "target_id": "550e8400-...",
  "reason": "incorrect_info",
  "description": "This business claims IFANCA certification but I've confirmed they don't have it."
}
```

**Validation**
- `target_type` — required, enum: `business | event | post | user`
- `target_id` — required, UUID, must exist
- `reason` — required, enum: `spam | inappropriate | incorrect_info | duplicate | hate_speech | other`
- `description` — optional, max 500 chars

**Response `201 Created`**
```json
{
  "data": {
    "report_id": "...",
    "status": "received",
    "message": "Thank you. Our team will review this report within 24 hours."
  }
}
```

**Errors**
| Status | `type` | When |
|---|---|---|
| 404 | `/errors/not-found` | Target content not found |
| 409 | `/errors/conflict` | User already reported this content (idempotent — return existing report) |

---

### `GET /v1/reports/mine`
> **MVP** · Bearer Token

**Purpose:** Returns IDs of content the current user has already reported. Mobile uses this to show "Already reported" instead of the Report button. Reduces duplicate submissions.

**Response `200 OK`**
```json
{
  "data": [
    { "target_type": "business", "target_id": "550e8400-...", "reported_at": "2026-04-20T10:00:00.000Z" }
  ]
}
```

---

## 18. Analytics

### `POST /v1/analytics/events`
> **MVP** · Bearer Token · Fire-and-forget

**Purpose:** Receive client-side analytics events in batches. **Always returns 200** — analytics failures never surface to the user. Events are enqueued in Bull for async batch insert into `activity_logs`.

**Body**
```json
{
  "events": [
    {
      "event_name": "feed_card_tapped",
      "properties": {
        "target_type": "business",
        "target_id": "550e8400-...",
        "position": 3,
        "category": "food",
        "is_featured": false,
        "feed_type": "now"
      },
      "occurred_at": "2026-04-21T14:30:00.000Z",
      "session_id": "sess_abc123"
    },
    {
      "event_name": "share_tapped",
      "properties": {
        "target_type": "event",
        "target_id": "abc123",
        "channel": "whatsapp"
      },
      "occurred_at": "2026-04-21T14:31:00.000Z",
      "session_id": "sess_abc123"
    }
  ]
}
```

**Validation** (soft — failures are logged, not rejected)
- `events` — required array, max 50 events per batch
- `event_name` — required, max 100 chars
- `occurred_at` — required, ISO 8601, must be within last 24 hours
- `session_id` — optional, max 128 chars

**Tracked event names:**
```
feed_viewed          feed_card_tapped     map_opened
map_pin_tapped       explore_opened       category_tapped
save_toggled         share_tapped         directions_tapped
call_tapped          whatsapp_tapped      lead_submitted
search_performed     search_result_tapped post_created
event_created        business_created     app_opened
session_ended        halal_radar_opened   halal_radar_result_tapped
```

**Response `200 OK`** — always, even on internal failure.
```json
{ "data": { "accepted": 2, "queued": true } }
```

---

### `POST /v1/analytics/sessions`
> **MVP** · Bearer Token

**Purpose:** Log app open / session start. Captures `source` for attribution. Separate from event batching because it's time-sensitive (used for D7/D30 retention calculation).

**Body**
```json
{
  "source": "push_notification",
  "push_type": "nearby_event",
  "app_version": "1.0.0",
  "platform": "ios",
  "session_id": "sess_abc123"
}
```

**Validation**
- `source` — required, enum: `direct | push_notification | deep_link | share`
- `push_type` — required if `source = "push_notification"`

**Response `201 Created`**
```json
{ "data": { "session_id": "sess_abc123", "recorded": true } }
```

---

## 19. Admin Moderation

> All `/v1/admin/*` routes require `Authorization: Bearer <clerk_jwt>` with `role: admin | super_admin`. Admin role is verified against the DB row on every request — not from the JWT claim alone.

### `GET /v1/admin/queue`
> **MVP** · Roles: `moderator, admin, super_admin`

**Purpose:** Unified moderation queue — all pending content, oldest first. The primary admin workflow screen.

**Query Params**
| Param | Type | Default | Notes |
|---|---|---|---|
| `type` | string | all | `business \| event \| post \| claim \| all` |
| `sort` | string | `created_at` | Oldest first (SLA enforcement) |
| `limit` | integer | 50 | |
| `offset` | integer | 0 | Offset pagination for admin tables |

**Response `200 OK`**
```json
{
  "data": [
    {
      "queue_item_id": "550e8400-...",
      "content_type": "business",
      "status": "pending",
      "sla_deadline": "2026-04-21T18:30:00.000Z",
      "sla_urgency": "overdue",
      "item": {
        "id": "550e8400-...",
        "name": "Al-Khyam Bakery",
        "business_type": "bakery",
        "halal_status": "self_declared",
        "address": "2755 W Devon Ave, Chicago, IL",
        "submitter": { "id": "...", "display_name": "Yusuf A.", "phone": "+13125550100" },
        "created_at": "2026-04-21T10:00:00.000Z",
        "report_count": 0
      }
    }
  ],
  "meta": { "total": 14, "offset": 0, "limit": 50 }
}
```

**SLA urgency:**
- `on_track` — within SLA window
- `at_risk` — <30 minutes remaining
- `overdue` — past SLA

---

### Business Moderation Actions

```
PATCH /v1/admin/businesses/:id/approve
PATCH /v1/admin/businesses/:id/reject
PATCH /v1/admin/businesses/:id/suspend
PATCH /v1/admin/businesses/:id/feature
PATCH /v1/admin/businesses/:id/halal-status
PATCH /v1/admin/businesses/:id/auto-approve
```

**`PATCH /v1/admin/businesses/:id/approve`**
> **MVP** · Roles: `moderator, admin`

**Body**
```json
{ "note": "Verified IFANCA cert on their website." }
```

**Response `200 OK`**
```json
{
  "data": {
    "id": "...",
    "status": "approved",
    "approved_at": "2026-04-21T14:30:00.000Z",
    "moderation_action_id": "..."
  }
}
```

Side effects: push notification to business owner ("Your listing is live!"), invalidate feed cache for city.

---

**`PATCH /v1/admin/businesses/:id/reject`**
> **MVP** · Roles: `moderator, admin`

**Body**
```json
{
  "reason": "duplicate",
  "note": "Duplicate of Sabri Nihari listing already approved."
}
```

**Validation**
- `reason` — required, enum: `duplicate | outside_coverage | incomplete | spam | inappropriate | other`

Side effects: push notification to submitter with reason.

---

**`PATCH /v1/admin/businesses/:id/feature`**
> **MVP** · Roles: `admin, super_admin`

**Body**
```json
{
  "placement": "feed_featured",
  "ends_at": "2026-04-28T23:59:59.000Z"
}
```

**Validation**
- `placement` — required, enum: `feed_featured | explore_featured | map_featured_pin | category_banner | campaign_spotlight`
- `ends_at` — required, future datetime

---

**`PATCH /v1/admin/businesses/:id/halal-status`**
> **MVP** · Roles: `admin, super_admin`

**Body**
```json
{ "halal_status": "ifanca_certified", "note": "Verified via IFANCA certification portal #4421" }
```

---

### Event Moderation Actions
```
PATCH /v1/admin/events/:id/approve    — { note? }
PATCH /v1/admin/events/:id/reject     — { reason, note? }
PATCH /v1/admin/events/:id/feature    — { placement, ends_at }
```

### Post Moderation Actions
```
PATCH /v1/admin/posts/:id/approve     — { note? }
PATCH /v1/admin/posts/:id/reject      — { reason, note? }
```

### Business Claim Actions
```
PATCH /v1/admin/businesses/:id/claims/:claimId/approve  — { note? }  → sets is_claimed=true, upgrades user role to business_owner
PATCH /v1/admin/businesses/:id/claims/:claimId/reject   — { reason, note? }
```

---

### `GET /v1/admin/users`
> **MVP** · Roles: `admin, super_admin`

**Query Params**
| Param | Type | Default |
|---|---|---|
| `status` | string | all |
| `role` | string | all |
| `city_id` | string | all |
| `q` | string | — (search by name or phone) |
| `sort` | string | `-created_at` |
| `limit` | integer | 50 |
| `offset` | integer | 0 |

**Response `200 OK`**
```json
{
  "data": [
    {
      "id": "...",
      "display_name": "Yusuf A.",
      "phone": "+13125550100",
      "role": "business_owner",
      "status": "active",
      "neighborhood": "West Ridge",
      "posts_count": 12,
      "reports_against_count": 0,
      "created_at": "2026-04-01T00:00:00.000Z",
      "last_active_at": "2026-04-21T13:00:00.000Z"
    }
  ],
  "meta": { "total": 487, "offset": 0, "limit": 50 }
}
```

---

### User Management Actions
```
PATCH /v1/admin/users/:id/suspend       — { reason, duration_days? }
PATCH /v1/admin/users/:id/ban           — { reason }
PATCH /v1/admin/users/:id/restore       — { note? }  → clears suspension/ban
PATCH /v1/admin/users/:id/role          — { role }   → super_admin only
PATCH /v1/admin/users/:id/auto-approve  — { events: bool, posts: bool }
```

---

### `GET /v1/admin/featured-slots`
> **MVP** · Roles: `admin, super_admin`

**Response `200 OK`**
```json
{
  "data": {
    "slots": [
      {
        "slot_id": "...",
        "placement": "feed_featured",
        "position": 1,
        "occupant": {
          "business_id": "550e8400-...",
          "name": "Sabri Nihari",
          "featured_since": "2026-04-14T00:00:00.000Z",
          "featured_until": "2026-04-28T23:59:59.000Z",
          "days_remaining": 7
        }
      },
      {
        "slot_id": "...",
        "placement": "feed_featured",
        "position": 2,
        "occupant": null,
        "fallback": "organic_top_content"
      }
    ],
    "summary": {
      "total_active": 3,
      "total_capacity": 6,
      "expiring_within_48h": 1
    }
  }
}
```

---

### Featured Slot Actions
```
POST   /v1/admin/featured-slots              — { business_id, placement, ends_at }
PATCH  /v1/admin/featured-slots/:id         — { ends_at } (extend)
DELETE /v1/admin/featured-slots/:id         — remove immediately (204)
```

---

### `GET /v1/admin/reports`
> **MVP** · Roles: `moderator, admin`

**Query Params:** `status` (pending|resolved), `target_type`, `sort=-created_at`, `limit`, `offset`

**Response `200 OK`**
```json
{
  "data": [
    {
      "id": "...",
      "target_type": "business",
      "target_id": "550e8400-...",
      "target_name": "Sabri Nihari",
      "reason": "incorrect_info",
      "description": "This business claims IFANCA certification but I've confirmed they don't have it.",
      "reporter": { "id": "...", "display_name": "Sarah M." },
      "status": "pending",
      "same_target_report_count": 2,
      "created_at": "2026-04-21T10:00:00.000Z"
    }
  ],
  "meta": { "total": 7, "offset": 0 }
}
```

---

### `PATCH /v1/admin/reports/:id/resolve`
> **MVP** · Roles: `moderator, admin`

**Body**
```json
{
  "action": "remove_content",
  "note": "Claim verified as false — halal status reverted to unknown."
}
```

**Validation**
- `action` — required, enum: `dismiss | remove_content | suspend_user | ban_user | update_content`

**Response `200 OK`**
```json
{
  "data": {
    "report_id": "...",
    "status": "resolved",
    "action_taken": "remove_content",
    "moderation_action_id": "..."
  }
}
```

---

### `GET /v1/admin/stats/overview`
> **MVP** · Roles: `admin, super_admin`

**Response `200 OK`**
```json
{
  "data": {
    "period": "today",
    "new_users_today": 23,
    "new_users_this_week": 147,
    "pending_approvals": 8,
    "pending_reports": 2,
    "active_listings": 94,
    "active_events": 12,
    "active_posts": 38,
    "featured_slots_active": 4,
    "leads_this_week": 31,
    "total_users": 487,
    "total_businesses": 94,
    "total_events": 67
  }
}
```

---

### `GET /v1/admin/stats/users`
> **MVP** · Roles: `admin, super_admin`

**Query Params:** `days` (integer, default 30)

**Response `200 OK`**
```json
{
  "data": {
    "period_days": 30,
    "total_new_users": 487,
    "by_day": [
      { "date": "2026-04-21", "new_users": 23, "active_users": 156 }
    ],
    "by_neighborhood": [
      { "neighborhood": "West Ridge", "user_count": 203 },
      { "neighborhood": "Rogers Park", "user_count": 91 }
    ],
    "retention": {
      "d7_estimate": 0.38,
      "d30_estimate": 0.22
    }
  }
}
```

---

## 20. Comments *(MMP — not built in MVP)*

> Deferred to MMP. Design documented here for planning. Do not implement in the 8-week build.

```
GET    /v1/events/:id/comments           → paginated comments
GET    /v1/posts/:id/comments            → paginated comments
POST   /v1/:contentType/:id/comments     → create comment
PATCH  /v1/comments/:id                  → edit own comment (within 15 min)
DELETE /v1/comments/:id                  → soft-delete own comment
POST   /v1/comments/:id/report           → report a comment
```

**Comment body:**
```json
{
  "body": "This is such a great event! Will definitely attend.",
  "parent_comment_id": null
}
```

Threaded to max 2 levels. `parent_comment_id` must be a top-level comment (not a reply).

---

## 21. Likes *(MMP — not built in MVP)*

> Deferred. MVP has no like/reaction system on any content.

```
POST   /v1/likes                         → { target_type, target_id, reaction_type }
DELETE /v1/likes/:targetType/:targetId   → remove reaction
GET    /v1/likes/check                   → batch check like status
```

`reaction_type` enum (MMP): `like | helpful | love | pray`

---

## 22. Billing *(MMP — Stripe integration)*

> Manual bank transfer / PayID in MVP. These endpoints are stubs for MMP. Do not build until Stripe is integrated.

```
GET    /v1/billing/plans                 → list promotion_plans with pricing
POST   /v1/billing/checkout              → create Stripe Checkout session → { checkout_url }
GET    /v1/billing/subscription          → current subscription (business owner)
POST   /v1/billing/portal               → Stripe Customer Portal URL
POST   /v1/billing/webhooks/stripe      → Stripe webhook handler (Public, verified by signature)
```

**Webhook events handled:**
- `checkout.session.completed` → activate `promoted_listings` row
- `invoice.payment_failed` → send push to business owner
- `customer.subscription.deleted` → deactivate featured slot

---

## 23. Bonus Modules

### Friday Finder (Jummah Locator)

```
GET /v1/mosques?city_id=chicago&lat=41.9989&lng=-87.6939&radius_meters=8000
```

**Response**
```json
{
  "data": [
    {
      "id": "...",
      "name": "Masjid Al-Faatir",
      "address": "1257 W Devon Ave",
      "distance_label": "0.1 mi away",
      "jummah_times": [
        { "time": "12:30", "language": "English/Arabic", "imam": "Sheikh Abdullah" },
        { "time": "13:30", "language": "Urdu/Arabic", "imam": "Sheikh Ibrahim" }
      ],
      "parking_notes": "Street parking on Greenview Ave"
    }
  ]
}
```

```
GET  /v1/mosques/:id/jummah-times        → single mosque jummah schedule
PATCH /v1/mosques/:id/jummah-times      → mosque admin updates times (admin or claimed mosque owner)
```

---

### Ramadan Mode

```
GET /v1/ramadan/season                   → active ramadan_season details (null if not Ramadan)
GET /v1/ramadan/feed?lat=&lng=&city_id=  → Ramadan-specific feed (iftar specials, events)
GET /v1/ramadan/prayer-times/:cityId/:date → { fajr, sunrise, dhuhr, asr, maghrib, isha }
POST /v1/ramadan/specials                → restaurant posts tonight's iftar special
```

**Ramadan feed** only returns results when `ramadan_seasons.is_active = true`. Otherwise returns `404 Not Found`. Mobile checks this on app open to decide whether to show the Ramadan UI.

---

### Notice Board

```
GET  /v1/notice-board?city_id=&category=&cursor=
POST /v1/notice-board                    → create notice board post
GET  /v1/notice-board/:id
DELETE /v1/notice-board/:id
```

**Categories:** `housing | rideshare | jobs | free_items | for_sale | lost_found | help_needed | announcement`

Posts expire in 30 days. Housing and Jobs sub-categories require admin approval.

---

### Campaigns

```
GET /v1/campaigns/active?city_id=        → active campaign (null if none running)
GET /v1/campaigns/:id/feed?lat=&lng=     → campaign spotlight feed (Muslim Business Week)
POST /v1/campaigns/:id/specials          → business posts campaign special
```

---

## 24. Quick Reference — All Endpoints

| # | Method | Path | Auth | Phase |
|---|---|---|---|---|
| 1 | POST | /v1/auth/session | Public+JWT | MVP |
| 2 | GET | /v1/auth/me | Bearer | MVP |
| 3 | POST | /v1/auth/push-tokens | Bearer | MVP |
| 4 | DELETE | /v1/auth/push-tokens/:deviceId | Bearer | MVP |
| 5 | DELETE | /v1/auth/session | Bearer | MVP |
| 6 | DELETE | /v1/auth/account | Bearer | MVP |
| 7 | GET | /v1/onboarding/status | Bearer | MVP |
| 8 | PATCH | /v1/onboarding/location | Bearer | MVP |
| 9 | PATCH | /v1/onboarding/profile | Bearer | MVP |
| 10 | GET | /v1/users/me | Bearer | MVP |
| 11 | PATCH | /v1/users/me | Bearer | MVP |
| 12 | GET | /v1/users/:id | Bearer | MVP |
| 13 | GET | /v1/users/me/content | Bearer | MVP |
| 14 | GET | /v1/geo/cities | Public | MVP |
| 15 | GET | /v1/geo/neighborhoods | Public | MVP |
| 16 | GET | /v1/geo/reverse | Bearer | MVP |
| 17 | POST | /v1/geo/geocode | Bearer | MVP |
| 18 | GET | /v1/businesses | Bearer | MVP |
| 19 | GET | /v1/businesses/:id | Public | MVP |
| 20 | POST | /v1/businesses | Bearer | MVP |
| 21 | PATCH | /v1/businesses/:id | Bearer | MVP |
| 22 | DELETE | /v1/businesses/:id | Bearer | MVP |
| 23 | POST | /v1/businesses/:id/claim | Bearer | MVP |
| 24 | GET | /v1/businesses/:id/stats | Bearer(owner) | MVP |
| 25 | POST | /v1/businesses/:id/daily-specials | Bearer(owner) | MVP |
| 26 | GET | /v1/restaurants | Public | MVP |
| 27 | GET | /v1/restaurants/open-now | Bearer | MVP |
| 28 | GET | /v1/services | Public | MVP |
| 29 | GET | /v1/services/:id | Public | MVP |
| 30 | GET | /v1/events | Public | MVP |
| 31 | GET | /v1/events/:id | Public | MVP |
| 32 | POST | /v1/events | Bearer | MVP |
| 33 | PATCH | /v1/events/:id | Bearer | MVP |
| 34 | DELETE | /v1/events/:id | Bearer | MVP |
| 35 | POST | /v1/events/:id/cancel | Bearer | MVP |
| 36 | GET | /v1/posts | Public | MVP |
| 37 | GET | /v1/posts/:id | Public | MVP |
| 38 | POST | /v1/posts | Bearer | MVP |
| 39 | PATCH | /v1/posts/:id | Bearer | MVP |
| 40 | DELETE | /v1/posts/:id | Bearer | MVP |
| 41 | GET | /v1/feed/now | Bearer | MVP |
| 42 | GET | /v1/feed/explore | Public | MVP |
| 43 | GET | /v1/feed/live | Bearer | MVP |
| 44 | GET | /v1/map/pins | Public | MVP |
| 45 | GET | /v1/map/pin/:type/:id | Public | MVP |
| 46 | GET | /v1/saves | Bearer | MVP |
| 47 | POST | /v1/saves | Bearer | MVP |
| 48 | DELETE | /v1/saves/:type/:id | Bearer | MVP |
| 49 | GET | /v1/saves/check | Bearer | MVP |
| 50 | POST | /v1/leads | Bearer | MVP |
| 51 | GET | /v1/leads/inbox | Bearer(owner) | MVP |
| 52 | PATCH | /v1/leads/:id/read | Bearer(owner) | MVP |
| 53 | POST | /v1/media/presign | Bearer | MVP |
| 54 | POST | /v1/media/confirm | Bearer | MVP |
| 55 | DELETE | /v1/media/:id | Bearer | MVP |
| 56 | GET | /v1/search | Bearer | MVP |
| 57 | GET | /v1/notifications/preferences | Bearer | MVP |
| 58 | PATCH | /v1/notifications/preferences | Bearer | MVP |
| 59 | GET | /v1/notifications | Bearer | MVP |
| 60 | PATCH | /v1/notifications/:id/read | Bearer | MVP |
| 61 | POST | /v1/notifications/read-all | Bearer | MVP |
| 62 | POST | /v1/reports | Bearer | MVP |
| 63 | GET | /v1/reports/mine | Bearer | MVP |
| 64 | POST | /v1/analytics/events | Bearer | MVP |
| 65 | POST | /v1/analytics/sessions | Bearer | MVP |
| 66 | GET | /v1/admin/queue | Admin | MVP |
| 67 | PATCH | /v1/admin/businesses/:id/approve | Admin | MVP |
| 68 | PATCH | /v1/admin/businesses/:id/reject | Admin | MVP |
| 69 | PATCH | /v1/admin/businesses/:id/suspend | Admin | MVP |
| 70 | PATCH | /v1/admin/businesses/:id/feature | Admin | MVP |
| 71 | PATCH | /v1/admin/businesses/:id/halal-status | Admin | MVP |
| 72 | PATCH | /v1/admin/businesses/:id/claims/:claimId/approve | Admin | MVP |
| 73 | PATCH | /v1/admin/businesses/:id/claims/:claimId/reject | Admin | MVP |
| 74 | PATCH | /v1/admin/events/:id/approve | Admin | MVP |
| 75 | PATCH | /v1/admin/events/:id/reject | Admin | MVP |
| 76 | PATCH | /v1/admin/events/:id/feature | Admin | MVP |
| 77 | PATCH | /v1/admin/posts/:id/approve | Admin | MVP |
| 78 | PATCH | /v1/admin/posts/:id/reject | Admin | MVP |
| 79 | GET | /v1/admin/users | Admin | MVP |
| 80 | PATCH | /v1/admin/users/:id/suspend | Admin | MVP |
| 81 | PATCH | /v1/admin/users/:id/ban | Admin | MVP |
| 82 | PATCH | /v1/admin/users/:id/restore | Admin | MVP |
| 83 | PATCH | /v1/admin/users/:id/role | SuperAdmin | MVP |
| 84 | PATCH | /v1/admin/users/:id/auto-approve | Admin | MVP |
| 85 | GET | /v1/admin/featured-slots | Admin | MVP |
| 86 | POST | /v1/admin/featured-slots | Admin | MVP |
| 87 | PATCH | /v1/admin/featured-slots/:id | Admin | MVP |
| 88 | DELETE | /v1/admin/featured-slots/:id | Admin | MVP |
| 89 | GET | /v1/admin/reports | Admin | MVP |
| 90 | PATCH | /v1/admin/reports/:id/resolve | Admin | MVP |
| 91 | GET | /v1/admin/stats/overview | Admin | MVP |
| 92 | GET | /v1/admin/stats/users | Admin | MVP |
| 93 | GET | /v1/mosques | Public | Bonus |
| 94 | PATCH | /v1/mosques/:id/jummah-times | Admin | Bonus |
| 95 | GET | /v1/ramadan/season | Public | Bonus |
| 96 | GET | /v1/ramadan/feed | Bearer | Bonus |
| 97 | GET | /v1/ramadan/prayer-times/:cityId/:date | Public | Bonus |
| 98 | POST | /v1/ramadan/specials | Bearer(owner) | Bonus |
| 99 | GET | /v1/notice-board | Public | Bonus |
| 100 | POST | /v1/notice-board | Bearer | Bonus |
| 101 | GET | /v1/campaigns/active | Public | Bonus |
| 102 | GET | /v1/campaigns/:id/feed | Public | Bonus |
| 103 | GET | /v1/:type/:id/comments | Bearer | MMP |
| 104 | POST | /v1/:type/:id/comments | Bearer | MMP |
| 105 | POST | /v1/likes | Bearer | MMP |
| 106 | DELETE | /v1/likes/:type/:id | Bearer | MMP |
| 107 | GET | /v1/billing/plans | Bearer(owner) | MMP |
| 108 | POST | /v1/billing/checkout | Bearer(owner) | MMP |
| 109 | GET | /v1/billing/subscription | Bearer(owner) | MMP |
| 110 | POST | /v1/billing/webhooks/stripe | Public+Sig | MMP |

---

## 25. My Additions & Enhancements

**Things not explicitly in the product spec but added here for robustness:**

**1. `GET /v1/saves/check` (batch)** — fetching 20 feed cards and then making 20 separate is-saved calls would be catastrophic for mobile performance. The batch check endpoint solves this in one call. Mobile passes all visible card IDs on feed load and gets back the full save-state map.

**2. `GET /v1/reports/mine`** — without this, users can spam the Report button (the UI has no way to know they already reported something after an app restart). This endpoint lets the mobile app pre-load reported IDs and show "Already reported" state immediately.

**3. `GET /v1/map/pin/:contentType/:id` (preview endpoint)** — a full business detail payload is ~3KB. The map bottom sheet preview only needs 200 bytes. Separate preview endpoint = faster map interactions, especially on LTE.

**4. `POST /v1/analytics/sessions` (separate from event batching)** — session attribution data (D7/D30 retention) is too important to lose in a batch queue failure. Separate, synchronous endpoint with instant DB write.

**5. `PATCH /v1/businesses/:id` with `If-Match` ETag** — two admins approving different fields of the same business simultaneously creates silent data corruption. ETag-based concurrency prevents this with a clean 412 response.

**6. `X-Contact-Tap: true` header on `GET /v1/businesses/:id`** — instead of a separate endpoint, mobile sends this header when the user taps Call or WhatsApp. The API increments `contact_tap_count` atomically on the same response. Zero extra round-trip. Zero extra endpoint.

**7. `/v1/restaurants/open-now` as a distinct endpoint** — the Halal Radar feature needs a no-pagination, distance-sorted, open-only response. Stuffing this into query params on `/v1/restaurants` makes the query logic messy and the cache key unmanageable. A dedicated endpoint has a clean Redis key: `halal-radar:{city_id}:{lat_3dp}:{lng_3dp}:{radius}`.

**8. `202 Accepted` on claim and account deletion** — both are async verification/grace-period flows. Using 200 would imply the action completed. 202 correctly signals "received and processing." The `Retry-After` header tells mobile how long before the state resolves.

**9. Deep link format documented alongside endpoints** — every response that references navigable content includes the deep link in the relevant notification/share context:
```
muzgram://business/{id}
muzgram://event/{id}
muzgram://post/{id}
muzgram://leads        (business owner inbox)
muzgram://explore/{category}
```

**10. `RateLimit-Policy` named policies** — instead of generic rate limit headers, named policies (`"posts"`, `"leads"`, `"otp"`, `"global"`) let mobile show contextually correct error messages: "You've reached your post limit for this hour" vs. "Too many requests — try again in 47 seconds."

---

*92 MVP endpoints · 11 MMP stubs · 10 bonus endpoints. Chicago first. Devon Ave is the test. Scale to 50K users without a redesign.*
