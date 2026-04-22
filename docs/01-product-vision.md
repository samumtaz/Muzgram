# Muzgram — Product Vision & MVP Definition

> Last updated: 2026-04-21
> See docs/18-brand-identity.md for full brand voice, persona depth, and content philosophy.

---

## Product Positioning

**Muzgram is where young Muslims find their scene — the best spots, the right events, and their people.**

It is NOT a mosque directory. NOT an Islamic education app. NOT a prayer times app. NOT a religious compliance tool.

It IS the social discovery layer for Muslim communities that has never existed before — the thing you open when you want to know what's happening near you, where your crew eats, and what's the move this weekend.

**Primary goal:** Make users open the app at least 3× a week because it answers questions they were already asking — "what's open near me?", "what's happening tonight?", "where is everyone going?"

**Target user:** 18–35. Culturally Muslim. Socially active. Lives in a city or suburb with a Muslim community. Doesn't want to explain themselves to an app that wasn't built for them.

**Expansion strategy:** Chicago metro launch across all clusters simultaneously → Houston, NYC, Dallas (Year 2) → global Muslim diaspora cities.

---

## What Users Discover

1. **Eat** — Spots open near them right now. Halal filter is always on, never mentioned.
2. **Go Out** — Events worth attending: cultural nights, food festivals, professional mixers, community gatherings, sports, Eid parties.
3. **Connect** — Trusted professionals from the community: finance, legal, real estate, health, creative.
4. **Share** — What's actually happening. Community posts that feel like the neighborhood's group chat.

---

## The Questions the App Must Answer (in under 10 seconds)

- "What's the move tonight near me?"
- "Where should we eat right now?"
- "What's happening this weekend that's worth going to?"
- "Who's the trusted [lawyer / mortgage broker / photographer] in this community?"
- "What's everyone doing for Eid / Ramadan / this Saturday?"

---

## MVP Goals (3 only)

**Goal 1 — Prove daily utility**
Users in one cluster open the app at least 3× per week organically — not because of push notifications, not because of novelty. Because it's the fastest way to answer where to eat and what to do.

**Goal 2 — Prove supply-side demand**
At least 15 businesses and 3 event organizers actively maintain their presence without being paid or constantly chased. The platform must have enough value that businesses want to be on it.

**Goal 3 — Prove willingness to pay**
At least 5 businesses pay for a promoted slot within the first 30 days. Revenue is the only real signal of product-market fit on the supply side.

---

## User Personas

### Nadia — 24, Graphic Designer, West Rogers Park
Her Instagram is food photography and event flyers. She sends 15 WhatsApp messages a day about where to eat and what's happening. She found her last 4 favorite spots through word of mouth in those groups. She wants an app that answers the questions she's already asking — without looking like it was built for her parents.

**Opens the app when:** hungry and can't decide / something is happening and she wants to know what / a friend asks "where should we go?"

---

### Amir — 27, Software Engineer, New to Bridgeview
Relocated from New Jersey. Back home he had a built-in Muslim social network from childhood — here he knows nobody. He's not going to cold-approach a mosque. He wants to find the restaurant everyone goes to after Jummah, the professional networking event someone mentioned, the community soccer league. He needs the friend who already lives here and knows where everyone goes.

**Opens the app when:** planning his weekend alone / trying to figure out where to go without feeling out of place / looking for people with similar taste in a new city.

---

### Zara — 22, Event and Community Builder
She throws Eid parties, cultural nights, and young professional mixers. She promotes through Instagram, Facebook, and 12 different WhatsApp groups. The crowd she wants — young Muslims who'd actually show up — has no single place to find her events. Muzgram is that place.

**Opens the app when:** promoting an event / checking how many people saved her listing / scouting what other events are on the same night.

---

### Tariq — 31, Financial Analyst
Goes to networking events. Eats out constantly. Attends the CIOGC gala, professional mixers, industry conferences. Wants to find professionals like him, and wants his firm visible where those professionals look when they need trusted referrals for a lawyer, an accountant, or a mortgage broker.

**Opens the app when:** looking for a service provider recommendation / planning a professional event / finding a spot impressive enough for clients.

---

### Sofia — 26, Nurse, Second-Gen, Chicago South Side
Culturally Muslim, practices at her own pace. Loves the community but can find the Muslim app ecosystem preachy and formal. She wants to find good spots to eat, cool events, and connect with people who get her — without filling out a religious profile. She tells 8 friends about an app if it's actually good. She forgets an app exists if it feels like homework.

**Opens the app when:** bored and browsing / someone mentions a spot she wants to check / planning something for her group.

---

## The Primary User Problem

**The single sentence:** Young Muslims in any given city have no single, always-current, socially aware place to discover what's happening near them — so they rely on a patchwork of Instagram, WhatsApp groups, Facebook events, and Google Maps that weren't built for them.

**The frustration stack:**
- Google Maps has no community context — it shows them every restaurant, not the ones their community goes to
- Facebook groups are noisy, outdated, and algorithmically buried
- Instagram shows them beautiful content from restaurants in cities they don't live in
- Eventbrite has no cultural relevance — it's built for corporate conferences, not Eid parties
- WhatsApp groups are closed and don't reach people outside the existing circle
- There is no social discovery layer built for Muslim communities. Anywhere.

---

## The Core Daily Habit Loop

```
"What's the move?" (multiple times daily)

Morning browse (7–9am):
  → Check what's happening today + weekly highlights
  → Spot a daily special for lunch before leaving the house
  → See an event this weekend worth saving

Lunchtime (12–1pm):
  → Open map, see what's nearby and open right now
  → Pick the closest good spot in under 30 seconds
  → "Right here" label on Sabri Nihari = done

Evening / weekend planning (6–9pm Fri–Sat):
  → Browse what's on this weekend
  → Find the event, send the WhatsApp link to the group
  → Group decides, everyone downloads Muzgram to see the details

The notification trigger:
  → Push: "Eid Bazaar · 0.8km from you · Starting now 🌙"
  → Opens app, taps in, saves 2 other events while there
  → Shares the bazaar link to 3 WhatsApp groups
  → 7 new users download from those shares
```

---

## MVP Feature List

### Mobile App — 5 screens

| Screen | What it does |
|---|---|
| Now Feed | Time-sorted local content: spots open now, events today, new listings this week, daily specials |
| Map Tab | Full-screen dark map with pins for Eat / Go Out / Connect |
| Explore Tab | Browse by vibe: Eat / Go Out / Connect / Share |
| Post/List Tab | Create: Event listing, Business listing, or Community post |
| Profile Tab | Saved items, my posts, basic profile |

### Core Content Types (3 only)

| Type | What it is |
|---|---|
| Spot / Business | Name, category, address, phone, hours, halal status, photos, description |
| Event | Title, date/time, location, category, description, cover photo, free/paid, external link |
| Community Post | Text + optional photo, location tag, category, expires 7 days |

### Supporting Features

- Phone OTP auth (Clerk) — zero friction, no passwords
- GPS auto-detection + manual neighborhood override
- Category filter chips on feed and map
- Save on any card (♡ → ♥ animation, optimistic)
- Business profile page with daily special banner
- Push notification opt-in for "events near me"
- WhatsApp deep-link sharing on every card
- Halal certification badge (emerald shield, quiet, non-preachy)

---

## What to Exclude from MVP

| Feature | Why |
|---|---|
| In-app search | Map + feed handles discovery. Cut. |
| Reviews / ratings | Needs volume to be meaningful. MMP. |
| DMs / messaging | Wrong product shape. WhatsApp does this. Cut. |
| Follows / social graph | Not a social network. Cut. |
| Video / reels | Not TikTok. Scope creep. Cut. |
| Stripe payments | Monetize manually first. Cut. |
| Business analytics | Weekly WhatsApp stat summary for MVP. Cut. |
| Community groups | MMP after volume exists. Cut. |
| Interest quiz onboarding | Just ask for location. Cut. |
| Event RSVPs | External link to WhatsApp/Eventbrite for MVP. Cut. |
| Jummah Finder | Useful but not core to the social ecosystem loop. MMP. |
| Prayer times | Not our product. Link to Muslim Pro. Cut. |

---

## MVP Monetization (Day 1, Manual)

**Golden rule: no Stripe in MVP. Zelle/Venmo/PayPal only. Sell in person first.**

**Featured Spot** — $75/week, $275/month. Top card placement in feed + map gold pin. Sold via WhatsApp.

**Boosted Event** — $25–$75 one-time. Top of events section + featured map pin + optional push notification.

**Founding Member** — $149 one-time. 20 slots only. Permanent badge + first month featured + founder-level support.

**Lead Package** — $79/month. Service providers get full lead details + fast notifications.

**Month 1 revenue target: $1,200–$2,000**

---

## 30-Day Success Metrics

### Acquisition
| Metric | Target |
|---|---|
| Registered users | 500+ |
| App Store installs | 800+ |
| Spots / businesses listed | 40+ |
| Events posted | 15+ |

### Retention (most important number in MVP)
| Metric | Target |
|---|---|
| **D7 retention** | **35%+** |
| D30 retention | 20%+ |
| Sessions per user per week | 3+ |
| Average session length | 2.5+ minutes |

### Engagement
| Metric | Target |
|---|---|
| Map tab usage | 40%+ of sessions |
| Card saves | 200+ total |
| WhatsApp shares | 100+ |
| Community posts submitted | 50+ |

### Revenue
| Metric | Target |
|---|---|
| Paying businesses | 5+ |
| MRR equivalent | $1,200+ |
| Boosted events sold | 3+ |

---

## Top 7 Failure Risks

1. **Empty feed on Day 1** — Seed 40+ listings before first user downloads. No empty screens.
2. **The app feels like a mosque directory** — Lead with food and events. Halal badge is quiet, not the headline.
3. **Wrong vibe** — If a 24-year-old opens the app and it feels formal or preachy, they close it and never come back.
4. **Businesses don't update listings** — Call every anchor business every 2 weeks. Stale data kills trust.
5. **Google Maps inertia** — Lead with events and social discovery, not just food. Events have no Google Maps equivalent.
6. **No content refresh** — Community posts expire in 7 days. Recruit 5 regular event organizers before launch.
7. **Charging businesses before proving value** — First 15 anchor businesses free for 60 days minimum. Revenue before value = no businesses.

---

## One-Line MVP Summary

> A local social discovery feed and map for Muslim communities — where to eat, what's happening, who to trust — built for the generation that's never had an app that gets them.
