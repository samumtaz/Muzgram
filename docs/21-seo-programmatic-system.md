# Muzgram — Programmatic SEO System

> Last updated: 2026-04-21
> Audience: Engineering team + growth lead
> Stack: Next.js 15 App Router (web layer) · PostgreSQL (data source) · Cloudflare (CDN/edge)
> Companion docs: 01-product-vision.md, 18-brand-identity.md, 20-cloud-infrastructure.md

---

## Strategic Framing

Muzgram has two interfaces: the **mobile app** (logged-in, social, real-time) and the **web layer** (anonymous, SEO-indexed, discovery-first). The web layer's job is to intercept organic search intent — people searching "halal restaurants Naperville" or "Muslim events Chicago tonight" — and convert them into app installs.

The SEO layer targets keywords people actually type. Once they land, the experience reflects the brand tone. There is no contradiction between targeting "halal restaurants in Naperville" in an H1 tag and having the app say "Best spots in Naperville" — the keyword is the hook, the brand is what keeps them.

**Target: 50,000+ indexed pages within 12 months of launch. Zero manual content creation required beyond initial seeding.**

---

## Document Map

1. [URL Structure](#1-url-structure)
2. [Page Types](#2-page-types)
3. [Programmatic Page Generation](#3-programmatic-page-generation)
4. [On-Page SEO Structure](#4-on-page-seo-structure)
5. [Structured Data](#5-structured-data)
6. [Internal Linking System](#6-internal-linking-system)
7. [User-Generated Content SEO](#7-user-generated-content-seo)
8. [Indexing Strategy](#8-indexing-strategy)
9. [Performance SEO](#9-performance-seo)
10. [App + Web SEO Connection](#10-app--web-seo-connection)
11. [Geo-Scaling Strategy](#11-geo-scaling-strategy)
12. [Content Strategy](#12-content-strategy)
13. [Monetization Through SEO](#13-monetization-through-seo)
14. [Admin SEO Tools](#14-admin-seo-tools)
15. [Concrete Examples](#15-concrete-examples)

---

## 1. URL Structure

### Design Principles

- All lowercase, hyphen-separated, no underscores
- City slug = the metro neighborhood name, not a database ID
- No trailing slashes (canonical standard)
- No query strings in indexed URLs (filters use URL path, not `?q=`)
- Max 3 levels deep for category pages, 4 for entity pages
- "Near me" pages are geo-detected at the edge, not query-string driven

### URL Taxonomy

```
TIER 1 — City Root Pages
/chicago
/naperville
/lombard
/bridgeview
/schaumburg
/west-rogers-park
/houston          ← Year 2
/new-york         ← Year 2

TIER 2 — Category Pages (city × category)
/chicago/eat
/chicago/go-out
/chicago/connect
/chicago/mosques
/naperville/eat
/naperville/go-out
/lombard/connect

TIER 3 — Subcategory Pages (city × category × subcategory)

  EAT subcategories:
  /chicago/eat/halal-burgers
  /chicago/eat/late-night
  /chicago/eat/shawarma
  /chicago/eat/south-asian
  /chicago/eat/breakfast
  /chicago/eat/mediterranean
  /chicago/eat/ethiopian
  /chicago/eat/desserts
  /naperville/eat/halal-pizza
  /naperville/eat/south-asian

  GO OUT — broad cultural + social event scope:
  /chicago/go-out/desi-parties
  /chicago/go-out/arab-parties
  /chicago/go-out/bollywood-nights
  /chicago/go-out/desi-dj-events
  /chicago/go-out/concerts
  /chicago/go-out/comedy-shows
  /chicago/go-out/cultural-festivals
  /chicago/go-out/eid-events
  /chicago/go-out/iftar-dinners
  /chicago/go-out/networking
  /chicago/go-out/sports
  /chicago/go-out/arts
  /chicago/go-out/open-mic
  /chicago/go-out/tonight
  /naperville/go-out/desi-parties
  /naperville/go-out/bollywood-nights
  /naperville/go-out/iftar-events
  /bridgeview/go-out/arab-parties
  /schaumburg/go-out/desi-parties

  CONNECT subcategories:
  /chicago/connect/photographers
  /chicago/connect/lawyers
  /chicago/connect/tutors
  /chicago/connect/mortgage-brokers
  /chicago/connect/wedding-venues
  /chicago/connect/wedding-planners
  /chicago/connect/dj-services

TIER 4 — Entity Pages (individual listings)
/chicago/places/sabri-nihari
/chicago/places/holy-land-grocery
/chicago/events/eid-bazaar-2026
/chicago/events/iftar-networking-night-april-2026
/naperville/places/noon-o-kabab
/naperville/events/ramadan-iftar-lombard-2026
/lombard/places/al-basha-restaurant

SPECIAL PAGES — High-intent landing pages
/near-me/halal-restaurants          ← Geo-detected at edge
/near-me/muslim-events
/near-me/halal-food-open-now
/near-me/mosques
/near-me/nikah-halls
/chicago/tonight
/chicago/today
/chicago/this-weekend
/naperville/tonight
/chicago/ramadan                     ← Seasonal
/chicago/eid                         ← Seasonal
/chicago/mosques

GUIDE PAGES — Editorial + SEO hybrid
/guides/best-halal-restaurants-chicago
/guides/best-halal-restaurants-naperville
/guides/muslim-wedding-vendors-chicago
/guides/iftar-restaurants-chicago-ramadan
/guides/eid-events-chicago-2026
/guides/halal-restaurants-near-ohare
/guides/muslim-owned-businesses-chicago
```

### URL Slug Generation Rules

```typescript
// packages/seo/src/slug.ts

export function generateListingSlug(name: string, city: string): string {
  // "Sabri Nihari Restaurant" → "sabri-nihari-restaurant"
  // Must be deterministic (same input = same output always)
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')   // remove special chars
    .replace(/\s+/g, '-')            // spaces to hyphens
    .replace(/-+/g, '-')             // dedupe hyphens
    .trim();

  return slug;
}

export function generateEventSlug(title: string, date: Date): string {
  // "Eid Bazaar 2026" on April 28 → "eid-bazaar-2026-april-28"
  const titleSlug = generateListingSlug(title, '');
  const dateSlug = format(date, 'MMMM-d').toLowerCase();
  return `${titleSlug}-${dateSlug}`;
}

// Slug conflicts: append city abbreviation
// Two "Al-Basha Restaurant" in different suburbs:
// /chicago/places/al-basha-restaurant
// /naperville/places/al-basha-restaurant  ← city in path prevents collision
```

---

## 2. Page Types

### 2.1 City Pages

**Purpose:** Top-level city hub. Ranks for "[City] Muslim community", "[City] halal food", "[City] Muslim events".

**Target keywords:**
- "halal restaurants [city]"
- "Muslim community [city]"
- "halal food [city]"
- "things to do [city] tonight"
- "Muslim events [city]"

**Content structure:**
```
H1: Discover [City]'s Best Spots, Events & People
H2: Restaurants Open Near [City] Now      → live feed section
H2: Events Happening in [City] This Week  → upcoming events grid
H2: Trusted Pros in [City]               → Connect category preview
H2: What's New in [City]                  → recent community posts
H2: Popular Neighborhoods in [City]       → cluster/neighborhood links
H2: About the Muslim Community in [City]  → editorial paragraph (unique per city)
```

**Metadata:**
```
Title: Halal Restaurants, Events & Community in [City] | Muzgram
Description: Find the best halal restaurants, Muslim events, and trusted local services in [City]. Your guide to what's open, what's happening, and what's worth it.
```

**Internal linking:**
- Links to all category pages for that city
- Links to top 5 businesses (by save count)
- Links to top 3 upcoming events
- Links to all neighborhood subclusters
- Breadcrumb: Home → [City]

---

### 2.2 Category Pages

**Purpose:** Category hub per city. Ranks for "[category] in [city]" — the highest-volume keywords.

**Types:** `/[city]/eat`, `/[city]/go-out`, `/[city]/connect`, `/[city]/mosques`

**Target keywords (Eat example):**
- "halal restaurants in Naperville"
- "halal food Naperville"
- "Muslim restaurants near Naperville"
- "best halal restaurants Naperville IL"

**Content structure (Eat):**
```
H1: Halal Restaurants in [City]
H2: Open Right Now                → time-filtered listing grid
H2: Most Saved This Week          → trending listings
H2: Browse by Type               → subcategory chips (Burgers, Shawarma, South Asian...)
H2: New to [City]                → recently added listings
H2: Daily Specials Today          → businesses with active specials
H2: Neighborhoods in [City]       → links to /[city]/eat/[neighborhood]
H2: Guides for [City] Food       → links to editorial guide pages
```

**Metadata:**
```
Title: Halal Restaurants in [City], IL — Open Now | Muzgram
Description: Browse [count]+ halal-certified restaurants in [City]. See what's open now, daily specials, and what locals are saving this week.
```

---

**Target keywords (Go Out example — the expanded scope):**
- "desi parties Chicago"
- "desi parties near me"
- "desi events Chicago this weekend"
- "Bollywood night Chicago"
- "Pakistani events Chicago"
- "Indian events Chicago"
- "Arab parties Chicago"
- "Muslim events Chicago"
- "halal club night Chicago"
- "desi DJ Chicago"
- "desi comedy show Chicago"
- "cultural events Chicago tonight"

**Content structure (Go Out):**
```
H1: Events & Parties in [City]

H2: Happening Tonight
  → time-filtered: next 12 hours

H2: This Weekend
  → Fri/Sat/Sun events grid

H2: Browse by Vibe
  → chip filters:
    Parties | Bollywood | Concerts | Comedy | Networking
    Cultural Festivals | Eid Events | Sports | Arts | Family

H2: Desi Parties in [City]
  → subcategory preview with link to /[city]/go-out/desi-parties

H2: Bollywood & Desi DJ Nights
  → subcategory preview with link to /[city]/go-out/bollywood-nights

H2: Concerts & Live Shows
  → /[city]/go-out/concerts

H2: Arab Cultural Events
  → /[city]/go-out/arab-parties (for cities with Arab community)

H2: Community & Cultural Festivals
  → Eid events, Melas, South Asian cultural festivals

H2: Upcoming in [City]
  → full paginated event list
```

**Metadata (Go Out):**
```
Title: Desi Parties, Events & Nightlife in [City] | Muzgram
Description: Find desi parties, Bollywood nights, concerts, comedy shows, and cultural events in [City]. See what's happening this weekend and share with your crew.
```

---

### 2.3 Subcategory Pages

**Purpose:** Captures long-tail searches — higher intent, lower competition, faster to rank.

**Target keywords — Eat subcategories:**
- "halal burgers Chicago"
- "shawarma near Naperville"
- "south asian restaurants Lombard"
- "Pakistani restaurant Schaumburg"
- "desi food near me open now"

**Target keywords — Go Out subcategories (the full cultural nightlife scope):**
- "desi parties Chicago"
- "desi parties near me this weekend"
- "Bollywood night Chicago"
- "Bollywood DJ night Naperville"
- "Pakistani events Chicago this weekend"
- "Indian events Chicago"
- "Arab parties Chicago"
- "Arab cultural events Bridgeview"
- "desi DJ near me"
- "halal club Chicago"
- "desi comedy show Chicago"
- "Muslim comedy show near me"
- "Eid party Chicago 2026"
- "desi concerts Chicago"
- "South Asian events Chicago"
- "iftar events Naperville"
- "Bhangra night Chicago"
- "desi Mela Chicago"
- "Eid bazaar Chicago 2026"
- "Muslim networking event Chicago"

**Target keywords — Connect subcategories:**
- "nikah hall Chicago"
- "Muslim photographer Chicago"
- "desi wedding photographer near me"
- "halal DJ Chicago"
- "desi DJ wedding Chicago"

**Content structure (Eat subcategory — e.g. Shawarma):**
```
H1: [Subcategory] in [City]  (e.g., "Shawarma Restaurants in Chicago")
H2: [Count] Options Near You
H2: Highly Saved             → top businesses by save count
H2: Recently Added
H2: Also in [City]           → related subcategory cross-links
H2: Other Cities             → same subcategory in other cities
```

**Content structure (Go Out subcategory — e.g. Desi Parties):**
```
H1: Desi Parties in [City]

H2: Upcoming This Month
  → event grid sorted by date

H2: This Weekend
  → filtered to Fri/Sat events

H2: Organizers to Follow
  → top event organizer profile cards (links to their listings)

H2: Venues Hosting Desi Nights in [City]
  → venue pages (cross-links to /[city]/places/[venue-slug])

H2: Other Nights You'll Love
  → Bollywood Nights | Arab Parties | Comedy Shows | Concerts
  (related Go Out subcategory cross-links)

H2: [City] Desi Parties — Upcoming Calendar
  → month-view calendar widget with event links

H2: Other Cities
  → /naperville/go-out/desi-parties | /houston/go-out/desi-parties
  (same subcategory expanding nationally — grows the keyword footprint)

H2: Frequently Asked Questions
  Q: Are there desi parties in [City] that are halal-friendly?
  Q: How do I find desi events near [City] this weekend?
  Q: What kind of desi events are on Muzgram?
```

**Metadata (Go Out subcategories):**
```
/chicago/go-out/desi-parties:
  Title: Desi Parties in Chicago — Upcoming Events This Weekend | Muzgram
  Description: Find desi parties and cultural nights in Chicago. Browse upcoming events, see who's going, and share with your crew.

/chicago/go-out/bollywood-nights:
  Title: Bollywood Nights in Chicago — DJ Events & Cultural Nights | Muzgram
  Description: Find Bollywood DJ nights and desi cultural events in Chicago. Updated weekly with the latest events near you.

/chicago/go-out/concerts:
  Title: Desi Concerts & Live Shows in Chicago | Muzgram
  Description: Pakistani, Indian, and Arab concerts and live shows in Chicago. Find upcoming shows, venues, and tickets.

/chicago/go-out/arab-parties:
  Title: Arab Cultural Events & Parties in Chicago | Muzgram
  Description: Find Arab cultural nights, dabke events, and community parties in Chicago and the suburbs.

/chicago/go-out/comedy-shows:
  Title: Desi Comedy Shows in Chicago — Stand-Up & Live Events | Muzgram
  Description: Desi stand-up comedy and entertainment shows in Chicago. Find tickets, dates, and venues.
```

---

### 2.4 Business / Listing Pages

**Purpose:** Individual business. Ranks for "[business name]", "[business type] near [neighborhood]".

**Content structure:**
```
H1: [Business Name]
H2: About                    → description, category, halal status
H2: Hours & Location         → hours table, embedded map
H2: Today's Special          → daily special banner (if active)
H2: Photos                   → photo grid
H2: Events Here              → upcoming events at this venue
H2: Near [Business Name]     → nearby businesses (internal linking)
H2: From the Community       → community posts mentioning this place
H2: Similar Spots in [City]  → same-category businesses
```

**Metadata:**
```
Title: [Business Name] — Halal [Category] in [Neighborhood], [City] | Muzgram
Description: [Business Name] is a halal [category] in [Neighborhood], [City]. [One-sentence description]. See hours, photos, and today's specials.
```

---

### 2.5 Event Pages

**Purpose:** Individual event. Ranks for "[event name]", "[event type] [city] [date/year]".

Events are time-sensitive — they rank fast (low competition, specific queries) and drive high-intent traffic.

**Content structure:**
```
H1: [Event Name]
H2: Event Details            → date, time, location, price, category
H2: About This Event         → description
H2: Where                    → venue page link + map
H2: More Events This Week    → related upcoming events
H2: From the Organizer       → organizer profile link
H2: Also in [City]           → similar event types
```

**Metadata:**
```
Title: [Event Name] — [Date] in [City] | Muzgram
Description: [Event Name] is happening [Date] in [City]. [One-sentence description]. Free/[Price]. See details and share with your crew.
```

**Important:** Event pages remain indexed after the event passes (301 redirect or noindex at 30 days post-event). Past event pages rank for "[event] [year]" searches and funnel into future editions.

---

### 2.6 "Near Me" Pages

**Purpose:** Intercepts the highest-volume local intent searches. Geo-detection happens at the Cloudflare Worker edge before the page renders.

**How it works:**
```
User searches "halal restaurants near me"
→ Lands on /near-me/halal-restaurants
→ Cloudflare Worker reads CF-IPCountry + CF-IPCity headers
→ Detects city → redirects to /[detected-city]/eat
→ OR renders a city-specific version of the near-me page if city is served

If city not yet in Muzgram:
→ Shows "We're coming to [detected city] soon — join the waitlist"
→ Captures email → feeds city launch pipeline
```

**Static near-me pages (always indexed):**
```
FOOD & DINING
/near-me/halal-restaurants       → 40,500 monthly searches
/near-me/halal-food              → 27,100 monthly searches
/near-me/halal-food-open-now     → 5,400 monthly searches
/near-me/iftar-dinners           → 1,600 monthly searches (10× in Ramadan)
/near-me/halal-catering          → 2,400 monthly searches
/near-me/desi-restaurants        → 9,800 monthly searches
/near-me/pakistani-restaurants   → 6,200 monthly searches
/near-me/indian-restaurants-halal→ 4,400 monthly searches

EVENTS & NIGHTLIFE
/near-me/desi-parties            → 12,000 monthly searches
/near-me/bollywood-night         → 8,400 monthly searches
/near-me/desi-events             → 7,100 monthly searches
/near-me/pakistani-events        → 3,800 monthly searches
/near-me/indian-events           → 5,200 monthly searches
/near-me/arab-events             → 2,900 monthly searches
/near-me/muslim-events           → 8,100 monthly searches
/near-me/desi-dj                 → 4,600 monthly searches
/near-me/halal-club              → 2,100 monthly searches
/near-me/desi-comedy-show        → 1,800 monthly searches
/near-me/eid-events              → 6,700 monthly searches (spike in Eid season)

COMMUNITY & SERVICES
/near-me/mosques                 → 33,100 monthly searches
/near-me/nikah-hall              → 2,900 monthly searches
/near-me/arabic-tutor            → 1,300 monthly searches
/near-me/muslim-photographer     → 900 monthly searches
/near-me/desi-wedding-photographer → 3,400 monthly searches
/near-me/halal-dj                → 1,200 monthly searches
```

---

### 2.7 "Tonight / Today / This Weekend" Pages

**Purpose:** Captures real-time intent. Refreshes every hour. ISR (revalidate: 3600).

```
/[city]/tonight    → "What's happening in Chicago tonight"
/[city]/today      → "Things to do in Chicago today Muslim"
/[city]/this-weekend → "Muslim events Chicago this weekend"
```

**Content:** Live events filtered to date range, businesses open tonight, daily specials active now.

**Metadata:**
```
Title: What's Happening in [City] Tonight — [Day, Date] | Muzgram
Description: [X] events and [Y] spots open in [City] tonight. Updated hourly.
```

---

### 2.8 Mosque Pages

**Purpose:** "Mosques near me" is one of the highest-volume Muslim local searches (33K/month). Each mosque gets its own indexed page.

**Content structure:**
```
H1: [Mosque Name] — [City], IL
H2: Prayer Times              → today's prayer times (dynamic)
H2: Location & Hours          → address, map
H2: Jummah Information        → Jummah khutbah time
H2: Events at This Mosque     → upcoming events
H2: Near [Mosque Name]        → nearby halal restaurants, services
H2: Other Mosques in [City]   → internal linking
```

**Metadata:**
```
Title: [Mosque Name] — Prayer Times & Info in [City] | Muzgram
Description: Find prayer times, Jummah schedule, and upcoming events at [Mosque Name] in [City], IL.
```

---

### 2.9 Guide Pages

**Purpose:** Long-form editorial content that captures competitive head-term searches and earns backlinks. Written once, auto-updated with fresh listings.

**Examples:**
```
FOOD GUIDES
/guides/best-halal-restaurants-chicago
/guides/best-halal-restaurants-naperville
/guides/best-desi-restaurants-chicago
/guides/best-pakistani-restaurants-chicago
/guides/best-indian-restaurants-halal-chicago
/guides/halal-food-near-ohare-airport
/guides/halal-restaurants-open-late-chicago
/guides/iftar-restaurants-chicago-ramadan-2026
/guides/halal-catering-chicago-weddings

EVENTS & NIGHTLIFE GUIDES  ← major new addition
/guides/desi-parties-chicago-2026
/guides/bollywood-nights-chicago
/guides/best-desi-events-chicago-this-month
/guides/eid-events-chicago-2026
/guides/arab-cultural-events-chicago
/guides/desi-comedy-shows-chicago
/guides/desi-concerts-chicago-2026
/guides/south-asian-events-naperville
/guides/things-to-do-chicago-desi-weekend

WEDDING & SERVICES GUIDES
/guides/muslim-wedding-vendors-chicago
/guides/desi-wedding-photographers-chicago
/guides/halal-dj-chicago-weddings
/guides/nikah-venues-chicago
/guides/arabic-tutors-chicago
/guides/muslim-owned-businesses-naperville
```

**Content structure:**
```
H1: Best Halal Restaurants in Naperville (2026)
H2: Our Top Picks              → curated top 5 (editorial, manually written)
H2: All Halal Restaurants in Naperville → full programmatic listing grid
H2: What to Look For           → halal certification explainer (200 words)
H2: By Cuisine Type            → categorized list with jump links
H2: Open Late in Naperville    → filtered view
H2: Frequently Asked Questions → FAQ schema (5 questions)
H2: Nearby Cities              → Lombard, Downers Grove, Aurora links
```

**Auto-update mechanism:** The "All Halal Restaurants" section pulls live from the database (ISR: revalidate every 6h). The intro paragraph and "Top Picks" section are manually written once. New businesses added to the DB automatically appear in the guide.

---

## 3. Programmatic Page Generation

### Technology Choice: Next.js 15 App Router

```
The web layer is a separate Next.js application from the mobile app.

apps/
  api/          ← NestJS backend (existing)
  mobile/       ← React Native Expo (existing)
  web/          ← Next.js 15 App Router (NEW — this is the SEO engine)
  admin/        ← Admin dashboard (existing)

The web app reads from the same PostgreSQL database as the API.
It does NOT go through the API — it queries the DB directly via a
read-only connection. This eliminates API latency from page renders.
```

### App Router File Structure

```
apps/web/src/app/
  page.tsx                          ← Homepage (muzgram.com)
  [city]/
    page.tsx                        ← City hub page
    eat/
      page.tsx                      ← Eat category page
      [subcategory]/
        page.tsx                    ← Subcategory page
    go-out/
      page.tsx
      [subcategory]/
        page.tsx
    connect/
      page.tsx
      [subcategory]/
        page.tsx
    mosques/
      page.tsx
    tonight/
      page.tsx
    today/
      page.tsx
    this-weekend/
      page.tsx
    places/
      [slug]/
        page.tsx                    ← Business detail page
    events/
      [slug]/
        page.tsx                    ← Event detail page
  near-me/
    [category]/
      page.tsx                      ← Near-me landing pages
  guides/
    [slug]/
      page.tsx                      ← Editorial guide pages
  sitemap.ts                        ← Dynamic sitemap generator
  robots.ts                         ← robots.txt generator
```

### Static Generation with generateStaticParams

```typescript
// apps/web/src/app/[city]/eat/page.tsx

import { db } from '@/lib/db';

// Pre-render all city eat pages at build time
export async function generateStaticParams() {
  const cities = await db.query(`
    SELECT slug FROM cities WHERE launch_status = 'active'
  `);

  return cities.rows.map(city => ({ city: city.slug }));
}

// Revalidate every 6 hours — picks up new businesses without full rebuild
export const revalidate = 21600;

export async function generateMetadata({ params }: { params: { city: string } }) {
  const city = await db.query(
    `SELECT name, listing_count FROM cities WHERE slug = $1`,
    [params.city]
  );

  return {
    title: `Halal Restaurants in ${city.rows[0].name}, IL — Open Now | Muzgram`,
    description: `Browse ${city.rows[0].listing_count}+ halal restaurants in ${city.rows[0].name}. See what's open now, daily specials, and what locals are saving this week.`,
    alternates: {
      canonical: `https://muzgram.com/${params.city}/eat`,
    },
    openGraph: {
      title: `Halal Restaurants in ${city.rows[0].name} | Muzgram`,
      description: `Find the best halal food in ${city.rows[0].name} — open now.`,
      url: `https://muzgram.com/${params.city}/eat`,
      siteName: 'Muzgram',
      type: 'website',
    },
  };
}
```

### Subcategory Page Generation

```typescript
// apps/web/src/app/[city]/eat/[subcategory]/page.tsx

export async function generateStaticParams() {
  // Generate all city × subcategory combinations
  const combinations = await db.query(`
    SELECT
      c.slug AS city,
      sc.slug AS subcategory
    FROM cities c
    CROSS JOIN subcategories sc
    WHERE c.launch_status = 'active'
      AND sc.category = 'eat'
      AND EXISTS (
        SELECT 1 FROM listings l
        WHERE l.city_id = c.id
          AND l.subcategory_id = sc.id
          AND l.is_active = true
      )
      -- Only generate page if at least 1 listing exists for that combination
      -- Prevents generating 1,000 empty pages
  `);

  return combinations.rows.map(row => ({
    city: row.city,
    subcategory: row.subcategory,
  }));
}

// This generates pages like:
// /chicago/eat/shawarma      (has 23 listings → generate)
// /chicago/eat/ethiopian     (has 4 listings → generate)
// /chicago/eat/kosher        (0 listings → skip, don't generate)
// /naperville/eat/shawarma   (has 6 listings → generate)
```

### Business Page Generation

```typescript
// apps/web/src/app/[city]/places/[slug]/page.tsx

export async function generateStaticParams() {
  // Generate individual pages for all active listings
  const listings = await db.query(`
    SELECT
      c.slug AS city,
      l.slug
    FROM listings l
    JOIN cities c ON l.city_id = c.id
    WHERE l.is_active = true
      AND c.launch_status = 'active'
    ORDER BY l.save_count DESC  -- Most popular first (build cache priority)
    LIMIT 10000                  -- Cap for initial build; rest via on-demand ISR
  `);

  return listings.rows;
}

// For listings beyond the 10K build cap: on-demand ISR
// When Google first crawls /chicago/places/some-new-restaurant:
//   1. Page not in static cache
//   2. Next.js renders it on-demand, saves to cache
//   3. Served from cache for all subsequent requests
//   4. Revalidates every 24h
export const revalidate = 86400;
```

### Avoiding Thin Content

The biggest programmatic SEO risk is generating thousands of pages with near-identical content. Here's how we prevent it:

```typescript
// Every page gets unique content signals from the database:

interface PageContentSignals {
  listing: Listing;
  recentSaves: number;           // "142 people saved this week"
  recentPhotos: Photo[];         // Photo grid (unique per business)
  communityPosts: Post[];        // Community mentions (unique, user-generated)
  upcomingEvents: Event[];       // Events at this venue
  dailySpecial: Special | null;  // Today's special (unique, changes daily)
  nearbyListings: Listing[];     // 5 nearby businesses (unique per location)
  reviewCount: number;           // MMP
  cityContext: string;           // "In the heart of West Rogers Park..."
}

// Rules for content minimum thresholds:
// - Business page: must have description > 50 words to be indexed
// - Subcategory page: must have > 2 listings to be indexed
// - Event page: must have description > 30 words to be indexed
// - Guide page: must have > 300 words in editorial section

// Pages below threshold: noindex until content meets bar
// This protects against thin content penalties
```

---

## 4. On-Page SEO Structure

### Title Tag Formula

```typescript
// packages/seo/src/titles.ts

export const TITLE_FORMULAS = {
  city: (city: string) =>
    `Halal Restaurants, Events & Community in ${city} | Muzgram`,

  cityEat: (city: string, count: number) =>
    `Halal Restaurants in ${city}, IL — ${count}+ Options Open Now | Muzgram`,

  cityGoOut: (city: string) =>
    `Muslim Events in ${city} — What's Happening This Week | Muzgram`,

  cityConnect: (city: string) =>
    `Trusted Muslim Professionals in ${city} — Lawyers, Photographers & More | Muzgram`,

  subcategoryEat: (sub: string, city: string) =>
    `Best ${sub} in ${city}, IL — Halal | Muzgram`,

  subcategoryGoOut: (sub: string, city: string, year: number) =>
    `${sub} in ${city} ${year} — Upcoming Events | Muzgram`,

  subcategoryConnect: (sub: string, city: string) =>
    `${sub} Near ${city} — Muslim Community Professionals | Muzgram`,

  listing: (name: string, category: string, neighborhood: string, city: string) =>
    `${name} — Halal ${category} in ${neighborhood}, ${city} | Muzgram`,

  event: (title: string, date: string, city: string) =>
    `${title} — ${date} in ${city} | Muzgram`,

  mosque: (name: string, city: string) =>
    `${name} — Prayer Times & Events in ${city} | Muzgram`,

  nearMe: (category: string) =>
    `${category} Near Me — Find What's Open Now | Muzgram`,

  tonight: (city: string, date: string) =>
    `What's Happening in ${city} Tonight — ${date} | Muzgram`,

  guide: (topic: string, city: string, year: number) =>
    `${topic} in ${city} (${year}) — Complete Guide | Muzgram`,
};

// Title length target: 50–60 characters
// If over 60: truncate at word boundary, append "| Muzgram"
```

### Meta Description Formula

```typescript
export const META_FORMULAS = {
  cityEat: (city: string, count: number, openNow: number) =>
    `Browse ${count}+ halal restaurants in ${city}. ${openNow} open right now. See daily specials, photos, and what locals are saving this week.`,

  subcategoryEat: (sub: string, city: string, count: number) =>
    `Find the best ${sub.toLowerCase()} in ${city}. ${count} halal-certified options, photos, hours, and what's open now.`,

  event: (title: string, date: string, city: string, price: string) =>
    `${title} is happening ${date} in ${city}. ${price}. See details, share with your crew, and discover more events near you.`,

  listing: (name: string, description: string, city: string) =>
    `${name} — ${description.slice(0, 80)}... Open in ${city}. See hours, photos, and today's specials.`,

  guide: (topic: string, city: string, count: number) =>
    `The complete guide to ${topic.toLowerCase()} in ${city}. ${count} options ranked and reviewed. Updated ${new Date().getFullYear()}.`,
};

// Meta description target: 140–155 characters
// Always include: city name, count/number, action word (see, find, browse, discover)
```

### H1 / H2 / H3 Hierarchy Rules

```
H1: One per page. Exact match or close variant of primary keyword.
    Never generic ("Welcome to Muzgram"). Always specific and local.

H2: Section headers. Include secondary keywords naturally.
    Target: 4–8 H2s per category page, 3–5 per entity page.

H3: Sub-section labels within H2 sections.
    Use for: cuisine types, event categories, service types.

H4: Rarely needed. Only for deeply nested content on guide pages.

Example — /chicago/eat/shawarma:
  H1: Shawarma Restaurants in Chicago
  H2: Open Near You Right Now
    (listing cards — no H3 needed)
  H2: Most Saved This Week
  H2: Browse Shawarma in Chicago Neighborhoods
    H3: West Rogers Park
    H3: Bridgeview
    H3: Schaumburg
  H2: Near Chicago's Shawarma Spots
    (related: falafel, gyros, Mediterranean)
  H2: Chicago Shawarma Guide
    H3: What Makes Good Shawarma
    H3: How We Verify Halal Status
  H2: Frequently Asked Questions
```

---

## 5. Structured Data

### Event Schema (JSON-LD)

```typescript
// apps/web/src/lib/schema/event.schema.ts

export function generateEventSchema(event: Event, venue: Listing | null) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description,
    startDate: event.startTime.toISOString(),
    endDate: event.endTime?.toISOString(),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',

    location: venue ? {
      '@type': 'Place',
      name: venue.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: venue.address,
        addressLocality: venue.city,
        addressRegion: venue.state,
        postalCode: venue.zip,
        addressCountry: 'US',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: venue.lat,
        longitude: venue.lng,
      },
    } : {
      '@type': 'PostalAddress',
      addressLocality: event.cityName,
      addressRegion: 'IL',
      addressCountry: 'US',
    },

    organizer: {
      '@type': 'Organization',
      name: event.organizerName,
      url: `https://muzgram.com/${event.citySlug}/places/${event.organizerSlug}`,
    },

    offers: event.isFree ? {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: event.externalLink ?? `https://muzgram.com/${event.citySlug}/events/${event.slug}`,
    } : {
      '@type': 'Offer',
      price: event.price?.toString() ?? '',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: event.externalLink ?? `https://muzgram.com/${event.citySlug}/events/${event.slug}`,
    },

    image: event.coverPhotoUrl
      ? [event.coverPhotoUrl]
      : ['https://muzgram.com/og-default.jpg'],

    keywords: [
      event.category,
      event.cityName,
      'Muslim community',
      'halal events',
      event.subcategory,
    ].filter(Boolean).join(', '),
  };
}
```

### LocalBusiness Schema

```typescript
// apps/web/src/lib/schema/business.schema.ts

export function generateBusinessSchema(listing: Listing) {
  const schemaType = CATEGORY_TO_SCHEMA_TYPE[listing.category] ?? 'LocalBusiness';

  return {
    '@context': 'https://schema.org',
    '@type': schemaType,
    // Map Muzgram categories to schema.org types:
    // 'restaurant' → 'Restaurant'
    // 'grocery' → 'GroceryStore'
    // 'mosque' → 'PlaceOfWorship'
    // 'lawyer' → 'LegalService'
    // 'photographer' → 'LocalBusiness' + 'ProfessionalService'
    // 'tutor' → 'EducationalOrganization'

    name: listing.name,
    description: listing.description,
    url: `https://muzgram.com/${listing.citySlug}/places/${listing.slug}`,
    telephone: listing.phone,

    address: {
      '@type': 'PostalAddress',
      streetAddress: listing.address,
      addressLocality: listing.city,
      addressRegion: listing.state,
      postalCode: listing.zip,
      addressCountry: 'US',
    },

    geo: {
      '@type': 'GeoCoordinates',
      latitude: listing.lat,
      longitude: listing.lng,
    },

    openingHoursSpecification: generateOpeningHours(listing.hours),

    // Halal status as additionalProperty (Google doesn't have a halal field natively)
    additionalProperty: listing.halalStatus === 'certified' ? [{
      '@type': 'PropertyValue',
      name: 'Halal Certification',
      value: listing.halalCertifier ?? 'Certified Halal',
    }] : undefined,

    image: listing.photos.slice(0, 5).map(p => p.url),

    // Aggregate rating — include when reviews exist (MMP+)
    ...(listing.reviewCount > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: listing.avgRating.toFixed(1),
        reviewCount: listing.reviewCount,
        bestRating: '5',
        worstRating: '1',
      },
    } : {}),

    // Price range
    priceRange: listing.priceRange ?? undefined,

    // Cuisine for restaurants
    ...(listing.category === 'restaurant' ? {
      servesCuisine: listing.cuisineTypes ?? [],
      hasMenu: listing.menuUrl ?? undefined,
    } : {}),

    // Parent organization if chain
    ...(listing.parentOrganization ? {
      parentOrganization: {
        '@type': 'Organization',
        name: listing.parentOrganization,
      },
    } : {}),
  };
}

function generateOpeningHours(hours: BusinessHours[]) {
  const dayMap: Record<string, string> = {
    monday: 'Mo', tuesday: 'Tu', wednesday: 'We',
    thursday: 'Th', friday: 'Fr', saturday: 'Sa', sunday: 'Su',
  };

  return hours.map(h => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: `https://schema.org/${h.day.charAt(0).toUpperCase() + h.day.slice(1)}`,
    opens: h.open,
    closes: h.close,
  }));
}
```

### BreadcrumbList Schema

```typescript
export function generateBreadcrumbSchema(breadcrumbs: Breadcrumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.label,
      item: `https://muzgram.com${crumb.path}`,
    })),
  };
}

// Example output for /chicago/eat/shawarma:
// [{position: 1, name: "Home", item: "https://muzgram.com"},
//  {position: 2, name: "Chicago", item: "https://muzgram.com/chicago"},
//  {position: 3, name: "Eat", item: "https://muzgram.com/chicago/eat"},
//  {position: 4, name: "Shawarma", item: "https://muzgram.com/chicago/eat/shawarma"}]
```

### FAQ Schema

```typescript
// Used on: Guide pages, category pages, subcategory pages

export function generateFAQSchema(faqs: FAQ[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

// Pre-defined FAQs by page type
export const FAQS_BY_TYPE = {
  cityEat: (city: string) => [
    {
      question: `Are there many halal restaurants in ${city}?`,
      answer: `Yes — Muzgram currently lists ${'{count}'} halal-certified restaurants in ${city}, spanning cuisines from South Asian to Middle Eastern, Mediterranean, and American.`,
    },
    {
      question: `How do I know if a restaurant is truly halal in ${city}?`,
      answer: `Muzgram shows a halal certification badge for businesses with verified certification from IFANCA or a recognized halal authority. You can filter by certification status on any listing.`,
    },
    {
      question: `What are the best late-night halal restaurants in ${city}?`,
      answer: `Several restaurants in ${city} serve until midnight or later. Use Muzgram's "Open Now" filter after 10pm to see what's currently serving.`,
    },
    {
      question: `How often are restaurant listings updated in ${city}?`,
      answer: `Listings are updated by business owners directly on Muzgram. Hours, menus, and daily specials can change at any time. We verify active listings quarterly.`,
    },
    {
      question: `Can I find halal food delivery in ${city} on Muzgram?`,
      answer: `Muzgram focuses on discovery and local dine-in. Many listed restaurants also offer delivery via their own channels or third-party services — check each listing for contact and ordering options.`,
    },
  ],
};
```

### Service Schema (Connect tab providers)

```typescript
export function generateServiceSchema(provider: ServiceProvider) {
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'ProfessionalService'],
    name: provider.name,
    description: provider.description,
    url: `https://muzgram.com/${provider.citySlug}/connect/${provider.categorySlug}/${provider.slug}`,
    telephone: provider.phone,
    email: provider.email,

    address: {
      '@type': 'PostalAddress',
      addressLocality: provider.city,
      addressRegion: provider.state,
      addressCountry: 'US',
    },

    serviceArea: {
      '@type': 'GeoCircle',
      geoMidpoint: {
        '@type': 'GeoCoordinates',
        latitude: provider.lat,
        longitude: provider.lng,
      },
      geoRadius: '30000', // 30km service radius in meters
    },

    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: provider.categoryName,
      itemListElement: provider.services.map(s => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: s.name,
          description: s.description,
        },
      })),
    },

    knowsAbout: provider.specializations ?? [],
    knowsLanguage: provider.languages?.map(l => ({ '@type': 'Language', name: l })),
  };
}
```

### Injecting Schema in Next.js App Router

```tsx
// apps/web/src/app/[city]/places/[slug]/page.tsx

import Script from 'next/script';
import { generateBusinessSchema, generateBreadcrumbSchema } from '@/lib/schema';

export default async function BusinessPage({ params }) {
  const listing = await getListing(params.city, params.slug);

  const schemas = [
    generateBusinessSchema(listing),
    generateBreadcrumbSchema([
      { label: 'Home', path: '/' },
      { label: listing.cityName, path: `/${params.city}` },
      { label: listing.categoryName, path: `/${params.city}/${listing.categorySlug}` },
      { label: listing.name, path: `/${params.city}/places/${params.slug}` },
    ]),
  ];

  return (
    <>
      {schemas.map((schema, i) => (
        <Script
          key={i}
          id={`schema-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      {/* page content */}
    </>
  );
}
```

---

## 6. Internal Linking System

### The Authority Flow Model

```
Homepage
  └── City Pages (major hubs — receive most internal link equity)
        ├── Category Pages (strong pages — linked from city + guide pages)
        │     ├── Subcategory Pages (long-tail — linked from category)
        │     │     └── Business/Event Pages (entity level)
        │     └── Business/Event Pages (also linked directly from category)
        └── Guide Pages (editorial — linked from city + category pages)

Near-Me Pages → redirect to City Pages (pass authority to city pages)
Tonight/Today Pages → link to events + businesses (freshness signal)
```

### Linking Rules by Page Type

```typescript
// City Page links out to:
const cityPageLinks = {
  internal: [
    '/[city]/eat',                     // Category pages (4 links)
    '/[city]/go-out',
    '/[city]/connect',
    '/[city]/mosques',
    '/[city]/tonight',                 // Tonight page
    '/[city]/places/[top-5-slugs]',    // Top 5 businesses by saves
    '/[city]/events/[next-3-events]',  // Next 3 upcoming events
    '/[cluster]/...',                  // Nearby neighborhoods
  ],
  guides: [
    '/guides/best-halal-restaurants-[city]',
    '/guides/muslim-events-[city]',
  ],
};

// Category Page (e.g. /chicago/eat) links out to:
const categoryPageLinks = {
  subcategories: [
    '/chicago/eat/shawarma',
    '/chicago/eat/south-asian',
    '/chicago/eat/burgers',
    // All subcategories with > 0 listings
  ],
  topListings: [
    '/chicago/places/[top-10-by-saves]',  // Most saved businesses
  ],
  relatedCategory: [
    '/chicago/go-out',                     // Cross-category
  ],
  guide: [
    '/guides/best-halal-restaurants-chicago',
  ],
  cityPage: ['/chicago'],                  // Breadcrumb + footer
};

// Business Page links out to:
const businessPageLinks = {
  nearby: [
    '/chicago/places/[5-nearest-businesses]',  // Geo-nearest
  ],
  samCategory: [
    '/chicago/places/[3-same-category]',        // "More shawarma spots"
  ],
  events: [
    '/chicago/events/[events-at-this-venue]',   // Events here
  ],
  parent: [
    '/chicago/eat/shawarma',                    // Subcategory
    '/chicago/eat',                             // Category
    '/chicago',                                 // City
  ],
};
```

### "Related Content" Modules (Bottom of Every Page)

Every page renders 3 related content modules. These are the primary internal linking mechanism and keep users on site.

```tsx
// apps/web/src/components/RelatedContent.tsx

// Module 1: Related Places (business + subcategory pages)
// "More Shawarma in Chicago"
// → 6 business cards linking to /chicago/places/[slug]

// Module 2: Events Nearby
// "Happening Near You"
// → 4 event cards linking to /chicago/events/[slug]

// Module 3: Explore More
// "Also in Chicago" — related subcategory + city category links
// → Text links: "Halal Burgers", "Mediterranean", "Open Late Tonight"
// → Each links to /chicago/eat/[subcategory]

// Module 4 (guide pages only): More Guides
// → 3 guide links for same city or same topic
```

### Neighborhood Cross-Linking

Chicago metro neighborhoods actively cross-link. This keeps crawlers moving through the cluster structure and captures neighborhood-level queries ("halal food Bridgeview", "Muslim events Schaumburg").

```tsx
// apps/web/src/components/NeighborhoodNav.tsx

// Shown on every Chicago city/category/subcategory page
// "Also in the Chicago Area"
// → Bridgeview | West Rogers Park | Schaumburg | Naperville | Lombard
// Each links to the same page type in the neighboring city:
// /chicago/eat → /bridgeview/eat | /naperville/eat | /schaumburg/eat
```

---

## 7. User-Generated Content SEO

### Why UGC Matters for SEO

Community posts, reviews (MMP), and event descriptions from users provide:
1. **Keyword diversity** — users naturally use long-tail phrases ("went to iftar here last Friday", "great place for after-Jummah lunch")
2. **Content freshness** — Google rewards pages that update frequently
3. **Unique content** — prevents identical-page penalties across city/category combinations
4. **Topical authority signals** — user language reinforces the page's topical focus

### UGC Integration Architecture

```typescript
// Community posts on business pages (SEO value)

// Every business page renders recent community posts mentioning it
// These are crawled by Google as part of the page content
// Max 10 posts shown per page, truncated at 150 characters with "Read more"

// UGC text is:
//  - Indexed as part of the page (not lazy-loaded)
//  - Rendered server-side (Next.js RSC — not client JS)
//  - Refreshes when post is published (ISR on-demand revalidation)

// Example post on /chicago/places/sabri-nihari:
// "Went after Jummah with the crew — the nihari was perfect, highly recommend
//  the extra bone marrow. Gets packed around 2pm on Fridays."
// ↑ This adds: "Jummah", "nihari", "Friday" — all relevant search terms
```

### Moderation for SEO Health

```typescript
// UGC moderation rules specifically for SEO:

const UGC_SEO_RULES = {
  // Minimum quality bar before appearing on page
  minimumTextLength: 20,          // No one-word posts
  maximumLinksAllowed: 0,         // No outbound links in UGC (spam prevention)
  spamKeywords: [                  // Block common spam patterns
    'click here', 'free money', 'discount code',
    'www.', 'http', '@gmail',
  ],

  // What gets noindexed even after passing moderation:
  noindexIfReportedCount: 3,      // 3 reports → noindex that post
  noindexIfTrustTier: 0,         // Tier 0 posts never indexed until tier upgrade

  // UGC schema for reviews (MMP)
  reviewMinWords: 30,             // Reviews under 30 words not shown in schema
  reviewMaxAge: 730,              // Reviews > 2 years old removed from schema (stale)
};
```

### UGC Keyword Seeding (the founder's manual job in weeks 1-4)

```
The cold-start problem: new business pages have no UGC.
Solution: seed 2-3 community posts per anchor business before launch.

Week 1: Founder writes 3 posts per top 20 businesses (60 posts)
  → Written in natural user voice, not marketing copy
  → Each post uses different neighborhood references, time references
  → Example: "This is the go-to spot after work for anyone in Bridgeview..."
  → Example: "Late night option — still open past midnight on weekends..."

Week 2-4: Recruit 10 anchor users, each writes 5+ posts
  → 50+ community posts live before first marketing push
  → Page content is rich, not thin, before Google first crawls
```

---

## 8. Indexing Strategy

### Sitemap Architecture

```typescript
// apps/web/src/app/sitemap.ts — Next.js 15 dynamic sitemap

import { MetadataRoute } from 'next';
import { db } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cities, listings, events, guides] = await Promise.all([
    db.query(`SELECT slug, updated_at FROM cities WHERE launch_status = 'active'`),
    db.query(`
      SELECT l.slug, c.slug AS city_slug, l.updated_at
      FROM listings l
      JOIN cities c ON l.city_id = c.id
      WHERE l.is_active = true AND c.launch_status = 'active'
      ORDER BY l.save_count DESC
    `),
    db.query(`
      SELECT e.slug, c.slug AS city_slug, e.updated_at
      FROM events e
      JOIN cities c ON e.city_id = c.id
      WHERE e.is_active = true
        AND e.start_time > NOW() - INTERVAL '7 days'
        -- Include recent past events (30 days) for indexed archive
    `),
    db.query(`SELECT slug, updated_at FROM guide_pages WHERE is_published = true`),
  ]);

  const staticPages = [
    { url: 'https://muzgram.com', priority: 1.0, changeFrequency: 'daily' as const },
    { url: 'https://muzgram.com/near-me/halal-restaurants', priority: 0.9, changeFrequency: 'hourly' as const },
    { url: 'https://muzgram.com/near-me/muslim-events', priority: 0.9, changeFrequency: 'hourly' as const },
    { url: 'https://muzgram.com/near-me/mosques', priority: 0.9, changeFrequency: 'weekly' as const },
  ];

  const cityPages = cities.rows.flatMap(city => [
    { url: `https://muzgram.com/${city.slug}`, priority: 0.9, changeFrequency: 'daily' as const, lastModified: city.updated_at },
    { url: `https://muzgram.com/${city.slug}/eat`, priority: 0.9, changeFrequency: 'daily' as const },
    { url: `https://muzgram.com/${city.slug}/go-out`, priority: 0.9, changeFrequency: 'daily' as const },
    { url: `https://muzgram.com/${city.slug}/connect`, priority: 0.8, changeFrequency: 'weekly' as const },
    { url: `https://muzgram.com/${city.slug}/mosques`, priority: 0.8, changeFrequency: 'weekly' as const },
    { url: `https://muzgram.com/${city.slug}/tonight`, priority: 0.8, changeFrequency: 'hourly' as const },
  ]);

  const listingPages = listings.rows.map(l => ({
    url: `https://muzgram.com/${l.city_slug}/places/${l.slug}`,
    priority: 0.7,
    changeFrequency: 'weekly' as const,
    lastModified: l.updated_at,
  }));

  const eventPages = events.rows.map(e => ({
    url: `https://muzgram.com/${e.city_slug}/events/${e.slug}`,
    priority: 0.8, // Events get higher priority — time-sensitive
    changeFrequency: 'daily' as const,
    lastModified: e.updated_at,
  }));

  const guidePages = guides.rows.map(g => ({
    url: `https://muzgram.com/guides/${g.slug}`,
    priority: 0.85, // Guides rank well — higher priority
    changeFrequency: 'monthly' as const,
    lastModified: g.updated_at,
  }));

  return [
    ...staticPages,
    ...cityPages,
    ...listingPages,
    ...eventPages,
    ...guidePages,
  ];
}

// Sitemap index for large sites (> 50K URLs):
// Split into: sitemap-cities.xml, sitemap-listings.xml, sitemap-events.xml
// All referenced from sitemap-index.xml
```

### robots.txt

```typescript
// apps/web/src/app/robots.ts

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',           // API routes
          '/admin/',         // Admin panel
          '/_next/',         // Next.js internals
          '/auth/',          // Auth pages
          '/profile/',       // Private user profiles
          '/saved/',         // Private saved items
          '/*?*',            // Query string URLs (prevent duplicate indexing)
          '/near-me/*/map',  // Map view variants
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: '/',       // Block OpenAI crawler from scraping content
      },
      {
        userAgent: 'CCBot',
        disallow: '/',       // Block Common Crawl
      },
    ],
    sitemap: 'https://muzgram.com/sitemap.xml',
    host: 'https://muzgram.com',
  };
}
```

### Canonical Tags

```typescript
// apps/web/src/lib/canonical.ts

// Rules for canonical assignment:

// 1. Every page has a self-referencing canonical
// /chicago/eat → canonical: https://muzgram.com/chicago/eat

// 2. Near-me pages canonical to the city category they serve
// /near-me/halal-restaurants (after geo-detect to Chicago)
// → canonical: https://muzgram.com/chicago/eat
// NOT self-referencing (avoids near-me page competing with city page)

// 3. Paginated pages: all pages canonical to page 1
// /chicago/eat?page=2 → canonical: https://muzgram.com/chicago/eat
// (But we don't use query string pagination — we use load-more/infinite scroll)

// 4. Past event pages (> 30 days after event)
// Option A: noindex (simplest)
// Option B: canonical to the recurring event's permanent page
// /chicago/events/eid-bazaar-2025 → canonical: /chicago/events/eid-bazaar-2026

// 5. Filter variant pages — if we ever create /chicago/eat/open-now as a page:
// → canonical: /chicago/eat (avoid splitting authority)
```

### Duplicate Content Prevention

```typescript
// Potential duplicate content scenarios and how we handle them:

const DUPLICATE_CONTENT_RULES = {
  // Same business in multiple categories
  // "Al-Basha" is both a restaurant AND a catering service
  // Solution: One canonical page, other category uses a link to canonical
  multiCategoryListings: 'canonical-to-primary-category',

  // Chicago metro has overlapping "neighborhoods" (Bridgeview vs Chicago)
  // A business physically in Bridgeview appears on both /chicago/eat and /bridgeview/eat
  // Solution: canonical to the city where the business is physically located
  multiCityListings: 'canonical-to-physical-city',

  // Near-me pages for same category in same city (mobile vs desktop)
  // Solution: single URL, responsive design, no mobile/desktop URL split
  mobileDesktopVariants: 'single-url-responsive',

  // Seasonal pages (/chicago/ramadan) vs category pages (/chicago/go-out/iftar-events)
  // Solution: seasonal pages are unique (different angle, editorial) — not duplicates
  seasonalVsCategory: 'unique-editorial-content',
};
```

---

## 9. Performance SEO

### Core Web Vitals Targets

```
LCP (Largest Contentful Paint): < 1.2s
INP (Interaction to Next Paint): < 100ms
CLS (Cumulative Layout Shift): < 0.05

Google's "Good" threshold is LCP < 2.5s. We target 1.2s — the competitive
advantage in local search where most competitors have 3-5s LCP.
```

### Next.js Performance Configuration

```typescript
// apps/web/next.config.ts

import type { NextConfig } from 'next';

const config: NextConfig = {
  // Image optimization via Next.js Image component
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.muzgram.com', // Cloudflare R2 CDN
      },
    ],
    formats: ['image/avif', 'image/webp'],  // Modern formats, 30-50% smaller
    deviceSizes: [375, 428, 768, 1024, 1280],
    imageSizes: [16, 32, 64, 128, 256, 384],
  },

  // Compress all responses
  compress: true,

  // PoweredBy header removed (minor security)
  poweredByHeader: false,

  // Bundle analysis
  experimental: {
    // Partial Prerendering: static shell + dynamic holes
    // Perfect for Muzgram: city page shell is static, "open now" section is dynamic
    ppr: true,

    // React Server Components optimizations
    serverActions: { bodySizeLimit: '2mb' },
  },

  // Headers for performance and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        // Immutable cache for static assets
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default config;
```

### Image Strategy

```tsx
// apps/web/src/components/ListingCard.tsx

import Image from 'next/image';

// Every listing card image:
// - Served from Cloudflare R2 CDN (media.muzgram.com)
// - WebP/AVIF format (auto-converted by Next.js Image)
// - Proper width/height to prevent CLS
// - loading="lazy" for below-fold images
// - priority for above-fold images (first 3 cards)

<Image
  src={listing.primaryPhoto ?? '/placeholder-food.webp'}
  alt={`${listing.name} — halal ${listing.category} in ${listing.neighborhood}`}
  // Alt text: descriptive + includes keywords naturally
  width={400}
  height={300}
  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
  loading={isPriority ? 'eager' : 'lazy'}
  priority={isPriority}
  className="object-cover rounded-lg"
/>

// Placeholder strategy: blurred LQIP (Low Quality Image Placeholder)
// Generated at upload time, stored as base64 string in DB
// Prevents layout shift while full image loads
placeholder="blur"
blurDataURL={listing.primaryPhotoBlurHash}
```

### Cloudflare Performance Config

```
Cloudflare settings for muzgram.com:

Speed → Optimization:
  ✓ Auto Minify: JS, CSS, HTML
  ✓ Brotli compression
  ✓ HTTP/2 + HTTP/3 (QUIC)
  ✓ 0-RTT Connection Resumption
  ✓ Early Hints (103 status) — preloads assets before HTML arrives

Caching:
  Static assets (_next/static/): Edge Cache TTL = 1 year (immutable)
  City/category pages: Edge Cache TTL = 5 minutes (with Cloudflare cache tags)
  Business pages: Edge Cache TTL = 1 hour
  Event pages: Edge Cache TTL = 30 minutes
  Tonight/Today pages: Edge Cache TTL = 10 minutes

Cache invalidation (Cloudflare Cache Tags):
  Every page is tagged: city:chicago, type:listing, id:sabri-nihari
  When business updates: purge tag id:sabri-nihari → only that page re-renders
  When new event published: purge tag city:chicago,type:event → all Chicago event pages refresh
  API: POST https://api.cloudflare.com/zones/{zone}/purge_cache {"tags": ["city:chicago"]}
```

---

## 10. App + Web SEO Connection

### The Conversion Funnel

```
Google Search
    ↓
SEO Landing Page (web) — /chicago/eat/shawarma
    ↓
User reads content, sees listings, clicks a business
    ↓
Business detail page — /chicago/places/sabri-nihari
    ↓
CTA: "See Live Updates + Map → Get the App"
    ↓
App Store / Play Store install
    ↓
First app session: feed shows same content they just browsed
    ↓
Retained user
```

### App Store SEO (ASO) Integration

```
The web SEO and App Store Optimization share keywords:

App Store title: "Muzgram — Halal Food & Events"
App Store subtitle: "Discover Local Muslim Community"
App Store keywords (100 char limit, hidden):
  halal,restaurant,food,events,muslim,community,mosque,discovery,local,chicago

Web pages that rank well → users search the app name → ASO gets the brand search boost
Brand search volume is an App Store ranking signal

Deep link strategy:
  Every web business/event page has a banner:
  "Open in Muzgram App → See live updates, map, share"
  → Uses Universal Links (iOS) / App Links (Android)
  → If app is installed: opens directly to the in-app listing
  → If not installed: goes to App Store, returns to listing after install
```

### Universal Links / App Links Configuration

```json
// apps/web/public/.well-known/apple-app-site-association
{
  "applinks": {
    "details": [
      {
        "appIDs": ["TEAM_ID.com.muzgram.app"],
        "components": [
          { "/": "/:city/places/*", "comment": "Business pages" },
          { "/": "/:city/events/*", "comment": "Event pages" },
          { "/": "/:city/eat", "comment": "Category pages" },
          { "/": "/:city/go-out", "comment": "Events category" }
        ]
      }
    ]
  }
}
```

```json
// apps/web/public/.well-known/assetlinks.json (Android)
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.muzgram.app",
    "sha256_cert_fingerprints": ["CERT_FINGERPRINT"]
  }
}]
```

### Smart App Banner (iOS)

```html
<!-- In Next.js layout.tsx metadata -->
<!-- Shows native iOS banner prompting app install -->
<meta name="apple-itunes-app" content="app-id=APP_STORE_ID, app-argument=muzgram://[path]">
```

---

## 11. Geo-Scaling Strategy

### City Launch SEO Sequence

Every new city follows the same SEO playbook. Takes 4 days of work.

```
Day 1 — Data prep:
  [ ] City record added to DB with slug, name, bounding box
  [ ] 100+ stub listings seeded from Google Places + ISNA directory
  [ ] 5+ events seeded for next 30 days
  [ ] generateStaticParams auto-picks up new city on next build

Day 2 — Content:
  [ ] 1 editorial paragraph written per city page (unique, not template copy)
  [ ] 1 guide page written: "Best Halal Restaurants in [City]"
  [ ] 5 FAQs written for the city eat page
  [ ] 3 community posts seeded per top business

Day 3 — Technical:
  [ ] Build triggered: generates all new city pages statically
  [ ] Sitemap regenerates automatically (includes new city)
  [ ] Submit new sitemap URLs to Google Search Console
  [ ] City pages submitted for indexing: GSC URL inspection tool
  [ ] Verify structured data: Google Rich Results Test on 3 pages

Day 4 — Verification:
  [ ] Check all new pages indexed in 24h (GSC coverage report)
  [ ] Verify no crawl errors on new city pages
  [ ] Check Cloudflare cache hit rate on new pages
  [ ] Monitor: first organic impressions appear in 5–14 days
```

### Chicago Cluster Expansion (Immediate — Week 1)

Chicago launches with ALL clusters simultaneously — each cluster is a separate city in the SEO system.

```
Phase 1 (Launch week):
  /chicago           → city hub
  /west-rogers-park  → cluster page (redirects-to /chicago for now OR own page)
  /bridgeview
  /schaumburg
  /naperville
  /lombard
  /orland-park
  /oak-park
  /downers-grove

  Each cluster links to /chicago and to neighboring clusters.
  This creates a topical cluster structure Google rewards.

Phase 2 (Month 2–3): Houston, NYC, Dallas
  /houston
  /houston/eat
  /houston/go-out
  etc. — same structure, auto-generated

Phase 3 (Month 4–6): LA, Atlanta
Phase 4 (Year 2): London, Toronto, Dubai
```

### Multi-City Page Templates

Content must be unique per city — not duplicate "halal restaurants in [city]" template text.

```typescript
// Each city has a unique editorial data object in the DB:

interface CityEditorialContent {
  citySlug: string;
  heroTagline: string;          // "Chicago's most complete Muslim food guide"
  neighborhoodHighlight: string;// "From Devon Ave in West Rogers Park to Bridgeview's Arab community..."
  communitySize: string;        // "400,000+ Muslims across the Chicago metro area"
  bestKnownFor: string[];       // ["Nihari on Devon Ave", "Bridgeview's Arab bakeries"]
  localInsight: string;         // 2-3 sentences written by local knowledge
  guidesPublished: number;      // Used in: "See our [N] guides for Chicago food"
}

// This data is what differentiates Chicago's /chicago/eat from Houston's /houston/eat.
// The listing grid is dynamic, but the editorial voice is manually written once per city.
```

---

## 12. Content Strategy

### Content Responsibility Matrix

| Content Type | Who Creates It | When | SEO Impact |
|---|---|---|---|
| City editorial paragraphs | Founder / content lead | City launch, once | High — prevents duplicate content |
| Guide pages (Best of [City]) | Founder / content lead | 1-2 per city at launch | Very High — head-term rankings |
| FAQ blocks | Founder / content lead | At launch, per page type | High — FAQ rich results |
| Business descriptions | Business owners | Ongoing (nudge system) | Medium — long-tail keywords |
| Event descriptions | Event organizers | Per event | High — event search capture |
| Community posts | Users | Ongoing | Medium — freshness + diversity |
| Photos | Business owners + users | Ongoing | Medium — image search |
| Reviews | Users (MMP) | MMP+ | High — review rich results |
| Daily specials | Business owners | Daily (automated nudge) | Low direct, high freshness signal |

### Content Seeding Timeline

```
Week 0 (Pre-launch):
  - Founder writes: 6 city editorial paragraphs (6 Chicago clusters)
  - Founder writes: 3 guide pages (Chicago eat, Chicago events, Chicago services)
  - Founder seeds: 3 community posts per top 20 anchor businesses = 60 posts
  - Business owners: 40+ businesses with photos and descriptions

Week 1–4 (Launch):
  - 5 anchor users recruited, each writes 10+ community posts = 50+ posts
  - Event organizers post 15+ events
  - Guide page: "Best Halal Restaurants in Naperville" (second-priority cluster)
  - Business onboarding: 15+ founding member businesses add full profiles

Month 2–3 (Traction):
  - 1 new guide page per week (automated suggestion based on search query data)
  - User-generated content reaches self-sustaining velocity
  - Business photo updates driven by automated nudge system (from doc 16)

Month 4+ (Sustainable):
  - All new content from users and businesses
  - Founder content: guide page refreshes (update yearly, not rewrite)
  - New city guides at each city launch
```

---

## 13. Monetization Through SEO

### How SEO Traffic Converts

```
Funnel 1: Business Lead (highest value)
  User searches "halal caterer Chicago" → /chicago/connect/catering
  → Sees listing with "Contact" button
  → Taps phone number → tracked as lead_contact event
  → Business pays $79/month Lead Package for premium visibility in this flow

Funnel 2: Featured Placement Visibility
  User searches "halal restaurants Naperville" → /naperville/eat
  → Featured business appears first (gold pin/top card)
  → User clicks → sees "Featured Business" badge
  → Business owner sees analytics: "Your featured placement drove 47 clicks this week"
  → Renews $275/month featured placement

Funnel 3: Event Promotion
  User searches "Muslim events Chicago this weekend" → /chicago/go-out
  → Boosted event appears at top with "Featured Event" badge
  → Organizer paid $75 for the boost
  → 200+ views → conversion to WhatsApp for tickets
  → Organizer books again for next event

Funnel 4: App Install (long-term retention)
  SEO page → Smart App Banner → App install → Retained user
  → Retained users generate more content → better SEO → more traffic → loop

Funnel 5: Guide Page → Founding Member
  Guide: "Best Halal Caterers in Chicago" → lists all caterers
  → Bottom of page: "Are you a caterer? Join as a Founding Member → $149"
  → Direct B2B conversion from SEO content

Funnel 6: Waitlist Capture (pre-launch cities)
  User in Houston searches "halal restaurants Houston" → near-me page detects Houston
  → "Muzgram is coming to Houston — join the waitlist"
  → Email captured → becomes founding member target
```

### Promoted Content in SEO Pages

```tsx
// Featured listings in category pages — paid placement in organic-looking results

// Category page listing grid order:
// Position 1: Featured (paid) — visually distinct (gold border, "Featured" badge)
// Positions 2-4: Top organic (sorted by save count + distance)
// Position 5: Featured (paid, if second slot exists)
// Positions 6-20: Organic

// This mirrors how Google Ads appears above organic results.
// Users understand the model; it doesn't feel deceptive.

// Pricing: Position 1 = $275/month, Position 5 = $150/month
// Both appear on all subcategory pages under the category
// (/chicago/eat featured business also appears on /chicago/eat/shawarma)
```

---

## 14. Admin SEO Tools

### SEO Management Dashboard (Admin App)

```typescript
// apps/admin/src/pages/seo.tsx — Internal admin panel for SEO management

// Feature 1: Page Metadata Editor
// Find any URL → edit title, meta description, H1
// Overrides auto-generated metadata for specific pages
// Use case: "Google Search Console shows high impressions, low CTR for this page"
// → Admin opens the page, rewrites the title to be more click-worthy

// Feature 2: Indexing Status Monitor
// Table view of all pages: URL, indexed (yes/no), last crawled, impressions, clicks
// Data pulled from: Google Search Console API
// Actions: "Request indexing" (sends URL to GSC indexing API)

// Feature 3: Guide Page CMS
// WYSIWYG editor for guide pages
// Fields: title, meta, H1, editorial intro (rich text), FAQ blocks, cities linked
// Preview: renders as the actual page before publishing

// Feature 4: Structured Data Validator
// Run any URL through Google Rich Results Test API
// Shows: which schema types are valid, which have errors
// Alert: sends Slack notification if any structured data breaks on deploy

// Feature 5: Search Query Insights
// Pulls from: GSC API + internal search_queries table
// Shows: top 50 queries driving impressions but no clicks
// Action: "Create guide page for this query" → pre-fills guide CMS

// Feature 6: Content Health Score
// Per city/category: shows content freshness, listing count, photo count, event count
// Red/yellow/green indicators
// "Naperville/connect has 3 listings — add more or noindex this page"
```

### GSC API Integration

```typescript
// apps/admin/src/lib/gsc.ts
import { google } from 'googleapis';

const searchConsole = google.searchconsole('v1');

export async function getSearchPerformance(startDate: string, endDate: string) {
  const auth = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });

  const response = await searchConsole.searchanalytics.query({
    auth,
    siteUrl: 'https://muzgram.com',
    requestBody: {
      startDate,
      endDate,
      dimensions: ['page', 'query'],
      rowLimit: 1000,
      dimensionFilterGroups: [{
        filters: [{
          dimension: 'country',
          operator: 'equals',
          expression: 'USA',
        }],
      }],
    },
  });

  return response.data.rows;
}

export async function requestIndexing(url: string) {
  // Google Indexing API — for event pages (time-sensitive, need fast indexing)
  const indexing = google.indexing('v3');
  const auth = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/indexing'],
  });

  await indexing.urlNotifications.publish({
    auth,
    requestBody: {
      url,
      type: 'URL_UPDATED',
    },
  });
}

// Auto-request indexing for:
// 1. New events published (time-sensitive — must index before the event happens)
// 2. New businesses added to active cities
// 3. New guide pages published
```

---

## 15. Concrete Examples

### URL Examples

```
CHICAGO METRO:
  muzgram.com/chicago
  muzgram.com/chicago/eat
  muzgram.com/chicago/eat/shawarma
  muzgram.com/chicago/eat/south-asian
  muzgram.com/chicago/eat/late-night
  muzgram.com/chicago/eat/breakfast
  muzgram.com/chicago/go-out
  muzgram.com/chicago/go-out/eid-events
  muzgram.com/chicago/go-out/iftar-dinners
  muzgram.com/chicago/go-out/networking
  muzgram.com/chicago/connect/photographers
  muzgram.com/chicago/connect/lawyers
  muzgram.com/chicago/connect/tutors
  muzgram.com/chicago/mosques
  muzgram.com/chicago/tonight
  muzgram.com/chicago/this-weekend
  muzgram.com/chicago/places/sabri-nihari
  muzgram.com/chicago/places/holy-land-grocery
  muzgram.com/chicago/events/eid-bazaar-chicago-april-28
  muzgram.com/chicago/events/iftar-networking-night-april-25

CHICAGO GO-OUT SUBCATEGORIES (new scope):
  muzgram.com/chicago/go-out/desi-parties
  muzgram.com/chicago/go-out/bollywood-nights
  muzgram.com/chicago/go-out/concerts
  muzgram.com/chicago/go-out/comedy-shows
  muzgram.com/chicago/go-out/arab-parties
  muzgram.com/chicago/go-out/cultural-festivals
  muzgram.com/chicago/go-out/eid-events
  muzgram.com/chicago/go-out/iftar-dinners
  muzgram.com/chicago/go-out/networking
  muzgram.com/chicago/go-out/sports

CHICAGO EVENTS (examples of individual event pages):
  muzgram.com/chicago/events/eid-bazaar-chicago-april-28
  muzgram.com/chicago/events/desi-party-bridgeview-april-26
  muzgram.com/chicago/events/bollywood-night-schaumburg-may-3
  muzgram.com/chicago/events/desi-comedy-night-chicago-may-10
  muzgram.com/chicago/events/iftar-networking-night-april-25

NAPERVILLE:
  muzgram.com/naperville
  muzgram.com/naperville/eat
  muzgram.com/naperville/eat/halal-burgers
  muzgram.com/naperville/go-out
  muzgram.com/naperville/go-out/desi-parties
  muzgram.com/naperville/go-out/bollywood-nights
  muzgram.com/naperville/go-out/iftar-events
  muzgram.com/naperville/places/noon-o-kabab
  muzgram.com/naperville/tonight

BRIDGEVIEW (Arab community cluster):
  muzgram.com/bridgeview
  muzgram.com/bridgeview/eat
  muzgram.com/bridgeview/go-out/arab-parties
  muzgram.com/bridgeview/go-out/cultural-festivals

LOMBARD:
  muzgram.com/lombard
  muzgram.com/lombard/eat
  muzgram.com/lombard/go-out/desi-parties
  muzgram.com/lombard/places/al-basha-restaurant
  muzgram.com/lombard/events/ramadan-iftar-lombard-april-2026

SCHAUMBURG (South Asian / professional cluster):
  muzgram.com/schaumburg
  muzgram.com/schaumburg/go-out/desi-parties
  muzgram.com/schaumburg/go-out/bollywood-nights
  muzgram.com/schaumburg/go-out/networking

NEAR ME:
  muzgram.com/near-me/halal-restaurants
  muzgram.com/near-me/desi-parties
  muzgram.com/near-me/bollywood-night
  muzgram.com/near-me/desi-events
  muzgram.com/near-me/pakistani-events
  muzgram.com/near-me/indian-events
  muzgram.com/near-me/arab-events
  muzgram.com/near-me/desi-dj
  muzgram.com/near-me/halal-food-open-now
  muzgram.com/near-me/mosques
  muzgram.com/near-me/nikah-hall
  muzgram.com/near-me/iftar-dinners
  muzgram.com/near-me/desi-wedding-photographer

GUIDES:
  muzgram.com/guides/best-halal-restaurants-chicago
  muzgram.com/guides/best-halal-restaurants-naperville
  muzgram.com/guides/desi-parties-chicago-2026
  muzgram.com/guides/bollywood-nights-chicago
  muzgram.com/guides/eid-events-chicago-2026
  muzgram.com/guides/desi-comedy-shows-chicago
  muzgram.com/guides/arab-cultural-events-chicago
  muzgram.com/guides/iftar-restaurants-chicago-ramadan-2026
  muzgram.com/guides/muslim-wedding-vendors-chicago
  muzgram.com/guides/halal-dj-chicago-weddings
  muzgram.com/guides/halal-food-near-ohare-airport
```

### Page Title Examples

```
HOME:
  Muzgram — Halal Food, Desi Parties, Events & Local Spots Near You

CITY PAGES:
  Chicago:    Halal Restaurants, Desi Events & Community in Chicago | Muzgram
  Naperville: Halal Food, Desi Parties & Events in Naperville | Muzgram
  Lombard:    Halal Food & Cultural Events in Lombard, IL | Muzgram
  Bridgeview: Arab Food, Events & Community in Bridgeview, IL | Muzgram
  Schaumburg: Halal Restaurants, Desi Parties & Events in Schaumburg | Muzgram

CATEGORY PAGES:
  /chicago/eat:     Halal Restaurants in Chicago, IL — 180+ Open Now | Muzgram
  /naperville/eat:  Halal Restaurants in Naperville, IL — 40+ Options | Muzgram
  /chicago/go-out:  Desi Parties, Events & Nightlife in Chicago | Muzgram
  /naperville/go-out: Desi Events & Parties in Naperville This Weekend | Muzgram
  /chicago/connect: Muslim Professionals in Chicago — Lawyers, Photographers & More | Muzgram
  /chicago/mosques: Mosques in Chicago — Prayer Times & Community | Muzgram

SUBCATEGORY PAGES — EAT:
  /chicago/eat/shawarma:          Best Shawarma in Chicago, IL — Halal | Muzgram
  /chicago/eat/south-asian:       Halal South Asian Restaurants in Chicago | Muzgram
  /chicago/eat/late-night:        Late Night Halal Food in Chicago — Open Now | Muzgram
  /naperville/eat/halal-burgers:  Best Halal Burgers in Naperville, IL | Muzgram

SUBCATEGORY PAGES — GO OUT (the new event landscape):
  /chicago/go-out/desi-parties:       Desi Parties in Chicago — This Weekend | Muzgram
  /chicago/go-out/bollywood-nights:   Bollywood Nights in Chicago — DJ Events | Muzgram
  /chicago/go-out/concerts:          Desi Concerts & Live Shows in Chicago | Muzgram
  /chicago/go-out/comedy-shows:      Desi Comedy Shows in Chicago | Muzgram
  /chicago/go-out/arab-parties:      Arab Cultural Events & Parties in Chicago | Muzgram
  /chicago/go-out/eid-events:        Eid Events in Chicago 2026 — Upcoming | Muzgram
  /chicago/go-out/iftar-dinners:     Iftar Dinners in Chicago — Ramadan 2026 | Muzgram
  /chicago/go-out/networking:        Muslim Professional Events in Chicago | Muzgram
  /chicago/go-out/cultural-festivals:South Asian & Arab Cultural Festivals Chicago | Muzgram
  /naperville/go-out/desi-parties:   Desi Parties in Naperville | Muzgram
  /schaumburg/go-out/bollywood-nights:Bollywood Nights in Schaumburg, IL | Muzgram
  /bridgeview/go-out/arab-parties:   Arab Cultural Events in Bridgeview, IL | Muzgram

BUSINESS PAGES:
  Sabri Nihari — Halal Pakistani Restaurant in Rogers Park, Chicago | Muzgram
  Noon O Kabab — Halal Afghan Restaurant in Naperville, IL | Muzgram
  Al-Basha — Halal Mediterranean Restaurant in Lombard, IL | Muzgram

EVENT PAGES — (the full cultural scope):
  Eid Bazaar Chicago — April 28, 2026 | Muzgram
  Bollywood Night Schaumburg — May 3, 2026 | Muzgram
  Desi Party Bridgeview — April 26, 2026 | Muzgram
  Desi Comedy Night Chicago — May 10, 2026 | Muzgram
  Arab Cultural Festival Lombard — April 30, 2026 | Muzgram
  Ramadan Iftar Networking Night — April 25, Chicago | Muzgram
  Pakistani Concert Chicago — June 15, 2026 | Muzgram

NEAR-ME PAGES:
  Halal Restaurants Near Me — Find What's Open Now | Muzgram
  Desi Parties Near Me — This Weekend | Muzgram
  Bollywood Night Near Me | Muzgram
  Desi Events Near Me This Weekend | Muzgram
  Pakistani Events Near Me | Muzgram
  Mosques Near Me — Prayer Times & Jummah | Muzgram
  Desi Wedding Photographer Near Me | Muzgram

GUIDE PAGES:
  Best Halal Restaurants in Chicago (2026) — Complete Guide | Muzgram
  Desi Parties in Chicago 2026 — Where to Go This Weekend | Muzgram
  Bollywood Nights in Chicago — Best Venues & Events | Muzgram
  Iftar Restaurants in Chicago — Ramadan 2026 Guide | Muzgram
  Desi Comedy Shows in Chicago 2026 | Muzgram
  Muslim Wedding Vendors in Chicago — Photographers, DJs & Venues | Muzgram
  Arab Cultural Events in Chicago 2026 | Muzgram
```

### Meta Description Examples

```
FOOD PAGES:
/chicago/eat:
  Browse 180+ halal-certified restaurants in Chicago. See what's
  open right now, today's specials, and what locals are saving
  this week. Updated daily.
  [154 chars]

/naperville/eat:
  Find halal restaurants in Naperville, IL — 40+ options across
  South Asian, Middle Eastern, and American cuisines. See hours,
  photos, and daily specials.
  [153 chars]

EVENT & NIGHTLIFE PAGES:
/chicago/go-out:
  Desi parties, Bollywood nights, concerts, comedy shows, and
  cultural events in Chicago. Find what's happening this weekend
  and share it with your crew.
  [152 chars]

/chicago/go-out/desi-parties:
  Find desi parties in Chicago this weekend. Browse upcoming
  events, see who's going, and discover the best desi nights
  near you. Updated weekly.
  [144 chars]

/chicago/go-out/bollywood-nights:
  Bollywood DJ nights and desi cultural events in Chicago.
  Find upcoming Bollywood nights, venues, and ticket links.
  The best desi nightlife near you.
  [151 chars]

/chicago/go-out/concerts:
  Pakistani, Indian, and Arab concerts and live shows in Chicago.
  Upcoming shows, venues, and tickets — updated as new events
  are announced.
  [141 chars]

/chicago/go-out/comedy-shows:
  Desi stand-up comedy and live entertainment in Chicago.
  Find upcoming shows by Pakistani, Indian, and Arab comedians
  near you.
  [130 chars]

/chicago/go-out/arab-parties:
  Arab cultural nights, dabke events, and community parties in
  Chicago and the suburbs. Find upcoming events in Bridgeview,
  Lombard, and beyond.
  [147 chars]

/chicago/go-out/eid-events:
  Find Eid events in Chicago 2026 — bazaars, parties, family
  gatherings, and community celebrations. See dates, locations,
  and share with your crew.
  [151 chars]

NEAR-ME PAGES:
/near-me/halal-restaurants:
  Find halal restaurants open near you right now. Muzgram shows
  you what's closest, what's open, and what your community is
  actually going to.
  [143 chars]

/near-me/desi-parties:
  Find desi parties near you this weekend. Muzgram shows you
  the best upcoming desi events, Bollywood nights, and cultural
  parties in your city.
  [144 chars]

/near-me/bollywood-night:
  Find Bollywood DJ nights near you. See upcoming events, venues,
  and ticket links — updated weekly with the latest desi nightlife
  near you.
  [141 chars]

GUIDE PAGES:
/guides/best-halal-restaurants-chicago:
  The complete guide to halal restaurants in Chicago — 180+
  options, ranked by what locals actually save. Updated April 2026.
  [128 chars]

/guides/desi-parties-chicago-2026:
  The best desi parties in Chicago in 2026. Bollywood nights,
  Pakistani and Indian cultural events, and Arab parties — all
  in one place. Updated weekly.
  [152 chars]

/guides/bollywood-nights-chicago:
  The best Bollywood DJ nights in Chicago — venues, upcoming
  events, and what to expect. Your guide to desi nightlife
  in Chicago and the suburbs.
  [147 chars]
```

### H1 / H2 Structure Examples

```
PAGE: /chicago/go-out/desi-parties

H1: Desi Parties in Chicago

H2: Happening This Weekend
  [event cards: Fri/Sat events, sorted by date]

H2: All Upcoming Desi Events in Chicago
  [paginated event grid — date, venue, price, organizer]

H2: Organizers You Should Know
  [3–4 top event organizer cards with link to their profile/listings]

H2: Venues Hosting Desi Nights in Chicago
  → links to /chicago/places/[venue-slug] for each major venue

H2: Also in Chicago's Suburbs
  → /naperville/go-out/desi-parties
  → /schaumburg/go-out/desi-parties
  → /bridgeview/go-out/arab-parties (cross-community)

H2: More Nightlife in Chicago
  → Bollywood Nights  (/chicago/go-out/bollywood-nights)
  → Concerts          (/chicago/go-out/concerts)
  → Comedy Shows      (/chicago/go-out/comedy-shows)
  → Eid Events        (/chicago/go-out/eid-events)

H2: Frequently Asked Questions
  Q: Are there desi parties in Chicago that are alcohol-free?
  Q: How do I find desi events in Chicago this weekend?
  Q: What kinds of desi parties are on Muzgram?
  Q: How do I post a desi party on Muzgram?

---

PAGE: /guides/desi-parties-chicago-2026

H1: Desi Parties in Chicago (2026) — Where to Go This Weekend

H2: This Week's Best Events
  [live-pulled, top 4 events from DB — auto-updated]

H2: The Desi Nightlife Scene in Chicago
  [150-word editorial — written once, unique to Chicago]

H2: All Upcoming Desi Events in Chicago
  [auto-generated full list]

H2: By Type
  H3: Bollywood DJ Nights
  H3: Pakistani & Indian Cultural Parties
  H3: Arab Nights
  H3: Comedy & Entertainment
  H3: Eid Celebrations

H2: Best Venues in Chicago for Desi Events
  [5–8 venue links → /chicago/places/[slug]]

H2: Desi Events in the Chicago Suburbs
  H3: Naperville
  H3: Schaumburg
  H3: Bridgeview
  H3: Lombard

H2: Frequently Asked Questions
  Q: Where are the best desi parties in Chicago in 2026?
  Q: Are there Bollywood nights in Chicago suburbs?
  Q: How often are desi events posted on Muzgram?

H2: More Chicago Guides
  → Best Halal Restaurants in Chicago
  → Bollywood Nights in Chicago
  → Eid Events Chicago 2026

---

PAGE: /naperville/eat/iftar-events

H1: Iftar Events in Naperville, IL

H2: Happening This Week
  [4 event cards — date, venue, price]

H2: All Upcoming Iftar Events in Naperville
  [paginated listing grid]

H2: Iftar Dining Spots in Naperville
  [restaurants open during Ramadan evenings — cross-links to /naperville/eat]

H2: Browse by Ramadan Week
  H3: Week 1 (March 1–7)
  H3: Week 2 (March 8–14)
  H3: Week 3 (March 15–21)
  H3: Last 10 Nights (March 22–31)

H2: Nearby Cities
  [Chicago | Lombard | Aurora | Lisle — same page type in neighboring cities]

H2: Frequently Asked Questions
  Q: Are there iftar events in Naperville during Ramadan?
  Q: How do I find free iftar dinners near Naperville?
  Q: What mosques in Naperville host community iftars?

---

PAGE: /guides/best-halal-restaurants-chicago

H1: Best Halal Restaurants in Chicago (2026)

H2: Our Top 10 Picks
  [manually curated, editorial — NOT auto-generated]

H2: All Halal Restaurants in Chicago
  [auto-generated from DB, updates with new listings]

H2: By Cuisine
  H3: South Asian (Pakistani & Indian)
  H3: Middle Eastern (Arab cuisine)
  H3: Mediterranean
  H3: American Halal
  H3: African

H2: Open Late in Chicago
  [filter: closes after midnight]

H2: Near Chicago Neighborhoods
  H3: Devon Avenue (West Rogers Park)
  H3: Bridgeview
  H3: Schaumburg

H2: How We Verify Halal Status
  [200-word explainer — builds E-E-A-T]

H2: Frequently Asked Questions
  [5 FAQs with schema markup]

H2: More Chicago Guides
  [links to: Chicago events guide, Chicago wedding vendors, Chicago mosques]
```

### Internal Linking Layout Example

```
PAGE: /chicago/places/sabri-nihari

BREADCRUMB (top of page):
  Home → Chicago → Eat → Pakistani → Sabri Nihari

MAIN CONTENT:
  [Business info, photos, hours, map]

SECTION: "Events at Sabri Nihari"
  → /chicago/events/iftar-at-sabri-nihari-april-20  (1 link)
  → /chicago/go-out                                  (1 link: "See all Chicago events")

SECTION: "Near Sabri Nihari"
  → /chicago/places/ghareeb-nawaz                   (nearby, same area)
  → /chicago/places/india-house                     (nearby)
  → /chicago/places/sugarland                       (nearby, dessert)

SECTION: "More Pakistani Restaurants in Chicago"
  → /chicago/eat/south-asian                        (subcategory page)
  → /chicago/places/karachi-restaurant              (similar category)
  → /chicago/places/bundoo-khan                     (similar category)

SECTION: "From the Community"
  [User posts mentioning Sabri Nihari — indexed text]

FOOTER LINKS:
  → /chicago/eat               ("Browse all Chicago restaurants")
  → /chicago                   ("Chicago home")
  → /guides/best-halal-restaurants-chicago ("Guide: Best halal in Chicago")
  → /near-me/halal-restaurants  ("Halal near me")

TOTAL INTERNAL LINKS ON THIS PAGE: 12–16
(Google's Goldilocks zone: enough to distribute authority, not so many they're diluted)
```

---

## Page Volume Projection

```
Chicago metro at launch:
  City hub pages:         9 clusters × 1 = 9
  Category pages:         9 × 4 = 36
  Subcategory pages:      9 × 4 categories × 8 subcategories avg = 288
  Business pages:         400 businesses × 1 = 400
  Event pages:            100 events (rolling) = 100
  Tonight/Today:          9 × 2 = 18
  Mosque pages:           45 mosques = 45
  Near-me pages:          10 = 10
  Guide pages:            15 at launch, +2/week = 15+
  ──────────────────────────────────────
  TOTAL CHICAGO LAUNCH:  ~921 pages

At 3 US cities (Month 6):
  3 × city pages + entity pages = ~2,500 pages

At 10 US cities (Year 2):
  10 × city pages + entity pages + guides = ~12,000 pages

At 20 US cities + 5 international (Year 3):
  ~50,000 pages

At full US + international (Year 4-5):
  ~500,000+ pages (with user reviews and community content compounding)

The system generates these automatically.
Zero manual page creation required after initial city setup.
```

---

> This document is the implementation spec. Engineers build: Next.js web app, DB views for SEO data, sitemap generator, structured data components, admin SEO dashboard.
> Next: see [20-cloud-infrastructure.md](20-cloud-infrastructure.md) for hosting the web app alongside the API.
