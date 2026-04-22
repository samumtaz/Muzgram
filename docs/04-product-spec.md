# Muzgram — Product Specification (All Modules)

> Last updated: 2026-04-21
> Covers all 16 MVP modules + 5 bonus modules

---

## Module 1: Auth & Onboarding

**Purpose:** Get user from zero to seeing relevant local content in under 90 seconds.

**Onboarding Flow (4 screens max):**
1. Phone number entry → Send OTP
2. 6-digit OTP verification → Auto-advance on correct entry
3. Location permission → [Allow] or [Enter manually] → neighborhood picker
4. First name only (optional, skippable) → Land on Now feed immediately

**Edge cases:**
- Phone already exists → log in, don't duplicate
- OTP expired (10 min TTL) → resend with 60s cooldown
- Location denied → manual neighborhood picker
- User outside Chicago → show nearest area content + "coming to your city" banner
- Drops off mid-onboarding → resume exactly where they left off

**MVP only:** Phone OTP only. 4 screens. No social login. No interest quiz.
**MMP:** Apple/Google Sign In, interest selection, business owner dedicated onboarding, "invite friends" prompt.

---

## Module 2: Location Selection & Geolocation

**Purpose:** Power proximity-sorted content on every feed and map.

**Location hierarchy:** City → Region → Neighborhood → Content (lat/lng)

**Proximity sort logic:**
- < 1km: weight 50 (highest)
- 1–5km: weight 30
- 5–15km: weight 15
- > 15km: excluded from Now feed

**Distance labels:**
- < 0.1km → "Right here"
- 0.1–0.5km → "0.3 mi away"
- 0.5–2km → "0.8 mi away"
- 2km+ → "2.4 mi away"

**Edge cases:**
- GPS unavailable → use last known location, show "Using last known location" badge
- User moves >2km between sessions → silently update feed on next open
- Outside Chicago → "Muzgram is coming to your city soon" + email capture

**MVP only:** GPS auto-detect + manual neighborhood picker (hardcoded Chicago list).
**MMP:** Radius preference slider, "visiting another city" mode, neighborhood boundary on map.

---

## Module 3: Home Screen

**Purpose:** Answer "what's happening near me right now" in a single glance.

**Screen anatomy:**
- Transparent header: Logo + Location subtitle + Notification bell + Search icon
- Live Now strip: horizontal scroll of real-time event pills
- Category filter chips: All / Food / Events / Services / Community
- Featured card (first card, large, 200px image)
- Compact cards (remaining feed)
- Floating tab bar

**Live Now criteria:**
- Event: start_time < now < end_time
- Restaurant: currently open per operating hours
- Community post: created in last 2 hours

**Feed ranking score:**
```
Score = recency_weight + proximity_weight + featured_weight
featured_weight: +200 (always near top)
recency: last 2h=100, 2–6h=80, 6–24h=60, 1–3d=40, 3–7d=20
proximity: <0.5km=50, 0.5–2km=30, 2–5km=15, >5km=0
```

**Edge cases:**
- Empty feed → "Be the first to add a listing" + 3 seed cards from nearest active area
- All content stale (>7d) → "Nothing new today" + explore prompt
- No location → show West Ridge default + location setup prompt

**MVP only:** Feed + chips + live strip + featured card. Pull to refresh.
**MMP:** Personalized ranking, "For You" vs "Nearby" tabs, stories row from followed businesses.

---

## Module 4: "Now" Feed

**Content eligibility:**
- Business: is_open_now = true (calculated from operating_hours + timezone)
- Event: starts within next 7 days OR end_time > now
- Community post: created_at > 48h AND not expired

**Card data shown:**
- Food: photo, name, halal badge, cuisine, distance, open/closed pill, hours, [Directions][Call]
- Event: image, title, date chip, venue, distance, category, free/paid, [Details][Share]
- Community post: optional image, body (3 lines), poster name, neighborhood, timestamp, category tag

**Pagination:** 20 items initial, 10 per subsequent load at 80% scroll.

**Edge cases:**
- Empty → "Today looks quiet" + 3 upcoming events as "Coming Up"
- Restaurant no hours → "Hours not listed" in amber — never assume open
- Event end_time passed → remove from Now feed, stays in Explore

**MVP only:** Chronological + proximity sort, category chips, card tap, share, pull to refresh.
**MMP:** Personalized ranking, "Interested" tap, AI daily picks summary card.

---

## Module 5: Explore Feed

**Purpose:** Browse all local content — not time-gated like Now feed.

**Category tabs:** All / Food / Events / Services / Community

**Sub-categories:**
- Food: restaurant, cafe, bakery, grocery, butcher, catering, food_truck, dessert
- Events: this_week, free, family, community, religious
- Services: real_estate, mortgage, legal, financial, healthcare, dental, tutoring, quran_school, auto, cleaning, construction, tech, photography, wedding
- Community: all

**Sort options:** Nearby (default) / Recent
**View:** List only in MVP

**Edge cases:**
- Sub-category empty → "No [sub-cat] listings yet — know one? Add it!"
- Offline → cached results with banner

**MVP only:** Category + sub-category browse, list view, nearby/recent sort.
**MMP:** Grid view, popularity sort, trending section, advanced filters (price, open now, halal cert only).

---

## Module 6: Map Screen

**Provider:** Mapbox via @rnmapbox/maps
**Default center:** User location (fallback: 41.9742, -87.7083 — West Ridge, Chicago)
**Default zoom:** 14 | Min: 10 | Max: 18

**Pin specs:**
- 40×52px SVG teardrop
- Category color + white icon center
- States: default / selected (scale 1.3 + white ring) / live (pulsing rose ring) / featured (gold star badge)

**Clustering:** >5 pins within 60px → cluster circle with count

**Bottom sheet on tap:**
- 35%: quick preview (thumbnail, name, distance, CTA)
- Swipe up → 75%: full profile
- [View Full Details] + [Directions] buttons

**Re-center FAB:** bottom right, 56px, accent.gold

**Edge cases:**
- No pins in viewport → "No listings here — zoom out or pan toward West Ridge"
- >200 pins → enforce clustering at zoom < 13
- Outside Chicago → fade pins + coverage boundary + "coming soon" tooltip
- Offline → cached pins + "Map data may be outdated" banner

**MVP only:** Full-screen dark map, category chips, pin tap → bottom sheet, clustering, user location dot.
**MMP:** Map search, radius tool, heat map density overlay, real-time live pin animation.

---

## Module 7: Events

**Creation form — required fields:**
- Title (120 char max)
- Date + Start time
- Location (Mapbox Geocoding address autocomplete)
- Category (dropdown)

**Optional:** End time, description (500 char), cover image, price/"Free" toggle, external link

**Status flow:** pending → admin approves (target: <1h) → live
**Auto-approve:** users with 3+ previously approved events

**Detail screen:**
- Full-bleed cover image (220px)
- Title, date+time chip, location + distance, mini-map snapshot
- Organiser row, description, price, external RSVP link
- Actions: [Save] [Share] [Directions] [Report]

**Edge cases:**
- Past date → validation error
- No image → category color gradient card
- Event cancelled → push to all savers: "Event cancelled: [title]"
- Duplicate submission → admin flag

**MVP only:** Create, browse, view, save, share, admin approval, featured toggle.
**MMP:** RSVP/Interested button, recurring events, reminders, in-app ticketing (Stripe), organiser analytics.

---

## Module 8: Halal Food Listings

**Halal certification tiers (Chicago-specific):**
- Tier 1: IFANCA Certified (green shield badge) — most trusted in Chicago
- Tier 2: ISNA Certified (green shield badge)
- Tier 3: Self-Declared Halal (amber badge) — always labeled "Self-declared"
- Tier 4: Status Unknown (gray badge) — default for admin-seeded listings

**Open/closed logic:**
- "Open until 10pm"
- "Closes in 47m" (amber, if <1h remaining)
- "Opens at 11am"
- "Closed today"

**Business profile screen:**
- Hero image (240px) + logo (60px circle, overlaps hero)
- Name + halal badge + claimed badge + open status
- Actions: [Call] [Directions] [Save] [Share] [WhatsApp]
- Tabs: Info / Photos / Posts
- Info: description, address, phone, website, Instagram, hours, halal cert details

**Daily specials:** photo + 1 line + "valid today only" → expires at midnight → "SPECIAL TODAY" banner in feed

**Edge cases:**
- No phone → hide Call button entirely
- No hours → "Hours not listed — contact for hours"
- Temporarily closed → red banner at top, hidden from "Open Now" filter
- Unclaimed → "Is this your business? Claim it free"

**MVP only:** Browse, view, directions, call, save, halal badge, open/closed, daily specials.
**MMP:** Reviews/ratings, menu upload, online ordering integration, business analytics, photo contributions from users.

---

## Module 9: Service Provider Listings

**Service categories (Chicago priority):**
Financial, Legal, Real Estate, Healthcare, Education, Events/Catering, Home Services, Auto, Tech, Wedding

**Lead generation flow:**
1. User taps "Contact" on provider card
2. Bottom sheet: pre-filled name + phone from auth
3. Optional: short message (150 chars)
4. Tap "Send Enquiry" → lead record created
5. Business owner gets push: "New enquiry from [Name]"
6. User sees: "Your enquiry was sent"

**No in-app messaging in MVP** — leads connect via phone/WhatsApp only.

**Service provider card shows:**
Logo, business name, service type chip, languages spoken, service area, response time, [Send Enquiry][Call]

**Edge cases:**
- Provider without phone → Contact still works (logs lead, manual follow-up)
- Max 3 leads from same user per week to same provider
- Provider marks "not accepting clients" → shown on profile

**MVP only:** Browse, view, send lead (name + phone + optional message).
**MMP:** Lead inbox with conversation history, paid lead model, quotes, provider reviews.

---

## Module 10: Simple Local Posts

**Post types:**
- Community — general updates
- Food Tip — "X has a new lunch special"
- Notice — "Mosque parking closed Saturday"
- Question — "Anyone know a halal caterer for 200?"
- Recommend — "Just tried Noon O Kabab — incredible"

**Creation flow:** Single screen. Text + optional photo + category chip + auto-detected neighborhood → Post.

**Expiry:** 7 days auto-expire. Forces content freshness.
**Auto-approve:** users with 5+ previous approved posts.

**Rate limit:** Max 5 posts per hour per user. 30-minute cooldown if exceeded.

**Edge cases:**
- Empty text → disable Post button
- Image upload fails → post goes through text-only with notification
- Same user posts 5+ in 1 hour → rate limit + cooldown
- Business posts → business name + logo instead of user avatar

**MVP only:** Text + optional image, category chip, 7-day expiry, admin approval, report button.
**MMP:** Post reactions (like/helpful/love), comments (threaded max 2 levels), resharing.

---

## Module 11: Search & Filters

**Search tech:** PostgreSQL full-text search (tsvector + GIN index) — no Elasticsearch in MVP.

**After 2 chars typed, 300ms debounce:**
- Results tabs: All / Food / Events / Services
- Result count: "12 results near West Ridge"
- Empty: "No results — try searching all of Chicago" → expand radius city-wide

**Filter panel (bottom sheet):**
- Category: All / Food / Events / Services / Community
- Open Now toggle (food only)
- Distance: 0.5mi / 1mi / 3mi / 5mi / 10mi
- Halal Cert: Any / Certified Only (food only)
- Price: Free Only (events only)

**Recent searches:** last 5, stored locally. Cleared on app uninstall.

**Edge cases:**
- Empty query → do nothing
- Special chars → sanitize before SQL
- Query >100 chars → truncate + notice
- Offline → cached results with banner

**MVP only:** PG full-text, basic filters, recent searches (local). No autocomplete.
**MMP:** Typesense/Meilisearch for fuzzy/typo-tolerant, autocomplete, voice search, zero-result analytics.

---

## Module 12: Saved Items

**Data:** Polymorphic saves table (user_id, target_type, target_id)

**Saved screen — tabs:** All / Food / Events / Services / Posts

**Event countdown labels:**
- "In 3 days" chip
- "Tomorrow" amber chip
- "Today!" rose pulse chip
- "Passed" — grayed out, moved to Past Events sub-section

**Edge cases:**
- Saved item removed by admin → "This listing is no longer available" (faded, not silently deleted)
- Saved business permanently closes → "Permanently Closed" on saved card
- Saved event passes → auto-archived to Past Events, not deleted
- No hard limit on saves in MVP

**MVP only:** Save/unsave, saved screen with tabs, event countdown labels.
**MMP:** Collections/folders ("Places to Try", "This Month's Events"), share a collection, "you haven't visited in 30 days" nudge.

---

## Module 13: Notifications

**Notification types:**

| Type | Trigger | Timing | Rate Limit |
|---|---|---|---|
| New nearby event | Event approved within 3mi | Immediate | Max 1/day |
| Event day reminder | User has saved event | 8am on event day | Per-event |
| New lead | Lead submitted to business | Immediate | No limit |
| Event cancelled | Saved event cancelled | Immediate | No limit |
| Listing approved | Owner submitted listing | On approval | Per-listing |
| Welcome | 24h after signup if not opened | Once | Once |

**Stack:** Expo Push (wraps FCM + APNS) + Bull queue on Redis

**Quiet hours:** 10pm–7am (on by default, user-adjustable)

**Deep link format:**
- `muzgram://event/{id}`
- `muzgram://business/{slug}`
- `muzgram://leads`

**Edge cases:**
- Push token expired → mark inactive, re-request on next app open
- App in foreground → show in-app toast, don't send system notification
- Cancelled event reminder → check cancellation status before sending, suppress if cancelled
- Batch failure → exponential backoff retry via Bull queue

**MVP only:** New event nearby, day reminder, lead alert, cancellation alert, preference toggles, quiet hours.
**MMP:** Daily digest, promotional notification slots (paid), in-app notification center, smart send time optimization.

---

## Module 14: User Profile

**Profile screen:**
- Avatar (80px) + display name + neighborhood badge + "Member since" date
- Stats: Posts count / Saves count
- Tabs: My Posts / My Events
- Settings: Edit Profile / My Neighborhood / Notifications / Privacy / Help / Delete Account / Log Out

**Edit profile fields:** Avatar (camera roll/camera), display name (40 char), bio (160 char), home neighborhood

**No avatar:** Initials on deterministic color circle (color derived from user_id hash)

**Account deletion:** 30-day soft delete grace period → hard delete day 31 → posts anonymised, not deleted

**Edge cases:**
- Display name with offensive content → auto-flag for admin review on save
- Profile image >10MB → client-side resize to max 1200px before upload
- User changes neighborhood → feed re-sorts immediately, no re-auth

**MVP only:** Name, photo, bio, neighborhood, my posts, my events, settings, log out, delete account.
**MMP:** Verification badge, follower/following system, reputation score, activity history.

---

## Module 15: Business / Provider Profile

**Claim flow:**
1. Owner taps "Claim this business"
2. Enters name + business phone
3. Admin verifies (calls business phone or checks website)
4. Admin approves → is_claimed = true → owner gets push notification
5. Timeline: verified within 24 hours

**Business owner in-app portal:**
1. My Listing — preview + quick stats (views, saves, leads this week)
2. Edit Listing — all fields, hours editor (per-day time pickers), photo management
3. Leads inbox (services only) — name, phone, message, timestamp, [Call directly]

**Edit approval rules:**
- Minor edits (phone, hours, photos) → immediate live
- Major edits (address, name, halal status) → admin review queue

**Edge cases:**
- Edit while under review → "Your changes are being reviewed" banner, disable re-editing
- Owner changes address → flag for admin re-geocoding + "Location pending verification" badge
- Lost access to phone → account recovery via admin (manual)
- Business logo >10MB → client-side compress

**MVP only:** Claim flow, edit listing, hours management, photo upload, lead inbox (services), basic view count.
**MMP:** Full analytics dashboard, multi-staff accounts, business posting tools, featured slot self-purchase (Stripe).

---

## Module 16: Admin Moderation Dashboard

**Tech:** React + Vite web app, Tailwind CSS, same Clerk auth (role check: admin)

**Sidebar nav:** Overview / Approval Queue / Businesses / Events / Posts / Users / Featured Management / Leads / Neighborhoods / Settings

**Approval Queue:**
- Default: all pending, oldest first
- Inline: [✓ Approve] [✗ Reject] [✎ Edit & Approve]
- Reject reasons: Duplicate / Outside coverage / Incomplete / Spam / Inappropriate
- Target SLAs: Events+Posts <1h, Businesses <4h, Claims <24h

**Featured Management:**
- 6 slots: 2 Now feed top cards, 2 Explore header, 2 Map gold pins
- Drag-and-drop slot manager
- Each slot: current occupant, featured since/until, [Replace][Remove][Extend]
- Empty slot → graceful degradation to organic top content

**Overview KPIs:** New users today, pending approvals, new listings this week, active events, leads this week, featured slots active

**Edge cases:**
- Reject without notifying → system auto-sends push with reason
- Two admins approve same item → idempotent (second is no-op)
- Admin accidentally deletes live listing → soft delete with 24h undo
- Fraudulent claim → suspension tools + appeal flow

**MVP only:** Queue, CRUD on all content, featured slot management, user management, lead table, KPI overview.
**MMP:** Automated spam detection, admin activity log, in-dashboard messaging to business owners, weekly PDF reports.

---

## Bonus Module: Ramadan Mode

**Activates automatically** during Ramadan month (driven by `ramadan_seasons` table).

**Changes to home feed:** "Ramadan Feed" with iftar specials, community iftars, suhoor spots, Eid shopping.

**New content type: Iftar Special**
- Restaurant posts tonight's iftar menu + price
- "SPECIAL TODAY" banner, expires at midnight
- meal_type: 'iftar' | 'suhoor'

**Prayer time banner:** Maghrib countdown on home screen ("Iftar in 2h 14m"), Fajr time for suhoor planning.

**Ramadan events category:** Nightly Taraweeh times, Laylatul Qadr events, Eid prayer times + locations.

**Community Ramadan board:** "Hosting an iftar?" → one-tap post to community board.

---

## Bonus Module: Friday Finder (Jummah Locator)

**Active Thursday night → Friday 3pm.**

**Shows:**
- All mosques in area with Jummah times
- Multiple khutbah times per mosque (some have 3 Jummah times)
- Distance, parking notes, khutbah topic (mosque-posted), crowd level [Quiet/Moderate/Packed]

**Notification:** Thursday 9pm — "Jummah tomorrow — [Nearest mosque] at [time], [X] min away"

**Data:** Mosques self-update times. Admin seeds initial data. DST updates 2x/year.

---

## Bonus Module: Notice Board

**Post categories:** Housing / Rideshare / Jobs / Free Items / For Sale / Lost & Found / Help Needed / Announcement

**Rules:** Posts expire in 30 days. Contact via WhatsApp/phone (no in-app DMs). Free to post. Admin approval for Housing and Jobs.

**Housing sub-features:** "Muslim household" tag, price/month, contact WhatsApp.

---

## Bonus Module: Halal Radar

**One-screen, one-purpose:** "I'm hungry right now. Show me open halal food within walking distance."

**Accessible via:** Home screen shortcut button OR 3D touch / long-press app icon.

**Shows:** Sorted list — open restaurants only, default 1 mile radius, distance sort, one-tap [Directions].

**No categories, no filters, no explore.** Just what's open, how far, get there.

**Widget candidate:** iOS/Android home screen widget in MMP.

---

## Bonus Module: Campaign Engine (Muslim Business Week)

**What it is:** 7-day in-app campaign spotlighting Muslim-owned businesses.

**How it works:**
- Admin activates campaign in dashboard
- Home screen banner: "Muslim Business Week — [dates]"
- Dedicated campaign feed: Muslim-owned businesses only
- Businesses post "Campaign Special" — promoted free
- Users who save 5+ businesses unlock "Community Champion" badge

**Monetization:** 5 premium campaign spotlight slots at $150/week = $750 per campaign week. Run 4x/year.

**Revenue model:** Campaign week is highest single-week revenue event in the app.
