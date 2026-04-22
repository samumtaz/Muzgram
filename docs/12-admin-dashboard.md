# Muzgram — Admin Dashboard Design
> Last updated: 2026-04-21
> Stack: React 19 + Vite + shadcn/ui + TanStack Query v5 + TanStack Table v8 + Clerk
> Philosophy: **Operator-grade. Fast. Keyboard-first. Nothing hides.**

---

## Design Philosophy

The admin dashboard is a **control room**, not a website. Every design decision prioritizes:

1. **Triage speed** — Approve or reject a piece of content in under 5 keystrokes
2. **Situational awareness** — Know the platform state at a glance without drilling into tables
3. **Trust through audit** — Every action is logged, traceable, and reversible within a window
4. **Role clarity** — Moderators see less than admins; admins see less than super_admins. No confusion about what each role can do
5. **Zero blank states** — Empty tables have seeding prompts; zero analytics has onboarding nudges

**Visual tone:** Matches Muzgram's dark design system (`#080C14` base) but with a professional density that the consumer app avoids. More Linear/Vercel than App Store.

---

## Tech Stack

```
Framework:        React 19 + Vite 6
Routing:          React Router v7 (file-based)
UI Components:    shadcn/ui (Radix UI + Tailwind CSS)
Data Tables:      TanStack Table v8 (server-side, virtual rows)
Server State:     TanStack Query v5
Client State:     Zustand v5
Auth:             @clerk/clerk-react
Charts:           Recharts 2 + Tremor v4
Command Palette:  cmdk
Drag & Drop:      @dnd-kit/core + @dnd-kit/sortable
Notifications:    react-hot-toast
Date handling:    date-fns + date-fns-tz
Icons:            Lucide React
Animations:       Framer Motion
Forms:            React Hook Form v7 + Zod v3
Export:           xlsx + file-saver
Spreadsheet Grid: AG Grid Community v33 (Excel-like import grids)
CSV/Excel Parse:  papaparse + xlsx (read pasted/uploaded data)
Deployment:       Vercel (free tier sufficient for MVP)
```

---

## 1. Information Architecture

### Sidebar Navigation Tree

```
MUZGRAM ADMIN
│
├── ◉ Command Center         /                     [Overview + Live feed]
│
├── ── OPERATIONS ──
│
├── ⚡ Approval Queue         /queue                [Badge: pending count]
│   ├── Businesses                                  [Sub-filter]
│   ├── Events
│   ├── Posts
│   └── Claims
│
├── 🚩 Moderation             /moderation           [Badge: flagged count]
│   ├── Flagged Content                             [Sub-filter]
│   └── Reports
│
├── ── CONTENT ──
│
├── 🏪 Businesses             /businesses
├── 🍽️  Restaurants            /restaurants          [View of businesses by food cat]
├── 📅 Events                 /events
├── 📝 Posts                  /posts
│
├── ── PEOPLE ──
│
├── 👥 Users                  /users
├── ✅ Verifications          /verifications        [Badge: pending]
├── 🎫 Support Tickets        /support              [Badge: open count]
│
├── ── GROWTH ──
│
├── ⭐ Featured               /featured             [Slot manager]
├── 📣 Promotions             /promotions
├── 🗺️  City Rollout           /cities
│
├── ── INTELLIGENCE ──
│
├── 📊 Analytics              /analytics
├── 📋 Reports                /reports              [Downloadable reports]
│
├── ── DATA ──
│
├── 📥 Data Import            /import               [Spreadsheet import]
│   ├── Cities                /import/cities
│   ├── Neighborhoods         /import/neighborhoods
│   ├── Businesses            /import/businesses
│   ├── Restaurants           /import/restaurants
│   ├── Events                /import/events
│   ├── Mosques               /import/mosques
│   └── Import History        /import/history
│
├── ── SYSTEM ──
│
└── ⚙️  Settings              /settings
    ├── Team & Roles          /settings/team
    ├── Notification Rules    /settings/notifications
    ├── API & Webhooks        /settings/api
    └── Audit Log             /settings/audit
```

### URL Structure

```
/                              Command Center
/queue                         Approval Queue (all)
/queue?type=business           Filtered queue
/queue?type=event
/queue?type=post
/queue?type=claim
/moderation                    Moderation hub
/moderation/flagged            Flagged content
/moderation/reports            User reports
/businesses                    Business table
/businesses/:id                Business detail + editor
/restaurants                   Restaurants (subset of businesses)
/events                        Events table
/events/:id                    Event detail + editor
/posts                         Posts table
/posts/:id                     Post detail + editor
/users                         User table
/users/:id                     User detail
/verifications                 Verification requests
/verifications/:id             Verification detail
/support                       Support ticket table
/support/:id                   Ticket detail
/featured                      Featured slot manager
/promotions                    Promotion manager
/cities                        City rollout dashboard
/analytics                     Analytics home
/analytics/retention           Retention deep dive
/analytics/content             Content performance
/analytics/geo                 Geographic analytics
/reports                       Downloadable reports
/import                        Data Import hub (sheet selector)
/import/cities                 Cities spreadsheet importer
/import/neighborhoods          Neighborhoods spreadsheet importer
/import/businesses             Businesses spreadsheet importer
/import/restaurants            Restaurants spreadsheet importer
/import/events                 Events spreadsheet importer
/import/mosques                Mosques + Jummah times importer
/import/history                All past import runs + undo log
/settings                      Settings hub
/settings/team                 Team members + roles
/settings/notifications        Alert rules
/settings/api                  API keys + webhooks
/settings/audit                Full audit log
```

---

## 2. Global Shell

### Layout Structure

```
┌────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (240px)          │  MAIN CONTENT                               │
│ ─────────────────────    │  ─────────────────────────────────────────  │
│ [M] Muzgram Admin  ⚡    │  [Breadcrumb]            [Actions]   [⌘K]  │
│ ─────────────────────    │  ─────────────────────────────────────────  │
│ ◉ Command Center         │                                             │
│                          │                                             │
│ OPERATIONS               │                                             │
│ ⚡ Approval Queue  [12]  │           Page Content                      │
│ 🚩 Moderation     [3]   │                                             │
│                          │                                             │
│ CONTENT                  │                                             │
│ 🏪 Businesses            │                                             │
│ 📅 Events                │                                             │
│ 📝 Posts                 │                                             │
│                          │                                             │
│ PEOPLE                   │                                             │
│ 👥 Users                 │                                             │
│ ✅ Verifications  [2]   │                                             │
│ 🎫 Support       [5]    │                                             │
│                          │                                             │
│ GROWTH                   │                                             │
│ ⭐ Featured              │                                             │
│ 🗺️  City Rollout          │                                             │
│                          │                                             │
│ INTELLIGENCE             │                                             │
│ 📊 Analytics             │                                             │
│ 📋 Reports               │                                             │
│                          │                                             │
│ SYSTEM                   │                                             │
│ ⚙️  Settings              │                                             │
│ ─────────────────────    │                                             │
│ [Avatar] Atif Mumtaz     │                                             │
│ super_admin              │                                             │
└────────────────────────────────────────────────────────────────────────┘
```

### Sidebar Behavior
- **Collapsible** — icon-only mode at 60px (toggle via `[` keyboard shortcut)
- **Badge counts** — red badges on Approval Queue, Moderation, Verifications, Support
- **Auto-update** — badge counts poll every 30 seconds
- **Urgency escalation** — if Approval Queue > 10 items, sidebar badge turns amber; >20 turns red
- **Active state** — gold left border + slightly lighter background on active item

### Top Bar
- **Breadcrumb** — max 2 levels: `Businesses / Noon O Kabab`
- **Quick actions** — context-sensitive right-side buttons (change per page)
- **Command palette trigger** — `⌘K` button visible in top-right corner
- **Admin avatar** — click to see role + log out

### Command Palette (`⌘K`)

```
┌─────────────────────────────────────────────────────┐
│  🔍  Search users, businesses, events...            │
├─────────────────────────────────────────────────────┤
│  RECENT                                             │
│  → Noon O Kabab                    Business        │
│  → Eid Bazaar 2026                 Event           │
│                                                     │
│  ACTIONS                                           │
│  ⚡ Go to Approval Queue      ⌘ 1                  │
│  🚩 Go to Moderation          ⌘ 2                  │
│  ⭐ Manage Featured Slots     ⌘ F                  │
│  + Create Business            ⌘ N                  │
│                                                     │
│  PAGES                                             │
│  Analytics · Users · Events · Posts · Cities       │
└─────────────────────────────────────────────────────┘
```

**Search behavior:** Searches businesses, events, posts, users simultaneously (4 parallel API calls). Results are ranked: exact match > partial match. Shows type chip next to each result.

---

## 3. Key Pages

---

### Page 1: Command Center (/)

**Purpose:** Morning briefing. Know the platform state in 15 seconds.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Good morning, Atif 👋  Tuesday, April 21                            │
│  Chicago · 1 active city · Last deploy: 2h ago                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │
│  │ QUEUE       │  │ USERS      │  │ CONTENT    │  │ REVENUE    │    │
│  │ ⚡ 12       │  │ 👥 847     │  │ 🏪 134     │  │ 💰 $645    │    │
│  │ pending     │  │ registered │  │ businesses │  │ this month │    │
│  │ ↑ 4 today  │  │ +12 today  │  │ +3 today   │  │ 5 paying   │    │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘    │
│                                                                      │
│  ┌────────────────────────────────┐  ┌──────────────────────────┐   │
│  │  APPROVAL QUEUE — URGENT       │  │  PLATFORM ACTIVITY       │   │
│  │                                │  │  (last 2 hours)          │   │
│  │  🔴 Maryam Bakery   3h 12m     │  │                          │   │
│  │     Business · Devon Ave       │  │  12:42  User registered  │   │
│  │     [✓ Approve] [✗ Reject]     │  │  12:38  Event approved   │   │
│  │                                │  │  12:31  Lead submitted   │   │
│  │  🟡 Eid Fashion Fair  47m      │  │  12:28  Post flagged  🚩 │   │
│  │     Event · 3 days away        │  │  12:19  Business claimed │   │
│  │     [✓ Approve] [✗ Reject]     │  │  12:14  User registered  │   │
│  │                                │  │  12:08  Event submitted  │   │
│  │  [View all 12 →]               │  │  [View full log →]       │   │
│  └────────────────────────────────┘  └──────────────────────────┘   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  7-DAY RETENTION TREND                       [D7: 34%] ↑ 2%   │  │
│  │  ▁▂▃▄▅▆▇  Mon Tue Wed Thu Fri Sat Sun                         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐  │
│  │  FEATURED      │  │  OPEN NOW      │  │  TODAY'S EVENTS        │  │
│  │  3/6 slots     │  │  47 businesses │  │  4 events today        │  │
│  │  3 expiring    │  │  in West Ridge │  │  2 upcoming this week  │  │
│  │  this week     │  │                │  │                        │  │
│  │  [Manage →]    │  │  [View map →]  │  │  [View events →]       │  │
│  └────────────────┘  └────────────────┘  └────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

**KPI Card Design:**
- Metric number: `text-4xl font-bold text-white`
- Label: `text-sm text-slate-400`
- Delta: green arrow + `+12 today` or red arrow + `-3 vs yesterday`
- Click any KPI card → navigates to the relevant page pre-filtered for today

**Urgent Queue Widget:**
- Shows top 3 oldest pending items
- Color code: 🔴 > 4h (SLA breach), 🟡 1-4h (approaching), ⚪ < 1h (fine)
- Inline approve/reject buttons — no navigation required
- Approve action: optimistic UI, item fades out, queue count decrements

**Activity Feed:**
- Live-ish: polls every 15 seconds
- Shows last 10 platform events (moderation actions, registrations, leads, flags)
- Flags are highlighted with a 🚩 and rose background

---

### Page 2: Approval Queue (/queue)

**Purpose:** The most-used page. Zero friction from "pending" to "approved". SLA-driven.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Approval Queue                              [Bulk Select] [Filters ▾]│
│  12 pending · Target: events <1h · businesses <4h · claims <24h      │
├──────────────────────────────────────────────────────────────────────┤
│  [All (12)] [Businesses (3)] [Events (6)] [Posts (2)] [Claims (1)]   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ ☐  🏪 BUSINESS  Maryam Bakery & Café            ● 3h 12m ago   │  │
│  │    Devon Ave · Food / Bakery · Submitted by Sara H.            │  │
│  │    📍 6345 N. Kedzie Ave · ☎ (773) 555-0182                   │  │
│  │    🟡 Self-declared halal · Unclaimed · First submission       │  │
│  │                                          [Preview] [✓] [✗] [⋯] │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ ☐  📅 EVENT  Eid Fashion Fair 2026                ● 47m ago    │  │
│  │    April 28 · 11am–6pm · Norwood Park · Free                  │  │
│  │    Organiser: Bilal Karimi (3 prev. approved events) ✓        │  │
│  │    Cover image attached · Short description ✓                 │  │
│  │                                          [Preview] [✓] [✗] [⋯] │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ ☐  📝 POST  "Anyone know a good halal caterer..."    ● 12m ago │  │
│  │    Question · West Ridge · Posted by Fatima Al-Amin           │  │
│  │    1st post from this user · Photo attached                   │  │
│  │                                          [Preview] [✓] [✗] [⋯] │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Keyboard: a=approve  r=reject  p=preview  j=down  k=up  space=select│
└──────────────────────────────────────────────────────────────────────┘
```

**Split View (default for tablet/desktop, toggle on mobile):**
When clicking a queue item, the right panel expands to show full content preview without navigating away:

```
┌───────────────────────┬────────────────────────────────────────────┐
│  QUEUE LIST           │  PREVIEW — Maryam Bakery & Café           │
│  ─────────────────    │  ─────────────────────────────────────── │
│  🔴 Maryam Bakery ◄  │  [Cover photo]                            │
│  🟡 Eid Fashion Fair  │                                           │
│  ⚪ Caterer question  │  📍 6345 N. Kedzie Ave, Chicago           │
│  ⚪ Halal butcher     │  ☎  (773) 555-0182                        │
│  ⚪ Post: Housing req │  🕐 Mon-Sat 7am–9pm, Sun 9am–5pm         │
│  ...                  │  🟡 Self-declared halal                    │
│                       │                                           │
│                       │  "Family bakery serving freshly baked     │
│                       │   pita, baklava, and traditional          │
│                       │   pastries since 2019."                   │
│                       │                                           │
│                       │  MODERATION CHECKLIST                     │
│                       │  ☐ Address verified on Google Maps        │
│                       │  ☐ Phone number is real                  │
│                       │  ☐ Category is correct                   │
│                       │  ☐ No spam signals                       │
│                       │  ☐ Halal claim is documented             │
│                       │                                           │
│                       │  SIMILAR BUSINESSES                       │
│                       │  ⚠ "Maryam Sweets" exists nearby         │
│                       │  → Check if duplicate before approving    │
│                       │                                           │
│                       │  [✓ Approve] [✎ Edit & Approve] [✗ Reject]│
│                       │  [Feature this listing] [Add note]        │
└───────────────────────┴────────────────────────────────────────────┘
```

**Queue Item Data Model:**
```typescript
interface QueueItem {
  id: string;
  type: 'business' | 'event' | 'post' | 'claim';
  title: string;
  submittedAt: Date;
  submittedBy: { name: string; userId: string; previousApprovals: number };
  category: string;
  city: string;
  neighborhood: string;
  urgencyLevel: 'critical' | 'warning' | 'normal'; // based on SLA age
  slaBreach: boolean;
  duplicateRisk: boolean;       // auto-detected by name similarity
  autoApproveEligible: boolean; // user has enough approved history
  moderationChecklist: ChecklistItem[];
}
```

**Auto-approve indicator:** If `autoApproveEligible = true`, show a subtle badge: "Auto-approve eligible" — admin still sees it but it's styled lighter. One-click approve without checklist required.

**Bulk actions:**
- Select multiple items → `[Approve Selected]` `[Reject Selected with Reason]`
- Bulk reject modal: choose one reason applies to all, OR "assign individual reasons"
- Bulk approve: confirmation dialog showing count + warning if any have duplicate risk

**Reject Reasons (dropdown):**
```
- Duplicate listing (similar exists at same address)
- Outside coverage area (not in supported city/neighborhood)
- Incomplete information (missing hours, phone, or description)
- Spam or promotional content
- Inappropriate content
- Unverifiable halal claim
- Wrong category
- Other (requires note)
```

**Keyboard shortcuts (shown in footer bar):**
- `j` / `k` — navigate down/up queue
- `a` — approve focused item
- `r` — open reject modal
- `p` — toggle preview panel
- `Space` — select/deselect for bulk
- `⌘ Enter` — approve & advance to next
- `?` — show all shortcuts

---

### Page 3: Businesses (/businesses)

**Purpose:** The source of truth for all business listings. Full CRUD, search, filter, and inline editing.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Businesses                            [+ Add Business] [Export CSV] │
│  134 total · 119 active · 3 pending · 2 suspended · 10 unclaimed     │
├──────────────────────────────────────────────────────────────────────┤
│  🔍 Search businesses...  [Category ▾] [Status ▾] [Halal ▾] [City ▾]│
├──────────────────────────────────────────────────────────────────────┤
│  ☐  Name ↕          Category    Halal        Status    Claimed  Act  │
├──────────────────────────────────────────────────────────────────────┤
│  ☐  Noon O Kabab    Food/Rest.  ● IFANCA     ● Active  ✓        ⋯   │
│  ☐  Maryam Bakery   Food/Bak.   ○ Self-decl  ● Active  ✗        ⋯   │
│  ☐  Chicago Muslim  Services/   —  Unknown   ● Active  ✓        ⋯   │
│     Finance Group   Financial                                        │
│  ☐  Patel Brothers  Food/Groc.  ● ISNA       ● Active  ✓        ⋯   │
│  ☐  Test Business   Food/Rest.  —  Unknown   ⏳ Pending ✗        ⋯   │
├──────────────────────────────────────────────────────────────────────┤
│  [← Prev]  Page 1 of 7  [Next →]           Showing 20 of 134        │
└──────────────────────────────────────────────────────────────────────┘
```

**Row actions (⋯ menu):**
- View / Edit
- Feature / Unfeature
- Approve (if pending)
- Suspend (if active) / Unsuspend
- Verify Halal Certification
- View Analytics
- Delete (soft)

**Business Detail / Edit Page (`/businesses/:id`):**

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Businesses  /  Noon O Kabab                   [View Live] [Save]  │
├──────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐  │
│  │  DETAILS                     │  │  STATUS & SETTINGS           │  │
│  │                              │  │                              │  │
│  │  Name: [Noon O Kabab      ]  │  │  Status:  [Active        ▾]  │  │
│  │  Category: [Food/Rest.    ]  │  │  Halal:   [IFANCA Certif.]  │  │
│  │  Subcategory: [Restaurant ]  │  │  Claimed: ✓ by Yusuf Ahmad  │  │
│  │  Phone: [(773) 555-0142  ]  │  │  Featured: ☐ (not featured) │  │
│  │  Website: [noonokabab.com ]  │  │  Auto-approve: ✓            │  │
│  │  Instagram: [@noonokabab  ]  │  │                              │  │
│  │  Address: [4601 N Kedzie  ]  │  │  STATS (this week)          │  │
│  │  City: [Chicago          ]  │  │  Views:  847                 │  │
│  │  Neighborhood: [W. Ridge  ]  │  │  Saves:  34                 │  │
│  │  Lat: [41.9731]             │  │  Leads:  12                  │  │
│  │  Lng: [-87.7099]            │  │  Contact taps: 28            │  │
│  │  [Re-geocode from address]  │  │                              │  │
│  └──────────────────────────────┘  └──────────────────────────────┘  │
│                                                                      │
│  OPERATING HOURS                                                     │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Mon  ☐ Closed  [11:00 AM] → [10:00 PM]                     │    │
│  │  Tue  ☐ Closed  [11:00 AM] → [10:00 PM]                     │    │
│  │  Wed  ☐ Closed  [11:00 AM] → [10:00 PM]                     │    │
│  │  Thu  ☐ Closed  [11:00 AM] → [10:00 PM]                     │    │
│  │  Fri  ☐ Closed  [11:00 AM] → [11:00 PM]                     │    │
│  │  Sat  ☐ Closed  [10:00 AM] → [11:00 PM]                     │    │
│  │  Sun  ☑ Closed                                               │    │
│  │  [Copy Mon-Sat hours to all weekdays]                        │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  PHOTOS (6 total)                                                    │
│  [img][img][img][img][img][img] [+ Upload]                          │
│  Drag to reorder · First photo is cover                              │
│                                                                      │
│  MODERATION HISTORY                                                  │
│  2026-04-15  Approved by admin@muzgram.com                          │
│  2026-04-14  Submitted by user                                       │
│  2026-04-18  Featured slot assigned                                  │
└──────────────────────────────────────────────────────────────────────┘
```

**Halal Certification Management (inline section):**
```
HALAL CERTIFICATION
  Current status: IFANCA Certified  ✓ Verified 2026-01-15

  Certificate reference: IFA-CHI-2024-0847
  Expires: December 2026
  [Change status ▾]  [Upload certificate document]

  Status options:
  • IFANCA Certified (highest trust)
  • ISNA Certified
  • Self-Declared Halal (add disclaimer)
  • Halal Status Unknown (default)
  • Not Halal (will show warning badge)
```

---

### Page 4: Events (/events)

**Purpose:** Full event lifecycle management — create, approve, feature, track expiry.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Events                               [+ Add Event] [Export]         │
│  87 total · 12 upcoming · 6 live now · 3 pending · 66 past          │
├──────────────────────────────────────────────────────────────────────┤
│  [Upcoming] [Live Now 🔴] [Pending] [Past] [All]                     │
│  🔍 Search...  [Category ▾] [Date range ▾] [City ▾]                  │
├──────────────────────────────────────────────────────────────────────┤
│  ☐  Title              Date         Status     Featured  Organiser   │
├──────────────────────────────────────────────────────────────────────┤
│  ☐  Eid Bazaar 2026   Apr 28        ● Active   ⭐ Yes    Bilal K.    │
│  ☐  Halal Food Fair   May 3-4       ● Active   ○ No     Amina S.    │
│  ☐  Quran Course      Apr 22, 7pm   🔴 Live    ○ No     Al-Faatir   │
│  ☐  Eid Fashion Fair  Apr 28        ⏳ Pending  ○ No     Sara M.     │
├──────────────────────────────────────────────────────────────────────┤
│  [← Prev]  Page 1 of 5  [Next →]                                    │
└──────────────────────────────────────────────────────────────────────┘
```

**Event countdown system:**
- "Starts in 3 days" → gray
- "Tomorrow" → amber
- "Today" → rose pulse animation
- "Live now" → rose badge + radio icon
- "Ended X days ago" → muted, in Past tab

**Inline quick-feature toggle:** Click the star icon in the Featured column to immediately feature/unfeature without opening the detail page. Confirmation popover: "Feature this event? It will appear at the top of the Events feed."

---

### Page 5: Posts (/posts)

**Purpose:** Manage community posts — ephemeral content with 7-day lifecycle.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Posts                                                  [Filters ▾]  │
│  342 total · 89 active · 253 expired · 4 flagged                    │
├──────────────────────────────────────────────────────────────────────┤
│  [Active] [Pending] [Flagged 🚩] [Expired] [All]                    │
├──────────────────────────────────────────────────────────────────────┤
│  ☐  Preview                Type        Author    Expires    Actions  │
├──────────────────────────────────────────────────────────────────────┤
│  ☐  "Anyone know a good..." Question   Fatima A  3d 14h    [✓][✗][⋯]│
│  ☐  "Maryam Bakery has..."  Food Tip   Sara H.   5d 2h     [✓][✗][⋯]│
│  ☐  [Photo] "Spotted this" Community  Omar K.   6d 8h     [✓][✗][⋯]│
│  🚩 "Check out my insta..." Spam?      anon123   1d 3h     [✓][✗][⋯]│
└──────────────────────────────────────────────────────────────────────┘
```

**Expiry extension:** Admin can extend a post's life by 7 days. Used for important community announcements.

**Post type breakdown widget (sidebar card):**
Shows distribution: Question (32%), Food Tip (28%), Community (21%), Notice (12%), Recommend (7%).

---

### Page 6: Users (/users)

**Purpose:** User management, role assignment, suspension, and account recovery.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Users                                              [Export] [Invite] │
│  847 registered · 423 active (D7) · 5 suspended · 12 business owners│
├──────────────────────────────────────────────────────────────────────┤
│  🔍 Search by name or phone...  [Role ▾] [Status ▾] [City ▾]        │
├──────────────────────────────────────────────────────────────────────┤
│  ☐  Name          Phone       Role      City      Joined    Status   │
├──────────────────────────────────────────────────────────────────────┤
│  ☐  Fatima A.    +1773...     user      Chicago   Apr 15    ● Active │
│  ☐  Bilal K.     +1312...     bus_own.  Chicago   Mar 28    ● Active │
│  ☐  Omar K.      +1847...     user      Skokie    Apr 18    ● Active │
│  ☐  Test User    +1555...     user      —         Apr 1     ○ Suspen │
├──────────────────────────────────────────────────────────────────────┤
│  [← Prev]  Page 1 of 43  [Next →]                                   │
└──────────────────────────────────────────────────────────────────────┘
```

**User Detail Page (`/users/:id`):**

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Users / Bilal Karimi                          [Suspend] [Edit Role]│
├──────────────────────────────────────────────────────────────────────┤
│  [Avatar] Bilal Karimi                      ROLE: business_owner     │
│           +1 (312) 555-0192                 SINCE: March 28, 2026    │
│           West Ridge, Chicago               STATUS: ● Active          │
│                                                                      │
│  ACTIVITY SNAPSHOT                                                   │
│  Posts submitted: 8  ·  Events submitted: 4  ·  Saves: 23           │
│  Leads received: 34  ·  Last active: 2 hours ago                     │
│                                                                      │
│  OWNED BUSINESSES                                                    │
│  ● Chicago Muslim Finance Group (claimed, active)                    │
│                                                                      │
│  RECENT EVENTS                                                       │
│  ✓ Eid Bazaar 2026 (approved Apr 20)                                │
│  ✓ Community Iftar (approved Apr 10)                                 │
│  ✓ Youth Halaqah (approved Apr 3)                                    │
│  ⏳ Ramadan Fundraiser (pending)                                      │
│                                                                      │
│  MODERATION HISTORY                                                  │
│  No flags or reports on this user                                    │
│                                                                      │
│  ROLE MANAGEMENT                                                     │
│  Current: business_owner  →  [Change to: user / moderator / admin]  │
│  ⚠ Only super_admin can assign admin or moderator roles              │
└──────────────────────────────────────────────────────────────────────┘
```

**Suspension flow:**
1. Click `[Suspend]`
2. Modal: Reason (dropdown) + optional note + Duration (24h / 7d / 30d / Permanent)
3. Confirm → Clerk API called to revoke sessions → `is_suspended = true`
4. User sees "Account suspended" on next login attempt with reason
5. Admin can unsuspend at any time from this page

---

### Page 7: Moderation (/moderation)

**Purpose:** All flagged content and user reports in one place. Two sub-views.

#### Sub-view 1: Flagged Content

```
┌──────────────────────────────────────────────────────────────────────┐
│  Flagged Content                                         [Filters ▾] │
│  7 pending review · 3 actioned today                                 │
├──────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ 🚩 POST  "Check out my Instagram store..."    SPAM · 5 reports  │  │
│  │    Community Post · Omar K. · West Ridge · Posted 2h ago       │  │
│  │    Auto-flagged: keyword match (instagram, promo code, $$$)    │  │
│  │                                                                 │  │
│  │    REPORTS (5):  "Spam" (3) · "Inappropriate" (1) · Other (1)  │  │
│  │                                                                 │  │
│  │    [👁 View full post]  [🗑 Remove] [✓ Dismiss] [⚑ Suspend user] │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ 🚩 BUSINESS  Halal Meats Direct                3 reports       │  │
│  │    "Halal Status Unknown" reported as "falsely claiming halal" │  │
│  │                                                                 │  │
│  │    REPORTS: "False information" (3)                            │  │
│  │                                                                 │  │
│  │    [View business]  [Update halal status]  [Suspend] [Dismiss] │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

**Auto-flag triggers (built into backend):**
- Post contains keywords: `instagram.com`, `@`, pricing language (`$$`, `price`, `DM me`)
- Business reports ≥ 5 → auto-suspend + admin task created
- User submits > 5 posts in 1 hour → rate-limited + flag to admin
- Same user submits > 3 businesses in 1 day → flag for review

#### Sub-view 2: Reports (/moderation/reports)

```
┌──────────────────────────────────────────────────────────────────────┐
│  Reports                                                             │
│  18 total · 11 pending · 7 resolved this week                       │
├──────────────────────────────────────────────────────────────────────┤
│  [Pending] [Resolved] [All]  ·  [Business] [Event] [Post] [User]    │
├──────────────────────────────────────────────────────────────────────┤
│  Target               Type      Reports  Reason           Status     │
│  Halal Meats Direct   Business  3        False info        Pending   │
│  "Check out my IG..." Post      5        Spam              Pending   │
│  Aisha's Catering     Business  1        Wrong hours       Resolved  │
│  Community post #48   Post      2        Inappropriate     Resolved  │
└──────────────────────────────────────────────────────────────────────┘
```

**Resolution actions:**
- `Dismissed` — report unfounded, content stays live, reporter notified
- `Actioned - Content Updated` — admin fixed the issue (e.g., corrected halal status)
- `Actioned - Content Removed` — content taken down, submitter notified with reason
- `Actioned - User Suspended` — user suspended as a result

---

### Page 8: Featured Management (/featured)

**Purpose:** Control which content occupies the 6 premium featured slots across the app.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Featured Management                      [View in app preview]      │
│  6 total slots · 4 active · 2 empty · 3 expiring this week         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  NOW FEED (Top 2 cards)                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐          │
│  │  SLOT 1 — NOW FEED      │  │  SLOT 2 — NOW FEED      │          │
│  │  ──────────────────────  │  │  ──────────────────────  │          │
│  │  [Noon O Kabab logo]     │  │  [Eid Bazaar banner]    │          │
│  │  Noon O Kabab            │  │  Eid Bazaar 2026        │          │
│  │  Food · Restaurant       │  │  Event · Apr 28         │          │
│  │  Since: Apr 15           │  │  Since: Apr 20          │          │
│  │  Until: Apr 29  ⚠ 8d    │  │  Until: Apr 28  ⚠ 7d   │          │
│  │  [Replace] [Remove]      │  │  [Replace] [Remove]     │          │
│  │  [Extend 7 days]         │  │  [Extend 7 days]        │          │
│  └─────────────────────────┘  └─────────────────────────┘          │
│                                                                      │
│  EXPLORE HEADER (2 slots)                                            │
│  ┌─────────────────────────┐  ┌─────────────────────────┐          │
│  │  SLOT 3 — EXPLORE       │  │  SLOT 4 — EXPLORE       │          │
│  │  ──────────────────────  │  │  ──────────────────────  │          │
│  │  [Patel Brothers logo]  │  │  ╔═══════════════════╗  │          │
│  │  Patel Brothers          │  │  ║  EMPTY SLOT       ║  │          │
│  │  Food · Grocery          │  │  ║  Graceful fallback║  │          │
│  │  Since: Apr 10           │  │  ║  to organic top   ║  │          │
│  │  Until: May 10           │  │  ║  content          ║  │          │
│  │  [Replace] [Remove]      │  │  ║  [+ Assign →]     ║  │          │
│  │  [Extend 7 days]         │  │  ╚═══════════════════╝  │          │
│  └─────────────────────────┘  └─────────────────────────┘          │
│                                                                      │
│  MAP GOLD PINS (2 slots)                                            │
│  ┌─────────────────────────┐  ┌─────────────────────────┐          │
│  │  SLOT 5 — MAP PIN       │  │  SLOT 6 — MAP PIN       │          │
│  │  Al-Faatir Mosque        │  │  ╔═══════════════════╗  │          │
│  │  Mosque · W. Ridge       │  │  ║  EMPTY SLOT       ║  │          │
│  │  Since: Apr 1            │  │  ╚═══════════════════╝  │          │
│  │  Until: Jun 1            │  │  [+ Assign →]           │          │
│  └─────────────────────────┘  └─────────────────────────┘          │
│                                                                      │
│  HISTORY                                                            │
│  Apr 15: Slot 1 assigned — Noon O Kabab  (by Atif Mumtaz)           │
│  Apr 20: Slot 2 assigned — Eid Bazaar    (by Atif Mumtaz)           │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Assign modal (when clicking "+ Assign →"):**
```
┌─────────────────────────────────────────────────┐
│  Assign to Slot 4 — Explore Header              │
│                                                 │
│  🔍 Search businesses or events...              │
│  ─────────────────────────────────────────────  │
│  ○ Maryam Bakery & Café · Food · Devon Ave      │
│  ○ Halal Food Fair · Event · May 3-4            │
│  ○ Chicago Muslim Finance · Services            │
│                                                 │
│  Featured until: [Apr 28, 2026 ▾]               │
│  Or: [1 week] [2 weeks] [1 month]               │
│                                                 │
│  [Cancel]  [Assign to Slot]                     │
└─────────────────────────────────────────────────┘
```

**Expiry warnings:**
- Green: > 14 days remaining
- Amber: 8-14 days remaining
- Red: ≤ 7 days remaining (also shown on Command Center as "3 expiring this week")

---

### Page 9: Verifications (/verifications)

**Purpose:** Review business claim requests and halal certification upload requests.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Verification Requests                                               │
│  5 pending · 2 halal certifications · 3 business claims             │
├──────────────────────────────────────────────────────────────────────┤
│  [All] [Business Claims (3)] [Halal Certifications (2)]             │
├──────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ 🏪 CLAIM REQUEST  Maryam Bakery & Café                         │  │
│  │    Requested by: Sara Hassan (+1 773 555 0281)                 │  │
│  │    Business phone: (773) 555-0182                              │  │
│  │    Method: Call business phone to verify ownership             │  │
│  │    SLA: Verify within 24 hours                                 │  │
│  │                                                                 │  │
│  │    VERIFICATION STEPS                                          │  │
│  │    ☐ 1. Call (773) 555-0182 and ask for business owner        │  │
│  │    ☐ 2. Confirm name: "Sara Hassan"                           │  │
│  │    ☐ 3. Confirm ownership ("Is this your business?")          │  │
│  │    ☐ 4. Mark verified below                                    │  │
│  │                                                                 │  │
│  │    Notes: [                                           ]         │  │
│  │                                                                 │  │
│  │    [✓ Approve Claim]  [✗ Reject — Could not verify]            │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ ✅ HALAL CERT  Noon O Kabab                                    │  │
│  │    Certificate uploaded: IFANCA-CHI-2024-0847.pdf              │  │
│  │    [View certificate]                                           │  │
│  │    Certificate type: ○ IFANCA ○ ISNA ○ Other                  │  │
│  │    Expiry date: [           ]                                   │  │
│  │    [✓ Approve & Set Status]  [✗ Reject — Invalid/Expired]      │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

### Page 10: Support Tickets (/support)

**Purpose:** User-submitted issues and help requests.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Support Tickets                              [Reply Template ▾]     │
│  12 open · 5 waiting on reply · 47 closed this month                │
├──────────────────────────────────────────────────────────────────────┤
│  [Open] [Awaiting Reply] [Closed] [All]  ·  [Category ▾]            │
├──────────────────────────────────────────────────────────────────────┤
│  #  Title                         User      Category    Age    Status│
│  45 "My business isn't showing"   Yusuf A.  Listing     2d    Open  │
│  44 "Wrong halal badge on profile" Sara H.  Content     1d    Open  │
│  43 "Can't upload photo"          Bilal K.  Technical   4h    ↩ Rep │
│  42 "How do I change my suburb"   Fatima A. Account     3d    Closed│
├──────────────────────────────────────────────────────────────────────┘

Ticket Detail (side panel):
  ┌──────────────────────────────────────────────────┐
  │ #45 · Listing · Yusuf Ahmad · 2 days ago         │
  │ "My business isn't showing on the feed"          │
  │                                                  │
  │ Message:                                         │
  │ "I submitted Yusuf's Halal Butcher 3 days ago    │
  │  and it still hasn't appeared. Phone is          │
  │  555-0142."                                      │
  │                                                  │
  │ LINKED CONTENT                                   │
  │ → Found: "Yusuf's Halal Butcher" (pending)       │
  │   Status: Pending approval for 3 days            │
  │   [→ Go to queue item]                           │
  │                                                  │
  │ REPLY                                            │
  │ [Hi Yusuf, your listing is in our approval       │
  │  queue and will be live within the hour....]     │
  │                                                  │
  │ [Use template ▾]  [Send Reply]  [Close Ticket]   │
  └──────────────────────────────────────────────────┘
```

**Reply templates (dropdown):**
- "Listing under review" — explains approval process
- "Listing approved" — confirms it's live, includes app link
- "Photo upload instructions" — step-by-step
- "How to edit your business" — owner portal guide
- "Account recovery" — escalation path
- "Feature request noted" — non-committal acknowledgment

**Auto-link:** When a ticket mentions a business name or phone number, the system searches and shows "Linked content" if a match is found. One click to jump directly to that queue item.

---

### Page 11: City Rollout (/cities)

**Purpose:** Track and manage expansion into new cities and neighborhoods.

```
┌──────────────────────────────────────────────────────────────────────┐
│  City Rollout                                        [+ Add City]    │
│  1 live city · 2 in preparation · 0 scheduled                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ● CHICAGO, IL  ·  LIVE SINCE: March 28, 2026                        │
│                                                                      │
│  NEIGHBORHOODS (25 total · 18 with content)                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Neighborhood     Businesses  Events  Users  Health   Actions  │   │
│  │ ─────────────────────────────────────────────────────────── │   │
│  │ ● West Ridge     47          8       234    ████ 92%          │   │
│  │ ● Devon Ave      34          12      187    ████ 88%          │   │
│  │ ● Rogers Park    12          3       45     ███  61%          │   │
│  │ ○ Bridgeview     3           0       12     ██   31%          │   │
│  │ ○ Oak Lawn       2           0       8      █    18%          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  LAUNCH READINESS CHECKLIST — Chicago, IL                           │
│  ✓ City record created with bounding box                            │
│  ✓ 25 neighborhoods seeded with centroids                           │
│  ✓ 40+ active business listings                                     │
│  ✓ 3+ upcoming events                                               │
│  ✓ Featured slots assigned (4/6)                                    │
│  ✗ Seed data: Bridgeview neighborhood (only 3 listings)             │
│  ✗ Featured slot 4 empty (Explore header)                           │
│  [View full checklist]                                               │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  ○ SKOKIE, IL  ·  STATUS: IN PREPARATION                            │
│                                                                      │
│  Launch readiness: ██░░░░ 34%                                       │
│  Blockers: No businesses seeded · No featured assigned              │
│  Estimated ready: 3 weeks at current pace                           │
│  [View checklist]  [Activate when ready]                            │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**City Health Score algorithm (admin-facing metric):**
```
Health Score = (
  business_count_score +    // 0-30 pts: 30pts for 40+ businesses
  events_score +            // 0-20 pts: 20pts for 5+ events this week
  content_freshness_score + // 0-20 pts: 20pts if avg content < 3d old
  user_engagement_score +   // 0-20 pts: 20pts if D7 retention > 30%
  featured_slots_score      // 0-10 pts: 10pts if all 6 slots filled
) / 100
```

**Neighborhood activation toggle:** Each neighborhood can be toggled off (hides from neighborhood picker in app without deleting data — useful for soft-launching one area at a time).

---

### Page 12: Analytics (/analytics)

**Purpose:** Platform health metrics that inform product decisions and prove MVP goals.

#### Analytics Home

```
┌──────────────────────────────────────────────────────────────────────┐
│  Analytics                    [Last 7 days ▾]  [Export CSV]          │
├──────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │
│  │  DAU       │  │  D7 RET.   │  │  SESSIONS  │  │  SHARES    │    │
│  │  247       │  │  34%       │  │  3.2 /wk   │  │  87        │    │
│  │  ↑ 12%    │  │  ↑ 2pp    │  │  ↑ 0.4     │  │  ↑ 23%    │    │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘    │
│                                                                      │
│  DAILY ACTIVE USERS (7 days)                                        │
│  300│        ▂▃▄▅▆▇█                                                │
│  200│    ▂▃▄                                                         │
│  100│▂▃▄                                                             │
│     └────────────────────────────────────                           │
│      Mon Tue Wed Thu Fri  Sat  Sun                                   │
│                                                                      │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐  │
│  │  SCREEN ENGAGEMENT           │  │  CONTENT PERFORMANCE         │  │
│  │  Feed:    68% of sessions    │  │  Cards tapped:  1,247        │  │
│  │  Map:     41% of sessions    │  │  Saves:         234          │  │
│  │  Explore: 34% of sessions    │  │  Leads sent:    48           │  │
│  │  Create:  8% of sessions     │  │  Calls made:    91           │  │
│  └──────────────────────────────┘  └──────────────────────────────┘  │
│                                                                      │
│  ACQUISITION FUNNEL                                                  │
│  Installed:    1,240  ────────────────────────────────── 100%        │
│  Opened:       1,104  ───────────────────────────────── 89%         │
│  Onboarded:    897    ──────────────────────────────── 72%          │
│  Location set: 743    ─────────────────────────────── 60%           │
│  D1 return:    521    ────────────────────────────── 42%            │
│  D7 return:    421    ─────────────────────────── 34%              │
│  D30 return:   248    ──────────────────────── 20%                  │
└──────────────────────────────────────────────────────────────────────┘
```

#### Analytics Sub-pages

**Retention (/analytics/retention):**
```
- D1 / D7 / D30 cohort table (weekly cohorts)
- Retention by onboarding step (did they set location? set name?)
- Retention by acquisition source (push notification, organic, share link)
- "Notification impact" — users who receive push have X% higher D7 retention
- Session frequency histogram: 1x / 2-3x / 4-7x / 7+ times per week
```

**Content Performance (/analytics/content):**
```
- Top 10 most-tapped businesses this week
- Top 10 most-saved events
- Category breakdown: which feed category drives most saves
- Daily special impact: businesses with daily specials vs without (session click comparison)
- Featured slot ROI: views/saves on featured vs non-featured slots
- Post engagement: which post types get reported vs engaged with
```

**Geographic (/analytics/geo):**
```
- Heatmap of user locations (admin-only, aggregated not individual)
- Content coverage gaps: neighborhoods with users but few listings
- "Opportunity zones" — high user density, low content count
- Distance distribution: how far users are from content they tap
```

---

### Page 13: Reports (/reports)

**Purpose:** Downloadable operational reports for founder decision-making.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Reports                                                             │
├──────────────────────────────────────────────────────────────────────┤
│  WEEKLY OPERATIONS                                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 📊 Weekly Platform Summary    Last run: Apr 20, 2026 [Run]   │   │
│  │    New users, new listings, events, leads, approvals         │   │
│  │    Format: PDF + CSV  [Download →]                           │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │ 📊 Business Activity Report   [Configure] [Run Now]          │   │
│  │    Views, saves, leads per business · Export for biz owners  │   │
│  │    Format: CSV  [Download →]                                 │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │ 📊 Moderation Log              [Configure] [Run Now]         │   │
│  │    All approvals/rejections/removals with reasons            │   │
│  │    Format: CSV  [Download →]                                 │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │ 📊 Retention Cohort Report    [Configure] [Run Now]          │   │
│  │    D1/D7/D30 by week of signup                               │   │
│  │    Format: CSV  [Download →]                                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  BUSINESS OWNER SUMMARIES                                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Send weekly summary to all business owners (WhatsApp CSV)    │   │
│  │ Columns: Business, Views, Saves, Leads, Calls this week      │   │
│  │                                                               │   │
│  │ [Generate summary for all businesses]  [Download WhatsApp    │   │
│  │  message templates with per-business stats]                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

**Business Owner Summary (the "manual analytics" for MVP):**
Since the mobile app doesn't have a business analytics screen in MVP, this page generates the weekly stats CSV that the founder sends to each business owner via WhatsApp. Each row is one business with that week's views/saves/leads/calls. This is a core retention tool — businesses stay active when they see their stats.

---

### Page 14: Settings (/settings)

#### Team & Roles (/settings/team)

```
┌──────────────────────────────────────────────────────────────────────┐
│  Team Members                                    [+ Invite Member]   │
├──────────────────────────────────────────────────────────────────────┤
│  Name            Email                Role         Last Active       │
│  Atif Mumtaz     atif@muzgram.com     super_admin  Now               │
│  [Pending]       volunteer@...        moderator    Invited Apr 19    │
│  ─────────────────────────────────────────────────────────────────   │
│                                                                      │
│  ROLE CAPABILITIES                                                   │
│  See full matrix below (section 4)                                   │
└──────────────────────────────────────────────────────────────────────┘
```

#### Audit Log (/settings/audit)

```
Searchable, filterable timeline of every admin action:

2026-04-21 12:42  atif@muzgram.com  APPROVED business "Maryam Bakery"
2026-04-21 12:38  atif@muzgram.com  REJECTED post #483 (spam)
2026-04-21 11:20  atif@muzgram.com  FEATURED business "Noon O Kabab" in Slot 1
2026-04-20 09:15  atif@muzgram.com  SUSPENDED user 847 (reason: spam posts)
2026-04-20 08:44  atif@muzgram.com  EXTENDED featured slot 2 by 7 days
...

Filters: By admin user · By action type · By date range
Export: CSV
Retention: Permanent (never purged)
```

---

## 4. Roles and Permissions

### Role Hierarchy

```
super_admin  →  admin  →  moderator  →  business_owner  →  user
```

Each role inherits the capabilities of the role below it, plus additional capabilities.

### Full Permissions Matrix

| Capability | user | business_owner | moderator | admin | super_admin |
|---|:---:|:---:|:---:|:---:|:---:|
| View admin dashboard | — | — | ✓ | ✓ | ✓ |
| View approval queue | — | — | ✓ | ✓ | ✓ |
| Approve/reject businesses | — | — | ✓ | ✓ | ✓ |
| Approve/reject events | — | — | ✓ | ✓ | ✓ |
| Approve/reject posts | — | — | ✓ | ✓ | ✓ |
| Approve business claims | — | — | ✓ | ✓ | ✓ |
| View flagged content | — | — | ✓ | ✓ | ✓ |
| Remove flagged content | — | — | ✓ | ✓ | ✓ |
| Suspend users (temp) | — | — | ✓ | ✓ | ✓ |
| View all users | — | — | — | ✓ | ✓ |
| Change user roles | — | — | — | ✓* | ✓ |
| Permanent suspension | — | — | — | ✓ | ✓ |
| Manage featured slots | — | — | — | ✓ | ✓ |
| Edit any business | — | — | — | ✓ | ✓ |
| Soft-delete content | — | — | — | ✓ | ✓ |
| View analytics | — | — | — | ✓ | ✓ |
| Export data | — | — | — | ✓ | ✓ |
| Manage cities / neighborhoods | — | — | — | ✓ | ✓ |
| Invite team members | — | — | — | — | ✓ |
| Assign admin/moderator roles | — | — | — | — | ✓ |
| Hard-delete content | — | — | — | — | ✓ |
| View audit log | — | — | — | — | ✓ |
| Manage API keys | — | — | — | — | ✓ |
| View support tickets | — | — | ✓ | ✓ | ✓ |
| Reply to support tickets | — | — | ✓ | ✓ | ✓ |
| Verify halal certifications | — | — | — | ✓ | ✓ |

**Notes:**
- `*` Admin can change roles to: `user`, `business_owner`. Cannot assign `admin` or `super_admin` (super_admin only).
- Moderator role verified from DB row on every request — not from JWT claim. Even if JWT is compromised, role is re-read from DB.
- `super_admin` cannot be demoted by another `super_admin` (must be done directly in DB).

### Role Assignment in Practice (MVP)

```
Atif Mumtaz (founder):           super_admin
1 part-time volunteer (if any):  moderator
Anchor business owners:          business_owner (auto-assigned on claim approval)
All other users:                 user (default)
```

---

## 5. Moderation Tools

### Moderation Philosophy

> **Default: human review.** Automation assists but never auto-removes without admin confirmation.
> Exception: auto-suspend on ≥5 reports (listing removed, admin creates task).

### Tool 1: Approval Queue SLA Tracking

Every queue item has a running timer. Color-coded urgency:

```typescript
const getUrgencyLevel = (submittedAt: Date, type: ContentType): UrgencyLevel => {
  const ageHours = (Date.now() - submittedAt.getTime()) / 3600000;
  const slaHours = { business: 4, event: 1, post: 1, claim: 24 }[type];
  if (ageHours > slaHours) return 'critical';    // SLA breached — red
  if (ageHours > slaHours * 0.75) return 'warning'; // 75% of SLA — amber
  return 'normal';                                // within SLA — no color
};
```

A daily digest email (to admin) fires at 9am if any items have been pending > 2× their SLA.

### Tool 2: Duplicate Detection

When a business is submitted, the system runs a similarity check:
1. Fuzzy name match (`pg_trgm` trigram similarity ≥ 0.6) against existing businesses
2. Distance check: same address or within 50 meters
3. Result shown in approval queue as: `⚠ Possible duplicate: "Maryam Sweets" (0.3 mi away)`
4. Admin sees a `[View both]` button to compare before approving

```sql
SELECT id, name, address, similarity(name, $input_name) AS sim
FROM businesses
WHERE similarity(name, $input_name) > 0.6
   OR ST_DWithin(location, ST_MakePoint($lng, $lat)::geography, 100)
ORDER BY sim DESC
LIMIT 5;
```

### Tool 3: Auto-Flag Rules Engine

Configurable in `/settings/moderation` (super_admin only):

| Rule | Trigger | Action |
|---|---|---|
| Report threshold | ≥5 reports on same item | Auto-suspend listing + create admin task |
| Keyword filter | Post contains blocklist terms | Flag for review (not auto-remove) |
| Velocity limit | >5 posts in 1 hour from one user | Rate limit + flag to admin |
| Spam pattern | Same user submits >3 businesses in 24h | Flag all 3 for review |
| Halal claim risk | New business claims IFANCA cert without cert upload | Downgrade to "self-declared" + flag |

**Keyword blocklist (seeded defaults):**
- Social media handles/links (instagram.com, tiktok.com, @username patterns)
- Promotional pricing language ("DM for price", "cash only, no receipt")
- Competition references ("better than Yelp", "unlike Google Maps")

### Tool 4: Bulk Moderation

For high-volume events (e.g., Ramadan — 30+ event submissions in one day):

1. Select all pending events of a type
2. Review thumbnails in a grid view (not list)
3. Bulk-approve clearly good ones in one click
4. Flag questionable ones individually
5. Bulk-reject clearly spam ones with shared reason

Grid view:
```
[img title ✓✗] [img title ✓✗] [img title ✓✗]
[img title ✓✗] [img title ✓✗] [img title ✓✗]
[Approve selected (4)]  [Reject selected (1)]
```

### Tool 5: Content Health Score (per listing)

Shown on business detail page and business table:

```
Health Score: 87/100  ████████░░

Breakdown:
  ✓ Has 5+ photos           (+20)
  ✓ Has complete hours      (+20)
  ✓ Has phone number        (+15)
  ✓ Has description         (+15)
  ✓ Has halal status set    (+10)
  ✗ No website              (0/7)
  ✗ No Instagram            (0/7)
  ✓ Recently updated        (+6)

Suggestions:
  → Add website URL to improve search discoverability
  → Add Instagram handle for social proof
```

Score used in: admin table sorting (low-health listings surfaced), nudge emails to business owners in MMP.

### Tool 6: Soft Delete + Undo Window

All admin deletions are soft-delete with a 24-hour undo window:

```
[🗑 Deleted]  "Noon O Kabab has been removed from the feed."
              [↩ Undo within 24 hours]  ← visible in audit log
```

After 24 hours: record stays soft-deleted. Never hard-deleted unless `super_admin` explicitly chooses "Permanently delete" from the audit log.

### Tool 7: Moderator Notes

Any queue item or content piece can have internal admin notes attached:

```
ADMIN NOTES (visible to admin team only)
─────────────────────────────────────────
Apr 20, 12:42  Atif: "Called business, confirmed halal cert expires Dec 2026.
               Certificate upload requested."
Apr 21, 09:15  Atif: "Still no cert uploaded. Sending reminder."

[+ Add note]
```

These notes are NOT visible to the content submitter. Used for team coordination and audit trail.

---

## 6. Analytics Views

### Key Metrics Per Page

**Command Center (real-time):**
- Pending approvals count (live)
- New users in last 24h
- Active users right now (proxy: sessions started in last 30 minutes)
- Open businesses right now in West Ridge
- Events happening today

**Platform Health (weekly):**

| Metric | MVP Target | How Measured |
|---|---|---|
| D7 retention | ≥ 35% | `analytics_sessions` cohort analysis |
| D30 retention | ≥ 20% | Same |
| Sessions/week/user | ≥ 3 | Total sessions ÷ active users |
| Session length | ≥ 3 min | `analytics_sessions.duration` |
| Map tab usage | ≥ 40% of sessions | `analytics_events` `view_screen:map` |
| WhatsApp shares | ≥ 100 total | `analytics_events` `tap_share:whatsapp` |
| Card saves | ≥ 200 total | `saves` table count |

**Content Performance:**

```
Top Businesses by engagement score:
  Score = (views × 1) + (saves × 5) + (calls × 8) + (leads × 10) + (shares × 3)

  1. Noon O Kabab                 Score: 1,847
  2. Maryam Bakery & Café         Score: 1,234
  3. Chicago Muslim Finance       Score: 987
  ...

Top Events by saves:
  1. Eid Bazaar 2026              47 saves
  2. Halal Food Fair              34 saves
  ...

Category performance:
  Food:      68% of card taps
  Events:    21% of card taps
  Services:  8% of card taps
  Community: 3% of card taps
```

**Acquisition Sources:**

```
How users found the app:
  WhatsApp share link:   34%
  App Store organic:     28%
  Push notification:     19%
  Direct/unknown:        19%

Track via: utm_source in deep link schema
muzgram://? utm_source=whatsapp&utm_medium=share&utm_content=business_noon-o-kabab
```

**Revenue (manual tracking, pre-Stripe):**

```
Paying businesses:       5 of 134 (3.7%)
Featured slot revenue:   $225/week (3 × $75)
Boosted events:          $75 (3 × $25)
Founding members:        $495 (5 × $99)
──────────────────────────────────────────
Monthly equivalent:      ~$1,395

Target: $500/month by Day 30
Current: $1,395  ✓ 2.8× target
```

---

## 7. Operational Tools Needed Before Launch

These are non-negotiable for Day 1 operations. Without them, the launch will be chaotic.

### Pre-Launch Operational Checklist

#### Content Operations
- [ ] **Approval queue fully functional** — operator can approve/reject without touching the database
- [ ] **Bulk approval** — for seeding 25+ businesses before launch without approving one-by-one
- [ ] **Featured slot manager** — all 6 slots assigned before first user opens the app
- [ ] **Seed data tool** — admin can create businesses directly (bypasses approval queue) for seed data entry
- [ ] **Hours copy tool** — "Copy Mon hours to Tue-Fri" (essential for bulk seeding 25 businesses)
- [ ] **Re-geocode button** — admin can trigger re-geocoding if lat/lng is wrong
- [ ] **Halal status bulk update** — CSV import for setting halal status on multiple businesses at once

#### User Operations
- [ ] **Test account management** — admin can create test users and reset their state
- [ ] **Push notification test tool** — send a test push to any phone number before launch
- [ ] **OTP bypass** (dev mode only) — use a fixed OTP code for testing without burning SMS credits

#### Content Quality
- [ ] **Live preview** — admin can see exactly how any business/event looks in the mobile app before approving
- [ ] **"View as user" mode** — admin logs in as any user to debug their specific feed/experience
- [ ] **Feed preview** — shows the actual Now feed for a given lat/lng (preview what West Ridge users will see)

#### Monitoring
- [ ] **Sentry integrated** — first crash must be caught before users report it
- [ ] **Health check page** — `/health` shows DB connection, Redis connection, queue depths
- [ ] **Queue depth alert** — notification to admin if approval queue > 10 items for > 2 hours
- [ ] **SLA breach alert** — email/Slack if any queue item exceeds SLA threshold

#### Launch Readiness Checklist (in admin dashboard)
A dedicated `/launch-readiness` page (visible to super_admin only) that shows:

```
┌──────────────────────────────────────────────────────────────────────┐
│  Launch Readiness — Chicago, IL                       87% ready      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  CONTENT  ───────────────────────────────────────────               │
│  ✓ 25+ active businesses (47 ✓)                                     │
│  ✓ 3+ upcoming events (8 ✓)                                         │
│  ✓ 5+ community posts (12 ✓)                                        │
│  ✗ 6/6 featured slots assigned (4/6 — 2 empty)                     │
│                                                                      │
│  INFRASTRUCTURE  ──────────────────────────────────────             │
│  ✓ Database healthy                                                  │
│  ✓ Redis connected                                                   │
│  ✓ R2 media storage operational                                      │
│  ✓ Push notification service operational                             │
│  ✓ Clerk auth operational                                            │
│  ✗ Sentry error tracking not configured                             │
│                                                                      │
│  LEGAL  ───────────────────────────────────────────────             │
│  ✓ Privacy policy published                                          │
│  ✓ Terms of service published                                        │
│  ✗ Business listing disclaimer visible on app store listing         │
│                                                                      │
│  OPERATIONS  ──────────────────────────────────────────             │
│  ✓ Admin account configured (super_admin role)                      │
│  ✓ Approval queue operational                                        │
│  ✗ Business owner onboarding email drafted                          │
│  ✗ Week-1 support response templates ready                          │
│                                                                      │
│  BLOCKERS TO FIX (3 items)                                          │
│  [→ Assign featured slots]  [→ Configure Sentry]  [→ Write emails] │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 8. What Can Wait Until MMP

These are designed but intentionally deferred. Do not build in MVP sprint.

### Deferred Features — Admin Dashboard

| Feature | Reason to defer | MMP trigger |
|---|---|---|
| **Stripe payment management** | No Stripe in MVP; revenue is manual | When first business pays online |
| **Promoted listings self-serve** | Admin-managed in MVP via Featured page | When >20 businesses want featured slots |
| **Business analytics dashboard (in-app)** | Admin sends manual WhatsApp summary | When businesses ask for self-serve stats |
| **Automated content moderation (AI)** | Volume doesn't justify it yet | When queue > 50/day |
| **In-app notification center management** | Basic push sufficient for MVP | When notification types > 8 |
| **Advanced fraud detection** | No fraud vectors at scale 1 | When user base > 5K |
| **Multi-admin collaborative tools** | Single operator for MVP | When team > 3 people |
| **Scheduled content publishing** | Immediate publish sufficient | When businesses want to schedule posts |
| **A/B test management** | No need before product-market fit | After D30 retention > 25% consistently |
| **City comparison analytics** | One city only in MVP | When 2nd city launches |
| **Revenue dashboard (Stripe)** | Manual revenue tracking in MVP | When Stripe is integrated |
| **Email/WhatsApp notification from admin** | Manual outreach for MVP | When >100 active businesses |
| **Automated business owner weekly digest** | Admin generates manually + sends via WA | When >50 businesses |
| **Import: Services-specific sheet** | Businesses sheet handles services in MVP | When service lead volume > 20/week |
| **Import: User bulk invite** | Phone OTP means no bulk invite needed | When referral program is built |
| **Support ticket SLA tracking** | No SLA commitment in MVP | When support > 10 tickets/week |
| **Admin mobile app** | Web dashboard is sufficient for MVP | When remote moderation is needed |
| **Webhook management UI** | No external integrations in MVP | When first third-party integrates |
| **Data export scheduler** | Ad-hoc export is sufficient | When investors request regular data |
| **Ramadan Mode control panel** | Hardcoded activation in MVP | When Ramadan Mode is built (MMP) |
| **Campaign Engine UI** | No campaigns in MVP | When Campaign Engine is built |
| **Comments/likes moderation queue** | No comments in MVP | When comments are built (MMP) |

### MMP Analytics Additions (not built in MVP)

```
Phase 2 analytics to build:
- Funnel analysis (custom path tracking)
- Cohort analysis by acquisition source
- Business owner self-serve analytics page (in mobile app)
- Revenue attribution per feature
- Push notification performance (open rate, click-through by type)
- Search query analytics (zero-result queries)
- Recommendation engine inputs (what users tap after tapping a category)
- User lifetime value calculation
- Churn prediction model (users with declining engagement)
```

---

### Page 15: Data Import Manager (/import)

**Purpose:** Load entire cities, neighborhoods, and business catalogs directly into the database from a spreadsheet-style grid — no CSV file upload required, no database client needed, no developer on standby. Built for a non-technical founder to seed a new city in an afternoon.

**Philosophy:** Works exactly like Google Sheets. Paste from Excel. Type into cells. Dropdown columns auto-validate. Red cells = problems. Green button = import. The system handles geocoding, slug generation, and all the database plumbing.

---

#### Hub Page (/import)

```
┌──────────────────────────────────────────────────────────────────────┐
│  Data Import                              [Import History] [Help]    │
│  Paste data directly into the grid or download a template to start   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  SELECT WHAT TO IMPORT                                               │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  🏙️  Cities        │  │  📍 Neighborhoods │  │  🏪 Businesses   │  │
│  │                  │  │                  │  │                  │  │
│  │  Add new cities  │  │  Add areas to    │  │  Bulk import     │  │
│  │  Chicago, Skokie │  │  existing cities │  │  business data   │  │
│  │  Bridgeview...   │  │  with centroids  │  │  any category    │  │
│  │                  │  │                  │  │                  │  │
│  │  [Open Sheet →]  │  │  [Open Sheet →]  │  │  [Open Sheet →]  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  🍽️  Restaurants   │  │  📅 Events        │  │  🕌 Mosques       │  │
│  │                  │  │                  │  │                  │  │
│  │  Halal food      │  │  Bulk event      │  │  Masjids with    │  │
│  │  listings with   │  │  calendar import │  │  Jummah times    │  │
│  │  hours + halal   │  │  from organizer  │  │  and prayer      │  │
│  │  status built in │  │  spreadsheets    │  │  schedules       │  │
│  │                  │  │                  │  │                  │  │
│  │  [Open Sheet →]  │  │  [Open Sheet →]  │  │  [Open Sheet →]  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                      │
│  RECENT IMPORTS                                                      │
│  ✓ Apr 21  Businesses  47 rows imported  Chicago, IL    [Undo]      │
│  ✓ Apr 20  Restaurants 12 rows imported  Devon Ave      [Undo]      │
│  ✓ Apr 19  Cities       1 row  imported  Chicago, IL    [—]         │
│  ✗ Apr 18  Events       3 rows failed    See errors     [Retry]     │
└──────────────────────────────────────────────────────────────────────┘
```

---

#### Spreadsheet Grid — Core Design

The grid is built on **AG Grid Community v33** — a free, battle-tested Excel-like grid that handles 10,000+ rows without virtualization problems.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Import: Businesses                           Chicago, IL            │
│  47 rows · 0 errors · Ready to import                               │
├──────────────────────────────────────────────────────────────────────┤
│  [📥 Download Template] [📋 Paste from Excel] [+ Add 10 rows]       │
│  [📁 Upload .xlsx / .csv]                      [✓ Validate] [Import]│
├──────────────────────────────────────────────────────────────────────┤
│ #  │ Name*         │ Category*  │ Sub-cat*   │ Address*          │.. │
├────┼───────────────┼────────────┼────────────┼───────────────────┼───┤
│  1 │ Noon O Kabab  │ Food ▾     │ Restaurant▾│ 4601 N Kedzie Ave │.. │
│  2 │ Maryam Bakery │ Food ▾     │ Bakery   ▾ │ 2847 W Devon Ave  │.. │
│  3 │               │            │            │                   │   │
│  4 │               │            │            │                   │   │
│  5 │               │            │            │                   │   │
│ .. │               │            │            │                   │   │
│ 25 │               │            │            │                   │   │
├────┴───────────────┴────────────┴────────────┴───────────────────┴───┤
│  [Add 25 more rows]  [25 ▾]                                          │
├──────────────────────────────────────────────────────────────────────┤
│  * = required field     ▾ = dropdown column    Red = validation error│
└──────────────────────────────────────────────────────────────────────┘
```

**Grid behavior:**
- **Click any cell** → edit in-place (no modal, no form)
- **Tab** → move to next cell
- **Enter** → move to cell below
- **Ctrl+V / ⌘V** → paste from Excel/Google Sheets (multi-cell paste works)
- **Delete / Backspace** → clear selected cells
- **Ctrl+Z** → undo last cell edit (local, not DB)
- **Ctrl+D** → fill down (copy value from cell above into selection)
- **Click row number** → select entire row
- **Shift+Click** → multi-row select
- **Right-click** → context menu: Delete Row, Insert Row Above, Duplicate Row
- **Drag row handle** → reorder rows

---

#### Sheet 1: Cities (/import/cities)

**Columns:**

| Column | Type | Required | Validation | Notes |
|---|---|---|---|---|
| Name | Text | ✓ | Min 2 chars | "Chicago", "Skokie" |
| State | Dropdown | ✓ | US states list | "IL", "IN" |
| Country | Auto | — | Auto-filled: "US" | |
| Latitude | Number | ✓ | Range: 24–50 | City center lat |
| Longitude | Number | ✓ | Range: -130 to -60 | City center lng |
| Timezone | Dropdown | ✓ | IANA tz list | "America/Chicago" |
| Bounding Box SW Lat | Number | ✓ | City boundary | |
| Bounding Box SW Lng | Number | ✓ | City boundary | |
| Bounding Box NE Lat | Number | ✓ | City boundary | |
| Bounding Box NE Lng | Number | ✓ | City boundary | |
| Is Active | Toggle | ✓ | true/false | false = hidden from app |
| Notes | Text | — | Internal only | Not shown in app |

**Visual:**
```
┌────┬─────────────┬───────┬────────────┬──────────┬──────────┬──────────────────┬────────┐
│ #  │ Name*       │ State*│ Timezone*  │ Lat*     │ Lng*     │ BBox (SW→NE)*    │ Active │
├────┼─────────────┼───────┼────────────┼──────────┼──────────┼──────────────────┼────────┤
│  1 │ Chicago     │ IL ▾  │ Amer/Chi ▾ │ 41.8781  │ -87.6298 │ 41.64,-87.94 →  │ ✓ Yes ▾│
│    │             │       │            │          │          │ 42.02,-87.52     │        │
├────┼─────────────┼───────┼────────────┼──────────┼──────────┼──────────────────┼────────┤
│  2 │ Skokie      │ IL ▾  │ Amer/Chi ▾ │          │          │                  │        │
│  3 │             │       │            │          │          │                  │        │
└────┴─────────────┴───────┴────────────┴──────────┴──────────┴──────────────────┴────────┘
```

**Smart helper:** "Lookup coordinates" button — type city name → auto-fills lat/lng and bounding box via Mapbox Geocoding API. Admin just types city name, clicks lookup, done.

---

#### Sheet 2: Neighborhoods (/import/neighborhoods)

| Column | Type | Required | Validation | Notes |
|---|---|---|---|---|
| City | Dropdown | ✓ | Existing cities | Auto-populated from Cities table |
| Name | Text | ✓ | Min 2 chars | "West Ridge", "Devon Ave" |
| Latitude | Number | ✓ | Centroid lat | |
| Longitude | Number | ✓ | Centroid lng | |
| Display Order | Number | — | 1–999 | Order in neighborhood picker |
| Is Active | Toggle | ✓ | true/false | |
| Notes | Text | — | — | Internal |

**Smart helper:** "Lookup centroid" — type neighborhood name + city → auto-fills lat/lng.

```
┌────┬──────────────┬──────────────┬──────────┬──────────┬───────┬────────┐
│ #  │ City*        │ Name*        │ Lat*     │ Lng*     │ Order │ Active │
├────┼──────────────┼──────────────┼──────────┼──────────┼───────┼────────┤
│  1 │ Chicago ▾    │ West Ridge   │ 41.9742  │ -87.7083 │ 1     │ ✓ Yes ▾│
│  2 │ Chicago ▾    │ Rogers Park  │ 41.9981  │ -87.6672 │ 2     │ ✓ Yes ▾│
│  3 │ Chicago ▾    │ Edgewater    │ 41.9850  │ -87.6598 │ 3     │ ✓ Yes ▾│
│  4 │ Chicago ▾    │ Devon Ave    │ 41.9985  │ -87.7066 │ 4     │ ✓ Yes ▾│
│  5 │ Chicago ▾    │ Bridgeview   │ 41.7439  │ -87.8534 │ 5     │ ○ No  ▾│
│  6 │              │              │          │          │       │        │
└────┴──────────────┴──────────────┴──────────┴──────────┴───────┴────────┘
[Lookup centroid for selected rows]
```

---

#### Sheet 3: Businesses (/import/businesses)

The most important importer. Covers all business types except restaurants (which have extended halal fields).

| Column | Type | Required | Auto-fill | Notes |
|---|---|---|---|---|
| Name | Text | ✓ | — | |
| Category | Dropdown | ✓ | — | Food / Events / Services / Community |
| Sub-category | Dropdown | ✓ | — | Dependent on Category |
| Address | Text | ✓ | — | Full street address |
| City | Dropdown | ✓ | — | From Cities table |
| Neighborhood | Dropdown | — | ← auto from address | |
| Latitude | Number | — | ← auto-geocoded | Auto-filled on geocode |
| Longitude | Number | — | ← auto-geocoded | Auto-filled on geocode |
| Phone | Text | — | — | Format: (773) 555-0142 |
| Website | URL | — | — | |
| Instagram | Text | — | — | Handle only, no @ |
| Description | Text | — | — | Max 500 chars |
| Halal Status | Dropdown | — | Unknown | IFANCA/ISNA/Self-declared/Unknown |
| Status | Dropdown | ✓ | active | active/pending |
| Is Featured | Toggle | — | false | |
| Hours Mon | Text | — | — | "11:00-22:00" or "Closed" |
| Hours Tue | Text | — | — | |
| Hours Wed | Text | — | — | |
| Hours Thu | Text | — | — | |
| Hours Fri | Text | — | — | |
| Hours Sat | Text | — | — | |
| Hours Sun | Text | — | — | "Closed" |
| Notes | Text | — | — | Internal, not shown in app |

**Visual (scrollable columns):**
```
┌────┬───────────────┬────────┬──────────┬──────────────────┬──────────┬───────┬──────────────┬────────┬─────────
│ #  │ Name*         │ Cat.*  │ Sub-cat* │ Address*         │ City*    │ Phone │ Halal Status │ Status │ Hours Mo
├────┼───────────────┼────────┼──────────┼──────────────────┼──────────┼───────┼──────────────┼────────┼─────────
│  1 │ Noon O Kabab  │ Food ▾ │ Rest.  ▾ │ 4601 N Kedzie    │ Chicago▾ │(773)..│ IFANCA     ▾ │ active▾│ 11:00-22
│  2 │ Maryam Bakery │ Food ▾ │ Bakery ▾ │ 2847 W Devon Ave │ Chicago▾ │(773)..│ Self-decl  ▾ │ active▾│ 07:00-21
│  3 │ Chicago Muslim│ Serv. ▾│ Finance▾ │ 3247 W Devon Ave │ Chicago▾ │       │ —          ▾ │ active▾│ 09:00-17
│  4 │               │        │          │                   │          │       │              │        │
└────┴───────────────┴────────┴──────────┴──────────────────┴──────────┴───────┴──────────────┴────────┴─────────
◄──────────────────────────────────────────────────────────────────────────────── scroll ──────────────────────►
```

**Smart features:**
- **[Geocode All]** button — geocodes all rows with addresses, auto-fills Lat/Lng + Neighborhood
- **[Validate All]** button — highlights invalid cells red before import
- **Hours format helper** — hover on Hours column header → tooltip: "Format: HH:MM-HH:MM or 'Closed'"
- **Duplicate detection** — if Name + Address match an existing business → row highlighted amber + "Possible duplicate" tooltip

---

#### Sheet 4: Restaurants (/import/restaurants)

Extended version of Businesses sheet, pre-filtered to Food category, with halal-specific and hours fields surfaced prominently (since restaurants always need them).

**Additional columns beyond Businesses:**

| Column | Type | Required | Notes |
|---|---|---|---|
| Cuisine | Dropdown | ✓ | Pakistani, Lebanese, Afghan, Indian, Egyptian, Turkish, American, Persian, Chinese, Other |
| Halal Cert Ref | Text | — | Certificate number e.g. "IFA-CHI-2024-0847" |
| Halal Cert Expiry | Date | — | Date picker |
| Daily Special | Text | — | Pre-load a daily special (optional) |
| Price Range | Dropdown | — | $ / $$ / $$$ |
| Accepts Cash Only | Toggle | — | Shows disclaimer on profile |
| Delivery Available | Toggle | — | |
| Dine In | Toggle | — | |
| Takeaway | Toggle | — | |

```
┌────┬──────────────┬────────────┬───────────┬──────────────────┬──────────────┬───────────────┬───────────┐
│ #  │ Name*        │ Cuisine*   │ Halal*    │ Address*         │ Phone        │ Hours Mon-Sun │ Featured  │
├────┼──────────────┼────────────┼───────────┼──────────────────┼──────────────┼───────────────┼───────────┤
│  1 │ Noon O Kabab │ Afghan   ▾ │ IFANCA  ▾ │ 4601 N Kedzie    │ (773)555-014 │ 11-22 all wk  │ ✓ Yes     │
│  2 │ Maryam Bak.  │ Lebanese ▾ │ Self-d. ▾ │ 2847 W Devon     │ (773)555-028 │ 7-21 / Closed │           │
│  3 │ Patel Bros.  │ Indian   ▾ │ ISNA    ▾ │ 2610 W Devon     │ (773)555-034 │ 9-21 daily    │           │
│  4 │ Sabri Nihari │ Pakistani▾ │ IFANCA  ▾ │ 2502 W Devon     │ (773)555-019 │ 12-24 daily   │ ✓ Yes     │
│  5 │              │            │           │                   │              │               │           │
└────┴──────────────┴────────────┴───────────┴──────────────────┴──────────────┴───────────────┴───────────┘
```

**Hours shortcut column:** Instead of 7 separate day columns, a single "Hours" column accepts a pattern:
```
"11:00-22:00"           → applies Mon-Sun
"11:00-22:00 / Closed"  → Mon-Sat 11-22, Sun Closed
"Mon-Fri 11-22, Sat-Sun 10-23"
"Closed"                → all days closed
```
Parser handles these patterns automatically. If the pattern is ambiguous, cell turns amber and shows "Verify hours manually."

---

#### Sheet 5: Events (/import/events)

Built for importing event calendars from organizers (they send a spreadsheet, admin pastes it in).

| Column | Type | Required | Notes |
|---|---|---|---|
| Title | Text | ✓ | Max 120 chars |
| Category | Dropdown | ✓ | Religious / Community / Food / Family / Education / Sports |
| Date | Date | ✓ | Date picker or type MM/DD/YYYY |
| Start Time | Time | ✓ | Type HH:MM AM/PM |
| End Time | Time | — | |
| Venue Name | Text | — | |
| Address | Text | ✓ | Full address |
| City | Dropdown | ✓ | |
| Is Free | Toggle | ✓ | |
| Price Label | Text | — | Required if Is Free = false |
| Description | Text | — | Max 500 chars |
| External Link | URL | — | RSVP / Eventbrite link |
| Organizer Name | Text | — | |
| Organizer Phone | Text | — | |
| Status | Dropdown | ✓ | active (skip queue) / pending (goes to queue) |
| Is Featured | Toggle | — | |

```
┌────┬──────────────────────┬───────────┬────────────┬───────┬──────────────────┬──────┬────────┐
│ #  │ Title*               │ Category* │ Date*      │ Time* │ Address*         │ Free │ Status │
├────┼──────────────────────┼───────────┼────────────┼───────┼──────────────────┼──────┼────────┤
│  1 │ Eid Bazaar 2026      │ Community▾│ 04/28/2026 │ 11 AM │ 5801 N Pulaski   │ ✓ ▾  │ active▾│
│  2 │ Quran Study Circle   │ Religious▾│ 04/22/2026 │  7 PM │ 6349 N Kedzie    │ ✓ ▾  │ active▾│
│  3 │ Halal Food Fair      │ Food     ▾│ 05/03/2026 │ 12 PM │ 2400 W Devon     │ ✗ ▾  │ active▾│
│  4 │ Muslim Youth Summit  │ Education▾│ 05/10/2026 │ 10 AM │ 2625 W Peterson  │ ✓ ▾  │ pending│
│  5 │                      │           │            │       │                  │      │        │
└────┴──────────────────────┴───────────┴────────────┴───────┴──────────────────┴──────┴────────┘
```

**Paste-from-organizer mode:** Many event organizers send a standard spreadsheet. Docs can provide a downloadable template with instructions to share with organizers: "Fill in the green columns and email it back."

---

#### Sheet 6: Mosques (/import/mosques)

| Column | Type | Required | Notes |
|---|---|---|---|
| Name | Text | ✓ | |
| Also Known As | Text | — | Common name / abbreviation |
| Address | Text | ✓ | |
| City | Dropdown | ✓ | |
| Phone | Text | — | |
| Website | URL | — | |
| Jummah 1 Time | Time | ✓ | First Khutbah |
| Jummah 2 Time | Time | — | Second Khutbah (if any) |
| Jummah 3 Time | Time | — | Third Khutbah (if any) |
| Jummah Language | Dropdown | — | English / Arabic / Urdu / Bengali / Somali / Mixed |
| Parking Notes | Text | — | "Street parking only", "Lot available" |
| Capacity | Number | — | Approx. capacity |
| Is Active | Toggle | ✓ | |

```
┌────┬──────────────────────┬──────────────────┬──────────┬──────────┬──────────┬──────────────┐
│ #  │ Name*                │ Address*         │ City*    │ Jummah 1 │ Jummah 2 │ Jummah 3     │
├────┼──────────────────────┼──────────────────┼──────────┼──────────┼──────────┼──────────────┤
│  1 │ Masjid Al-Faatir     │ 7101 N Ridgeway  │ Chicago▾ │ 12:00 PM │ 1:00 PM  │ 2:00 PM      │
│  2 │ Islamic Fdn of W Rdg │ 7350 N Leavitt   │ Chicago▾ │ 12:30 PM │ 2:00 PM  │              │
│  3 │ MCC                  │ 8601 Menard      │ Chicago▾ │  1:00 PM │          │              │
│  4 │                      │                  │          │          │          │              │
└────┴──────────────────────┴──────────────────┴──────────┴──────────┴──────────┴──────────────┘
```

---

#### Import Workflow — Step by Step

Every sheet follows the same 4-step flow:

```
STEP 1: ENTER DATA
─────────────────
Enter rows directly in the grid
  OR paste from clipboard (Ctrl+V)
  OR upload .xlsx / .csv file

STEP 2: VALIDATE
─────────────────
Click [Validate All] — runs all rules:
  ✓ Required fields present
  ✓ Enums match dropdown options
  ✓ URLs are valid URLs
  ✓ Dates are not in the past (events)
  ✓ Lat/lng are valid coordinates
  ✓ No duplicate name+address combos
  ✓ Phone format valid

  Result: Red cells = errors. Amber cells = warnings.
  "3 errors · 2 warnings · 44 ready to import"

STEP 3: GEOCODE (businesses/restaurants/mosques)
─────────────────────────────────────────────────
Click [Geocode All Addresses]
  → Calls Mapbox Geocoding API for each row with an address
  → Auto-fills Lat, Lng, Neighborhood columns
  → Unresolved addresses turn amber (admin types manually)
  → Progress bar: "Geocoding 44 of 47..."

STEP 4: IMPORT
───────────────
Click [Import X rows] (only enabled when 0 errors)
  → Progress bar per row
  → Each row is a separate API POST (idempotent, X-Idempotency-Key per row)
  → Failures are retried once
  → Result: "44 imported · 3 failed (see errors)"
  → Failed rows stay in grid, highlighted red, with error reason
  → Success: "Import complete — 44 businesses are now live"
  → [Undo this import] link visible for 30 minutes
```

---

#### Validation Panel

When [Validate All] is clicked, a panel slides in below the grid:

```
┌──────────────────────────────────────────────────────────────────────┐
│  Validation Results                             ✗ 3 errors  ⚠ 2 warnings │
├──────────────────────────────────────────────────────────────────────┤
│  ERRORS (must fix before import)                                     │
│                                                                      │
│  ✗ Row 2, Column "Phone"                                            │
│    "(773) 555-028" — invalid format (expected 10 digits)            │
│    [Jump to cell]                                                    │
│                                                                      │
│  ✗ Row 5, Column "Address"                                          │
│    Required field is empty                                          │
│    [Jump to cell]                                                    │
│                                                                      │
│  ✗ Row 9, Column "Date"                                             │
│    "03/15/2026" is in the past — events must be future-dated        │
│    [Jump to cell]                                                    │
│                                                                      │
│  WARNINGS (can import, but review these)                            │
│                                                                      │
│  ⚠ Row 1 — Possible duplicate: "Noon O Kabab" already exists        │
│    at similar address. Will create a second listing if imported.    │
│    [Ignore]  [Skip this row]                                         │
│                                                                      │
│  ⚠ Row 7 — Halal status is "Unknown" — consider setting it          │
│    before publishing                                                 │
│    [Ignore]                                                          │
└──────────────────────────────────────────────────────────────────────┘
```

---

#### Paste-from-Excel Support

The most powerful feature. Users prepare data in Google Sheets / Excel, copy the cells, and paste directly into the grid.

**How it works:**
1. User selects data range in Excel (including or excluding headers)
2. Copies (`Ctrl+C`)
3. Clicks the first cell in the admin grid (row 1, column 1)
4. Pastes (`Ctrl+V`)
5. Data populates automatically, column-by-column

**Column matching:**
- If headers are included in the paste, the system tries to auto-match to column names (case-insensitive, handles "Business Name" → "Name", "Halal Cert" → "Halal Status")
- Unmatched columns are shown in a mapping dialog:

```
┌─────────────────────────────────────────────────────────────────┐
│  Column Mapping                                                 │
│  We found 8 columns in your paste. Match them:                 │
│                                                                 │
│  Your column →           Maps to                               │
│  "Business Name"    →    Name ✓ (auto-matched)                 │
│  "Type"             →    [Category          ▾]                 │
│  "Full Address"     →    Address ✓ (auto-matched)              │
│  "Contact No."      →    [Phone             ▾]                 │
│  "Certification"    →    [Halal Status      ▾]                 │
│  "Mon Hours"        →    [Hours Mon         ▾]                 │
│  "Online Reviews"   →    [Skip this column  ▾]                 │
│  "Notes"            →    Notes ✓ (auto-matched)                │
│                                                                 │
│  [Apply Mapping]  [Cancel]                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

#### Excel Template Download

Every sheet has a `[📥 Download Template]` button that downloads a pre-formatted `.xlsx` file:

```
Template contents:
  - Row 1: Column headers (bold, frozen)
  - Row 2: Example row (light blue background, shows correct format)
  - Row 3-52: Empty rows (50 rows pre-formatted)
  - Column widths optimized for each field
  - Dropdown validation in Excel for enum columns (Category, City, etc.)
  - Comments on required columns explaining format
  - Sheet 2: "Instructions" tab with field-by-field explanation
```

The template is what founders share with business owners to collect their own data:
> "Fill in the green columns and email it back — we'll handle the rest."

---

#### Import History (/import/history)

```
┌──────────────────────────────────────────────────────────────────────┐
│  Import History                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  Date        Type         Rows  Status   By        Actions           │
│  Apr 21 12:42 Businesses  47    ✓ Done   Atif M.  [Undo] [View log] │
│  Apr 21 10:15 Restaurants 12    ✓ Done   Atif M.  [Undo] [View log] │
│  Apr 20 09:31 Cities       1    ✓ Done   Atif M.  [—]    [View log] │
│  Apr 19 15:44 Events       8    ✗ 3 fail Atif M.  [Retry][View log] │
│  Apr 19 14:02 Neighbors.  25    ✓ Done   Atif M.  [—]    [View log] │
├──────────────────────────────────────────────────────────────────────┤
│  UNDO WINDOW                                                         │
│  [Undo] is available for 30 minutes after import. After that,        │
│  individual records must be deleted from the content pages.          │
└──────────────────────────────────────────────────────────────────────┘
```

**Undo import:** Clicking [Undo] for a recent import:
1. Shows: "This will soft-delete 47 businesses imported in this batch. Continue?"
2. On confirm: all records from that import are soft-deleted (status = 'deleted')
3. They do NOT appear in the feed or app
4. They remain in the database and can be recovered individually from `/businesses`
5. After 24h: undo is no longer available (records become permanent)

---

#### Import Row Status Colors

| Color | Meaning |
|---|---|
| White (default) | Empty / untouched |
| Light blue | Pasted from clipboard |
| Green left border | Successfully imported |
| Red background | Validation error (must fix) |
| Amber background | Warning (can import, should review) |
| Strikethrough gray | Skipped by admin (excluded from import) |
| Spinner | Currently being imported |
| Green checkmark | Row import confirmed by API |
| Red X | Row import failed (API error shown on hover) |

---

#### Backend: Import API Endpoints

```typescript
// Batch import endpoints — each processes one sheet type

POST /v1/admin/import/cities
POST /v1/admin/import/neighborhoods
POST /v1/admin/import/businesses
POST /v1/admin/import/restaurants   // alias for businesses with food category
POST /v1/admin/import/events
POST /v1/admin/import/mosques

// Each endpoint:
// - Auth: admin | super_admin only
// - Body: { rows: ImportRow[], options: { skipDuplicates: boolean, status: 'active' | 'pending' } }
// - X-Idempotency-Key: required (prevents double-import on network retry)
// - Processing: synchronous for <50 rows, async (202 + job ID) for 50+ rows
// - Response: { imported: number, skipped: number, failed: FailedRow[], importBatchId: string }
// - importBatchId: stored on each created record for undo tracking

POST /v1/admin/import/:batchId/undo
// Soft-deletes all records created in this import batch
// Available only if import < 30 minutes ago
// Returns: { undone: number }

GET /v1/admin/import/history
// Returns paginated list of import batches with counts and status

POST /v1/admin/geo/batch-geocode
// Body: { addresses: string[] }
// Returns: { results: Array<{ address, lat, lng, neighborhood, confidence }> }
// Used by frontend before import to auto-fill coordinates
// Rate limited: 100 addresses per call, 500 per hour per admin
```

**Idempotency on import rows:**
Each row generates its own `X-Idempotency-Key` based on `hash(name + address + importBatchId)`. If the admin accidentally clicks Import twice, the second click is a no-op for already-imported rows.

---

#### Import UX — Micro-interactions

- **Row counter** updates live: "14 rows filled" as user types
- **Import button** is disabled until 0 errors: `[Import 47 rows]` → grayed out → `[Fix 3 errors first]`
- **Geocode progress** has a live counter: "Geocoding... 23/47" with a progress bar
- **Import progress** per-row: each row's row number turns into a spinner then ✓ or ✗ as it imports
- **Cell autocomplete**: typing in Name column shows existing business names (to prevent duplicates)
- **Column freeze**: Row # and Name columns are frozen — always visible when scrolling right
- **Horizontal scroll indicator**: a frosted gradient appears at the right edge when more columns exist off-screen

---

## Component Library

### shadcn/ui Components Used

```
Core UI:
  Button, Input, Textarea, Select, Checkbox, RadioGroup, Switch
  Badge, Avatar, Separator, Skeleton

Navigation:
  NavigationMenu, Breadcrumb, Tabs, Pagination

Overlay:
  Dialog, AlertDialog, Sheet, Popover, Tooltip, HoverCard, DropdownMenu

Layout:
  Card, Accordion, Collapsible, ScrollArea, ResizablePanel

Data:
  Table (base for TanStack Table integration)
  Calendar (for date range pickers)
  Command (cmdk integration — command palette)

Feedback:
  Alert, Progress, Sonner (toasts)

Forms:
  Form (React Hook Form integration), Label
```

### Custom Components

```
<ImportGrid />             — AG Grid wrapper with Muzgram column types + validation
<ImportValidationPanel />  — slides in below grid, lists all errors with jump-to links
<ColumnMappingDialog />    — maps pasted columns to schema columns
<GeocodeProgressBar />     — shows geocoding progress per row
<ImportProgressOverlay />  — row-by-row import status overlay
<ImportHistoryRow />       — single history entry with undo/view-log actions
<TemplateDownloadButton /> — generates + downloads pre-formatted .xlsx template
<QueueItem />              — approval queue row with SLA timer
<ContentPreviewPanel />    — split-view right panel
<KpiCard />                — metric card with delta indicator
<FeaturedSlotCard />       — featured slot management tile
<ActivityFeedItem />       — activity log entry
<SlaTimer />               — live countdown showing age + SLA status
<HealthScoreBar />         — content health score visualization
<CityHealthCard />         — city readiness summary card
<BulkActionBar />          — sticky bottom bar when rows are selected
<AdminRoleBadge />         — colored role chip (super_admin/admin/moderator)
<ModChecklistItem />       — approval checklist checkbox with auto-save
<LaunchReadinessItem />    — pre-launch checklist item with status
```

---

## Color Usage in Admin Context

The admin dashboard uses the same dark design system as the consumer app, but with **higher information density** and distinct admin-specific semantic colors:

```typescript
// admin/src/lib/theme.ts

export const adminColors = {
  // Inherited from design system
  bg: {
    page:     '#080C14',  // main content area
    sidebar:  '#040810',  // slightly darker sidebar
    card:     '#141C2A',
    elevated: '#1A2332',
    hover:    '#1E2A3D',
  },

  // Admin-specific semantic colors
  queue: {
    critical: '#EF4444',  // SLA breached (red)
    warning:  '#F59E0B',  // approaching SLA (amber)
    normal:   '#10B981',  // within SLA (emerald)
  },

  role: {
    super_admin:    '#F59E0B',  // gold
    admin:          '#6366F1',  // indigo
    moderator:      '#38BDF8',  // sky
    business_owner: '#10B981',  // emerald
    user:           '#94A3B8',  // slate
  },

  // Status pills
  status: {
    active:   { bg: 'rgba(16,185,129,0.15)', text: '#10B981' },  // green
    pending:  { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B' },  // amber
    suspended:{ bg: 'rgba(239,68,68,0.15)',  text: '#EF4444' },  // red
    deleted:  { bg: 'rgba(71,85,105,0.15)',  text: '#64748B' },  // gray
    claimed:  { bg: 'rgba(99,102,241,0.15)', text: '#6366F1' },  // indigo
  },
};
```

---

## Keyboard Shortcuts Reference

| Shortcut | Action |
|---|---|
| `⌘ K` | Open command palette |
| `⌘ 1` | Go to Approval Queue |
| `⌘ 2` | Go to Moderation |
| `⌘ F` | Go to Featured slots |
| `[` | Toggle sidebar collapsed/expanded |
| `j` / `k` | Navigate up/down in queue or table |
| `a` | Approve focused queue item |
| `r` | Open reject modal for focused item |
| `p` | Toggle preview panel |
| `e` | Edit focused item |
| `Space` | Select/deselect row for bulk |
| `⌘ A` | Select all visible rows |
| `⌘ Enter` | Approve and advance to next item |
| `Escape` | Close modal / deselect |
| `?` | Show all keyboard shortcuts |

---

## Implementation Notes

### API Client Setup

```typescript
// admin/src/lib/api.ts
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';

export const useAdminApi = () => {
  const { getToken } = useAuth();

  return axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: { 'X-App-Version': APP_VERSION },
  }).interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
};
```

### Role Guard Component

```typescript
// admin/src/components/RoleGuard.tsx
import { useAdminUser } from '@/hooks/useAdminUser';

export const RoleGuard = ({
  required,
  children,
  fallback = <AccessDenied />,
}: {
  required: AdminRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => {
  const { role } = useAdminUser();
  const hasAccess = required.includes(role);
  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

// Usage:
<RoleGuard required={['admin', 'super_admin']}>
  <UserRoleEditor />
</RoleGuard>
```

### Real-time Queue Counter

```typescript
// admin/src/hooks/useQueueCount.ts
export const useQueueCount = () => {
  return useQuery({
    queryKey: ['queue', 'count'],
    queryFn: () => api.get('/v1/admin/queue/count').then(r => r.data),
    refetchInterval: 30_000,   // poll every 30 seconds
    staleTime: 20_000,
  });
};

// Sidebar usage:
const { data } = useQueueCount();
// data: { total: 12, critical: 2, businesses: 3, events: 6, posts: 2, claims: 1 }
```

### TanStack Table v8 Setup (example: Businesses table)

```typescript
const columns: ColumnDef<Business>[] = [
  { id: 'select', cell: CheckboxCell, header: SelectAllHeader },
  { accessorKey: 'name', header: 'Name', enableSorting: true },
  { accessorKey: 'category', cell: CategoryChipCell },
  { accessorKey: 'halal_status', cell: HalalBadgeCell },
  { accessorKey: 'status', cell: StatusPillCell },
  { accessorKey: 'is_claimed', cell: ClaimedIconCell },
  { id: 'actions', cell: RowActionsCell },
];

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  manualPagination: true,        // server-side
  manualSorting: true,           // server-side
  manualFiltering: true,         // server-side
  state: { sorting, columnFilters, pagination, rowSelection },
  onSortingChange: setSorting,
  onPaginationChange: setPagination,
  onRowSelectionChange: setRowSelection,
  rowCount: totalCount,
});
```

---

*This document is the source of truth for admin dashboard design. Implementation follows Sprint 8 in `docs/11-engineering-execution-plan.md`. All API contracts are in `docs/08-rest-api-design.md`.*
