# Muzgram — MMP Design

> Last updated: 2026-04-21
> Philosophy: **Deepen the loop. Earn more per user. Run in more cities. Involve less founder.**
> MMP begins only after MVP proves the loop. Not before.

---

## MMP Context

MMP is not MVP++. It is a deliberate shift in what the product optimizes for:

| Dimension | MVP | MMP |
|---|---|---|
| Optimization | Retention proof | Revenue + retention at scale |
| User trust | Platform trust (halal badges work) | Individual trust (reviews, verification) |
| Business relationship | Founder sells manually | Self-serve + upsell automation |
| Content source | Seeded + organic | Organic + algorithmic amplification |
| Geography | Chicago metro (simultaneous) | Chicago mature + 2nd city soft-launch |
| Team dependency | Atif is the bottleneck | System is the bottleneck |
| Feed quality | Manual curation as fallback | Personalization handles it |
| Operations | ~15h/week founder time | ~2h/week founder time |

MMP does not change what Muzgram is. It makes Muzgram work better for more people in more places, with fewer manual interventions.

---

## MMP Gate Criteria

These are the minimum signals that must be true before MMP development starts. Starting MMP without these means building on sand.

```
GATE CRITERIA — ALL MUST PASS
─────────────────────────────────────────────────────────────────
✓ D7 retention ≥ 35% across at least 2 Chicago clusters
  (Not 1 cluster — that could be a local anomaly)

✓ 500+ monthly active users in Chicago metro
  (Enough behavioral data to train personalization models)

✓ 20+ paying businesses generating $3,000+ MRR
  (Demand proven. Stripe self-serve has a market to serve.)

✓ 15+ businesses posting content without being prompted
  (Supply-side habit formed — not just founder-seeded content)

✓ Admin moderation queue < 2 hours average review time
  (Operations stable enough to add more content volume)

✓ Feed freshness: avg 5+ new content items/day/cluster
  (Content engine running — personalization has data to work with)

✓ Zero critical halal certification errors reported
  (Trust layer verified — safe to expand trust features on top of it)
─────────────────────────────────────────────────────────────────
```

**If gate criteria aren't met:** Fix the underlying MVP issue first. Every MMP feature assumes the loop works. Personalization without retention is a waste. Reviews without trust baseline are noise. Self-serve Stripe without proven payment intent is over-engineering.

---

## Exact MMP Goals

### Goal 1 — Reach $10,000 MRR with self-serve revenue
No more manual Zelle invoicing for every transaction. Businesses that want to pay should be able to do so without Atif being involved. Target: 40+ paying businesses, average $250/month, $10K MRR by end of MMP.

### Goal 2 — Achieve D30 retention ≥ 30%
MVP proves D7. MMP proves the longer arc. A user who is still active at Day 30 has formed a genuine habit. Target metric: 30%+ of first-session users active 30 days later.

### Goal 3 — Soft-launch one second city with < 40 hours of setup work
The city expansion model must be proven replicable. Chicago took weeks and heavy founder involvement. City 2 (Houston or New York) should take less than one work week of setup, using the data import tool, the institutional partnership playbook, and the founding member pre-sale system.

### Goal 4 — Reduce founder operational time to < 3 hours per week
MVP requires ~15 hours/week of founder operations (outreach, content review, invoicing, moderation). MMP automation targets: Stripe handles payments, AI handles moderation, Bull queues handle nudges, the admin dashboard handles everything else.

### Goal 5 — Supply side: 50+ businesses posting content independently per week
The feed runs itself only when enough businesses are active content producers. MMP goal: businesses post daily specials, photos, and events without Atif following up — because the business dashboard shows them ROI clearly enough to motivate self-service.

---

## MMP Feature Set

### TIER 1 — REVENUE CRITICAL (build first, highest ROI)

---

#### Feature 1.1 — Stripe Self-Serve Payment Infrastructure

**What it is:**
Full Stripe integration replacing manual Zelle/Venmo. Businesses purchase featured placements, lead packages, and event boosts directly in the business portal without Atif's involvement. Includes subscriptions, one-time payments, and the Stripe Customer Portal for self-management.

**Why it matters:**
Manual payment collection at $3K MRR is sustainable. At $10K MRR with 40+ businesses, it becomes a full-time job. Every minute Atif spends sending payment reminders is a minute not spent on city expansion or product improvement. Self-serve unlocks the revenue ceiling.

**MVP data dependency:**
- `businesses` table (existing) — Stripe customer_id column added
- `promotions` table (existing) — linked to Stripe subscription_id
- Manual payment history as baseline for pricing validation

**Implementation:**
```
Stripe product catalog:
  prod_featured_feed     → price_weekly: $85, price_monthly: $275, price_quarterly: $725
  prod_featured_explore  → price_weekly: $65, price_monthly: $195, price_quarterly: $500
  prod_featured_map      → price_weekly: $55, price_monthly: $165, price_quarterly: $425
  prod_bundle_visibility → price_weekly: $125, price_monthly: $395, price_quarterly: $995
  prod_bundle_full       → price_weekly: $175, price_monthly: $549, price_quarterly: $1,350
  prod_leads_starter     → price_monthly: $79 (recurring)
  prod_leads_pro         → price_monthly: $149 (recurring)
  prod_leads_premium     → price_monthly: $249 (recurring)
  prod_event_basic       → price_onetime: $25
  prod_event_plus        → price_onetime: $45
  prod_event_anchor      → price_onetime: $75
  prod_business_pro      → price_monthly: $49 (MMP new tier)

Stripe webhook events to handle:
  checkout.session.completed       → activate promotion in DB
  invoice.payment_succeeded        → extend subscription end date
  invoice.payment_failed           → 3-day grace, then deactivate slot
  customer.subscription.deleted    → graceful downgrade to free tier
  customer.subscription.updated    → plan change handling

Stripe Customer Portal:
  Businesses manage their own subscription (upgrade/downgrade/cancel)
  Cancel flow: "Are you sure? You'll lose featured placement" + pause option
  Pause option: suspend subscription for up to 30 days (retains slot reservation)
```

**Stripe Link integration (2026 standard):**
Stripe Link pre-fills payment details for returning customers. For a business owner who has paid before, checkout takes < 20 seconds. Conversion uplift: 20–35% vs standard checkout form.

**Admin revenue dashboard additions:**
```
/admin/revenue (super_admin only):
  MRR by product type (Featured / Lead / Event / Pro)
  MRR by cluster/neighborhood (which areas are monetizing best)
  Churn rate, renewal rate, average contract length
  Failed payment queue with one-click retry
  Upcoming renewals in next 7 days (proactive outreach list)
  Revenue per paying business (LTV projection)
```

---

#### Feature 1.2 — Business Pro Subscription ($49/month)

**What it is:**
A mid-tier business subscription that gives restaurants and businesses enhanced capabilities without requiring featured placement. The "professional tools" layer between free and full featured.

**Why it matters:**
There is currently a cliff between "free listing" and "$275/month featured placement." Many businesses want to invest in Muzgram but can't justify $275. Business Pro at $49 captures this middle segment, increases MRR, and creates an upsell path to featured placement.

**What Business Pro includes:**
```
BUSINESS PRO — $49/MONTH
─────────────────────────────────────────────────────────────────
✓ Analytics dashboard (real views, saves, lead funnel — not just WhatsApp summary)
✓ Extended photos: 15 photos vs 5 for free accounts
✓ Daily special promoted treatment: "SPECIAL TODAY" banner automatic
  (free tier: daily special visible but not banner-promoted)
✓ Response time badge: "Typically responds within 2h" calculated automatically
✓ "Accepting new clients" toggle (service providers only)
  with waitlist notification when turned back on
✓ Priority support (WhatsApp response within 4h vs next day)
✓ Scheduling: pre-schedule daily specials for the week (set Mon, publish daily)
✓ Monthly PDF performance report (auto-generated, emailed)
✓ "Business Pro" badge on listing (subtle — signals active business)
─────────────────────────────────────────────────────────────────
```

**Upsell path:**
Business Pro analytics show businesses how much traffic they're getting but not converting. The data itself becomes the pitch for upgrading to Featured Placement.

---

#### Feature 1.3 — Business Analytics Dashboard (Full)

**What it is:**
A real-time analytics dashboard inside the business owner portal. Replaces the "weekly WhatsApp screenshot" with self-serve data access.

**Why it matters:**
Businesses won't renew featured placements they can't measure. Showing a business owner that their featured listing drove 847 views, 34 saves, and 12 lead inquiries this month makes the renewal conversation unnecessary — they renew themselves.

**Dashboard specs:**
```
ANALYTICS DASHBOARD — BUSINESS OWNER PORTAL
─────────────────────────────────────────────────────────────────
Overview cards (this period vs last period):
  Profile Views        847  (+23% vs last month)
  Saves                 34  (+8%)
  Lead Enquiries        12  (+50%)
  Directions Taps        6  (new metric)
  WhatsApp Taps          9  (new metric)
  Call Taps              3

Charts (Recharts 2 / Tremor v4):
  Views over time: 30-day line chart (day-by-day)
  Traffic sources: pie (Feed / Map / Search / Direct / Explore)
  Peak hours: bar chart (when people view your profile — by hour)
  Category rank: "You're #3 in Pakistani Restaurants near West Ridge"

Lead funnel:
  Profile views → Enquiry sent → [phone call made] (estimated)
  Shows conversion rates at each step

Daily Special performance:
  Which specials drove the most profile visits that day
  Best-performing day of week for specials

Content health score:
  Photos: 4/15 uploaded (↑ add more)
  Hours: Complete ✓
  Description: 45 words (↑ add more)
  Daily Special: Posted 3 of last 7 days (↑ consistency helps)
  Overall: 62/100 — "Good. Add more photos to reach 80."

Export:
  Monthly PDF report (formatted, shareable with business partner)
  CSV export for Airtable/Excel tracking
─────────────────────────────────────────────────────────────────
```

**MVP data dependency:** `analytics_events` table collecting view/save/tap events since Day 1. Every analytics dashboard query runs against this accumulated data. The quality of the dashboard at MMP launch depends entirely on how consistently analytics were tracked during MVP.

---

### TIER 2 — RETENTION CRITICAL (highest D30 impact)

---

#### Feature 2.1 — Personalized "For You" Feed

**What it is:**
A second feed tab alongside "Nearby" — personalized based on the user's save history, browse patterns, category preferences, and neighborhood affinity. Not algorithmic manipulation — genuine relevance matching.

**Why it matters:**
Users who see content relevant to their actual behavior return more often. A user who saves every Pakistani restaurant should see new Pakistani restaurants first. A user who attends religious events should see religious events prominently. This is the difference between D30 retention of 20% and 35%.

**MVP data dependency:**
- `user_interest_signals` table (being collected from Day 1 per docs/16)
- `saves` table (existing) — primary signal
- `analytics_events` table — category tap patterns, card dwells

**Personalization signals (ranked by reliability):**
```
SIGNAL WEIGHT TABLE
─────────────────────────────────────────────────────────────────
Save action           weight: 10  (strongest intent signal)
Lead enquiry sent     weight: 8   (highest intent)
WhatsApp share        weight: 7   (social endorsement of quality)
Card detail view      weight: 4   (interest, not just scroll-past)
Category chip tap     weight: 3   (explicit preference signal)
Map category filter   weight: 3   (browsing intent)
Long dwell (>5s)      weight: 2   (passive interest)
Feed scroll-past      weight: -1  (mild negative signal if consistent)
─────────────────────────────────────────────────────────────────
```

**Implementation approach:**
MVP approach (no ML required): weighted scoring per content item based on category match with user's top 3 inferred categories. Simple, fast, effective, can be improved with ML later.

```typescript
// Personalization score overlay on feed items
function personalizeScore(
  baseScore: number,
  item: FeedItem,
  userProfile: UserInterestProfile
): number {
  const categoryMatch = userProfile.topCategories.includes(item.category);
  const subCategoryMatch = userProfile.topSubCategories.includes(item.subCategory);
  const neighborhoodAffinity = userProfile.neighborhoodAffinity[item.neighborhoodId] ?? 0;

  return baseScore
    + (categoryMatch ? 25 : 0)
    + (subCategoryMatch ? 15 : 0)
    + (neighborhoodAffinity * 10); // 0–10 bonus based on how often they browse this area
}
```

**For You tab design:**
```
HOME SCREEN — MMP
─────────────────────────────────────────────────────────────────
Header: unchanged
Live Now strip: unchanged

Tab row below strip (NEW):
  [Nearby ●]  [For You]
  — "Nearby" is the MVP feed (unchanged)
  — "For You" is the personalized feed
  — Default stays on "Nearby" (always safe, no cold-start problem)
  — "For You" shows "Learning your preferences..." for first 7 days
    with basic city-wide popular content as fallback

"For You" feed header:
  "Based on your West Ridge activity" — specific, not generic
  Small "Why this?" icon on each card → explains in plain English:
    "You saved 3 Pakistani restaurants" or "You browse Events weekly"
─────────────────────────────────────────────────────────────────
```

---

#### Feature 2.2 — Ramadan Mode (Full Implementation)

**What it is:**
A comprehensive Ramadan-aware product mode that activates automatically each year, transforming the app's content priorities, feed composition, notifications, and header during the entire holy month.

**Why it matters:**
Ramadan is the single highest-retention period in the Islamic calendar. User engagement spikes 3–5×. If the app is explicitly Ramadan-aware — not just a generic app that happens to have halal listings — it becomes the community's digital home for the month. Users who have a great Ramadan on Muzgram are retained for 11 months afterward.

**MVP data dependency:**
- `ramadan_seasons` table (existing in schema) with start_date, end_date per year
- Prayer time API integration (Aladhan API — free, reliable, location-based)
- Existing event and business content infrastructure

**Full Ramadan mode specification:**
```
RAMADAN MODE — ACTIVATES ON RAMADAN 1ST, DEACTIVATES ON EID

Feed Header (replaces standard header):
  Standard: "★ Muzgram · 📍 West Ridge · 🔔"
  Ramadan:  "★ Muzgram · 🌙 Ramadan · Iftar in 2h 14m · 🔔"
  — "Iftar in X" calculated from Maghrib prayer time for user's location
  — Counts down in real time when open after Asr
  — Changes to "Iftar time! 🌙" during Maghrib window

Ramadan feed category:
  New chip in category row: [🌙 Ramadan]
  Content: events tagged ramadan=true, businesses with Ramadan specials,
           community posts with #ramadan tag, mosque iftar programs

Suhoor mode (4:00 AM – 6:00 AM window):
  Feed header: "★ Muzgram · 🌙 Suhoor · Fajr in 47 min"
  Feed prioritizes: restaurants open for suhoor, suhoor specials
  Category chip: [🌙 Suhoor] appears in this window only

Taraweeh listings:
  Mosques can post "Taraweeh tonight" as a recurring daily event
  Auto-surfaces in evening feed from 8 PM onward during Ramadan

Notification — Suhoor alert (opt-in, explicit toggle in settings):
  "Suhoor reminder: Fajr in 45 minutes · [Nearest open restaurant]"
  Sent at calculated Fajr - 45 minutes (user-adjustable to 30/45/60 min)
  This notification type has the highest opt-in rate of any Muzgram notif

Notification — Iftar alert (opt-in):
  "Iftar in 30 minutes near West Ridge 🌙"
  Sent at calculated Maghrib - 30 minutes
  Optional: deeplinks to map showing nearby open halal restaurants

Ramadan specials feed (business feature):
  Businesses can tag their daily special as "Ramadan Iftar Special"
  These get special visual treatment: gold crescent badge on card
  Filtered feed: [Iftar Deals] sub-category shows only these

Last 10 nights (Laylatul Qadr):
  "The Last 10 Nights" section appears in Events from Day 21
  Community events, extra prayers, charity events surfaced prominently
  Push notification (one-time, Ramadan 21st): "The blessed last 10 nights begin"

Eid countdown (last 3 days):
  Header shows: "Eid in [X] days 🌙"
  Feed shows: Eid events, Eid prayer times, Eid bazaars, Eid gift shops
  Community post prompt: "Share your Eid plans!"
```

---

#### Feature 2.3 — Event RSVP and Attendance System

**What it is:**
A lightweight "I'm going / I'm interested" system for events, with attendee count visibility (not attendee names), calendar export, and post-event photo prompts.

**Why it matters:**
RSVP creates commitment. Users who tap "Going" are 4× more likely to actually attend the event and 6× more likely to open the app on event day. Calendar export makes Muzgram events part of the user's real calendar — creating an ambient reminder without a push notification. Post-event photos feed the community content loop.

**MVP data dependency:**
- `events` table (existing) — add rsvp_count, interested_count columns
- `saves` table (existing) — RSVP is a superset of save (going → implicitly saved)

**Implementation spec:**
```
EVENT DETAIL — MMP RSVP SECTION
─────────────────────────────────────────────────────────────────
Below the info triptych, above description:

[Going ✓]  [Interested ♡]  [Add to Calendar ↗]
  — Three equal-width buttons, secondary style
  — "Going" tap: haptic, green fill, "47 going" count updates
  — "Interested" tap: amber fill, "23 interested" count updates
  — Going and Interested are mutually exclusive
  — "Add to Calendar": exports .ics file → iOS/Android calendar
    Subject: [event title]
    Location: [full address]
    Description: "Found on Muzgram: [event url]"
    Alert: 1 hour before (default)

Attendee count display:
  "47 going · 23 interested"
  No names visible — aggregate count only
  No "See who's going" — preserves privacy, prevents stalking

Organizer view (business portal):
  Full attendee count + interested count
  Trend chart: RSVPs over time (useful for planning)
  "Send reminder to Going users" — one-click push to RSVP'd users
    (Most powerful organizer feature: targeted to committed attendees only)
─────────────────────────────────────────────────────────────────

POST-EVENT AUTOMATION (24h after event ends):
  Push to users who marked "Going":
    "How was [Event Name]? Share a photo from last night 📸"
    Deep link → community post compose (event pre-tagged)
  This generates post-event content without manual curation
  Only sent once. Never re-sent. Never pressured.
```

---

#### Feature 2.4 — Jummah Finder + Mosque Hub

**What it is:**
A dedicated Jummah screen that shows mosques near the user with prayer times, khutbah languages, and capacity information — updated weekly. The mosque becomes a first-class content entity, not just a business listing.

**Why it matters:**
Jummah is a weekly obligation for Muslim men and a community anchor for Muslim families. Users who open Muzgram every Friday to find Jummah create the most reliable weekly active user habit of any feature in the product. The mosque hub also creates a natural content partnership — mosques that use Muzgram for Jummah promotion post events, announcements, and Ramadan programs through the same account.

**MVP data dependency:**
- `mosques` table (existing, seeded with 27+ mosques across Chicago metro)
- `jummah_times` table (existing — times, khutbah language, capacity)

**Jummah Finder screen spec:**
```
JUMMAH FINDER — Dedicated screen (Friday-promoted, accessible always)
─────────────────────────────────────────────────────────────────
Access: Friday: appears as floating card at top of Now feed
        Always: reachable via Explore → Events → Jummah

Header: "Jummah Today" (Friday) or "Jummah Times" (other days)
        Date + "Nearest mosques"

Mosque cards (sorted by distance from user):
  ┌──────────────────────────────────────────────────────────┐
  │ [80px] Mosque Foundation                                 │
  │        Bridgeview · 3.2 mi away                         │
  │                                                          │
  │  🕌 Khutbah: Arabic + English                           │
  │  ⏱  1st Jummah: 12:00 PM · 2nd: 2:00 PM               │
  │  👥 Capacity: ~2,000   🅿 Parking available              │
  │                                                          │
  │  [📍 Directions]  [📅 Add to Calendar]  [Save ♡]       │
  └──────────────────────────────────────────────────────────┘

Filters:
  Language: [All] [Arabic] [English] [Urdu] [Arabic+English] [Urdu+English]
  Distance: [Nearest] [Within 2mi] [Within 5mi] [Within 10mi]
  Capacity: [Any] [Large (500+)] [Medium (100–500)] [Small (<100)]

Footer CTA: "Is your mosque on Muzgram? Add it free →"

Mosquito alert (Friday 11 AM):
  "Jummah today at [Nearest saved mosque]: 12:30 PM · 0.4 mi"
  Only if user has saved a mosque OR a mosque is within 0.5 mi
─────────────────────────────────────────────────────────────────
```

---

### TIER 3 — DISCOVERY & TRUST

---

#### Feature 3.1 — Typesense Powered Search

**What it is:**
Replacing PostgreSQL full-text search with Typesense — an open-source, typo-tolerant, instant-results search engine. Sub-50ms search results with faceted filtering, result highlighting, and multi-model ranking.

**Why it matters:**
PostgreSQL FTS gets the job done for MVP. It does not handle typos ("Ghareeb Nawaaz" → nothing), synonyms ("Pakistani food" → Pakistani restaurants), or instant-as-you-type results without hammering the database. At 100K+ content items, search quality becomes a retention factor: if users can't find what they're looking for quickly, they leave.

**MVP data dependency:**
- Requires syncing existing `businesses`, `events`, `posts` tables to Typesense
- Minimum 500 indexed items before the search quality improvement is measurable
- Historical search query logs from MVP (to identify what users actually search for)

**Typesense schema:**
```typescript
// Typesense collection schemas
const businessCollection = {
  name: 'businesses',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'description', type: 'string', optional: true },
    { name: 'category', type: 'string', facet: true },
    { name: 'sub_category', type: 'string', facet: true },
    { name: 'halal_status', type: 'string', facet: true },
    { name: 'neighborhood', type: 'string', facet: true },
    { name: 'is_open_now', type: 'bool', facet: true },
    { name: 'location', type: 'geopoint' },
    { name: 'content_health_score', type: 'int32' },
    { name: 'is_featured', type: 'bool', facet: true },
    { name: 'tags', type: 'string[]', facet: true },
    // e.g. ['biryani', 'nihari', 'desi', 'pakistani', 'halal']
  ],
  default_sorting_field: 'content_health_score',
};

// Search query — instant results with typo tolerance
const searchParams = {
  q: 'ghareeb nawab',        // user typed wrong — still finds Ghareeb Nawab
  query_by: 'name,description,tags',
  facet_by: 'category,halal_status,is_open_now',
  filter_by: `location:(${lat},${lng},${radiusKm} km) && is_active:true`,
  sort_by: `_text_match:desc,content_health_score:desc`,
  typo_tokens_threshold: 1,
  num_typos: 2,
  highlight_full_fields: 'name',
};
```

**Search UX improvements over MVP:**
```
MMP SEARCH EXPERIENCE
─────────────────────────────────────────────────────────────────
Instant results: first results appear after 1 character (not 2)
                 < 50ms response time (vs 300ms debounce + 150ms DB)

Typo tolerance: "niahri" → "Nihari", "sabri niahri" → "Sabri Nihari"
               Handles missing/extra letters, transpositions

Faceted filters (filter panel slide-up):
  [Open Now ●] [IFANCA Certified] [ISNA Certified] [Self-Declared]
  [Food] [Events] [Services] [Community]
  [Within 0.5mi] [Within 1mi] [Within 2mi] [Within 5mi]
  Price: [Free] [$] [$$] [$$$]

Voice search (iOS/Android speech API):
  Microphone icon in search bar (MMP addition)
  "Find halal restaurants near me" → executes search with geo filter
  "When is the next community event?" → redirects to events

Semantic search (MMP, no ML model needed):
  Tag-based synonyms: "Pakistani" → searches Pakistani + Desi + South Asian
  "Biryani" → searches restaurants tagged with biryani
  Tags are business-maintained + admin-curated (not ML-generated)

Search result improvements:
  Section headers: "Businesses (12) · Events (3) · Services (2)"
  Matched text highlighted in gold on result titles
  "No results? Try widening your area" → expands radius automatically
  Recent + trending searches sidebar
─────────────────────────────────────────────────────────────────
```

---

#### Feature 3.2 — Reviews and Community Trust Ratings

**What it is:**
A lightweight, moderated review system where verified users (those who have demonstrated real engagement with the platform) can leave a 1–5 star rating and short text review on business listings.

**Why it matters:**
Trust is the product. Without reviews, Muzgram's halal badge and open/closed status are the only trust signals. With reviews, first-time visitors to a neighborhood can see "34 community members recommend this" before deciding where to eat. This is the single most requested feature from community app users after they trust the basic listing data.

**Why MVP was too early for this:**
Reviews require volume to be meaningful. 3 reviews on a business are noise. 30+ are signal. Building reviews in MVP would have produced empty review sections, undermining trust instead of building it. MMP, with 500+ MAU across multiple clusters, has the volume for reviews to be meaningful from Day 1.

**Design philosophy — not Yelp:**
```
MUZGRAM REVIEW PRINCIPLES
─────────────────────────────────────────────────────────────────
NOT goal: Comprehensive, lengthy, SEO-optimized reviews (that's Yelp)
IS goal:  Quick community trust signals from people who actually visited

Format:  1–5 stars + optional 150-char text + "Halal status accurate?" toggle
Length:  Max 150 characters — this is a signal, not a blog post
Tone:    Community, not critic ("Great biryani — very authentic 🤲")

Review eligibility:
  Must have: verified phone (existing)
  Must have: account > 7 days old (prevents spam review accounts)
  Must have: never been flagged for content violations
  One review per business per user (update-in-place, not duplicate)
  No review for your own claimed business (detected via claim record)

Display:
  Rating summary: ⭐ 4.3 (47 reviews) — on every business card
  Review section on business detail: latest 3 shown, "See all" → full list
  Sort: Most recent / Highest rated / Lowest rated
  Reply from owner: business owner can reply to any review (one reply per review)

Halal accuracy toggle:
  "Was the halal status accurate?" [Yes ✓] [No ✗]
  Shown only on businesses with halal_status != unknown
  Aggregate: "43/47 reviewers confirm halal status accurate"
  This is the most powerful trust signal in the entire product
  Admin flagged if accuracy drops below 70% (potential mis-certification)

Review moderation:
  AI scan before publication (spam + profanity)
  Community report on reviews
  Admin review queue for flagged items
  Zero tolerance for: personal attacks, fake reviews (5+ reviews from
  same device fingerprint for same business)
─────────────────────────────────────────────────────────────────
```

---

#### Feature 3.3 — Verified Business Program

**What it is:**
An enhanced verification tier beyond the basic halal certification badge — a full identity and quality verification that businesses pay $99/year for. Includes a field visit, photo shoot, and a "Muzgram Verified" badge that signals the listing is 100% accurate and actively managed.

**Why it matters:**
The halal badge answers "is the food halal?" The Verified badge answers "is everything about this listing accurate?" Hours, photos, menu, ownership — all verified by someone who physically visited. This is the trust tier that converts hesitant new-to-the-area users who can't rely on personal network recommendations yet.

**Verification checklist (in-person):**
```
MUZGRAM VERIFIED — ANNUAL $99 VERIFICATION
─────────────────────────────────────────────────────────────────
Verified by Muzgram team member (Atif or designated verifier):
  ☐ Business physically exists at listed address
  ☐ Operating hours confirmed as accurate (visit during listed hours)
  ☐ Halal certification documents reviewed (if claimed certified)
  ☐ Menu items / services as described
  ☐ Business photos taken by Muzgram team (professional, dark aesthetic)
    → 5 photos: exterior, interior, food/product, team/owner, detail shot
  ☐ Owner/manager contact confirmed (backup contact for listing issues)
  ☐ Google reviews cross-referenced for major discrepancies

Badge display:
  ✓ "Muzgram Verified" badge — gold checkmark, distinct from halal badge
  Verification date shown: "Verified April 2026"
  Re-verification reminder sent at 11 months

Benefits to business:
  Gold verified checkmark on all cards and map pins
  Priority placement in search results (+15 score boost)
  "Verified" filter in search facets (users can filter verified-only)
  Monthly verification spotlight email (sent to subscribers in their area)
  Photos from the professional shoot (business keeps the photos)
─────────────────────────────────────────────────────────────────
```

---

### TIER 4 — COMMUNITY AND SOCIAL INFRASTRUCTURE

---

#### Feature 4.1 — Community Groups (Lightweight)

**What it is:**
Location-based and affinity-based community groups that have their own feed of posts and events, managed by a group admin. Not a chat feature — a community content space. Groups are associated with real institutions: mosques, neighborhoods, Muslim professional networks.

**Why it matters:**
The Muslim community already organizes in groups — WhatsApp groups, mosque committees, Facebook groups. Muzgram groups give these communities a local discovery-tied home: a mosque's group shows that mosque's events, notices, and community posts to all group members. This is the bridge between the existing community infrastructure and Muzgram.

**What prevents this from becoming another WhatsApp:**
```
MUZGRAM GROUPS — HARD DESIGN CONSTRAINTS
─────────────────────────────────────────────────────────────────
No real-time chat — posts only (not messages)
No private groups — all groups are visible, join to post
No DMs — cannot contact individual group members
No following individuals — follow groups, not people
No notifications for every post — digest notification once/day max
Group size limit: unlimited read, post = admin-approved new members only
No monetization through groups — groups are pure community utility

Groups are designed to NOT be addictive.
If a group feature creates doom-scrolling behavior, it's wrong.
─────────────────────────────────────────────────────────────────
```

**Group types:**
```
NEIGHBORHOOD GROUPS (auto-created per neighborhood)
  "West Ridge Community" — auto-created when neighborhood is seeded
  Anyone can join, no approval needed
  Posts: local notices, events, food tips, questions
  Admin: Muzgram moderator (no external admin for neighborhood groups)

MOSQUE GROUPS (created by verified mosque accounts)
  "Mosque Foundation Community" — created by mosque admin account
  Mosque posts: events, announcements, prayer schedule changes, donations
  Public: anyone can follow, read, and save posts
  Post: mosque account only (curated, not open)
  This is the "official mosque channel" on Muzgram

INTEREST GROUPS (user-created, admin-approved)
  "Muslim Professionals Chicago" — member-submitted
  "Chicago Desi Foodies" — member-submitted
  "Chicago Muslim Parents" — member-submitted
  Open membership, any member can post (moderated)
  Admin-approved to prevent spam group creation
```

---

#### Feature 4.2 — City-Specific Onboarding

**What it is:**
When Muzgram launches in a second city, the onboarding experience adapts: welcome copy mentions the city, the neighborhood picker shows only local neighborhoods, and the first feed shows a curated "Welcome to Muzgram in Houston" experience with the best local content.

**Why it matters:**
A user in Houston who downloads Muzgram and sees Chicago-focused onboarding immediately distrusts the product's local relevance. City-specific onboarding signals: "this was built for you, in your city."

**Implementation:**
```
CITY-SPECIFIC ONBOARDING ADAPTS:
─────────────────────────────────────────────────────────────────
Onboarding Screen 1 (location):
  "Muzgram is live in Houston"    (vs generic "Muzgram")
  "Discover halal food, events, and services near you in Houston"

Neighborhood picker:
  Shows only Houston neighborhoods (geo-filtered, not Chicago list)
  "Popular in Houston" suggestions at top of list

First feed after onboarding:
  "Welcome to Houston 🌟 — Here's what's near you"
  Shows curated "New City Highlights": top-reviewed businesses,
  upcoming events, founding member businesses (prominent)
  "Be one of the first in Houston" CTA for businesses visible once

Founding member businesses get "🌟 Houston Pioneer" badge
  (city-specific version of "Founding Business" badge)

City launch notification (to early signups who opted in):
  "Muzgram just launched in Houston! [X] businesses are already live.
   Find what's halal near you 📍"
─────────────────────────────────────────────────────────────────
```

---

#### Feature 4.3 — Rich Push Notifications with Actions

**What it is:**
Upgrading from basic push notifications to rich notifications with images, multiple action buttons, and iOS Live Activities for real-time events.

**Why it matters:**
A push notification with a hero image of the event has 2–3× higher CTR than a text-only push. Action buttons ("Going / Not Going" directly from notification) double the conversion because the user doesn't need to open the app to act. These are standard capabilities of Expo Push Notifications in 2026.

**Notification upgrade specs:**
```
RICH PUSH NOTIFICATION FORMAT
─────────────────────────────────────────────────────────────────
Event nearby (rich):
  Title:    "Iftar Bazaar · 0.8mi · Tonight 6PM"
  Body:     "Over 40 vendors. Free entry. Bridgeview."
  Image:    Event hero image (60×60px thumbnail on iOS, full-width on Android)
  Actions:  [Going ✓]  [Not Going ✗]  [View Event →]
  Action tap "Going" → calls RSVP API without opening the app

Daily special (rich):
  Title:    "Friday Special at Noon O Kabab"
  Body:     "Lamb Biryani $9.99 · Open now · 0.3mi"
  Image:    Food photo (from daily special photo upload)
  Actions:  [Directions ↗]  [Call 📞]
  No "View" button — directions and call are the only actions needed

Saved event reminder (actionable):
  Title:    "CIOGC Iftar starts in 2 hours"
  Body:     "Islamic Foundation · 17.4mi · 8:30 PM tonight"
  Actions:  [Get Directions ↗]  [I can't make it ✗]
  "I can't make it" → updates RSVP to "Not going" via API background call

iOS Live Activities (iOS 16.2+ — 2026 standard):
  For events the user marked "Going":
    Live Activity on lock screen shows:
      Event name + countdown to start
      Distance from current location (updates live)
      "Tap for directions" when within 30 minutes
  Dismissed automatically when event ends
─────────────────────────────────────────────────────────────────
```

---

#### Feature 4.4 — Smart Digest Notification (Weekly Summary)

**What it is:**
An optional weekly summary push that replaces multiple individual daily pushes for users who prefer less frequent but more information-dense notifications.

**Why it matters:**
Some users (particularly parents and professionals) don't want daily pushes but do want to know what's happening this week. The weekly digest captures these users who would otherwise opt out of all notifications — trading frequency for completeness.

**Format:**
```
WEEKLY DIGEST — SUNDAY 9 AM (OPT-IN, DEFAULT OFF)
─────────────────────────────────────────────────────────────────
Title: "This Week Near West Ridge 🌙"
Body:  "3 events · 5 new businesses · 2 Ramadan specials"
Image: Collage of 3 event/business photos (dynamically generated)

In-app expanded view (tap):
  "This Week Near You"
  Events this week (sorted by date)
  New businesses added this week (with ✦ New badge)
  Upcoming Ramadan events (if in Ramadan)
  [Browse all →]

Personalized content selection:
  Based on user's top 2 categories (from interest signals)
  Only includes content within user's typical browse radius
─────────────────────────────────────────────────────────────────
```

---

#### Feature 4.5 — Halal Radar Widget (iOS + Android Home Screen)

**What it is:**
A home screen widget showing the nearest open halal restaurant, an upcoming event today, and the Muzgram quick-open button. Users who add the widget see Muzgram value without opening the app, which creates ambient retention.

**Why it matters:**
Home screen widgets dramatically increase DAU without push notifications. A widget on the home screen is a zero-friction return trigger — the user sees current content every time they unlock their phone. Halal Radar is the perfect widget candidate: the information is genuinely time-sensitive and changes throughout the day.

```
HALAL RADAR WIDGET SPEC
─────────────────────────────────────────────────────────────────
Medium size (4×2 cells):
  ┌──────────────────────────────────────┐
  │ ★ MUZGRAM · West Ridge              │
  │                                      │
  │ 🍽 Sabri Nihari — Right Here        │
  │    Open until 10 PM · Pakistani     │
  │                                      │
  │ 📅 Youth Basketball · 7 PM · 1.2mi  │
  └──────────────────────────────────────┘

Small size (2×2 cells):
  ┌─────────────────┐
  │ ★ MUZGRAM       │
  │ 🍽 Sabri Nihari │
  │ ● Open · 0.2mi  │
  │ [Tap to open]   │
  └─────────────────┘

Updates: Every 30 minutes (iOS/Android widget refresh limit)
Tap: Deep links to business/event detail (not app home)
Data source: WidgetKit extension calls /v1/feed/widget?lat=&lng= (lightweight endpoint)
Content: Nearest open halal restaurant + nearest event today
Ramadan variant: Adds "Iftar in 2h 14m" to widget header
─────────────────────────────────────────────────────────────────
```

---

### TIER 5 — INSTITUTIONAL PARTNERSHIPS

---

#### Feature 5.1 — Mosque Partner Dashboard

**What it is:**
A specialized admin portal for mosque administrators that gives them direct control over their mosque listing, prayer times, event calendar, and community announcements — without going through Muzgram admin approval for routine updates.

**Why it matters:**
If a mosque has to wait 24 hours for Muzgram admin to approve their Jummah time change, they will stop using the platform and return to WhatsApp. The mosque partner dashboard removes friction and gives institutions the autonomy they're accustomed to as community leaders.

**Mosque partner dashboard features:**
```
MOSQUE ADMIN PORTAL (separate from main admin dashboard)
─────────────────────────────────────────────────────────────────
Listing management:
  — Edit mosque name, address, capacity, parking info (auto-approved)
  — Update Jummah times + khutbah language (auto-approved)
  — Update prayer times display (Fajr/Zuhr/Asr/Maghrib/Isha — auto-approved)
  — Upload photos (AI moderated, auto-published if passes)
  — Toggle: "Currently open for visitors" (immediate)

Event management:
  — Create/edit/cancel events (auto-approved for Tier 4 accounts)
  — Recurring event setup (weekly, monthly, annual)
  — Event RSVP tracking (see who's coming)
  — Send reminder to RSVP'd users (one-click)
  — Download attendee count report

Analytics:
  — Mosque profile views per week
  — Jummah attendance interest (users who tapped "Add to Calendar")
  — Event RSVP counts and trends
  — Most viewed prayer time

Community announcements:
  — Post to their mosque's community group (directly, no approval)
  — Emergency announcements (immediately visible, marked URGENT)

Donation integration (MMP → Production):
  — Add donation button to mosque profile (links to LaunchGood or Give.com)
  — Not handled in-app — just an external link that Muzgram surfaces
─────────────────────────────────────────────────────────────────
```

---

#### Feature 5.2 — IFANCA API Integration (Halal Certification Sync)

**What it is:**
A direct API connection to IFANCA's certification database that auto-verifies and auto-updates halal certification status for businesses — replacing the manual certification review process.

**Why it matters:**
Manually verifying halal certifications is a bottleneck and an error risk. An automated sync with IFANCA's official database means: (1) certifications are always current, (2) businesses don't have to upload documents, (3) revoked certifications are automatically flagged. This is the highest-trust halal signal in North America.

**Implementation:**
```
IFANCA SYNC SYSTEM (requires partnership with IFANCA — MMP priority)
─────────────────────────────────────────────────────────────────
Partnership ask: API access to IFANCA certification database
  — Monthly batch sync (or webhook on certification changes)
  — Fields: company_name, address, certification_number, expiry_date, status

Sync job (Bull queue, runs weekly):
  → POST /ifanca-api/verify { company: "Noon O Kabab", address: "..." }
  → Response: { certified: true, cert_number: "CHI-2024-0234", expires: "2027-01-15" }
  → Update businesses.halal_status = 'ifanca_certified'
  → Update businesses.halal_cert_number and halal_cert_expires

Auto-revocation:
  If sync returns { certified: false } for previously certified business:
    → Immediately downgrade to 'self_declared'
    → Flag for admin review (human confirms before showing downgrade)
    → Do NOT automatically display "no longer certified" — that's defamatory if wrong
    → Admin reviews within 24h and makes final decision

ISNA parallel sync (similar integration, parallel partnership)

Display enhancement with sync data:
  "IFANCA Certified · Cert #CHI-2024-0234 · Valid until Jan 2027"
  → Trust signal 10× stronger than just the badge
─────────────────────────────────────────────────────────────────
```

---

## What NOT to Add in MMP

These are ideas that will be requested, considered, and should be explicitly deferred. The discipline of saying "not yet" is what keeps MMP focused.

```
DEFERRED TO PRODUCTION OR BEYOND
─────────────────────────────────────────────────────────────────
In-app messaging / DMs
  Why not: Moderation complexity, dating app perception risk,
           WhatsApp already serves this need. Build only if
           WhatsApp proves insufficient for community use cases.

Marketplace / E-commerce (order halal food in-app)
  Why not: Margins destroyed by delivery infrastructure.
           DoorDash problem without DoorDash scale.
           Muzgram's value is discovery, not fulfillment.

Ticketed events (in-app payment for event tickets)
  Why not: Event organizers have existing tools (Eventbrite, LaunchGood).
           Integration is 10× simpler than building in-house.
           Add external link support; don't build a ticketing system.

Video content (reels, stories, live streaming)
  Why not: Bandwidth cost, CDN complexity, moderation burden 100×,
           scope creep away from local discovery identity.
           Muzgram is photos + text. Not TikTok.

Anonymous posting
  Why not: Community trust is built on accountability. Anonymous posts
           create harassment risk, impossible moderation, brand risk.
           Phone-verified accounts are the foundation of community trust.

Paid advertising network (showing non-Muslim ads)
  Why not: Brand-destroying. A Muslim community app that shows Remy Martin
           ads because "the algorithm" decided they're relevant
           is a trust and values disaster.

Follower/following social graph
  Why not: Muzgram is a local discovery app, not a social network.
           The social graph creates influencer dynamics, comparison pressure,
           and content-chasing behavior that directly conflicts with the
           utility-first product philosophy.

Crypto / NFT integrations
  Why not: No.

Dating features (explicit)
  Why not: Brand risk, moderation complexity, wrong product positioning.
           Community networking (People Match) is different and can be added
           carefully in Production. Dating = separate product.
─────────────────────────────────────────────────────────────────
```

---

## Monetization in MMP

MMP unlocks 4 new revenue streams that were either not possible or not worth building in MVP:

### New Revenue Stream 1 — Business Pro Subscription
$49/month for enhanced business tools. Target: 30+ Business Pro subscribers at MMP end. $1,470/month new revenue from a product that requires zero Atif time to deliver.

### New Revenue Stream 2 — Stripe Self-Serve Featured Placements
Converts manual sales into self-serve. Not new revenue but removes the ceiling on revenue growth. Every business that previously waited for Atif to invoice them can now self-serve at 2 AM on a Saturday.

### New Revenue Stream 3 — Verified Business Program
$99/year. Target: 15 verified businesses at MMP launch. $1,485/year one-time, $1,485/year recurring per cohort. Grows as the portfolio grows.

### New Revenue Stream 4 — Push Notification Blast (tightly controlled)
$75–$199 per blast, proximity-targeted, strict limits (1/business/month, 3 platform-wide/day). Target: 4–5 blasts per month at $125 average. ~$500–$625/month. Genuinely low volume — the limits are real, not marketing.

### New Revenue Stream 5 — Campaign Packages (Seasonal)
```
RAMADAN CAMPAIGN PACKAGE (annual, highest-value seasonal product)
─────────────────────────────────────────────────────────────────
Full Ramadan Package:    $599 for the month
  Includes: Featured Feed Card for 30 days
            "Ramadan Iftar Special" gold crescent badge
            3 push notifications during Ramadan (blasts at Ramadan budget)
            Ramadan campaign spotlight email to subscribers in area
            "Ramadan Partner" badge on listing for the month

Iftar Special Spotlight: $199 for 2 weeks
  Featured in "Iftar Deals" sub-category
  Daily special auto-promoted during Ramadan window (Asr–Isha)

Eid Spotlight:           $299 for Eid week
  Featured in Eid events section
  "Eid Mubarak" banner on listing for 7 days
  Push notification on Eid day to area users

Target: 15 Ramadan packages × avg $350 = $5,250 in one month
This is Muzgram's biggest annual revenue event
─────────────────────────────────────────────────────────────────
```

### MMP Revenue Projection

```
MMP MRR TARGETS (by end of MMP phase, ~Month 9)
─────────────────────────────────────────────────────────────────
Featured Placements (self-serve + manual): 40 × $265avg = $10,600
Business Pro Subscriptions:               30 × $49      = $1,470
Lead Packages (Starter/Pro/Premium):      25 × $119avg  = $2,975
Push Notification Blasts:                 5/mo × $125   = $625
Daily Special Promotions:                 15 × $59/wk   = $885
Neighborhood Spotlight:                   8 × $165/mo   = $1,320
───────────────────────────────────────────────────────────────
Total MRR target:                                        ~$17,875
Annual run rate:                                         ~$215K ARR

Ramadan annual spike (not MRR):                          +$8,000–$15,000
Verified Business Program (annual):                      +$1,500–$4,500/yr
─────────────────────────────────────────────────────────────────
```

---

## The Prioritized MMP Roadmap

### MMP Sprint 1 — Revenue Infrastructure (Weeks 9–11)
**Goal:** Remove manual payment bottleneck. Businesses can pay without Atif.

```
DELIVERABLES
  ✓ Stripe Checkout integration (featured placements, event boosts)
  ✓ Stripe Subscriptions (lead packages, Business Pro)
  ✓ Stripe webhook handling (activate/deactivate/renew promotions)
  ✓ Stripe Customer Portal (businesses manage their own plans)
  ✓ Business analytics dashboard Phase 1 (views, saves, lead count)
  ✓ "Promote your business" flow in business owner portal
  ✓ Invoice PDF auto-generation + email delivery
  ✓ Failed payment grace period (3 days) + auto-deactivation

DEPENDENCIES: Stripe account approved, business portal built (Sprint 9 MVP)
SUCCESS METRIC: First self-serve payment received without Atif involvement
```

### MMP Sprint 2 — Retention Features (Weeks 11–14)
**Goal:** Convert more Day-7 users into Day-30 users.

```
DELIVERABLES
  ✓ Ramadan mode (full: header countdown, suhoor/iftar notifs, Ramadan feed)
  ✓ Jummah Finder screen with mosque hub
  ✓ Event RSVP system (Going / Interested / Calendar export)
  ✓ Saved event smart reminders (T-24h, T-2h with rich push)
  ✓ Rich push notifications with action buttons
  ✓ Post-event photo prompt automation (24h after event)
  ✓ Business Pro subscription (product creation + upsell flow)
  ✓ Halal Radar home screen widget (iOS WidgetKit + Android AppWidgets)

DEPENDENCIES: Push notification infrastructure (MVP Sprint 4 complete)
              Event RSVP requires events table + rsvp_count columns
SUCCESS METRIC: D30 retention ≥ 30%
```

### MMP Sprint 3 — Discovery Upgrade (Weeks 13–16)
**Goal:** Users find what they're looking for in under 5 seconds.

```
DELIVERABLES
  ✓ Typesense integration (sync existing content, replace PG FTS)
  ✓ Faceted search filters (open now, halal cert, category, distance)
  ✓ Search autocomplete + typo tolerance
  ✓ Voice search (iOS SFSpeechRecognizer / Android SpeechRecognizer)
  ✓ For You personalized feed tab (category-weighted scoring)
  ✓ Advanced Explore filters (grid view, popularity sort, trending section)
  ✓ Map search ("Search on map" → executes with viewport bounds)
  ✓ Business content tags (admin adds: biryani, mortgage, quran_school etc.)

DEPENDENCIES: 500+ indexed items in Typesense for quality to be noticeable
              User interest signals table populated from MVP (30+ days data)
SUCCESS METRIC: Search CTR (tap result after search) ≥ 60%
                "For You" feed saves rate ≥ 25% higher than "Nearby" baseline
```

### MMP Sprint 4 — Trust Infrastructure (Weeks 15–18)
**Goal:** New users trust the platform without needing community vouching.

```
DELIVERABLES
  ✓ Reviews + ratings system (1–5 stars, 150 chars, halal accuracy toggle)
  ✓ Review moderation pipeline (AI + community reports + admin queue)
  ✓ Business owner review reply feature
  ✓ Verified Business Program (paid $99/year, in-person verification workflow)
  ✓ Response time badge (auto-calculated from lead response times)
  ✓ "Accepting new clients" toggle (service providers) + waitlist notify
  ✓ Enhanced provider profile (portfolio section, case studies, credentials)
  ✓ IFANCA API partnership exploration (start conversations, build integration)

DEPENDENCIES: 500+ MAU minimum for reviews to be populated meaningfully
              Business owner portal fully stable (Sprint 9 MVP complete)
SUCCESS METRIC: Average reviews per listed business ≥ 3 within 60 days
                Verified Business conversions ≥ 10 at $99/each = $990
```

### MMP Sprint 5 — Community + City Expansion (Weeks 17–20)
**Goal:** The app works in multiple cities. Community layer deepens engagement.

```
DELIVERABLES
  ✓ Community groups (neighborhood auto-groups, mosque groups, interest groups)
  ✓ Group feed (posts + events within group context)
  ✓ Mosque partner dashboard (self-serve prayer times, events, announcements)
  ✓ City-specific onboarding (adapts to user's detected metro area)
  ✓ City 2 soft-launch: Houston, TX or New York/NJ (founding members pre-sold)
  ✓ Data import tool hardened for new city operations (< 40h setup)
  ✓ Campaign Engine: Ramadan + Eid packages (seasonal revenue products)
  ✓ Referral system ("Invite 3 friends → 1 free event boost" for businesses)
  ✓ Weekly digest notification (opt-in, replaces daily individual pushes)

DEPENDENCIES: City 2 founding member sales must close before sprint ends
              Institutional partnership in City 2 locked (mosque anchor)
SUCCESS METRIC: City 2 live with 50+ businesses seeded + 200+ users Week 1
                Community groups: 3+ active groups with 20+ members each
```

---

## MMP Definition of Done

MMP is complete when all of the following are true:

```
MMP COMPLETION CRITERIA
─────────────────────────────────────────────────────────────────
Revenue:
  ✓ $10,000+ MRR from self-serve (no manual Zelle payments)
  ✓ 40+ paying businesses
  ✓ Stripe churned zero active subscriptions due to billing failure
  ✓ Ramadan campaign revenue ≥ $5,000 (seasonal proof)

Retention:
  ✓ D7 ≥ 40%, D30 ≥ 30% (improvement over MVP gate criteria)
  ✓ Sessions per user per week ≥ 4 (from 3 at MVP)
  ✓ Push opt-out rate ≤ 12%

Discovery:
  ✓ Search CTR ≥ 60%
  ✓ Map tab opens ≥ 50% of sessions (from 40% at MVP)
  ✓ Reviews live on 70%+ of businesses with 5+ reviews each

Operations:
  ✓ Atif founder time ≤ 3h/week (from 15h/week at MVP)
  ✓ Moderation queue < 4h average SLA
  ✓ Zero manual invoicing for transactions under $500

Expansion:
  ✓ City 2 live with 50+ businesses, 200+ users, $1,000+ MRR Month 1
  ✓ City 2 setup time ≤ 40 hours (vs Chicago's 200+ hours)
  ✓ The MMP is a template, not a one-off
─────────────────────────────────────────────────────────────────
```

---

*MMP is not done when all features are built. It is done when the business can grow without the founder being the bottleneck.*
