# Muzgram — MVP UX Design Specification

> Last updated: 2026-04-21
> Philosophy: **Dark. Warm. Confident. Local-first. Utility-first.**
> Benchmark feel: Airbnb clarity · Uber Eats speed · Headspace calm · distinctly Muzgram warmth

---

## Design Principles

Before any screen — these five rules govern every decision:

**1. Answer the question before the user asks it.**
"What's open near me right now?" must be answerable within one second of opening the app. Never make the user tap three times to find a halal restaurant.

**2. Distance is always visible. Always.**
Every card, every pin, every result shows distance. This is a local app. Location is the product.

**3. Gold is earned, not decorative.**
`accent.gold` appears only on featured/promoted content, primary CTAs, and active states. Using it anywhere else dilutes the signal.

**4. Emerald is trust. Rose is urgency.**
Green shield = halal certified. Rose pulse = happening right now. These are not decorative colors — they communicate safety and immediacy.

**5. The app should make the user feel like a local.**
"West Ridge" in the header. Neighborhood names on every card. Devon Ave content seeded. The user should feel they're looking at their street, not the internet.

---

## Global UI Constants

```
Screen background:    #080C14
Safe area top:        48px (dynamic island devices) / 44px (standard)
Safe area bottom:     34px (home indicator devices) / 0px (standard)
Content horizontal padding: 16px
Tab bar height:       68px + safe area bottom
Tab bar position:     floating, 12px above safe area
Card gap:             12px
Section gap:          24px
```

---

## Screen 1 — Splash

**Vibe:** A confident, cultural greeting. Not a loading screen — a welcome moment.

```
┌──────────────────────────────────────┐
│                                      │
│                                      │
│                                      │
│                                      │
│              ●                       │
│         ●         ●                  │
│     ●       M U Z       ●           │
│         ●         ●                  │
│              ●                       │
│                                      │
│  ┌──────────────────────────────┐   │
│  │   م  U  Z  G  R  A  M        │   │
│  └──────────────────────────────┘   │
│                                      │
│         West Ridge · Chicago         │
│                                      │
│                                      │
└──────────────────────────────────────┘
```

### Layout
- Full-screen `#080C14`
- Center: Muzgram wordmark in **Plus Jakarta Sans ExtraBold 800**, text.primary `#F1F5F9`, letter-spacing -1.5
- Above wordmark: a subtle 8-point star (Islamic geometric motif) rendered in SVG — not a crescent (too cliché), not a mosque silhouette (too religious) — just a mathematically beautiful gold star that dissolves into the logo
- Below wordmark: city tagline "West Ridge · Chicago" in Inter Regular 12, `#475569`, tracking 2px
- Background: tiny particle constellation — 12 gold dots at very low opacity (3%) arranged in a geometric grid, barely visible, gives depth without noise

### Animation Sequence
```
0ms    → Logo opacity: 0, scale: 0.85
300ms  → Logo opacity: 1, scale: 1.0 (spring: damping 20, stiffness 180)
600ms  → City tagline fades in (opacity: 0 → 1, 400ms ease-out)
1400ms → Crossfade to onboarding or home (no hard cut — 300ms fade)
```

### What NOT to do
- No spinner, no progress bar, no loading state
- No animation longer than 1.5 seconds total
- No "swipe to begin" — just auto-advances
- No marketing copy ("Discover your Muslim community" is saved for after they experience it)

### Daily habit reinforcement
This screen is the bookmark. "When I see the star and the wordmark, I'm at Muzgram." Muscle memory forms from visual consistency. Never change the splash.

---

## Screen 2 — Onboarding: Phone Entry

**Vibe:** One job. One input. Get out of the way.

```
┌──────────────────────────────────────┐
│ ← (back, hidden on first screen)    │
│                                      │
│                                      │
│                                      │
│  ┌──────────────────────────────┐   │
│  │    ★ MUZGRAM                 │   │
│  └──────────────────────────────┘   │
│                                      │
│  Your Muslim                         │
│  neighbourhood,                      │
│  in your pocket.                     │
│                                      │
│  ─────────────────────────────────  │
│                                      │
│  Enter your phone number             │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ 🇺🇸 +1  │  (312) 555-0100   │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │      Get Started →           │   │
│  └──────────────────────────────┘   │
│   (accent.gold, disabled until       │
│    10 digits entered)                │
│                                      │
│  By continuing, you agree to our    │
│  Terms of Service and Privacy Policy │
│                                      │
└──────────────────────────────────────┘
```

### Information Hierarchy
1. **Value proposition** (3 words per line, large, display font — anchors trust before asking for phone)
2. **Phone input** (the only interactive element — keyboard opens automatically)
3. **CTA button** (disabled/gold state changes tell you exactly when you can proceed)
4. **Legal text** (smallest, muted — required but not the point)

### Interaction Patterns
- Screen loads → `KeyboardAvoidingView` → numeric keyboard opens automatically after 400ms delay (not instant — gives logo moment to settle)
- Phone field: `+1` country code locked (US only for MVP), auto-formats as `(XXX) XXX-XXXX`
- At 10 digits entered: button animates from disabled (`bg.elevated`, `text.muted`) to active (`accent.gold`, spring scale 1.0 → 1.02 → 1.0)
- `haptics.selection()` fires at that transition — tactile "ready" signal
- CTA tap: `haptics.impact.medium()`, spinner appears inside button (never replace button with separate spinner)
- Error (Clerk OTP send fail): inline below input, `semantic.error` text, not a modal

### Key Components
- `Logo` — compact version (wordmark only, no tagline)
- `PhoneInput` — custom component wrapping `TextInput` with flag + country code prefix
- `Button` — primary variant, state-aware (disabled → active), `h-[52px]`
- `Keyboard` — numeric keyboard, auto-focus

### My UX Additions
- **Auto-detect country code** from device locale — for future multi-country expansion. US locked for MVP but the UI already shows the flag, making the international intent clear.
- **Subtle progress indicator**: 3 dots at the very bottom of the screen (below terms), one filled gold = step 1 of 4. Never intrusive but user knows where they are.

---

## Screen 3 — Onboarding: OTP Verification

**Vibe:** Satisfying. Each digit feels like a small win.

```
┌──────────────────────────────────────┐
│                                      │
│ ←                                    │
│                                      │
│  Code sent to                        │
│  (312) 555-0100                      │
│                                      │
│  Enter the 6-digit code              │
│                                      │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
│  │ 4  │ │ 7  │ │ _  │ │    │ │    │ │    │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘
│         (each box: 48×56px)          │
│                                      │
│  ─────── Verifying... ───────        │
│   (only visible after 6th digit)     │
│                                      │
│                                      │
│  Didn't get a code?                  │
│  Resend in 0:47                      │
│                                      │
└──────────────────────────────────────┘
```

### Interaction Patterns
- 6 independent digit boxes, not a single input — visual satisfation per digit
- Each box: 48×56px, rounded 12px, `bg.card` inactive, `bg.elevated` active (focused), `accent.gold` border on active
- Auto-advance on each digit entry — no backspace needed until end
- After digit 6: automatic verification attempt — no "confirm" button
- `haptics.selection()` on each digit entry
- Success: `haptics.notification.success()` + immediate transition (no success screen — just move forward)
- Error (wrong OTP): all 6 boxes shake (Reanimated `withSequence` translateX -8 → 8 → -4 → 4 → 0) + `haptics.notification.error()` + boxes reset empty
- **Resend timer**: 60s countdown in `text.muted`, auto-enabled after timer — no extra tap
- After 3 failed attempts: brief message "Having trouble? We'll call you" with one-tap voice OTP

### Visual Emphasis
- The 6 boxes are the entire screen — nothing competes
- Completed boxes: white digit on `bg.elevated` — feels like a combination lock being solved
- The progress from empty → filled is the emotional journey

---

## Screen 4 — Onboarding: Location Setup

**Vibe:** The app asks for one thing and explains exactly why.

```
┌──────────────────────────────────────┐
│                                      │
│ ←                                Skip│
│                                      │
│  ┌──────────────────────────────┐   │
│  │  [Map illustration — Devon   │   │
│  │   Ave pins glowing on dark   │   │
│  │   map, 180px tall]           │   │
│  └──────────────────────────────┘   │
│                                      │
│  What's near you?                    │
│                                      │
│  Muzgram shows you halal food,       │
│  events, and services within         │
│  minutes of you — right now.         │
│                                      │
│  ┌──────────────────────────────┐   │
│  │  📍  Use My Location         │   │
│  └──────────────────────────────┘   │
│                                      │
│  ─────────── or ─────────────        │
│                                      │
│  ┌──────────────────────────────┐   │
│  │  Choose a neighbourhood →    │   │
│  └──────────────────────────────┘   │
│   (secondary button, bg.elevated)    │
│                                      │
└──────────────────────────────────────┘
```

### After "Use My Location" tapped → system permission dialog
- If granted: auto-resolves neighborhood via `/v1/geo/reverse`, shows "West Ridge detected ✓" with emerald checkmark, auto-advances after 1.2s
- If denied: seamlessly transitions to the neighborhood picker (no error, no shame — just the manual path)

### Neighborhood Picker (when "Choose" tapped or location denied)

```
┌──────────────────────────────────────┐
│                                      │
│ ←  Choose your neighbourhood         │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ 🔍 Search neighbourhoods...  │   │
│  └──────────────────────────────┘   │
│                                      │
│  POPULAR NEAR DEVON AVE              │
│                                      │
│  ┌─────────────────┐ ┌─────────┐   │
│  │ West Ridge   ✓  │ │ Rogers  │   │
│  │ (most listings) │ │  Park   │   │
│  └─────────────────┘ └─────────┘   │
│  ┌─────────────────┐ ┌─────────┐   │
│  │ Skokie          │ │Peterson │   │
│  │                 │ │   Park  │   │
│  └─────────────────┘ └─────────┘   │
│                                      │
│  ALL CHICAGO NEIGHBOURHOODS          │
│  (alphabetical list below)           │
│                                      │
└──────────────────────────────────────┘
```

### Key Design Decisions
- "West Ridge" pre-highlighted as first option with "(most listings)" label — user picks the right place immediately
- Grid layout (2-column) for quick scanning vs. long scrollable list
- Selected state: `accent.gold` border + `bg.elevated` fill + checkmark
- Search filters the grid in real-time (debounced 200ms)

---

## Screen 5 — Onboarding: Name (Optional)

**Vibe:** Feels like the app already knows you're almost in.

```
┌──────────────────────────────────────┐
│                                      │
│ ←                                    │
│                                      │
│                                      │
│  Last step! ✨                        │
│                                      │
│  What should we call you?            │
│                                      │
│  First name only — or skip entirely. │
│                                      │
│  ┌──────────────────────────────┐   │
│  │  Yusuf                       │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │    Let's Go →                │   │
│  └──────────────────────────────┘   │
│  (accent.gold)                       │
│                                      │
│         Skip for now                 │
│  (text.muted, ghost button)          │
│                                      │
└──────────────────────────────────────┘
```

### Interaction Patterns
- "Skip for now" is equally accessible — no dark pattern hiding it
- Skip tap: `haptics.impact.light()`, immediate transition
- Submit tap: optimistic navigation — don't wait for API response to advance
- Keyboard: alphabetic, standard (not numeric)
- Character limit: 40 chars, counter shows at 30 chars remaining

---

## Screen 6 — Home / Now Feed

**Vibe:** "This is my street." Familiar, current, alive.

```
┌──────────────────────────────────────┐
│ STATUS BAR                           │
│                                      │
│ ★ Muzgram    📍 West Ridge   🔔(3)  │  ← transparent header
│                                      │
│ ─────────────────────────────────── │
│                                      │
│ 🔴 LIVE  [Sabri Nihari] [CIOGC Iftar] [Youth BBall] ──►
│          horizontal scroll strip      │
│                                      │
│ ─────────────────────────────────── │
│                                      │
│ [All ●] [Food] [Events] [Svcs] [Comm]│  ← category chips
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ ⭐ FEATURED                      │ │
│ │                                  │ │
│ │  [Full-width hero image 200px]   │ │
│ │                                  │ │
│ │ 🍽 Pakistani                     │ │
│ │ Sabri Nihari                     │ │
│ │ ● Open until 10 PM · 0.2 mi     │ │
│ │ ♡ Save      Share ↗             │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──[80px]─┬────────────────────────┐│
│ │  [img]  │ CIOGC Iftar Fundraiser  ││
│ │         │ Tonight 8:30 PM         ││
│ │         │ 🟣 Fundraiser · 0.8 mi  ││
│ │         │ ♡                       ││
│ └─────────┴────────────────────────┘│
│                                      │
│ [  Now  ][🗺][Explore][ + ][👤]      │  ← floating pill tab bar
└──────────────────────────────────────┘
```

### Information Hierarchy
1. **Location identity** — "West Ridge" in header. User instantly knows they're looking at their neighbourhood.
2. **Live Now strip** — what's happening right this second. The most urgent content.
3. **Category filter chips** — instant content narrowing, one tap.
4. **Featured card** — full-bleed image, the most premium content. Gold badge communicates it's special.
5. **Compact cards** — the feed body. Digest of local life.

### Header Design (Transparent → Solid on Scroll)
```
At scroll position 0:
  Background: transparent
  Logo: text.primary
  Shadow: none

At scroll position > 60px:
  Background: rgba(8,12,20,0.92) + backdrop-blur(20px)
  Border bottom: rgba(255,255,255,0.06)
  (Reanimated interpolate on scroll offset)
```

**Header anatomy:**
- Left: `★ Muzgram` wordmark compact (16px, semibold)
- Center: `📍 West Ridge` — tap to change neighbourhood (animated underline on tap, routes to neighbourhood picker)
- Right: bell icon with `accent.rose` dot badge (count, max "9+") · search icon

### Live Now Strip
```
Height: 44px (pill height) + 12px top/bottom padding
Scroll: horizontal, no scrollbar visible (fade edge mask on right)
Items: up to 8 live items — events happening now + restaurants open right now
Pill anatomy: [dot indicator] [category color bg] [Name] [distance]

🔴 dot: rose pulse animation (Reanimated withRepeat, opacity 1→0.3, 2s loop)
```

Tapping a live pill: animates down (scale 0.95, spring), then navigates to detail.

### Category Chips
```
Height: 36px
Gap: 8px horizontal
Padding: 0 14px
Font: label (12px, 600, 0.4 tracking)
Active: category color fill + white text + spring scale animation
Inactive: bg.elevated + text.muted
All chip: accent.gold fill when active
```

On chip tap: `haptics.selection()` + feed re-filters with crossfade (300ms).

### Featured Card
```
Height: 268px (200px image + 68px text overlay)
Image: full-width, expo-image with blurhash placeholder
Gradient: transparent → rgba(8,12,20,0.95) covering bottom 55%
Category chip: top-left, 8px margin
⭐ FEATURED badge: top-right, gold background, 10px label
Title: h2 (22px, 700), bottom of gradient
Meta row: distance label · open status pill
Actions: Save ♡ · Share ↗ (both right of each other, bottom-right)
```

**The Save button animation:**
```
Unsaved: ♡ (outline, text.secondary)
Tap:     scale 0 → 1.3 → 1.0 (spring.bouncy), haptics.impact.medium
Saved:   ♥ (filled, accent.rose)
```

### Compact Cards
```
Height: 88px
Image: 80×80px, rounded-md (14px), left-aligned, 12px margin
Content right: Name (h4, 16px, 600) + meta (body, 14px, secondary) + category chip
Distance: always visible, text.muted, right-aligned
Save icon: right edge, 24px touch target (hidden until row is long-pressed → MMP)
```

### Pull to Refresh
```
Pull threshold: 60px
Animation: custom gold spinner (not system spinner) — Muzgram star rotating
"Refreshed just now" toast appears at top (500ms, then fades)
```

### Empty State (Day 1, before seeding)
```
Never shows an empty white screen.
Shows 3 cards from West Ridge seed data regardless.
If feed is truly empty: illustration of a quiet Devon Ave street at night
+ "Nothing new today near West Ridge"
+ [Explore all of Chicago] secondary button
```

### Daily Habit Reinforcement
- "Live Now" strip changes content throughout the day — reason to check morning, lunch, evening
- Daily specials appear as banners on restaurant cards — only valid today, creates scarcity + urgency
- Featured slots rotate (admin-managed) — new featured card each visit feels like new discovery
- Push notification "Eid Bazaar 1.2km from you today" → opens this screen → user discovers 3 other things while browsing

---

## Screen 7 — Explore

**Vibe:** Leisure browsing. "What does West Ridge have to offer?"

```
┌──────────────────────────────────────┐
│                                      │
│  Explore       📍 West Ridge  🔍     │
│                                      │
│ ┌────┐ ┌──────┐ ┌────────┐ ┌──────┐│
│ │Food│ │Events│ │Services│ │Comm. ││
│ └────┘ └──────┘ └────────┘ └──────┘│
│  (primary tab row — large, 44px)     │
│                                      │
│ [Restaurant][Café][Bakery][Butcher]─►│
│  sub-category horizontal scroll      │
│                                      │
│ ─── Nearby First ──────── Sort ≡ ───│
│                                      │
│ [Featured card if active]            │
│                                      │
│ ┌──────────────────────────────────┐│
│ │[img] Ghareeb Nawaz               ││
│ │      Pakistani · ● Open          ││
│ │      🟢 Self-declared · 0.1 mi   ││
│ └──────────────────────────────────┘│
│ ┌──────────────────────────────────┐│
│ │[img] Devon Market                ││
│ │      Halal Grocery · Open        ││
│ │      🟢 ISNA Certified · 0.3 mi  ││
│ └──────────────────────────────────┘│
│  ...                                 │
│                                      │
│ [  Now  ][🗺][Explore●][ + ][👤]    │
└──────────────────────────────────────┘
```

### Primary Tab Row
- 4 tabs: Food / Events / Services / Community
- Height: 44px (not chip — proper tab, heavier weight)
- Active tab: bottom border 2px `accent.gold` + text.primary semibold
- Inactive: text.muted regular
- Tab switch: content crossfades (200ms) — never hard cut

### Sub-category Row (changes per primary tab)
```
Food:      Restaurant · Café · Bakery · Grocery · Butcher · Catering · Food Truck · Dessert
Events:    This Week · Free · Family · Community · Religious · Youth
Services:  Financial · Legal · Real Estate · Healthcare · Education · Home Services
Community: (no sub-categories — just one unified feed)
```

### Sort Row
```
Left: "Nearby First" (active sort label)
Right: Sort icon ≡ → taps open sort bottom sheet
Sort options: Nearby First · Most Recent · A–Z
```

### Card Design (Explore mode — slightly richer than Now Feed compact cards)
```
Height: 96px
Image: 88×88px, rounded-lg (20px)
Title: h4 (16px, 600)
Subtitle: body (14px) — business type
Status row: Halal badge + open pill + distance
Distance: always rightmost, text.muted

Halal badge in Explore is LARGER than in Now Feed:
  - Shield icon 14px + label text 11px
  - Emerald for certified, gold for self-declared, muted for unknown
```

### Daily Habit Reinforcement
- Sub-category state persists between sessions — if you always browse "Café", it remembers
- "New this week" label on content added in last 7 days — gives a reason to browse even when you know the area
- Sort by "Most Recent" — businesses and events that just joined get discovered

---

## Screen 8 — Map

**Vibe:** Devon Ave from 200 feet up. Every pin is a discovery.

```
┌──────────────────────────────────────┐
│ [FULL SCREEN MAPBOX — NO CHROME]     │
│                                      │
│ ┌──────────────────────────────────┐│
│ │ 🔍 Search on map...      [⊕]   ││  ← floating glass search bar
│ └──────────────────────────────────┘│
│                                      │
│ [All ●] [🍽 Food] [📅 Events] [💼 Svcs]
│  floating chip row (glass pill bg)   │
│                                      │
│ ·  ·  ·  · [🍽 green pin] ·  ·      │
│  · [🟣 event pin] ·  ·  ·           │  ← Mapbox canvas
│       · [🍽 gold star pin] ·  ·     │
│  ·  ·  ·  [👤 blue dot] ·  ·        │
│      · [🍽 green pin cluster:12]    │
│  ·  ·  ·  ·  ·  ·  ·  ·  ·          │
│                                      │
│                          [⊙ 56px FAB]│  ← re-center button, accent.gold
│                                      │
└──────────────────────────────────────┘

When pin tapped → bottom sheet slides up to 35%:

┌──────────────────────────────────────┐
│ ─────────── (drag handle) ─────────  │
│                                      │
│ [80px img] Sabri Nihari              │
│            🟢 ISNA Certified         │
│            ● Open until 10 PM        │
│            0.2 mi away               │
│                                      │
│ [Directions ↗]    [View Details →]  │
│                                      │
└──────────────────────────────────────┘
Swipe up to 75% → full business detail preview
Swipe to 95% → immersive (same as Business Detail screen)
```

### Map Style
- Custom Mapbox style matching design system exactly: `#080C14` background, `#0F1520` water, `#1A2332` roads
- Building outlines barely visible: `rgba(255,255,255,0.03)` — creates depth without noise
- POI labels suppressed (we show our own) — only street names visible
- Mapbox logo: bottom-left, 4px opacity (required by Mapbox license)

### Pin Design Spec
```
Default teardrop pin: 40×52px SVG
├─ Outer shape: teardrop, category color fill
├─ Inner circle: 24px diameter, white/10% darker fill
├─ Icon: 14×14px Lucide icon, white
└─ Bottom point: centered, 8px radius

States:
  Default:  normal scale (1.0)
  Hover:    scale 1.1 (desktop only — skip on mobile)
  Selected: scale 1.3 + white 3px ring + drop shadow — spring.bouncy
  Live now: rose pulse ring (3 rings expanding outward, 2s loop, opacity 1→0)
  Featured: gold star badge (16px) at top-right of teardrop

Cluster pin: circle 40px diameter
  Background: category color (most common in cluster)
  Text: count, Inter Bold 13px, white
  Scale: grows to 48px at 20+ items
```

### Floating Search Bar
```
Height: 44px
Background: rgba(8,12,20,0.85) + backdrop-blur(20px)
Border: rgba(255,255,255,0.08)
Border-radius: 22px (full pill)
Margin: 16px horizontal, 16px below status bar
Placeholder: "Search on map..." in text.muted
Right side: [filter icon ⊕] — opens filter bottom sheet
```

### Category Chips (floating over map)
```
Below search bar, 8px gap
Same pill design as feed chips
Background: rgba(8,12,20,0.85) + backdrop-blur
Active chip's color fills the background — more vivid than feed chips
because they're over the dark map (more contrast needed)
```

### Re-center FAB
```
Position: bottom-right, 24px from edge, 100px above tab bar
Size: 56×56px circle
Background: accent.gold
Icon: Navigation2 (Lucide), white, 22px
Shadow: 0 4px 20px rgba(245,158,11,0.4)  — gold glow
Tap: camera flies to user location, spring animation, haptics.impact.medium
Hidden: when user is already centered (appears when camera is >200m from user position)
```

### Map Bottom Sheet (35% snap)
```
Background: bg.elevated (#1A2332)
Top border-radius: 28px
Handle bar: 4×40px, rgba(255,255,255,0.2), centered, 12px from top
Content padding: 20px horizontal

Image: 80×80px, rounded-md, left-aligned
Right of image:
  Name: h3 (18px, 600)
  Halal badge: shield + label (14px)
  Open status: ● emerald "Open until 10 PM" or ⊘ rose "Closed"
  Distance: text.muted, caption

Bottom row: two equal buttons (secondary, full width 1/2 each)
  [Directions ↗] → opens Apple/Google Maps
  [View Details →] → expands sheet to 75%
```

### Bottom Sheet 75% — Full Preview
Adds: description truncated to 3 lines, photo strip (4 thumbnails, horizontal scroll), [Call] [WhatsApp] [Save] row.

### Daily Habit Reinforcement
- Every lunch hour: "I'll just check the map to see what's open nearby"
- Live pins pulse — creating FOMO for live events
- Pin count per category chip changes throughout day — creates curiosity
- Map remembers last camera position — user immediately sees their neighbourhood context

---

## Screen 9 — Event Detail

**Vibe:** I want to go. Tell me everything I need to decide in 10 seconds.

```
┌──────────────────────────────────────┐
│ [FULL BLEED HERO IMAGE — 280px]      │
│                                      │
│ ←  (glass pill back btn)   Share ↗  │  ← top actions over image
│                                      │
│                   [🟣 Fundraiser]    │  ← category chip, bottom of image
│                                      │
├──────────────────────────────────────┤
│                                      │
│ Iftar Dinner & Fundraiser            │  ← h1 (28px, 700)
│ CIOGC Annual Ramadan Event           │  ← subtitle (body, secondary)
│                                      │
│ ┌─────────────────────────────────┐ │
│ │ 📅  Tonight · Mon Apr 21        │ │
│ │     8:30 PM – 11:00 PM          │ │
│ ├─────────────────────────────────┤ │
│ │ 📍  Islamic Foundation          │ │
│ │     300 W Highridge Rd          │ │
│ │     17.4 mi away  [Map ↗]      │ │
│ ├─────────────────────────────────┤ │
│ │ 🎟  Suggested Donation $25     │ │
│ │     [RSVP / External Link ↗]   │ │
│ └─────────────────────────────────┘ │
│                                      │
│ About this event                     │
│ Join us for our annual iftar dinner  │
│ and community fundraiser. Dinner     │
│ catered by Halal Brothers. All       │
│ welcome. [Read more]                 │
│                                      │
│ Organised by CIOGC Events           │
│ [avatar] [Name] · Verified ✓        │
│                                      │
├──────────────────────────────────────┤
│ ┌────────────────┐ ┌───────────────┐│
│ │  ♥  Save Event │ │  Share to WA ↗││
│ └────────────────┘ └───────────────┘│
│ (sticky bottom bar, bg.elevated)     │
└──────────────────────────────────────┘
```

### Information Hierarchy
1. **Hero image** — emotional hook, 280px, sets the scene
2. **Event title** — what it is (large, confident)
3. **Info triptych** (date/time + location/distance + price) — the three decisions: "Can I make it? Can I get there? Can I afford it?"
4. **Description** — expandable, 3 lines default
5. **Organiser** — trust signal (who's running this)
6. **Sticky action bar** — Save + Share always visible

### Hero Image Treatment
```
Full-width, 280px height
expo-image, contentFit: "cover"
blurhash placeholder during load
Bottom gradient: transparent → rgba(8,12,20,0.4) on bottom 40%
  (softer than feed cards — detail screen has more space for text below)
Back button: glass pill (bg rgba(8,12,20,0.6) + blur, 36×36px, top-left, 16px margins)
Share button: glass pill, top-right
Category chip: 8px margin, bottom-left of image area
```

### Info Triptych
```
Three-row info card: bg.card, rounded-xl (20px), 16px padding, 12px gap
Each row: icon (18px, category color) + text content + right action (if applicable)

Row 1 — Date/Time:
  "Tonight · Mon Apr 21" (h4, bold)
  "8:30 PM – 11:00 PM" (body, secondary)

Row 2 — Location:
  "Islamic Foundation" (h4, bold)
  "300 W Highridge Rd · 17.4 mi away" (body, secondary)
  [Map ↗] link: opens Apple/Google Maps with pre-filled destination

Row 3 — Price:
  "Suggested Donation $25" or "Free" (h4, bold)
  [RSVP ↗] or [External Link ↗]: accent.gold text, opens in-app browser
```

### Sticky Bottom Bar
```
Height: 80px (52px button + 28px safe area)
Background: rgba(8,12,20,0.95) + backdrop-blur(20px)
Border top: border.subtle

Two equal buttons, 8px gap:
  Save: secondary style, ♡ icon → ♥ on save (optimistic toggle)
  Share: "Share to WhatsApp ↗" (primary style when unsaved, secondary when saved)
    Tap: directly opens WhatsApp with pre-filled text (not share sheet)
    The ↗ icon makes it clear this leaves the app momentarily
```

### Cancelled State
```
Red banner below hero: "⊘ This event has been cancelled"
Save button: "Saved — Event Cancelled" (amber warning style)
Share button: hidden (don't promote cancelled events)
```

---

## Screen 10 — Restaurant Detail

**Vibe:** "Can I eat here? Yes. Will I? Also yes."

```
┌──────────────────────────────────────┐
│ [HERO IMAGE — 260px, full bleed]     │
│                                      │
│ ←  (glass back)         Share ↗ [♡] │
│                                      │
│  [🟢 ISNA CERTIFIED]                 │  ← halal badge overlay, bottom-left
│                                      │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐│
│ │                    [logo 56px ●] ││  ← logo overlaps hero bottom
│ │ Sabri Nihari                     ││
│ │ Pakistani Restaurant             ││
│ │                                  ││
│ │ ● Open · Closes 10:00 PM         ││  ← emerald dot, live feel
│ │ 0.2 mi away · Devon Ave          ││
│ └──────────────────────────────────┘│
│                                      │
│ ┌────┐ ┌────────────┐ ┌──────┐     │
│ │Call│ │  Directions│ │ WA ↗ │     │  ← action row, 3 equal buttons
│ └────┘ └────────────┘ └──────┘     │
│                                      │
│ ─────────────────────────────────── │
│                                      │
│ 🍽 SPECIAL TODAY                    │
│ Friday Nihari Special — $8.99       │  ← daily special banner (gold bg)
│ Full bowl with naan. Today only.    │
│                                      │
│ ─────────────────────────────────── │
│                                      │
│ [Info] [Photos] [Hours]              │  ← tab row, underline style
│                                      │
│ Info tab content:                    │
│   About · Phone · Website · Hours    │
│   Halal cert details                 │
│                                      │
│ Photos tab: horizontal photo strip   │
│ Hours tab: 7-day hours grid          │
│                                      │
│ ┌────────────────────────────────┐  │
│ │  ♥  Saved              Share ↗ │  │  ← sticky bar
│ └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

### Hero + Logo Overlap Treatment
```
Hero image: 260px, full bleed, contentFit: cover
Logo: 56×56px circle, white border 2px, positioned at bottom-right of hero (-28px offset — overlaps)
On no logo: initials circle (deterministic color from business name hash)

Below hero:
  Business name: h1 (28px, 700, letterSpacing -0.5)
  Category: body, text.secondary
  Open status: ● (2px emerald circle, pulsing) + "Open · Closes 10:00 PM" (emerald, 14px, 500)
    Or: ⊘ (rose, static) + "Closed · Opens 11:00 AM" (text.muted)
    Or: ⚠ "Closes in 43 min" (amber — urgency signal for food seeker)
  Distance: text.muted, 14px
```

### Halal Badge on Hero
```
Positioned: bottom-left of image, 12px margin
Style: not a chip — a badge with icon + text
  🟢 shield icon 16px + "ISNA Certified" label
  Background: rgba(16,185,129,0.15) + border rgba(16,185,129,0.4)
  On tap: full-screen modal explaining the certification tiers
  (Tap to learn what ISNA Certified means — this is education + trust building)
```

### Action Row
```
Three equal-width buttons, 12px gap, height 48px, rounded-full

[📞 Call]        → tel: link, haptics.impact.medium
[↗ Directions]  → opens Maps app, logs analytics contact_tap
[💬 WhatsApp]   → wa.me/+1... pre-filled message "Hi, I found you on Muzgram"
                   contact_tap_count increments on all three

All three secondary style (bg.elevated, border.default)
```

### Daily Special Banner
```
Shows ONLY when business has a daily special for today
Background: rgba(245,158,11,0.12) + border rgba(245,158,11,0.2)
Icon: 🍽 (or whatever category icon)
Title: "SPECIAL TODAY" — label style, accent.gold, uppercase, tracking 0.8
Content: special title + optional description
Expires at midnight — gone tomorrow, creates return-tomorrow habit
```

### Tab Row (Info / Photos / Hours)
```
Three equal tabs, 44px height
Active: accent.gold underline 2px + text.primary semibold
Inactive: text.muted regular

Info tab:
  About section (expandable 3 lines)
  Contact info: phone, website, Instagram (icon + text per row)
  Halal certification detail section (expandable)
  Report issue link (text.muted, very bottom)

Photos tab:
  2×2 grid of photos (full-width grid)
  Tap → full-screen photo viewer with swipe navigation

Hours tab:
  7-day list, current day highlighted in accent.gold
  "Open until X PM" / "Closed today" per row
  Special note: "Temporarily closed" red banner if is_temporarily_closed
```

### Claim Banner (unclaimed businesses)
```
Shown at very bottom, above sticky bar
Background: bg.secondary
Text: "Is this your business?" + "Claim it free →"
Design: subtle, not pushy — business owners who find their business will see this
```

---

## Screen 11 — Service Provider Detail

**Vibe:** Professional. Trustworthy. "I want to enquire."

```
┌──────────────────────────────────────┐
│ [COVER OR GRADIENT — 200px]          │
│  (grey gradient if no cover photo)   │
│ ←          Share ↗                  │
│                                      │
│ ┌──────────────────────────────────┐│
│ │ [logo 56px]                      ││
│ │ Halal Home Finance LLC           ││
│ │ Mortgage · Financial Planning    ││
│ │ 1.3 mi away                      ││
│ └──────────────────────────────────┘│
│                                      │
│ ┌──────────────────────────────────┐│
│ │ ✓ Accepting new clients         ││
│ │ 🗣 English · Urdu · Arabic       ││
│ │ ⏱ Responds within 24 hours      ││
│ │ 📍 6550 N Lincoln Ave, Chicago  ││
│ └──────────────────────────────────┘│
│                                      │
│ About                                │
│ We specialize in halal-compliant    │
│ home financing for Chicago Muslims.  │
│ [Read more]                          │
│                                      │
│ ─────────────────────────────────── │
│                                      │
│ Send an Enquiry                      │
│                                      │
│ [Your message (optional)]            │
│ ┌──────────────────────────────────┐│
│ │ Hi, I'm looking for halal mortgage
│ │ advice for a home purchase...    ││
│ │                                  ││
│ └──────────────────────────────────┘│
│                                      │
│ ┌──────────────────────────────────┐│
│ │ Send Enquiry → (accent.gold btn) ││
│ └──────────────────────────────────┘│
│  Your phone number will be shared   │
│  (+1 312 555-0100) · Not your number?│
│                                      │
└──────────────────────────────────────┘
```

### Key UX Decisions
- **Lead form is on the detail page** — not a separate screen. Reduces friction. User reads about the provider and sends enquiry without navigating away.
- **Phone number pre-filled and shown** — no form fields for name/phone (taken from auth). User just writes their message (optional). Maximum conversion.
- **"Responds within 24 hours"** — sets expectation so user doesn't feel anxious waiting
- **"Accepting new clients" status** — if false, lead form is replaced with "Currently not accepting new clients. Save to be notified when they reopen." (This is a MMP feature — but the UX slot is designed for it)

### Trust Signals Info Card
```
4-row card: bg.card, rounded-xl, 16px padding, 12px gap
✓ Accepting new clients — emerald checkmark, emerald text
🗣 Languages — plain text, flags if relevant
⏱ Response time — text.secondary
📍 Service area — text.secondary
```

### Post-Submit State
```
After "Send Enquiry" tapped:
Button becomes: [✓ Enquiry Sent]  (emerald, disabled)
Below button: "Halal Home Finance LLC will contact you directly."
The lead form collapses — replaced by confirmation message
haptics.notification.success()
```

---

## Screen 12 — Create Post / Event / Business

**Vibe:** Quick. Unintimidating. "Just post it."

```
┌──────────────────────────────────────┐
│                                      │
│ ✕ Cancel                      Post  │  ← top bar, Post = accent.gold text
│                                      │
│ ─────────────────────────────────── │
│                                      │
│ What are you sharing?                │
│                                      │
│ ┌──────────┐ ┌──────────┐ ┌───────┐│
│ │    📅    │ │    🍽    │ │  💬  ││
│ │  Event   │ │ Business │ │  Post ││
│ │ Listing  │ │ Listing  │ │       ││
│ └──────────┘ └──────────┘ └───────┘│
│  (3-column type picker)              │
│                                      │
│ ─── After type selected: ─────────  │
│                                      │
│ [category chip row — horizontal]     │
│  Community / Food Tip / Notice /     │
│  Question / Recommendation           │
│                                      │
│ ┌──────────────────────────────────┐│
│ │                                  ││
│ │ What do you want to share?       ││
│ │                                  ││
│ │ (TextArea — auto-grows, 500 char)││
│ │                                  ││
│ └──────────────────────────────────┘│
│                                      │
│ 📷 Add Photo (optional)             │
│                                      │
│ 📍 West Ridge (auto-detected)        │
│                                      │
│ ─ 487 chars left ─────────────────  │
└──────────────────────────────────────┘
```

### Create Flow Structure
Three distinct flows. "Post" (community post) is described above. "Event" and "Business" open multi-step forms. For MVP:

**Community Post** — single screen, immediate
**Event** — 2 steps: basic info → location
**Business Listing** — 2 steps: business info → hours + photos

### Community Post Design
```
TextArea:
  Auto-grows from 80px to 200px max visible (scroll internally above 200px)
  No border in unfocused state — just bg.secondary behind it (content-first)
  Focused: subtle border.default
  Placeholder: "What do you want to share? A food tip, a question, a notice..."

Category chips above the text area:
  Tap to select — changes the post category
  Selected chip: category color bg + white text
  Only one selectable at a time

Photo section:
  "📷 Add Photo" row — tap → expo-image-picker
  After photo selected: shows 80×80 thumbnail with ✕ to remove
  Upload progress: thin accent.gold bar below thumbnail

Neighbourhood:
  Auto-detected from location store
  Tap to change (→ neighbourhood picker bottom sheet)

Post button (top-right header):
  Text: "Post" in accent.gold
  Disabled state: text.muted (before content entered)
  Loading state: spinner replaces text
```

### Character Limit UX
```
At 0 chars: "500" (label, text.muted)
At 100+ chars: counter disappears (not useful)
At 400 chars: counter reappears in amber "100 left"
At 480 chars: counter turns rose "20 left"
At 500 chars: input locked, rose "0 left"
```

### Empty Submit Prevention
"Post" button is always visible but clearly disabled (text.muted, no opacity) until at least 1 character is entered. No toast errors for empty submission — just make the button obviously inactive.

---

## Screen 13 — Search

**Vibe:** Fast. Find it before your brain finishes thinking.

```
┌──────────────────────────────────────┐
│                                      │
│ ← ┌────────────────────────────┐ ✕ │
│   │ 🔍 nihari...               │   │  ← auto-focused, keyboard open
│   └────────────────────────────┘   │
│                                      │
│  12 results near West Ridge          │  ← result count, updates live
│                                      │
│ [All ●] [Food 5] [Events 2] [Svcs 1]│  ← category tabs with counts
│                                      │
│ ┌──────────────────────────────────┐│
│ │[img] Sabri <mark>Nihari</mark>   ││  ← highlighted match
│ │      Pakistani · Open · 0.2mi   ││
│ │      🟢 ISNA Certified           ││
│ └──────────────────────────────────┘│
│ ┌──────────────────────────────────┐│
│ │[img] Noon O Kabab                ││
│ │      Persian/Afghan · 0.4mi     ││
│ └──────────────────────────────────┘│
│  ...                                 │
│                                      │
└──────────────────────────────────────┘
```

### Empty State (before typing)

```
┌──────────────────────────────────────┐
│ ← ┌────────────────────────────┐ ✕ │
│   │ 🔍 Search Muzgram...        │   │
│   └────────────────────────────┘   │
│                                      │
│  Recent Searches                     │
│  ① nihari                    ✕      │
│  ② eid bazaar                ✕      │
│  ③ halal mortgage            ✕      │
│                                      │
│  ─────────────────────────────────  │
│                                      │
│  Try searching for:                  │
│  [Devon Ave] [Eid events]            │
│  [Halal mortgage] [Youth events]     │
│                                      │
└──────────────────────────────────────┘
```

### Key Interactions
- Keyboard opens automatically on screen load (no tap required to start typing)
- **300ms debounce** before API call — search feels live but doesn't hammer the server
- After 2 chars: loading skeleton (3 skeleton rows)
- At 0 results: "No results for 'xyz'" + "Try searching all of Chicago" button (expands radius)
- Text highlighting: `<mark>` equivalent — matched substring in accent.gold on result title
- ✕ button at end of search bar: clears text, returns to recent searches state (not back navigation)
- Recent searches stored in MMKV, shown as tappable chips

---

## Screen 14 — Notifications

**Vibe:** Curated. Relevant. Never noisy.

```
┌──────────────────────────────────────┐
│                                      │
│ ←  Notifications          Mark all ✓│
│                                      │
│ ─────────────────────────────────── │
│                                      │
│  TODAY                               │  ← section header, label style, muted
│                                      │
│ ● [📅] Iftar Bazaar near you         │  ← unread: ● rose dot, bg.secondary
│   Community event · 0.8 mi away      │
│   "Happening at 6pm today near..."   │
│   2h ago                             │
│                                      │
│ ● [🍽] Your listing is live!         │
│   Al-Khyam Bakery approved           │
│   "Your business listing is now..."  │
│   5h ago                             │
│                                      │
│ ─────────────────────────────────── │
│                                      │
│  YESTERDAY                           │
│                                      │
│   [📅] Event day reminder            │  ← read: no dot, bg.primary
│   CIOGC Iftar Fundraiser             │
│   "Don't forget — tonight at..."     │
│   Yesterday                          │
│                                      │
└──────────────────────────────────────┘
```

### Notification Row Design
```
Height: 80px (content-driven, wraps if needed)
Left: 40×40px icon circle (category color + type icon) + rose dot if unread
Content:
  Title: h4 (16px, 600) — bold if unread, regular if read
  Subtitle: body (14px, secondary) — content type + distance
  Preview: bodySm (13px, muted) — first line of notification body
  Timestamp: caption (11px, muted) — right-aligned
Background:
  Unread: bg.secondary
  Read: bg.primary
```

### Empty State
```
🔔 illustration (muted gold bell)
"No notifications yet"
"When events happen near you or your listings get approved, we'll tell you here."
```

### Swipe to Dismiss (MMP gesture — design slot ready)
Left swipe on notification row reveals "Dismiss" action. Marked for MMP but the row height and padding are designed to accommodate the gesture without visual cramping.

---

## Screen 15 — Saved Items

**Vibe:** My personal local guide. Things I want to return to.

```
┌──────────────────────────────────────┐
│                                      │
│ ←  Saved                            │
│                                      │
│ [All ●] [Food] [Events] [Svcs] [Posts│
│  tab row with counts                 │
│                                      │
│ EVENTS                               │
│                                      │
│ ┌──────────────────────────────────┐│
│ │[img] CIOGC Iftar Fundraiser      ││
│ │      [TODAY! 🔴]  ← rose chip   ││
│ │      Tonight 8:30 PM             ││
│ └──────────────────────────────────┘│
│                                      │
│ ┌──────────────────────────────────┐│
│ │[img] Muslim Professionals Night  ││
│ │      [In 14 days]                ││
│ │      May 5 · 6:30 PM             ││
│ └──────────────────────────────────┘│
│                                      │
│ BUSINESSES                           │
│                                      │
│ ┌──────────────────────────────────┐│
│ │[img] Sabri Nihari                ││
│ │      ● Open · 0.2 mi            ││
│ └──────────────────────────────────┘│
│                                      │
└──────────────────────────────────────┘
```

### Event Countdown Labels
```
[TODAY! 🔴]     → rose background, pulse animation, happens today
[Tomorrow]      → amber background, static
[In 3 days]     → bg.elevated, static
[May 8]         → text.muted, no badge — far future
[Past]          → text.muted, opacity 0.5, moved to bottom section "Past Events"
```

### Grouped by Content Type
Within "All" tab: sections (Events first, then Businesses, then Posts) with section headers. Within "Events" tab: chronological, soonest first — past events at bottom in collapsed "Past Events" section.

### Empty States per Tab
```
Food:   "No saved restaurants yet" · [Browse halal food →]
Events: "No saved events yet" · [See what's coming up →]
All:    "Nothing saved yet" · [Browse the feed →]
```

### Long-press to Unsave (gesture)
Long-press on any card → haptics.impact.medium → card wiggles (like iOS delete mode) → ✕ appears top-right → tap ✕ to confirm remove. (Muscle memory from iOS photos/apps.)

---

## Screen 16 — User Profile

**Vibe:** Understated. This is a utility app, not a social platform.

```
┌──────────────────────────────────────┐
│                                      │
│                          Settings ⚙ │
│                                      │
│ ┌──────────────────────────────────┐│
│ │  [Avatar 80px]                   ││
│ │  Yusuf A.                        ││
│ │  West Ridge · Member since Apr   ││
│ │                                  ││
│ │  12 posts  ·  3 events  ·  47 ♥ ││
│ │                                  ││
│ │  [Edit Profile]                  ││
│ └──────────────────────────────────┘│
│                                      │
│ [My Posts ●] [My Events]             │
│                                      │
│ ┌──────────────────────────────────┐│
│ │[img] Food Tip post               ││
│ │      "Just tried Noon O Kabab..."││
│ │      West Ridge · 2 days ago     ││
│ └──────────────────────────────────┘│
│  ...                                 │
│                                      │
└──────────────────────────────────────┘
```

### Avatar + Profile Header
```
Avatar: 80×80px circle
  Has photo: expo-image with blurhash placeholder
  No photo: initials (e.g. "YA") on deterministic color circle (avatarColor.ts)
  Border: 2px border.strong, no camera icon overlay (keep clean — edit is via button)

Name: h2 (22px, 700)
Meta: "West Ridge · Member since April" — body, text.secondary

Stats row: [12 posts · 3 events · 47 saved]
  Numbers in text.primary bold, labels in text.muted
  Stats are not tappable (MMP: tap posts → filtered view)

[Edit Profile] button: secondary style, 36px height, rounded-full, top-right of header card
```

### My Content Tabs
```
Two tabs: My Posts · My Events
Tab style: underline (same as business detail screen)
Content: same compact card design as feed — feels consistent
Pending content: shows "(Pending Review)" label in amber on card
Rejected content: shows "(Not approved)" in rose + tap to see reason (MMP)
```

---

## Screen 17 — Provider Profile (Business Owner Portal)

**Vibe:** Empowering. "This is my business on Muzgram."

```
┌──────────────────────────────────────┐
│                                      │
│ ←  My Business                       │
│                                      │
│ ┌──────────────────────────────────┐│
│ │  [Hero thumb]  Sabri Nihari      ││
│ │  Pakistani Restaurant            ││
│ │  ● Live · Approved               ││
│ └──────────────────────────────────┘│
│                                      │
│ THIS WEEK                            │
│ ┌────────┐ ┌────────┐ ┌───────────┐│
│ │  214   │ │   18   │ │     4     ││
│ │ Views  │ │ Saves  │ │  Enquiries││
│ └────────┘ └────────┘ └───────────┘│
│  (3-column stat cards)               │
│                                      │
│ ─────────────────────────────────── │
│                                      │
│ [Enquiries (4)] [Edit Listing]       │
│  tab row                             │
│                                      │
│ Enquiries tab:                       │
│ ● Omar H. · +1 312 555-0300         │
│   "Looking for halal mortgage..."   │
│   Today 1:45 PM                     │
│   [📞 Call directly]                 │
│                                      │
└──────────────────────────────────────┘
```

### Stats Cards
```
3 equal columns, bg.card, rounded-xl, 16px padding
Number: d2 (32px, 700, display font) — large and confident
Label: caption (11px, text.muted)
Background: none — clean and minimal
```

### Enquiries (Leads Inbox)
```
Lead row: 80px height
Left: 8px rose dot if unread + avatar (40px, initials)
Content: Name + phone (text.primary) + preview message (text.muted, 1 line truncated) + timestamp
Bottom: [📞 Call directly] — tel: link, no in-app chat
Swipe right: mark as read
```

### Edit Listing Entry Points
```
From this screen → taps "Edit Listing" tab
Shows: all editable fields in a form (same as create, pre-populated)
Minor edits: immediate save
Major edits: "Your changes are under review" banner
```

---

## Screen 18 — Settings

**Vibe:** Clean. Gets out of the way. Not a dumping ground.

```
┌──────────────────────────────────────┐
│                                      │
│ ←  Settings                          │
│                                      │
│ [Avatar 48px]  Yusuf A.             │
│                (312) 555-0100        │
│                West Ridge            │
│  [Edit Profile →]                    │
│                                      │
│ ─────────────────────────────────── │
│                                      │
│ LOCATION                             │
│ My Neighbourhood        West Ridge ›│
│                                      │
│ NOTIFICATIONS                        │
│ Nearby Events              ○ ─── ●  │
│ Event Day Reminder         ○ ─── ●  │
│ Lead Received              ○ ─── ●  │
│ Quiet Hours (10pm–7am)     ○ ─── ●  │
│                                      │
│ ACCOUNT                              │
│ Help & Support                     ›│
│ Privacy Policy                     ›│
│ Terms of Service                   ›│
│ Delete Account                     ›│
│                                      │
│ ─────────────────────────────────── │
│                                      │
│ Log Out                              │
│ (text.secondary, no destructive red  │
│  — log out isn't dangerous)          │
│                                      │
│ Version 1.0.0                        │
│ (text.muted, caption)                │
└──────────────────────────────────────┘
```

### Settings Design Rules
1. **No section has more than 4 items** — if it does, something is wrong with the architecture
2. **Toggles are instant** — no "save" button for preferences. Toggle changes API immediately.
3. **"Delete Account" is in the list but not red** — it's not dangerous, it's a 30-day soft delete. Making it red creates unnecessary anxiety.
4. **"Log Out" is plain text** — not a button, not red. Calm and clear.
5. **Version number at bottom** — essential for customer support. Always include it.

### Toggle Design
```
Height: 56px per row
Left: setting label (h4, 16px)
Right: toggle switch (custom, not system)
  Off: bg.elevated, circle at left
  On: category/accent color, circle at right
  Spring animation on toggle: 200ms
  haptics.selection() on toggle change
  Immediate API call — no confirm dialog (easy to undo by toggling back)
```

---

## Cross-Screen UX Patterns

### 1. The Toast System (in-app notifications)
```
When app is in foreground and push notification arrives:
  Toast slides down from top (Reanimated spring)
  Height: 64px, bg.elevated, rounded-xl (20px), 16px margin horizontal
  Left: notification icon 36px circle
  Content: title (h4, bold) + body (body, secondary, 1 line truncated)
  Auto-dismiss: 4 seconds
  Tap: navigates to deep link
  Swipe up: dismiss immediately
  Never shows a system notification if app is foregrounded
```

### 2. The Share Pattern
```
All share buttons go directly to WhatsApp with pre-filled message.
This is a specific design decision — not a generic share sheet.
The share sheet appears only if WhatsApp is not installed (rare).

WhatsApp message format:
  Business: "Found this on Muzgram: Sabri Nihari (ISNA Certified, open now) 🌙 muzgram://business/id"
  Event: "Check out this event: CIOGC Iftar Dinner - Tonight 8:30PM 🌙 muzgram://event/id"
  Post: Shared via screenshot (post detail screen has a "Share screenshot" option — clean image with post text + Muzgram branding, no screenshot of the app UI)
```

### 3. The Loading Philosophy
```
Never show a spinner in the feed. Ever.
The loading hierarchy:
  1. Instant: cached TanStack Query data renders immediately
  2. Skeleton: if no cache exists, skeletons render (never empty white)
  3. Refresh: Pull-to-refresh with custom gold star spinner (fast, 500ms max)
  4. Pagination: "Loading more..." label at bottom (not spinner) for next page

Skeleton rule: every component that shows data has a skeleton twin.
  FeaturedCard → FeaturedCardSkeleton (same dimensions, shimmer)
  CompactCard  → CompactCardSkeleton
  BusinessDetail → BusinessDetailSkeleton
  EventDetail  → EventDetailSkeleton
```

### 4. Error Recovery
```
Two types of errors:
  A) Content error (network/API failure)
  B) User error (validation failure)

A) Content error:
  Full-screen: illustration + message + [Try Again] button
  Section (within larger screen): inline [Try again ↺] link in place of content
  Card (single failed item): "Content temporarily unavailable" faded card — never removes the slot

B) User error (form validation):
  Inline: red helper text below the specific field
  No toast for validation — the field itself communicates the error
  On API field error (e.g., duplicate listing): server error bridged to field via setError()
```

### 5. Haptic Language
```
Light tap     → Tab switches, chip selections, toggle changes
Medium impact → Button presses, save toggles, photo selected
Heavy impact  → (reserved for future, e.g., achievement unlocked)
Success       → OTP verified, post submitted, lead sent, listing approved
Error         → OTP wrong (with shake animation), submit failed
Selection     → Digit entry in OTP, character counter milestones
```

### 6. Empty Feed Strategy (day 1)
```
The app NEVER shows an empty feed.
Seed data strategy (built into admin):
  - 30+ Devon Ave businesses pre-seeded before launch
  - West Ridge as default neighborhood = max content on day 1
  - "Explore all of Chicago" fallback always shows content

If user is in a truly empty neighborhood:
  Show nearest active content + distance label "2.4 mi away" 
  + "Muzgram is new here — be the first to post!" CTA
  Never a completely empty screen.
```

### 7. Neighbourhood Identity Reinforcement
```
"West Ridge" appears in:
  - Feed header (always visible)
  - Explore header (always visible)  
  - Search result count ("12 results near West Ridge")
  - Empty states ("Nothing in West Ridge today...")
  - Notification previews ("Event 0.8mi from West Ridge")
  
This is intentional. The user should feel they're looking at THEIR neighborhood,
not a generic app. It creates local pride and belonging.
```

### 8. Content Freshness Signals
```
How the app communicates "this is current":
  - "2h ago" / "Today" / "Yesterday" labels on posts
  - "Closes in 47 min" amber status on restaurants (urgency)
  - "SPECIAL TODAY" banner (only valid today — creates daily check-in habit)
  - "New this week" label on recently added businesses (exploration reward)
  - Live Now strip changes content throughout the day
  - Pull to refresh custom animation (satisfying visual feedback)
  
The opposite of staleness: everything feels like it was checked today.
```

---

## My UX Enhancements (Beyond the Spec)

**1. The "Right Here" Distance Label**
When a business or event is < 160m away, don't show "0.1 mi" — show "Right here" in emerald text. This creates a delightful moment of hyper-local relevance. "Sabri Nihari — Right here." Users screenshot this.

**2. The "Closes in 43 min" Urgency Signal**
When a restaurant has < 60 minutes until closing, the open status turns amber and shows countdown: "Closes in 43 min". This creates a micro-urgency that drives immediate action (phone call, directions). Converts browse → visit.

**3. The Halal Badge Education Tap**
Tapping any halal badge opens a bottom sheet explaining the certification tiers:
- IFANCA Certified → most trusted, third-party audited
- ISNA Certified → trusted, third-party audited  
- Self-Declared → business claims halal, not verified
- Muslim-Owned → owned by Muslim family, halal status varies
This builds trust in the platform, educates users, and differentiates Muzgram from Google Maps where "halal" is just a user tag.

**4. Prayer Time Awareness (Invisible UX)**
The app doesn't show prayer times (that's a different app). But it's prayer-aware in two ways:
- Push notifications are suppressed during Maghrib window (20 min) — no "Sabri Nihari special offer" interrupting iftar
- Ramadan mode (activated automatically from the DB table) adds "Iftar in 2h 14m" to the feed header — a single line, elegant, informative

**5. The WhatsApp Share Screenshot for Posts**
When sharing a community post to WhatsApp, generate a clean "card image" of the post (black background, post text, author initials, Muzgram logo, neighbourhood badge). Not a screenshot of the app UI — a clean, intentional sharing card. This gets shared more because it looks intentional.

**6. The "New Listing" Shimmer Badge**
Businesses added in the last 7 days show a gold "✦ New" badge on their card. Small, 22px, top-right. Creates reward for regular users who discover new places ("Oh, Al-Khyam Bakery just joined!") and gives new businesses extra visibility.

**7. Open Now Status on Every Card Everywhere**
Every restaurant card everywhere (feed, explore, search results, saved items, map bottom sheet) always shows open/closed status with time. Non-negotiable. The #1 frustration with Google Maps is finding a place, going there, and finding it closed. We solve this.

**8. The Neighbourhood Switch Gesture**
Tapping "West Ridge" in the header → bottom sheet neighbourhood picker slides up. Selecting a different neighbourhood: the feed crossfades to the new location's content. No navigation, no reload screen — seamless teleportation. User can browse Devon Ave, then switch to Bridgeview to check what's happening there, then switch back.

**9. Haptic Confirmation on Every Content Submission**
When a post, event, or business listing is submitted:
`haptics.notification.success()` → brief success toast → screen transitions with the card still visible in the background (through a translucent overlay) before routing back to feed. User sees their content "land" in the world. Satisfying, confirms it worked.

**10. The "Muzgram Moment" on Business Detail**
Below the action row (Call / Directions / WhatsApp), a single subtle line:
"Found via Muzgram · Devon Ave · West Ridge"
This text gets captured in screenshots that users send to their WhatsApp groups. It becomes organic promotion. The copy never says "Share on Muzgram" — it's just quietly branded into the moment of discovery.

---

*16 screens. 1 neighbourhood. Designed for the person who opens their phone at lunchtime on Devon Ave and wants to know what's open. Everything else is secondary.*
