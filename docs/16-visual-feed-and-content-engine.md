# Muzgram — Visual Feed & Auto-Running Content Engine

> Last updated: 2026-04-21
> Philosophy: **The feed runs itself. Atif is the founder, not the editor.**
> The "GRAM" in Muzgram is a promise: this is a visual, alive, photo-forward community — not a directory with a logo.

---

## Why This Document Exists

Two problems need solving simultaneously:

**Problem 1 — The "GRAM" identity gap.**
Muzgram has "GRAM" in its name. Users will arrive with a mental model shaped by Instagram. A feed of text-only cards and business listings will feel like a broken promise. The visual layer — photos, scenes, food shots, event moments — is what makes the product feel alive and worth opening. A feed without photos is a yellow pages app with a dark mode.

**Problem 2 — The manual management trap.**
If Atif has to manually curate, approve, seed, and refresh every piece of content to keep the feed alive, the platform cannot scale past 3 cities. The content engine must become self-fueling: businesses post because it benefits them, users post because it's easy and visible, automation handles the quality layer, and the algorithm handles the curation. The founder exits the editorial role as fast as possible.

**This document solves both.** It designs a visual-first feed that runs on community behavior, business incentives, and intelligent automation — not manual management.

---

## The Content Stack

Muzgram's feed is not one content type. It is a stack of six content layers that blend into a single cohesive visual experience:

```
CONTENT LAYER STACK (feed priority order)
─────────────────────────────────────────────────────────────────
Layer 1 — LIVE NOW          Events happening right now, restaurants open now
                             Rose pulse. Highest urgency. Automated.

Layer 2 — FEATURED          Admin-set paid promoted content
                             Gold star badge. Highest visual weight. Manual (business sale).

Layer 3 — VISUAL MOMENTS    Community photos of local places and events
                             "The GRAM layer." Fully user-generated. Auto-moderated.

Layer 4 — DAILY SPECIALS    Restaurant food photos + today's offer
                             Business-generated. Expires at midnight. Auto-nudged.

Layer 5 — EVENTS            Upcoming events in next 7 days
                             Organizer-generated. Admin-approved (auto for verified orgs).

Layer 6 — DISCOVER          New businesses, new listings, new services
                             Mix of business-submitted + auto-enriched from data sources.
─────────────────────────────────────────────────────────────────
```

The feed algorithm blends these layers in real-time based on time of day, user location, recency, and engagement signals. No single layer dominates — the mix creates the feeling that something new always exists.

---

## The Visual Feed ("The GRAM Layer")

### What Makes It Visual

Photos are the emotional core of the product. The design system is built for dark, warm, image-forward content. Every card is designed to make a photo feel cinematic.

```
VISUAL HIERARCHY IN CARDS
─────────────────────────────────────────────────────────────────
Featured Card (Layer 2):    200px hero, full-bleed, gradient overlay
                             The dominant visual element on screen load

Visual Moment Card:         160px image, full-width, bottom-third text overlay
                             "Instagram post in feed" feel — photo first, text second

Daily Special Card:         120px image, left-aligned, right: offer text
                             Food photography at compact size = impulse

Event Card (with image):    140px hero, full-width, date chip overlay
                             Community event photos turn strangers into friends

Event Card (no image):      Gradient background from category color (#6366F1)
                             Never a blank white box — always visual

Business Card (compact):    80×80px thumbnail, rounded — consistent
                             Grid-friendly density without visual noise
─────────────────────────────────────────────────────────────────
```

### The Photo-First Community Post

Community posts are currently text-first. This must shift to photo-first in MVP — not as a social-network clone, but as a local visual discovery layer.

```
REDESIGNED COMMUNITY POST CARD
──────────────────────────────────────────────────────────
┌──────────────────────────────────────────────────────┐
│ [Full-width image: 160px, contentFit: cover]         │
│                                              [Save ♡] │
│  ─────────────────────────────────────────────────── │
│  [Avatar 32px]  Yusuf A. · West Ridge · 2h ago       │
│                                                        │
│  "Friday biryani at Ghareeb Nawaz hits different      │
│   when it's cold outside 🤲"                          │
│                                                        │
│  [🍽 Food Tip]  [Share ↗]                            │
└──────────────────────────────────────────────────────┘
```

**The key design shift:** when a post has a photo, the photo leads. When there is no photo, the post still renders beautifully with a category-colored left accent bar and a slightly larger text treatment. Photo posts get +15 feed score vs text-only — this is not hidden, it just reflects that photos generate more engagement and discovery value.

### Visual Moment Categories

Community photos cluster into specific types that the app should recognize and surface intelligently:

```
VISUAL MOMENT TAXONOMY
─────────────────────────────────────────────────────────────────
Food Photos       "Friday Nihari at Sabri Nihari" — drives lunchtime opens
                  Automatically linked to the tagged business
                  Shows in business profile Photos tab + community feed

Event Photos      "CIOGC Iftar 2026" — shared after the event
                  Creates post-event content that lives for 7 days
                  Drives FOMO for next year's event

Discovery Posts   "Just found this place on Devon Ave"
                  The word-of-mouth moment in digital form
                  Highest WhatsApp share rate of any post type

Community Notices "Free Quran class every Tuesday at [Mosque]"
                  No photo needed — purely informational
                  Auto-expires 7 days or after the stated date

Recommendations   "Best halal butcher in Bridgeview — [Business]"
                  Organic business promotion by real community members
                  Linked to the mentioned business automatically

Questions         "Anyone know a good Muslim immigration lawyer?"
                  High reply intent — if replies existed, this would be
                  the highest-engagement type. For now: saves + shares.
─────────────────────────────────────────────────────────────────
```

### Business Photo Ecosystem

Every business has a photo layer that is always growing without Atif touching it:

```
BUSINESS PHOTO SOURCES (auto-aggregated)
─────────────────────────────────────────────────────────────────
Source 1: Owner-uploaded (admin portal)
  Business owner logs into portal, uploads menu photos, storefront,
  food shots. Quality control: owner-selected = usually good.
  Display: Business profile Photos tab + feed card hero

Source 2: Daily special photos
  Business posts today's special → photo attached
  Appears in: business card "SPECIAL TODAY" banner + feed
  Expires: midnight tonight

Source 3: Community-tagged photos
  User posts "Tried Ghareeb Nawaz tonight 🍛" with photo
  → Post is auto-tagged to that business if business name mentioned
  → Photo appears in business profile "Community Photos" sub-tab
  Display: separate sub-tab from owner photos (trust distinction)

Source 4: Auto-enriched from Google Places / Foursquare API (MMP)
  When a business is first seeded, auto-pull existing public photos
  from Google Places API as a starter set
  Admin review queue before display
  Falls back gracefully if no photos available
─────────────────────────────────────────────────────────────────
```

---

## The Auto-Running Content Engine

### How the Feed Runs Itself

The goal: Atif wakes up on a random Tuesday and the feed has fresh content without him touching it. Here is how that happens structurally:

```
SELF-RUNNING CONTENT PIPELINE
─────────────────────────────────────────────────────────────────

AUTOMATIC EVERY DAY (zero human action required):

  Midnight:
    — Daily specials expire from all business cards
    — Community posts older than 7 days are soft-deleted
    — "New" badge removed from businesses added > 7 days ago
    — Feed score cache invalidated → fresh ranking on next request
    — Event "happening today" labels refresh for next day's events
    — Push notification queue prebuilt for tomorrow's events
      (events happening tomorrow within geo clusters → queued for 8am push)

  6:00 AM:
    — Morning event feed precomputed and cached (Redis, 30min TTL)
    — Businesses with scheduled daily specials auto-posted
      (business owner pre-submitted specials for the week → auto-publish)
    — Live Now strip precomputed for 7–9am window

  12:00 PM:
    — Lunchtime feed recalculated (food weight + 15, radius tightens)
    — "Closes in X min" signals activated for businesses closing 12–2pm
    — Map food filter pre-caches nearby open restaurants

  5:00 PM:
    — Evening event feed precomputed
    — Weekend event section promoted to top of feed (Fri–Sun)
    — "Tonight" label applied to events starting in next 5 hours

  11:59 PM:
    — Tomorrow's specials queue checked → notification list built
    — Content freshness audit: flag any cluster with < 3 new items today
      → alert sent to admin Slack/WhatsApp if cluster goes stale
─────────────────────────────────────────────────────────────────
```

### The Business Content Automation Loop

The most reliable content source is businesses themselves — when you make posting effortless and show them the benefit immediately.

```
BUSINESS CONTENT NUDGE SYSTEM (automated, no Atif involvement)
─────────────────────────────────────────────────────────────────

Trigger 1 — NEW BUSINESS ONBOARDED
  T+0:    "Your listing is live on Muzgram! 🎉" WhatsApp message
  T+24h:  "Add your first daily special — it takes 30 seconds"
           [Link to admin portal → daily special form]
  T+72h:  "47 people viewed your listing this week" (real stat)
           "Add your top 3 menu photos to get 2× more views"
  T+7d:   "Tip: businesses with daily specials get 3× more profile visits"

Trigger 2 — BUSINESS HAS NOT POSTED IN 7 DAYS
  Auto WhatsApp (from Muzgram number, not Atif personally):
  "Salam [Name] — quick reminder to post today's special on Muzgram.
   Only takes 30 seconds: [deep link to daily special form]
   Your listing is currently getting 12 views/week 📊"

Trigger 3 — BUSINESS HAS UPCOMING EVENT (detected from their submissions)
  48h before event:
  "Your event '[Title]' is tomorrow — share it to your WhatsApp groups!
   Here's your event link: muzgram.app/event/[id]"
  [Pre-formatted WhatsApp share text included]

Trigger 4 — SEASONAL TRIGGERS (automated, calendar-based)
  Ramadan T-7d:  "Ramadan Mubarak! 🌙 Add your Iftar timings and
                  Ramadan specials to Muzgram — community is searching now"
  Eid T-3d:      "Add your Eid hours so the community knows you're open"
  Friday 9 AM:   "Post your Friday special — it's your highest traffic day"

Trigger 5 — BUSINESS CLAIMS THEIR LISTING (unclaimed → claimed)
  Immediate: Welcome flow + photo upload prompt
  T+2h:     "Your claimed listing needs 3 photos to be complete" progress bar
  T+24h:    "Add your operating hours to show as Open/Closed in the feed"
─────────────────────────────────────────────────────────────────
```

**Implementation:** These are Bull queue jobs — `BusinessContentNudgeJob` — scheduled and re-scheduled automatically. A new business onboarding triggers the sequence. The WhatsApp messages go via Twilio WhatsApp Business API (MMP; MVP uses manual Atif messages for first 20 businesses, then automates).

### The Community Content Flywheel (Self-Fueling)

```
COMMUNITY CONTENT LOOP — NO HUMAN CURATOR NEEDED
─────────────────────────────────────────────────────────────────

Stage 1 — SEED (first 2 weeks, Atif involved)
  Atif posts 5–10 community posts himself: food tips, event discoveries,
  neighborhood observations. These are not "admin posts" — they're
  genuine posts from his Muzgram account. Sets the tone and category norms.

Stage 2 — ANCHOR USERS (weeks 2–6)
  Identify 5–10 "community connectors" in each cluster:
    — Active WhatsApp group admins
    — Mosque social media managers
    — Food bloggers in the community
    — Event organizers who use the platform
  Invite them personally. Show them how posting works.
  These anchors generate 80% of early community content.

Stage 3 — ORGANIC FLYWHEEL (month 2 onward)
  Push notification: "Event near you — save it"
  User saves event → goes to event → takes a photo → posts on Muzgram
  Post appears in West Ridge feed → 3 people see it → 1 posts their own
  The loop runs without Atif.

Stage 4 — AUTOMATION AMPLIFICATION (MMP)
  "Post a photo from last night's event" — push notification
  sent 12 hours after an event ends, to users who saved the event
  "Share your experience" — gentle, one-time, not spammy
  This turns event attendees into content producers automatically
─────────────────────────────────────────────────────────────────
```

### The Event Recurrence System

Events that happen regularly (weekly Jummah, monthly community meetings, annual galas) create automatic content density without any new submission:

```
EVENT RECURRENCE ENGINE (reduces manual work by 60%)
─────────────────────────────────────────────────────────────────
Recurrence types:
  weekly:   same day, same time, every week
  biweekly: every other week
  monthly:  same week-of-month, same day (e.g., "first Sunday")
  annual:   same calendar date (e.g., annual Eid gala)

When organizer submits a recurring event:
  — Admin approves the parent event
  — System auto-generates all future instances (up to 12 months)
  — Each instance auto-publishes 7 days before its occurrence
  — Each instance auto-expires 1 day after it ends

Automatic freshness maintenance:
  "Jummah Prayer at Mosque Foundation" posted once by the mosque admin
  → App auto-generates 52 weekly instances for the year
  → Each Friday, the Jummah event is visible in the feed
  → Mosque admin does nothing for a full year after initial setup

Recurrence UI (organizer portal):
  "Does this event repeat?" toggle
  → If yes: frequency picker (weekly / biweekly / monthly / annual)
  → "Until" date or "indefinitely"
  → Preview of generated instances before confirming
─────────────────────────────────────────────────────────────────
```

**Impact:** A mosque that sets up their Jummah, weekly halaqa, and monthly community dinner as recurring events fills the feed with 156+ events per year from a single 15-minute setup session. This is the most powerful content automation in the MVP.

---

## Automated Content Moderation System

Manual approval of every piece of content does not scale. The system must auto-approve trusted content and auto-flag suspicious content, reserving human attention for the ambiguous middle.

### The Trust Tier System

Every account that produces content has a trust tier. Trust tier determines how much automation they get.

```
TRUST TIER MATRIX
─────────────────────────────────────────────────────────────────
TIER 0 — UNVERIFIED USER (new accounts, < 7 days old)
  Content: Community posts + photos
  Moderation: Async review (appears in feed, flagged for review queue)
  Auto-reject if: NSFW score > 0.7, spam pattern detected
  Review SLA: 2 hours
  Upgrade path: 7 days old + 0 violations → Tier 1

TIER 1 — TRUSTED USER (7+ days, no violations)
  Content: Community posts + photos
  Moderation: Auto-approved with background AI scan
  Bypass: Feed immediately on post
  Flag if: AI confidence < 0.85 or community report received
  Upgrade path: 30 days + 3+ quality posts → Tier 2

TIER 2 — COMMUNITY CONTRIBUTOR (established posters)
  Content: All post types + event submissions
  Moderation: Auto-approved (AI passes instantly)
  Bypass: Immediate feed placement
  Special: Event submissions bypass the manual approval queue
           (auto-approved, admin notified after the fact)

TIER 3 — VERIFIED BUSINESS (claimed + verified by admin)
  Content: Business listing edits, daily specials, event submissions
  Moderation: Fully auto-approved
  Never enters review queue
  Exception: Major listing changes (address, category) → re-verify
  Photos: Auto-approved (business has accountability)

TIER 4 — VERIFIED ORGANIZER (CIOGC, Mosque Foundation, IMAN, etc.)
  Content: All content types
  Moderation: Fully auto-approved, priority feed placement
  Photos: Auto-approved
  Events: Auto-approved, auto-featured for 24h
─────────────────────────────────────────────────────────────────
```

### AI Moderation Pipeline

```
CONTENT MODERATION PIPELINE (automated)
─────────────────────────────────────────────────────────────────

STEP 1 — SPAM DETECTION (< 50ms, runs on every submission)
  Check: URL patterns, repeated text, known spam phrases
  Model: Custom RegEx + Bloom filter on banned phrases
  Action: Auto-reject with soft error ("This post couldn't be published.
           Try again with different content.")
  No admin notification for spam — just silently reject

STEP 2 — PHOTO CONTENT SCAN (< 2s, runs on every uploaded image)
  API: Google Cloud Vision API SafeSearch or AWS Rekognition
  Checks: NSFW content, violence, graphic imagery
  Thresholds:
    SAFE (all scores < 0.3):   Publish immediately
    LIKELY (any score 0.3–0.7): Flag for human review, hold from feed
    EXPLICIT (any score > 0.7): Auto-reject, log for pattern analysis
  Cost: ~$0.0015/image (negligible at MVP scale)

STEP 3 — DUPLICATE DETECTION (< 100ms)
  Hash: perceptual hash (pHash) for images, fuzzy text match for posts
  If duplicate image found (> 95% match): reject silently with
    "This photo looks like one already shared. Try a new one."
  If near-duplicate text (> 85% match): warn user, let them decide

STEP 4 — COMMUNITY REPORT PROCESSING (automated response to reports)
  When a post receives 3+ reports from different users:
    → Auto-hidden from feed pending review (content still exists)
    → Admin notification: "3 reports received on [post] — review now"
    → Review SLA: 30 minutes during business hours
  When a post receives 10+ reports:
    → Auto-removed immediately, admin notified
    → Content creator receives: "Your post was removed after community review"
    → First offense: warning only
    → Second offense: 48h posting suspension
    → Third offense: account flagged for manual review

STEP 5 — QUALITY SCORING (runs 24h after publish, adjusts feed weight)
  Inputs: save rate, share rate, profile taps from the post
  Low quality score (< 20): naturally deprioritized in feed
  High quality score (> 70): surfaced to more users in cluster
  This is the algorithm doing curation — no human editorial needed
─────────────────────────────────────────────────────────────────
```

### What Stays Manual (and why)

```
HUMAN REVIEW REQUIRED
─────────────────────────────────────────────────────────────────
Business listing first submission:
  Why: First impression of business data quality. Address,
       category, halal status all need verification.
       A wrong halal certification is a liability.
  SLA: 24 hours
  Who reviews: Atif (MVP) → designated moderator (MMP)

Halal certification upgrades:
  Why: Certifications cannot be self-declared for IFANCA/ISNA tier.
       Requires documentation review.
  SLA: 48 hours (async — business is listed as "self-declared" until verified)
  Who reviews: Atif (always personal — this is a trust signal)

Community reports on potentially sensitive religious content:
  Why: Cultural and religious context requires human judgment.
       AI cannot reliably distinguish between acceptable Islamic
       content and genuinely problematic content.
  SLA: 2 hours
  Who reviews: Admin with community context

Business address changes:
  Why: Could be used to hijack another business's listing.
  SLA: 24 hours
  Who reviews: Moderator (MMP) or Atif (MVP)
─────────────────────────────────────────────────────────────────
```

---

## The Feed Algorithm (Self-Adjusting, No Manual Curation)

### The Scoring System

Every piece of content gets a real-time score. The feed is the top-N items by score. No editorial override except for paid featured content.

```typescript
// Feed scoring function — runs server-side on every feed request
function scoreContent(item: FeedItem, user: UserContext): number {
  let score = 0;

  // ── Recency (max 100 points) ────────────────────────────────
  const ageHours = (Date.now() - item.created_at) / 3600000;
  if (ageHours < 2)        score += 100;
  else if (ageHours < 6)   score += 80;
  else if (ageHours < 24)  score += 60;
  else if (ageHours < 72)  score += 40;
  else if (ageHours < 168) score += 20;
  // older than 7d: 0 (and will be expired anyway for posts)

  // ── Proximity (max 50 points) ───────────────────────────────
  const km = haversine(user.lat, user.lng, item.lat, item.lng);
  if (km < 0.5)       score += 50;
  else if (km < 2)    score += 35;
  else if (km < 5)    score += 20;
  else if (km < 10)   score += 8;
  else if (km < 20)   score += 2;
  // >20km: 0 — excluded from Now feed entirely

  // ── Content Type Boosts ─────────────────────────────────────
  if (item.type === 'event' && item.isToday)       score += 40;
  if (item.type === 'event' && item.isThisWeek)    score += 20;
  if (item.type === 'business' && item.isOpenNow)  score += 25;
  if (item.type === 'post' && item.hasPhoto)        score += 15; // visual
  if (item.type === 'daily_special')               score += 30;
  if (item.isLiveNow)                              score += 60; // real-time

  // ── Trust & Verification Boosts ─────────────────────────────
  if (item.isVerifiedOrganizer)                    score += 20;
  if (item.halalStatus === 'ifanca_certified')     score += 10;
  if (item.contentHealthScore > 80)                score += 8;

  // ── Engagement Quality (past 48h) ───────────────────────────
  score += Math.min(item.saveCount_48h * 3, 15);    // max 15
  score += Math.min(item.shareCount_48h * 5, 20);   // max 20

  // ── Paid Featured Override ───────────────────────────────────
  if (item.isFeatured && item.featured_until > Date.now()) {
    score += 200; // always near top, below live events
  }

  // ── Time-of-Day Adjustments ─────────────────────────────────
  const hour = new Date().getHours();
  if (hour >= 11 && hour <= 14 && item.type === 'business') score += 15; // lunch
  if (hour >= 17 && item.type === 'event' && item.isToday)  score += 10; // evening
  if (hour >= 6 && hour <= 9 && item.type === 'event')       score += 8;  // morning planning

  // ── New Listing Bonus (7-day window) ────────────────────────
  const daysOld = ageHours / 24;
  if (daysOld < 7 && item.type === 'business') score += 8; // "New" badge period

  return score;
}
```

### Feed Composition Rules (Enforced by Algorithm)

```
FEED COMPOSITION CONSTRAINTS
─────────────────────────────────────────────────────────────────
Max 1 featured card per 5 organic cards (1-in-5 cap)
Max 3 events from the same organizer per feed load
Max 2 daily specials visible without scrolling
Min 1 visual post (with photo) in first 10 cards
Community posts: max 30% of feed items (prevents post-flood)
Business listings: min 30% of feed items (core discovery utility)

If any constraint cannot be satisfied (too little content):
  Widen radius by 1km
  Extend recency window by 24h
  Surface "New to the area" placeholder with nearest content
  Never show a truly empty feed
─────────────────────────────────────────────────────────────────
```

### The Cold-Start Problem (Solved Without Manual Seeding Each City)

When Muzgram launches in Houston, there is no content. Here is how the system bootstraps itself:

```
CITY COLD-START AUTOMATION SEQUENCE
─────────────────────────────────────────────────────────────────
T-4 weeks (admin data import):
  Admin uses the bulk import tool (AG Grid) to import:
    — Top 30 halal restaurants from Google Places API data
    — Top 15 mosques from ISNA mosque directory API
    — 10 Muslim service providers from local directory scrape
  Data is imported, geocoded, and marked as "stub" listings
  (visible to users, but flagged internally as needing enrichment)

T-2 weeks (founding member outreach):
  Founding members are sold in the new city
  Their listings get immediate full enrichment + photo upload

T=0 (launch):
  Feed has 55+ pieces of content from import + founding members
  Community posts not yet seeded — that's OK
  Feed shows businesses + upcoming events (manually submitted)
  The "GRAM" layer comes in week 2 as users start posting

Week 2–4 (organic kick-off):
  First 100 users join → first community photo posts appear
  Business owners log in → start posting daily specials
  Event organizers submit first events → auto-approved if verified

Month 2 onward:
  Flywheel is self-running
  Content refresh rate exceeds content expiry rate
  Feed is alive without any curation by Atif or local team
─────────────────────────────────────────────────────────────────
```

**The key insight:** The stub listing import (using public data from Google Places, ISNA directory, and local directories) creates the illusion of a full content set before a single local business has taken action. Users who arrive on Day 1 see a full feed. Businesses are incentivated to claim their stub listing and improve it. The stub becomes a magnet.

---

## The Data Layer for Future People Match

The people match feature is not being built now — but the data it needs should be collected from Day 1. Retroactively building this data is impossible; building it in parallel costs almost nothing.

### What to Collect Now (Silently)

```
PEOPLE MATCH DATA FOUNDATION (MVP — stored, not shown to users)
─────────────────────────────────────────────────────────────────
user_interest_signals table:
  user_id         uuid
  signal_type     enum('save', 'tap', 'share', 'post', 'search', 'visit')
  content_type    enum('food', 'event', 'service', 'community')
  category_tag    varchar(50)  -- e.g. "halal_mortgage", "youth_events", "nigerian_food"
  created_at      timestamptz

user_community_clusters table:
  user_id         uuid
  cluster_name    varchar(100) -- derived from behavior: 'family_planner', 'food_explorer', 'event_goer'
  confidence      float        -- 0–1
  computed_at     timestamptz

user_neighborhood_affinity table:
  user_id         uuid
  neighborhood_id uuid
  affinity_score  float        -- how often they browse / save content from this area
  last_computed   timestamptz
─────────────────────────────────────────────────────────────────
```

**Why this is sufficient for now:** The people match feature needs interest signals, not social graph signals. When it launches, the algorithm already knows that User A saves events and posts food photos in West Ridge, and User B does the same in West Ridge. That's enough to surface "people with similar taste in your area" without a social graph.

### The People Match Feature Design (Future — reference only)

```
PEOPLE MATCH — NOT BEING BUILT YET — DESIGN INTENT
─────────────────────────────────────────────────────────────────
This is NOT a dating feature. It is a community networking feature.

Use cases:
  "Muslims new to the area looking to connect"
  "Muslim professionals who want to network"
  "Parents looking for play dates for their kids"
  "Event organizers looking for volunteers"

What it is NOT:
  Dating (explicitly not — no swipes, no romantic framing)
  Social following (not an Instagram clone)
  Private messaging (too much scope and moderation complexity)

Mechanism (when built):
  Opt-in only ("Enable community connections" in settings — off by default)
  Shows: "[Name] also frequents Devon Ave · 3 interests in common"
  Action: "Say Salam 👋" → sends a one-way intro notification
  No further chat — exchange WhatsApp from there
  Platform is the discovery layer, not the communication layer

Data we need from Day 1 (being collected already):
  Interest signals, neighborhood affinity, event attendance patterns
  All stored in the tables above — silently, with no user-facing feature
─────────────────────────────────────────────────────────────────
```

---

## The Visual Design System for "GRAM" Content

How photos look in the product matters as much as whether photos exist.

### Photo Treatment Standards

```
PHOTO DISPLAY SPECS BY CONTEXT
─────────────────────────────────────────────────────────────────
Community Post (feed):
  Width: full card width
  Height: 160px (portrait crops to center, landscape fills naturally)
  Aspect ratio: 16:9 preferred, 4:3 fallback
  Gradient: transparent → rgba(8,12,20,0.7) covering bottom 30%
  Category chip on gradient
  Border-radius: 16px top corners, 0px bottom (connects to text below)

Business Profile Photos Tab:
  Grid: 3-column for owner photos (4:3, 80px cells)
  Full-bleed viewer: tap → full-screen with swipe navigation
  "Community Photos" sub-tab: same grid, separate from owner photos
  Label distinction: owner photos = no label, community = "by [name]"

Daily Special (card):
  Thumbnail: 120×120px, rounded-xl (18px)
  No gradient (food photos are more appetizing unobscured)
  Border: border.subtle on thumbnail container

Event Hero:
  Width: full card width
  Height: 140px for compact, 280px for detail screen
  Gradient: transparent → rgba(8,12,20,0.95) covering bottom 50%
  Date chip over image: top-left, 8px margin
  Category chip: bottom-left of image

Map Pin Preview (bottom sheet):
  80×80px, rounded-md, left-aligned
  Source: first owner-uploaded photo, fallback to category gradient
─────────────────────────────────────────────────────────────────
```

### Photo Upload UX (Community Post Flow)

```
PHOTO POST CREATION — OPTIMIZED FOR SPEED AND QUALITY
─────────────────────────────────────────────────────────────────
Step 1: User taps + button
  Three large type cards: Event / Business / Post
  Post card shows a camera icon prominently — visual affordance

Step 2: Type selected → camera opens automatically
  (Not the gallery — camera first. Capture the moment.)
  "Photo from Library" as secondary option below the camera viewfinder
  User takes photo or selects from library

Step 3: Photo selected → instantly in the composer
  Photo fills the top 50% of the screen
  Auto-cropped to 16:9 with drag-to-reposition
  Tap to replace photo (no extra tap to remove then add)
  "Add photo" step is BEFORE the text step — visual-first design

Step 4: Text and category
  "What's this about?" — short, friendly prompt
  Category chips: Food Tip / Event Buzz / Discovery / Notice / Question
  Location: auto-detected, tap to change
  Character limit: 280 (Twitter-length — posts with photos need less text)

Step 5: Post
  Haptic confirmation → optimistic update → appears in feed immediately
  Upload continues in background (Cloudflare R2)
  If upload fails: retry silently, toast if 3rd retry fails
─────────────────────────────────────────────────────────────────
```

### The "No Photo" Fallback System

Not every post will have a photo. The feed should never look broken for text-only content:

```
TEXT-ONLY POST VISUAL TREATMENT
─────────────────────────────────────────────────────────────────
Category color gradient as the card background (subtle):
  Food Tip:    rgba(16,185,129,0.06) background + emerald left accent bar (3px)
  Event Buzz:  rgba(99,102,241,0.06) + indigo left bar
  Discovery:   rgba(245,158,11,0.06) + gold left bar
  Notice:      rgba(248,63,94,0.06)  + rose left bar
  Question:    rgba(56,189,248,0.06) + sky left bar

Text styling for text-only posts:
  Font: Plus Jakarta Sans (display font, not body)
  Size: 18px (slightly larger than body — the text IS the visual)
  Leading: 1.5 (generous line height for readability)
  Max lines visible: 5, then "Read more" fade

Author: avatar + name + neighborhood + time (same as photo posts)

Result: text-only post looks intentional and typographically confident,
not like a broken image placeholder
─────────────────────────────────────────────────────────────────
```

---

## Operational Automation Runbook

This section answers: what does running Muzgram look like week-to-week once the automation is in place?

### Week in the Life of Muzgram Operations (Post-Automation)

```
MONDAY (< 30 minutes of founder time)
  ○ Check admin dashboard Slack alert:
    "3 clusters had < 3 new content items yesterday"
    Action: WhatsApp 2 business contacts in those clusters
    "Hey [Name], quick reminder to post today's special!"

TUESDAY–THURSDAY (< 15 minutes/day)
  ○ Review admin moderation queue:
    Typical: 3–8 items needing human review
    Most are: first-time business submissions or flagged posts
    Average review time: 90 seconds per item
    Total: 8–12 minutes

FRIDAY (< 45 minutes)
  ○ Review Jummah-adjacent event submissions (peak submission day)
  ○ Check this weekend's event coverage per cluster
    "Does Bridgeview have 3+ events this weekend?"
  ○ Send renewal WhatsApp to any expiring featured businesses
    (generated by admin dashboard, Atif copies and pastes)

SATURDAY–SUNDAY (< 5 minutes/day)
  ○ Monitor for community reports (dashboard alert)
  ○ No routine action required — automation runs everything

MONTHLY (< 2 hours)
  ○ Review analytics: D7 retention, push CTR, cluster health
  ○ Identify 2–3 dormant businesses for personal outreach
  ○ Renew or lapse any featured placements
  ○ Review new institutional partnership opportunities

TOTAL WEEKLY OPERATIONS TIME (post-automation): ~2.5 hours
TOTAL WEEKLY OPERATIONS TIME (pre-automation MVP): ~15 hours
```

### Automation Dependencies and Build Order

```
AUTOMATION BUILD PRIORITY (engineering sprint order)
─────────────────────────────────────────────────────────────────
Sprint 1 (MVP core, must have):
  ✓ Midnight content expiry jobs (daily specials, post TTL)
  ✓ Feed score calculation (cached, served fast)
  ✓ Push notification queue (event reminders)
  ✓ Business hours → open/closed calculation

Sprint 4 (automation layer, high ROI):
  ✓ Bull queue: BusinessContentNudgeJob
  ✓ Event recurrence engine (recurring events generator)
  ✓ Community report processing (auto-hide at 3 reports)
  ✓ Feed freshness monitoring (Slack alert if cluster stale)

Sprint 8 (AI moderation):
  ✓ Google Vision API integration (photo scanning)
  ✓ Spam detection pipeline
  ✓ Trust tier system and auto-approval logic
  ✓ Duplicate detection (pHash for images, fuzzy match for text)

MMP (scale automation):
  → Twilio WhatsApp Business API for automated business nudges
  → Google Places API enrichment for stub listings
  → Engagement quality scoring (adjust feed weight post-publish)
  → "Post a photo from last night's event" automated push
─────────────────────────────────────────────────────────────────
```

---

## The Live Feed Vision (What It Looks Like at Day 30)

When everything above is working, this is what a user in West Ridge sees when they open Muzgram on a Friday lunchtime:

```
WEST RIDGE FEED — FRIDAY 12:15 PM — DAY 30
─────────────────────────────────────────────────────────────────

🔴 LIVE  [Ghareeb Nawaz] [CIOGC Halaqa] [Youth Bball Tonight] ──►

[All ●] [Food] [Events] [Services] [Community]

┌─────────────────────────────────────────────────────────────┐
│ ⭐ FEATURED                                                  │
│ [Full-width photo: steaming biryani, golden light]          │
│                                                    ✦        │
│ 🍽 Pakistani/Afghan                                         │
│ Noon O Kabab                                               │
│ ● Open · 🍽 Friday Biryani Special $9.99 · 0.3 mi          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ [Community photo: packed dining room, warm golden light]    │
│                                                    ♡        │
│ [●] Fatima Z. · West Ridge · 45 min ago                    │
│ "The Friday crowd at Ghareeb Nawaz is unreal 🤲            │
│  Worth the 20 min wait"                                    │
│ [🍽 Food Tip]  [Share ↗]                                  │
└─────────────────────────────────────────────────────────────┘

[img] CIOGC Halaqa — Tonight 7:30 PM · 0.8 mi · 🟣 Religious · ♡

┌─────────────────────────────────────────────────────────────┐
│ [Photo: freshly baked bread, dark dramatic lighting]        │
│ 🍽 SPECIAL TODAY  Al-Khyam Bakery                          │
│ Fresh Kaak · Every Friday · While supplies last · 0.6 mi  │
└─────────────────────────────────────────────────────────────┘

[img] ✦ New  Halal Home Finance LLC · Financial · 1.3 mi · ♡

[img] Eid Bazaar 2026 · Sat Apr 26 · 1.1 mi · 📅 · ♡
─────────────────────────────────────────────────────────────────

This feed required:
  ZERO Atif curation today
  ZERO manual featured slot changes today
  ZERO photo uploads by Atif
  ZERO event submissions by Atif
  
It required:
  ✓ Noon O Kabab posting their Friday special (30 sec, they do it every Friday now)
  ✓ Fatima posting a photo after her lunch (genuine community behavior)
  ✓ Al-Khyam Bakery setting up their recurring Friday special (set once, runs forever)
  ✓ CIOGC submitting tonight's halaqa (Tier 4 — auto-approved)
  ✓ The algorithm doing the rest
```

---

## Summary: The Auto-Running System at Scale

```
WHAT RUNS AUTOMATICALLY (zero human action required)
─────────────────────────────────────────────────────────────────
✓ Content expiry (midnight jobs)
✓ Feed score recalculation (real-time, cached)
✓ Open/closed business status (calculated from hours)
✓ Recurring event publishing (set once, runs for a year)
✓ Business content nudges via Bull queue (WhatsApp automation MMP)
✓ Community report auto-hiding (at 3 reports)
✓ Photo AI moderation (Vision API, < 2s per image)
✓ Spam detection (regex + bloom filter)
✓ Push notification queue (events, saved item reminders)
✓ Morning/lunch/evening feed adjustment (time-weighted scoring)
✓ Islamic calendar mode activation (Ramadan, Eid detection)
✓ "New" badge lifecycle (7-day automatic)
✓ Cluster freshness alerts (Slack notification if content drops low)

WHAT REQUIRES HUMAN ATTENTION (< 3 hours/week post-automation)
─────────────────────────────────────────────────────────────────
→ First business listing approval (24h SLA)
→ Halal certification verification (48h SLA)
→ Community report review (30-min SLA for 10+ report items)
→ Renewal conversations with featured businesses
→ New cluster outreach for content density

WHAT THE "GRAM" LAYER DELIVERS
─────────────────────────────────────────────────────────────────
Visual community posts → emotional resonance → WhatsApp sharing
Daily special food photos → lunch habit loop → daily active opens
Event photos → post-event community → next event anticipation
Business photo library → trust + discovery → lead conversion

The name Muzgram carries a visual promise.
This document is how we keep it.
```

---

*The feed should feel like it has a full editorial team behind it. It doesn't. It has a good algorithm, a smart automation system, and a community that posts because the app is actually useful.*
