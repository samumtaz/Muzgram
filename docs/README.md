# Muzgram — Project Documentation

> **Local Muslim lifestyle ecosystem app** — Chicago launch, city-by-city expansion.
> NOT a dating app. NOT an Instagram clone. NOT a TikTok clone.
> Location-first. Utility-first. Community-first.

---

## Document Index

| File | Contents | Last Updated |
|---|---|---|
| [01-product-vision.md](01-product-vision.md) | MVP goals, user personas, habit loop, feature list, exclusions | 2026-04-21 |
| [02-design-system.md](02-design-system.md) | Colors, typography, spacing, components, motion, map style | 2026-04-21 |
| [03-chicago-launch.md](03-chicago-launch.md) | Launch market strategy, Devon Ave playbook, week-by-week plan | 2026-04-21 |
| [04-product-spec.md](04-product-spec.md) | All 16 modules — purpose, user stories, fields, edge cases, MVP vs MMP | 2026-04-21 |
| [05-database-schema.md](05-database-schema.md) | Full PostgreSQL schema — 44 tables, indexes, enums, future-proofing | 2026-04-21 |
| [06-roadmap.md](06-roadmap.md) | MVP → MMP → Production phases, weekly build order, tech decisions | 2026-04-21 |

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Mobile | React Native + Expo | Cross-platform, fast iteration |
| Backend | NestJS (Node.js) | Structured, scales better than Express |
| Database | PostgreSQL + PostGIS | Relational + geo queries |
| Cache | Redis | Feed caching, rate limiting, queues |
| Auth | Clerk | Fastest phone+email+social, great Expo SDK |
| Maps | Mapbox | Custom dark style, cheaper at scale |
| Storage | Cloudflare R2 | S3-compatible, no egress fees |
| Notifications | Expo Push + FCM | Native integration, free |
| Payments | Stripe | MMP — not MVP |
| Admin | React + Vite | Web dashboard |
| Monorepo | Turborepo | Shared types across mobile/api/admin |

---

## Launch Market

**Chicago, IL — Devon Avenue corridor (West Ridge / Rogers Park)**

- Highest concentration of halal food + Muslim-owned businesses in Midwest
- Active mosque event culture (CIOGC, ISNA, MAS Chicago)
- Dense, walkable — users experience "nearby" in real time
- IFANCA halal certification HQ is in Chicago suburbs — local partnership potential

**Expansion order:** Devon Ave → Bridgeview → Skokie/Evanston → Schaumburg/Naperville → Full Chicago metro

---

## Core Product Principles

1. Every piece of content is tied to **place + category + time**
2. The app must answer **"what is happening near me right now?"** on every open
3. Never build generic social features before local utility is proven
4. Content must feel **alive** — stale feeds kill retention
5. **Halal accuracy is a trust product** — one wrong listing damages the whole app
6. Monetize manually first, build payment infrastructure second
7. Launch one suburb cluster, prove it, then expand

---

## Bonus Modules (MMP Priority)

| Module | Why It Matters |
|---|---|
| Ramadan Mode | 3–5x usage spike annually, deepest emotional engagement |
| Friday Finder (Jummah) | Weekly use case, opens app every Thursday night + Friday |
| Notice Board | Hyper-local classifieds — housing, jobs, rideshare, free items |
| Halal Radar | One-tap "open halal food nearby" shortcut — highest frequency use |
| Campaign Engine | Muslim Business Week — revenue spike + viral growth |

---

## Key Contacts & Resources

- IFANCA (halal cert, Chicago): https://www.ifanca.org
- CIOGC (Chicago Muslim orgs): https://ciogc.org
- MAS Chicago: https://maschicago.org
- Devon Ave Facebook groups: "Muslims of Chicago", "Chicago Halal Food"

---

*This document is a living reference. Update after every major planning session.*
