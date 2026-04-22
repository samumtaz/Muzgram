# Muzgram — Design System (2026)

> Last updated: 2026-04-21
> Philosophy: **Dark. Warm. Confident.**
> Feels like Airbnb met Uber Eats met a modern city guide — fast, confident, warm, never cluttered.

---

## Fonts

```
Display: Plus Jakarta Sans (Bold 700, ExtraBold 800)
Body:    Inter (Regular 400, Medium 500, SemiBold 600)

Install:
  expo install @expo-google-fonts/plus-jakarta-sans
  expo install @expo-google-fonts/inter
```

---

## Color System

```typescript
// packages/constants/src/theme.ts

export const colors = {
  bg: {
    primary:   '#080C14',   // main app background
    secondary: '#0F1520',   // subtle section separation
    card:      '#141C2A',   // card surface
    elevated:  '#1A2332',   // modal, bottom sheet
    overlay:   '#1E2A3D',   // pressed state
  },
  accent: {
    gold:    '#F59E0B',    // primary CTA, highlights
    emerald: '#10B981',    // halal indicator, food, success
    indigo:  '#6366F1',    // events category
    rose:    '#F43F5E',    // community / live / urgent
    sky:     '#38BDF8',    // map, location elements
  },
  text: {
    primary:   '#F1F5F9',
    secondary: '#94A3B8',
    muted:     '#475569',
    inverse:   '#080C14',
  },
  border: {
    subtle:  'rgba(255,255,255,0.06)',
    default: 'rgba(255,255,255,0.10)',
    strong:  'rgba(255,255,255,0.18)',
  },
  semantic: {
    success: '#10B981',
    error:   '#EF4444',
    warning: '#F59E0B',
    info:    '#38BDF8',
  },
  category: {
    food:      '#10B981',
    events:    '#6366F1',
    services:  '#F59E0B',
    community: '#F43F5E',
    mosque:    '#8B5CF6',
  },
} as const;
```

---

## Typography Scale

```typescript
export const typography = {
  fonts: {
    display: 'PlusJakartaSans',
    body:    'Inter',
  },
  scale: {
    d1: { fontSize: 40, lineHeight: 48, fontWeight: '800', letterSpacing: -1.5 },
    d2: { fontSize: 32, lineHeight: 40, fontWeight: '700', letterSpacing: -1.0 },
    h1: { fontSize: 28, lineHeight: 36, fontWeight: '700', letterSpacing: -0.5 },
    h2: { fontSize: 22, lineHeight: 30, fontWeight: '700', letterSpacing: -0.3 },
    h3: { fontSize: 18, lineHeight: 26, fontWeight: '600', letterSpacing: -0.2 },
    h4: { fontSize: 16, lineHeight: 24, fontWeight: '600', letterSpacing: 0   },
    bodyLg: { fontSize: 16, lineHeight: 26, fontWeight: '400', letterSpacing: 0 },
    body:   { fontSize: 14, lineHeight: 22, fontWeight: '400', letterSpacing: 0 },
    bodySm: { fontSize: 13, lineHeight: 20, fontWeight: '400', letterSpacing: 0 },
    label:   { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.4 },
    caption: { fontSize: 11, lineHeight: 16, fontWeight: '400', letterSpacing: 0.2 },
  },
} as const;
```

---

## Spacing & Radius

```typescript
export const spacing = {
  px: 1, '0.5': 2,
  1: 4,  2: 8,  3: 12, 4: 16, 5: 20,
  6: 24, 8: 32, 10: 40, 12: 48, 16: 64,
} as const;

export const radius = {
  sm:    8,
  md:    14,
  lg:    20,
  xl:    28,
  '2xl': 36,
  full:  9999,
} as const;
```

---

## Tab Bar (Floating Pill)

```
Position: floating above content, not traditional bottom nav
Background: rgba(8,12,20,0.85) + blur(20px)
Border: rgba(255,255,255,0.08)
Height: 68px
Border-radius: 34px
Margin-horizontal: 20px
Shadow: 0 -1px 40px rgba(0,0,0,0.6)
Active icon: filled + accent.gold dot indicator
Inactive: rgba(255,255,255,0.35)
```

---

## Card Types

### Feature Card (full-width, image-first)
```
Image height: 200px, full bleed
Gradient overlay: transparent → rgba(8,12,20,0.95) on bottom 60%
Title + meta overlaid on gradient
Category chip: top-left (colored pill)
Border radius: 20px
```

### Compact Card (list style)
```
Thumbnail: 80×80px, left-aligned
Content: name, meta, category chip — right of thumbnail
Background: bg.card
Border radius: 16px
Border: border.subtle
```

---

## Category Chips

```
Shape: pill (border-radius: full)
Height: 36px | Padding: 0 14px
Active:   category color bg + white text
Inactive: bg.elevated + text.muted
Font: label style (12px, semibold, 0.4 letter-spacing)
Horizontal scroll, no visible scrollbar
```

---

## Map Pins (Mapbox custom markers)

```
Shape: teardrop (40×52px SVG)
Center: 24px circle + white category icon
Background: category color

States:
  default:  normal size
  selected: scale(1.3) + white 3px ring + shadow
  live:     pulsing rose outer ring (2s loop)
  featured: gold star badge top-right

Category → Color → Icon (Lucide):
  food:      #10B981   UtensilsCrossed
  events:    #6366F1   CalendarDays
  services:  #F59E0B   Briefcase
  community: #F43F5E   Users

Clustering:
  >5 pins within 60px → cluster circle
  Tap cluster → zoom in
```

---

## Bottom Sheets

```
Background: bg.elevated (#1A2332)
Border-radius top: 28px
Handle: 4px × 40px, rgba(255,255,255,0.2), centered
Snap points: 35%, 75%, 95%
Backdrop: rgba(0,0,0,0.6)
```

---

## Buttons

```
Primary:
  bg: accent.gold | text: text.inverse | height: 52px
  border-radius: full | font: h4 700
  press: scale(0.97) + brightness(0.9)

Secondary:
  bg: bg.elevated | text: text.primary
  border: border.default | same sizing

Ghost:
  bg: transparent | text: accent.gold
  underline on press

Destructive:
  bg: semantic.error | text: white
```

---

## Motion & Animation

```typescript
export const animation = {
  spring: {
    gentle: { damping: 20, stiffness: 180 },
    snappy: { damping: 15, stiffness: 300 },
    bouncy: { damping: 10, stiffness: 200 },
  },
  duration: {
    instant: 100,
    fast:    200,
    normal:  300,
    slow:    500,
  },
} as const;

// Key interactions:
// Card press:      scale(0.97) spring.snappy
// Tab switch:      fade + translateY(-4) spring.gentle
// Map pin select:  scale(1.3) spring.bouncy
// Bottom sheet:    spring.gentle
// Skeleton load:   shimmer left→right, 1.5s loop
```

---

## Skeleton Loading

```
Every card has a skeleton — NEVER show spinners
Shimmer: left-to-right gradient sweep, 1.5s loop
Colors: bg.card → bg.elevated → bg.card

Skeleton card contains:
  - Image placeholder (full width, 200px or 80px)
  - Title line (70% width, 16px height)
  - Meta line (45% width, 12px height)
```

---

## Iconography

```
Library: Lucide React Native
Style: consistent 1.5px stroke, rounded caps

Category icons:
  food:      UtensilsCrossed
  events:    CalendarDays
  services:  Briefcase
  community: Users
  mosque:    Building2
  map:       MapPin
  live:      Radio  (with rose pulse dot)
  save:      Bookmark / BookmarkCheck
  share:     Share2
  back:      ChevronLeft
  filter:    SlidersHorizontal
  search:    Search
  location:  Navigation2
  verified:  ShieldCheck
  halal:     ShieldCheck (emerald)
  settings:  Settings2
```

---

## Mapbox Dark Style Config

```json
{
  "background": "#080C14",
  "water": "#0F1520",
  "roads": {
    "primary": "#1A2332",
    "secondary": "#141C2A",
    "labels": "#475569"
  },
  "buildings": "#0F1520",
  "parks": "#0D1A1A",
  "labels": {
    "city": "#94A3B8",
    "poi": "#64748B"
  }
}
```

---

## Screen Layout: Now Feed

```
┌─────────────────────────────────┐
│  Muzgram          🔔  🔍        │ ← transparent header
│  📍 West Ridge                  │ ← tap to change neighborhood
├─────────────────────────────────┤
│ 🔴 LIVE  [pill][pill][pill] ──► │ ← horizontal live strip
├─────────────────────────────────┤
│ [All][Food][Events][Svcs][Comm] │ ← category chips
├─────────────────────────────────┤
│      Featured Card (200px)      │ ← full-width feature card
├─────────────────────────────────┤
│ [80px] Title          ♥         │ ← compact card
│ [img ] Meta · Distance          │
│        [chip]                   │
├─────────────────────────────────┤
│        ...more cards...         │
├─────────────────────────────────┤
│   [  Now  ][Map][Explore][  +  ]│ ← floating pill tab bar
└─────────────────────────────────┘
```

---

## Screen Layout: Map Tab

```
Full-screen Mapbox (zero chrome)
├── Floating search bar (top, glass pill)
├── Category chips (below search bar)
├── Re-center FAB (bottom right, 56px gold circle)
├── Custom pins (category colored teardrops)
└── Bottom sheet on pin tap:
      35%: quick preview
      75%: full detail
      95%: immersive
```

---

## Screen Layout: Business Profile

```
├── Full-bleed hero image (250px)
├── Back btn top-left (glass pill) + Share btn top-right
├── Floating card (overlaps hero bottom):
│     Name + Halal badge + Category + Distance + Open status
│     [Call] [Directions] [Save] [Share] action row
└── Scrollable:
      About | Hours | Photos (h-scroll) | Map snippet
```

---

## Design References (Vibe Board)

- **Airbnb** — premium card layouts, confident imagery, clean headers
- **Uber Eats** — clear category browsing, fast utility, open/closed states
- **Foursquare Swarm** — local-first map-centric discovery
- **Headspace** — calm dark UI, nothing fights for attention
- **Distinctly Muzgram** — warm gold accent, emerald halal badge, culturally familiar without being a "mosque app"
