# Muzgram — Cloud Infrastructure Design

> Last updated: 2026-04-21
> Role: Senior DevOps / Cloud Architect perspective
> Companion docs: 19-production-architecture.md, 11-engineering-execution-plan.md, 07-backend-architecture.md
> Stack: NestJS API · React Native Expo · PostgreSQL + PostGIS · Redis · Cloudflare R2 · Bull queues · Clerk · Stripe · Expo Push · Mapbox · Google Vision

---

## Document Map

1. [MVP Deployment Architecture](#1-mvp-deployment-architecture)
2. [Production Deployment Architecture](#2-production-deployment-architecture)
3. [CI/CD Pipeline](#3-cicd-pipeline)
4. [Environment Strategy](#4-environment-strategy)
5. [Secrets Management](#5-secrets-management)
6. [Backups and Disaster Recovery](#6-backups-and-disaster-recovery)
7. [Monitoring and Observability](#7-monitoring-and-observability)
8. [Cost-Conscious Decisions — Startup Stage](#8-cost-conscious-decisions--startup-stage)
9. [Scale-Up Decisions — Growth Stage](#9-scale-up-decisions--growth-stage)
10. [Cloud Provider Recommendations and Tradeoffs](#10-cloud-provider-recommendations-and-tradeoffs)

---

## 1. MVP Deployment Architecture

### Philosophy

The MVP architecture has one job: let a solo founder ship, iterate, and learn without any ops overhead. Every dollar and hour spent on infrastructure before product-market fit is waste. The right MVP stack costs under $80/month, deploys in under 10 minutes, and requires zero on-call rotation.

### MVP Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │     Cloudflare CDN      │  ← DNS, SSL, DDoS, media cache
              │   (Free tier)           │
              └────────────┬────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼─────┐   ┌───────▼──────┐  ┌──────▼──────┐
    │  Mobile  │   │   API Server  │  │  Admin UI   │
    │   App    │   │  (NestJS)     │  │  (React)    │
    │  (Expo)  │   │  Railway.app  │  │  Railway.app│
    │  iOS/    │   │  512MB RAM    │  │  static     │
    │  Android │   │  1 vCPU       │  │  deploy     │
    └──────────┘   └───────┬───────┘  └─────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
    ┌─────────▼──┐  ┌──────▼──────┐  ┌─▼──────────────┐
    │ PostgreSQL │  │    Redis     │  │ Cloudflare R2  │
    │ + PostGIS  │  │  Railway     │  │ Object Storage │
    │ Railway    │  │  256MB RAM   │  │ $0.015/GB/mo   │
    │ 1GB RAM    │  └─────────────┘  └────────────────┘
    └────────────┘
```

### MVP Services Breakdown

| Service | Provider | Spec | Purpose | Monthly Cost |
|---|---|---|---|---|
| API (NestJS) | Railway | 512MB RAM, 0.5vCPU | REST API + webhook handling | $10 |
| Worker | Railway | 256MB RAM, 0.25vCPU | Bull queues, push, moderation | $5 |
| PostgreSQL + PostGIS | Railway | 1GB RAM, 1vCPU, 10GB disk | Primary database | $20 |
| Redis | Railway | 256MB | Cache + Bull queue broker | $5 |
| Object Storage | Cloudflare R2 | Pay-per-use | Photos, media | ~$2 |
| CDN + DNS + SSL | Cloudflare | Free tier | Global edge, DDoS | $0 |
| Admin UI | Railway | Static deploy | Internal operations | $0 |
| Domain | Namecheap | muzgram.com | DNS managed by Cloudflare | $12/year |
| **Total** | | | | **~$42–55/month** |

### Why Railway for MVP

Railway is the right call for a solo founder at this stage — not because it's the cheapest or most powerful, but because the ops cost is zero. No Terraform, no Kubernetes, no IAM roles to manage. You push code, Railway deploys it. Postgres, Redis, and your API are all in the same project dashboard. The integrated deployment logs make debugging straightforward without setting up log aggregation. When you outgrow Railway (which you will — the trigger is documented in Section 9), the migration to Fly.io or AWS takes one sprint and the app code doesn't change.

### Railway Project Structure

```
Railway Project: muzgram-production
  Services:
    ├── muzgram-api          (NestJS, GitHub autodeploy from main)
    ├── muzgram-worker       (NestJS worker, same codebase, different start command)
    ├── muzgram-admin        (React static build)
    ├── muzgram-db           (PostgreSQL 15 + PostGIS)
    └── muzgram-redis        (Redis 7)

Railway Project: muzgram-staging
  Services:
    ├── muzgram-api-staging
    ├── muzgram-worker-staging
    ├── muzgram-db-staging   (smaller, 512MB)
    └── muzgram-redis-staging
```

### MVP Database Configuration

```sql
-- Railway PostgreSQL: enable PostGIS immediately
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- trigram search for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

-- Connection string format Railway provides:
-- postgresql://postgres:PASSWORD@HOST:PORT/railway

-- Railway connection limits: 100 max connections
-- NestJS TypeORM pool: max 10 connections (leave headroom)
-- If you hit connection limits before PgBouncer: use Neon instead of Railway PostgreSQL
```

### MVP API Dockerfile

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json turbo.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/constants/package.json ./packages/constants/
COPY packages/utils/package.json ./packages/utils/
COPY apps/api/package.json ./apps/api/
RUN npm ci --workspace=apps/api --workspace=packages/types \
    --workspace=packages/constants --workspace=packages/utils

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=apps/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages
USER nestjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/main.js"]
```

```dockerfile
# apps/worker/Dockerfile — same base, different CMD
FROM muzgram-api:latest AS worker
CMD ["node", "dist/worker.js"]
```

### Railway railway.toml

```toml
# railway.toml (root of monorepo)
[build]
builder = "DOCKERFILE"
dockerfilePath = "apps/api/Dockerfile"
buildCommand = ""

[deploy]
startCommand = "node dist/main.js"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[[services]]
name = "muzgram-api"
source = "."

[[services]]
name = "muzgram-worker"
source = "."
startCommand = "node dist/worker.js"
```

### Mobile App Distribution (MVP)

```
Expo Application Services (EAS) — the only sane choice for React Native in 2026

Build:
  eas build --platform all --profile production
  → Produces .ipa (iOS) and .apk/.aab (Android)
  → Build happens on Expo's servers, not your machine
  → No Mac required for iOS builds

Distribution:
  eas submit --platform all
  → Submits to App Store Connect + Google Play Console automatically
  → First submission: manual review (Apple: 24-48h, Google: 4-8h)
  → Subsequent builds: expedited review if no new permissions

OTA Updates (JavaScript changes, no store submission):
  eas update --branch production --message "Feed fix"
  → Live on users' devices within 24h (background download)
  → Instant for foreground refresh
  → No App Store approval needed

EAS Build pricing:
  Free tier: 30 builds/month (enough for MVP)
  Production: $99/month unlimited (upgrade when you hit the limit)
```

---

## 2. Production Deployment Architecture

### Production Topology

The production architecture shifts from "zero ops" to "controlled ops" — still lean, but with redundancy, observability, and the ability to handle burst traffic (Ramadan nights, Eid weekend, Friday evenings).

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE GLOBAL NETWORK                            │
│         DDoS · WAF · CDN · R2 · Workers · KV · DNS · SSL              │
└─────────────┬───────────────────────────────────┬───────────────────────┘
              │                                   │
              │ API traffic                       │ Media (R2 served at edge)
              ▼                                   ▼
┌─────────────────────────┐             ┌─────────────────┐
│   Cloudflare Workers    │             │  Cloudflare R2  │
│   Edge Auth Check       │             │  Photo/Media    │
│   Geo-routing           │             │  Storage        │
│   Rate Limiting (edge)  │             │  ~$0.015/GB/mo  │
└─────────────┬───────────┘             └─────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FLY.IO (US-East primary)                             │
│                                                                         │
│  ┌─────────────────┐  ┌────────────────────┐  ┌──────────────────────┐ │
│  │  API Service    │  │   Worker Service   │  │   Admin Service      │ │
│  │  3 machines     │  │   2 machines       │  │   1 machine          │ │
│  │  shared-cpu-2x  │  │   shared-cpu-1x    │  │   shared-cpu-1x      │ │
│  │  512MB RAM each │  │   512MB RAM each   │  │   256MB RAM          │ │
│  │  Auto-scale 1→6 │  │   Auto-scale 1→4  │  │   Private network    │ │
│  └────────┬────────┘  └────────┬───────────┘  └──────────────────────┘ │
│           │                    │                                         │
│  ┌────────▼────────────────────▼────────────────────────────────────┐  │
│  │                    Fly.io Private Network (WireGuard)            │  │
│  │         All inter-service traffic stays internal                 │  │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
              │                     │
              ▼                     ▼
┌────────────────────┐   ┌──────────────────────────────────────────────┐
│  Upstash Redis     │   │         Neon Serverless PostgreSQL           │
│  Cluster           │   │                                              │
│  Global replication│   │  Primary (us-east-1)                        │
│  Pay-per-request   │   │  Read Replica 1 (us-east-1, same region)    │
│  $0/mo until scale │   │  Read Replica 2 (us-west-2, future)         │
└────────────────────┘   │  Auto-scale compute, branching for PRs      │
                         │  Continuous WAL archiving to S3              │
                         └──────────────────────────────────────────────┘
```

### Production Service Specifications

| Service | Platform | Spec | Replicas | Auto-scale | Est. Cost/mo |
|---|---|---|---|---|---|
| API (NestJS) | Fly.io | shared-cpu-2x, 512MB | 3 min | 1–6 based on CPU | $45 |
| Worker (Bull) | Fly.io | shared-cpu-1x, 512MB | 2 min | 1–4 based on queue depth | $20 |
| Admin Dashboard | Fly.io | shared-cpu-1x, 256MB | 1 | None | $5 |
| Notification Service | Fly.io | shared-cpu-1x, 256MB | 2 | None | $10 |
| PostgreSQL Primary | Neon | 0.25–4 vCPU auto | 1 | Serverless auto-scale | $50 |
| PostgreSQL Replica | Neon | 0.25–2 vCPU auto | 1–2 | Serverless auto-scale | $35 |
| Redis Cluster | Upstash | Global, multi-region | Managed | Managed | $30 |
| Object Storage | Cloudflare R2 | Pay-per-use | — | — | $15 |
| CDN + Security | Cloudflare Pro | Managed | — | — | $20 |
| Typesense Search | Hetzner VPS | CPX21 (3vCPU/4GB) | 1 node | Manual | $12 |
| Monitoring Stack | Grafana Cloud | Free tier (50GB logs) | — | — | $0 |
| **Total** | | | | | **~$242/month** |

### Production Fly.io Configuration

```toml
# fly.toml — muzgram-api
app = "muzgram-api"
primary_region = "iad"  # US-East (Northern Virginia)
kill_signal = "SIGTERM"
kill_timeout = 30

[build]
  dockerfile = "apps/api/Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "3000"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false   # Never stop — always-on API
  auto_start_machines = true
  min_machines_running = 3     # Always 3 machines minimum
  processes = ["app"]

  [http_service.concurrency]
    type = "requests"
    hard_limit = 250           # Per machine request limit before new machine spins up
    soft_limit = 200

[[vm]]
  size = "shared-cpu-2x"
  memory = "512mb"

[checks]
  [checks.health]
    grace_period = "30s"
    interval = "15s"
    method = "GET"
    path = "/health"
    port = 3000
    timeout = "10s"
    type = "http"

[[regions]]
  region = "iad"               # Primary
  min_machines = 3

# Add when Year 2 cities go live:
# [[regions]]
#   region = "lax"             # US-West (LA, Houston traffic)
#   min_machines = 1
```

```toml
# fly.toml — muzgram-worker
app = "muzgram-worker"
primary_region = "iad"

[build]
  dockerfile = "apps/worker/Dockerfile"

[env]
  NODE_ENV = "production"

[http_service]
  internal_port = 3001         # Health check only, not public
  force_https = false
  auto_stop_machines = false   # Workers must not stop mid-job
  auto_start_machines = true
  min_machines_running = 2

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"
```

### Neon PostgreSQL Production Setup

```sql
-- Neon project: muzgram-production
-- Neon automatically handles: WAL archiving, point-in-time recovery,
-- connection pooling (built-in Pgbouncer on port 5432 → :6543 for pooled)

-- Connection string patterns:
-- Direct (for migrations): postgresql://user:pass@ep-XXX.us-east-1.aws.neon.tech/muzgram?sslmode=require
-- Pooled (for API): postgresql://user:pass@ep-XXX-pooler.us-east-1.aws.neon.tech/muzgram?sslmode=require

-- TypeORM datasource config
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,          // Pooled connection (Neon built-in pooler)
  extra: {
    max: 10,                               // Max 10 connections from this container
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  },
  ssl: { rejectUnauthorized: false },
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsRun: true,                   // Auto-run migrations on startup
});

-- Read replica datasource (for feed queries, map queries, search)
export const ReplicaDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_REPLICA_URL,  // Read replica URL
  extra: { max: 15 },                     // More connections on replica (read-heavy)
  ssl: { rejectUnauthorized: false },
  entities: [...],
  // No migrations: replica follows primary automatically
});
```

### Upstash Redis Production Setup

```typescript
// packages/cache/src/redis.client.ts
import { Redis } from '@upstash/redis';

// Upstash: HTTP-based Redis — works from any environment including edge
// No persistent TCP connection = works with serverless, auto-scale containers

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Separate Redis instance for Bull queues
// Bull requires a persistent TCP connection — use Upstash with ioredis compat layer
import IORedis from 'ioredis';

export const bullRedisConnection = new IORedis(process.env.UPSTASH_REDIS_IOREDIS_URL, {
  maxRetriesPerRequest: null,  // Required for Bull
  enableReadyCheck: false,     // Required for Bull
  tls: { rejectUnauthorized: false },
});
```

### Cloudflare R2 Media Architecture

```typescript
// packages/storage/src/r2.client.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// R2 uses S3-compatible API — no SDK lock-in
export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Upload flow: client gets presigned URL → uploads direct to R2 → API confirms
// This pattern: API never handles file bytes, client uploads at full bandwidth

export async function createPresignedUploadUrl(key: string): Promise<string> {
  return getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: 'image/webp',
      // Conditions: limit upload size at presign time, not post-upload
      ContentLength: 10 * 1024 * 1024,  // 10MB max
    }),
    { expiresIn: 300 }  // 5 minute window to complete upload
  );
}

// R2 Bucket configuration (set once via Cloudflare dashboard or Wrangler):
// - Public read: YES (media served directly to clients at CDN speed)
// - CORS: allow GET from *, PUT from api.muzgram.com only
// - Cache rules: photos = 1 year TTL (immutable — we use content-addressed keys)
// - Transform: Cloudflare Images (optional) for on-the-fly resize at $5/month

// Key naming convention: content-addressed, never user-controlled
// photos/{userId}/{uuid}.webp
// thumbnails/{listingId}/{uuid}-thumb.webp
// events/{eventId}/cover-{uuid}.webp
```

### Production Networking

```
All inter-service traffic stays on Fly.io's private WireGuard network.
No service is publicly reachable except the API and Admin.

Public endpoints:
  api.muzgram.com         → muzgram-api Fly.io (HTTPS only)
  admin.muzgram.com       → muzgram-admin Fly.io (HTTPS + IP allowlist)
  media.muzgram.com       → Cloudflare R2 (CDN-served, no origin hits)
  muzgram.com             → Cloudflare Pages (marketing site, static)

Internal-only (Fly.io private network):
  muzgram-worker.internal → Worker service
  muzgram-db.internal     → (Not used — Neon is external, uses TLS)
  muzgram-redis.internal  → (Not used — Upstash is external, uses HTTPS)
  muzgram-typesense.internal → Typesense on Hetzner via Tailscale

Tailscale for private access:
  - Typesense (Hetzner VPS) joined to Tailscale network
  - Fly.io machines joined to same Tailscale network
  - Typesense reachable at 100.x.x.x internally, never public
  - Admin SSH to Typesense: tailscale ssh typesense-hetzner
  - Cost: Tailscale free tier covers this
```

---

## 3. CI/CD Pipeline

### Pipeline Overview

```
Developer → GitHub PR → CI validates → Preview deploy → Review → Merge → Production deploy

Every step is automated. The human makes decisions; the pipeline executes.
```

### GitHub Actions — Full Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  validate:
    name: Validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npm run typecheck --workspaces

      - name: Lint
        run: npm run lint --workspaces

      - name: Unit tests
        run: npm run test --workspaces -- --passWithNoTests
        env:
          NODE_ENV: test

      - name: Integration tests
        run: npm run test:integration --workspace=apps/api
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}  # Neon branch for CI
          REDIS_URL: ${{ secrets.TEST_REDIS_URL }}

  security:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: npm audit
        run: npm audit --audit-level=high
        # Fails CI if any HIGH or CRITICAL CVEs in dependencies

      - name: Secret scanning
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          # Scans diff for accidentally committed secrets

  build:
    name: Build Docker Images
    runs-on: ubuntu-latest
    needs: [validate]
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push API image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/api/Dockerfile
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/api:${{ github.sha }}
            ghcr.io/${{ github.repository }}/api:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
          # Build cache: cuts build time from 4min to 45sec after first build

      - name: Build and push Worker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/worker/Dockerfile
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/worker:${{ github.sha }}
            ghcr.io/${{ github.repository }}/worker:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  preview:
    name: Deploy Preview
    runs-on: ubuntu-latest
    needs: [build]
    if: github.event_name == 'pull_request'
    environment:
      name: preview
      url: https://muzgram-api-pr-${{ github.event.number }}.fly.dev
    steps:
      - uses: actions/checkout@v4

      - name: Setup Fly CLI
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Create Neon preview branch
        id: neon_branch
        uses: neondatabase/create-branch-action@v5
        with:
          project_id: ${{ secrets.NEON_PROJECT_ID }}
          branch_name: preview/pr-${{ github.event.number }}
          api_key: ${{ secrets.NEON_API_KEY }}

      - name: Deploy preview API
        run: |
          flyctl deploy \
            --app muzgram-api-preview-pr-${{ github.event.number }} \
            --image ghcr.io/${{ github.repository }}/api:${{ github.sha }} \
            --env DATABASE_URL=${{ steps.neon_branch.outputs.connection_string }} \
            --env PREVIEW_PR=${{ github.event.number }} \
            --ha=false \
            --vm-size shared-cpu-1x \
            --vm-memory 256
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Comment preview URL on PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Preview Deployment Ready 🚀
              
              | Service | URL |
              |---|---|
              | API | https://muzgram-api-preview-pr-${{ github.event.number }}.fly.dev |
              | API Docs | https://muzgram-api-preview-pr-${{ github.event.number }}.fly.dev/docs |
              | Neon Branch | \`preview/pr-${{ github.event.number }}\` |
              
              Preview uses an isolated Neon branch — safe to run migrations and test data.`
            })

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [build]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment:
      name: staging
      url: https://api-staging.muzgram.com
    steps:
      - uses: actions/checkout@v4

      - name: Setup Fly CLI
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy API to staging
        run: |
          flyctl deploy \
            --app muzgram-api-staging \
            --image ghcr.io/${{ github.repository }}/api:${{ github.sha }} \
            --strategy rolling
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Deploy Worker to staging
        run: |
          flyctl deploy \
            --app muzgram-worker-staging \
            --image ghcr.io/${{ github.repository }}/worker:${{ github.sha }} \
            --strategy rolling
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Run smoke tests
        run: npm run test:smoke
        env:
          SMOKE_TEST_URL: https://api-staging.muzgram.com

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [deploy-staging]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment:
      name: production
      url: https://api.muzgram.com
      # GitHub environment protection: require manual approval in GitHub UI
      # This is the single human gate before production
    steps:
      - uses: actions/checkout@v4

      - name: Setup Fly CLI
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy API to production (rolling)
        run: |
          flyctl deploy \
            --app muzgram-api \
            --image ghcr.io/${{ github.repository }}/api:${{ github.sha }} \
            --strategy rolling \
            --wait-timeout 300
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
        # Rolling deploy: new machine starts → health check passes → old machine stops
        # Zero downtime guaranteed

      - name: Deploy Worker to production
        run: |
          flyctl deploy \
            --app muzgram-worker \
            --image ghcr.io/${{ github.repository }}/worker:${{ github.sha }} \
            --strategy bluegreen
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Tag release in GitHub
        uses: actions/github-script@v7
        with:
          script: |
            const tag = `v${new Date().toISOString().slice(0,10)}-${{ github.sha }}`.slice(0,30);
            await github.rest.git.createRef({
              owner: context.repo.owner,
              repo: context.repo.repo,
              ref: `refs/tags/${tag}`,
              sha: context.sha
            });

      - name: Notify Slack on deploy
        uses: slackapi/slack-github-action@v1
        with:
          channel-id: '#deployments'
          slack-message: "✅ muzgram-api deployed to production — ${{ github.sha }} — ${{ github.actor }}"
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}

  cleanup-preview:
    name: Cleanup Preview
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request' && github.event.action == 'closed'
    steps:
      - name: Destroy preview Fly app
        run: flyctl apps destroy muzgram-api-preview-pr-${{ github.event.number }} --yes
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Delete Neon preview branch
        uses: neondatabase/delete-branch-action@v3
        with:
          project_id: ${{ secrets.NEON_PROJECT_ID }}
          branch: preview/pr-${{ github.event.number }}
          api_key: ${{ secrets.NEON_API_KEY }}
```

### Mobile CI/CD Pipeline

```yaml
# .github/workflows/mobile.yml
name: Mobile CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'apps/mobile/**'
      - 'packages/**'

jobs:
  test-mobile:
    name: Test Mobile
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test --workspace=apps/mobile -- --passWithNoTests
      - run: npm run typecheck --workspace=apps/mobile

  ota-update:
    name: EAS OTA Update (JS changes only)
    runs-on: ubuntu-latest
    needs: [test-mobile]
    # Only run OTA update — no native changes in most PRs
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup EAS CLI
        run: npm install -g eas-cli

      - name: Publish OTA update
        run: |
          eas update \
            --branch production \
            --message "Auto-update: ${{ github.sha }}" \
            --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
        working-directory: apps/mobile

  native-build:
    name: EAS Native Build (schedule: weekly or on-demand)
    runs-on: ubuntu-latest
    needs: [test-mobile]
    if: |
      contains(github.event.head_commit.message, '[native-build]') ||
      github.event_name == 'workflow_dispatch'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install -g eas-cli

      - name: Build for both platforms
        run: |
          eas build \
            --platform all \
            --profile production \
            --non-interactive \
            --no-wait  # Build async, don't block CI
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
        working-directory: apps/mobile
```

### Database Migration Pipeline

```yaml
# .github/workflows/migrations.yml
name: Database Migrations

on:
  push:
    branches: [main]
    paths:
      - 'apps/api/src/migrations/**'

jobs:
  migrate-staging:
    name: Run Migrations on Staging
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci

      - name: Run migrations on staging
        run: npm run migration:run --workspace=apps/api
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}

      - name: Verify migration
        run: npm run migration:show --workspace=apps/api
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}

  migrate-production:
    name: Run Migrations on Production
    runs-on: ubuntu-latest
    needs: [migrate-staging]
    environment:
      name: production-migrations
      # Separate environment with required approvers — migrations need sign-off
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci

      - name: Create Neon restore point before migration
        run: |
          curl -X POST "https://console.neon.tech/api/v2/projects/${{ secrets.NEON_PROJECT_ID }}/branches" \
            -H "Authorization: Bearer ${{ secrets.NEON_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"branch": {"name": "pre-migration-${{ github.sha }}", "parent_id": "main"}}'
          # This is an instant snapshot — if migration fails, restore from this branch

      - name: Run migrations on production
        run: npm run migration:run --workspace=apps/api
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
```

### Rollback Procedure

```bash
# Emergency rollback: revert to previous image without a code revert

# 1. Find the last known-good image tag
flyctl releases --app muzgram-api

# 2. Rollback API to previous release
flyctl deploy --app muzgram-api --image ghcr.io/muzgram/api:PREVIOUS_SHA --strategy immediate

# 3. Rollback Worker
flyctl deploy --app muzgram-worker --image ghcr.io/muzgram/worker:PREVIOUS_SHA --strategy immediate

# 4. If migration caused DB issues: restore Neon from pre-migration branch
# (Neon branch is instant — no data transfer, no downtime)
# In Neon console: make pre-migration-SHA branch the primary

# Total rollback time: < 5 minutes
# This is why you tag your Docker images with git SHA, not just "latest"
```

---

## 4. Environment Strategy

### Four Environments

```
local → preview → staging → production

Each environment is fully isolated:
  - Separate database (Neon project or branch)
  - Separate Redis (Upstash database)
  - Separate Clerk application (separate JWT keys)
  - Separate Stripe account (test mode vs live mode)
  - Separate R2 bucket (muzgram-local, muzgram-preview, muzgram-staging, muzgram-production)
  - Separate Expo project (separate push notification certificates)
```

### Environment Comparison

| Property | Local | Preview | Staging | Production |
|---|---|---|---|---|
| Database | Local Docker PostgreSQL | Neon PR branch | Neon staging project | Neon production project |
| Redis | Local Docker Redis | Upstash shared | Upstash staging | Upstash production |
| Storage | Local MinIO | R2 preview bucket | R2 staging bucket | R2 production bucket |
| Auth | Clerk test | Clerk test | Clerk test | Clerk production |
| Payments | Stripe test mode | Stripe test mode | Stripe test mode | Stripe live mode |
| Push notifs | Expo dev client | Expo dev client | Expo simulator | FCM + APNS live |
| Maps | Mapbox dev token | Mapbox dev token | Mapbox dev token | Mapbox production token |
| AI moderation | Disabled | Disabled | Enabled | Enabled |
| Data | Seeded fake data | Seeded fake data | Copy of production (anonymized) | Real user data |

### Local Development Setup

```bash
# docker-compose.yml — local development only, never deployed

version: '3.9'
services:
  postgres:
    image: postgis/postgis:15-3.4-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: muzgram_dev
      POSTGRES_USER: muzgram
      POSTGRES_PASSWORD: muzgram_dev_password
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru

  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"   # MinIO console
    environment:
      MINIO_ROOT_USER: muzgram
      MINIO_ROOT_PASSWORD: muzgram_local
    command: server /data --console-address ":9001"
    volumes:
      - miniodata:/data

  typesense:
    image: typesense/typesense:0.26.0
    ports:
      - "8108:8108"
    environment:
      TYPESENSE_API_KEY: local_dev_key
    volumes:
      - typesensedata:/data

volumes:
  pgdata:
  miniodata:
  typesensedata:
```

```bash
# .env.local — never committed
DATABASE_URL=postgresql://muzgram:muzgram_dev_password@localhost:5432/muzgram_dev
REDIS_URL=redis://localhost:6379
R2_ENDPOINT=http://localhost:9000
R2_BUCKET_NAME=muzgram-local
TYPESENSE_URL=http://localhost:8108
TYPESENSE_API_KEY=local_dev_key
CLERK_SECRET_KEY=sk_test_xxxxx       # Clerk test mode
STRIPE_SECRET_KEY=sk_test_xxxxx      # Stripe test mode
MAPBOX_SECRET_TOKEN=sk.xxxx          # Mapbox dev token (free tier)
AI_MODERATION_ENABLED=false
NODE_ENV=development
```

### Staging Data Management

```bash
# Anonymize and copy production data to staging (run monthly or before major features)
# scripts/sync-staging-data.ts

async function syncStagingData() {
  // 1. Export production data
  const businesses = await prodDb.query(`
    SELECT id, name, city_id, category, lat, lng, halal_status, trust_tier,
           hours, phone, website, created_at
           -- Deliberately exclude: owner_id, owner_phone (PII)
    FROM businesses WHERE is_active = true
  `);

  const events = await prodDb.query(`
    SELECT id, title, city_id, category, start_time, end_time, lat, lng,
           is_free, created_at
           -- Exclude: organizer_id, contact details
    FROM events WHERE start_time > NOW() - INTERVAL '7 days'
  `);

  // 2. Generate fake users (never copy real users to staging)
  const fakeUsers = generateFakeUsers(100);  // faker.js

  // 3. Import to staging
  await stagingDb.query('TRUNCATE TABLE businesses CASCADE');
  await stagingDb.query('TRUNCATE TABLE users CASCADE');
  // ... bulk insert

  console.log(`Synced: ${businesses.length} businesses, ${events.length} events`);
}
```

---

## 5. Secrets Management

### Doppler — Central Secrets Management

```
Why Doppler over AWS Secrets Manager or environment variables in Railway/Fly:
  - One source of truth across local, CI, staging, production
  - No .env files to copy around (the #1 cause of leaked secrets)
  - Sync to Railway, Fly.io, GitHub Actions natively
  - Secret rotation without code deploys
  - Audit trail: who changed what, when
  - Free tier: up to 5 projects, sufficient for MVP through early MMP
  - Cost at scale: $10/month for team plan

Alternatives:
  - AWS Secrets Manager: better if you're all-in on AWS (adds $0.40/secret/month + API calls)
  - HashiCorp Vault: overkill until you have a dedicated platform team
  - 1Password Secrets Automation: good UX, $19/month for teams
```

### Doppler Project Structure

```
Doppler Project: muzgram

  Configs:
    dev       (local development)
    ci        (GitHub Actions)
    staging   (staging environment)
    production(production environment)

  Secret inheritance:
    dev        → inherits from root, overrides locally
    ci         → inherits from root, uses test keys
    staging    → inherits from root, uses staging keys
    production → inherits from root, uses live production keys

  Sync targets:
    production → Fly.io muzgram-api (auto-sync on secret change)
    production → Fly.io muzgram-worker (auto-sync)
    staging    → Fly.io muzgram-api-staging (auto-sync)
    ci         → GitHub Actions secrets (sync via Doppler GitHub Action)
```

### Secret Inventory

```
# Core infrastructure
DATABASE_URL                    # Neon pooled connection string
DATABASE_REPLICA_URL            # Neon read replica connection string
REDIS_URL                       # Upstash Redis URL
UPSTASH_REDIS_REST_URL          # Upstash HTTP URL (for cache client)
UPSTASH_REDIS_REST_TOKEN        # Upstash auth token

# Storage
CLOUDFLARE_ACCOUNT_ID           # R2 account ID
R2_ACCESS_KEY_ID                # R2 access key
R2_SECRET_ACCESS_KEY            # R2 secret key
R2_BUCKET_NAME                  # muzgram-production
CDN_BASE_URL                    # https://media.muzgram.com

# Auth
CLERK_SECRET_KEY                # sk_live_xxxxx
CLERK_WEBHOOK_SECRET            # whsec_xxxxx (Clerk webhook signature)
JWT_SECRET                      # Internal service-to-service JWT (256-bit random)

# Payments
STRIPE_SECRET_KEY               # sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY          # pk_live_xxxxx (safe to expose to client)
STRIPE_WEBHOOK_SECRET           # whsec_xxxxx

# Notifications
EXPO_ACCESS_TOKEN               # For Expo Push API
FCM_SERVER_KEY                  # Firebase (backup push, not primary)

# Third-party APIs
MAPBOX_SECRET_TOKEN             # sk.xxxxx (server-side only)
MAPBOX_PUBLIC_TOKEN             # pk.xxxxx (exposed to mobile app, rate-limited)
GOOGLE_VISION_API_KEY           # AI moderation
OPENAI_API_KEY                  # Text moderation (ambiguous cases only)
TYPESENSE_API_KEY               # Admin API key (write access)
TYPESENSE_SEARCH_ONLY_API_KEY   # Read-only key (safe to use in mobile app)

# Monitoring
GRAFANA_API_KEY                 # For alert routing
SENTRY_DSN                      # Crash reporting (if using Sentry)

# Internal
NODE_ENV                        # production
PORT                            # 3000
LOG_LEVEL                       # info (production), debug (staging)
```

### Secret Rotation Schedule

```
Quarterly rotation (automated where possible):
  - DATABASE_URL: Neon auto-rotates on request
  - CLERK_SECRET_KEY: Rotate in Clerk dashboard → Doppler auto-syncs → Fly restarts
  - R2_ACCESS_KEY_ID: Rotate in Cloudflare → Doppler → Fly restarts
  - JWT_SECRET: Generate new 256-bit random → deploy with backward compat → remove old

Immediate rotation triggers:
  - Any suspected breach or unauthorized access
  - Developer offboarding
  - GitHub repository visibility change
  - Any secret accidentally committed to Git (even if reverted — the commit log is public)

Secret scanning (continuous):
  - TruffleHog in CI scans every PR diff
  - GitHub secret scanning enabled on repository
  - Gitleaks pre-commit hook (developers install locally):
    npx husky add .husky/pre-commit "npx gitleaks detect --source . --verbose"
```

---

## 6. Backups and Disaster Recovery

### Backup Strategy by Data Type

| Data Type | Provider | Backup Method | RPO | RTO | Retention |
|---|---|---|---|---|---|
| PostgreSQL | Neon | Continuous WAL archiving | 5 min | 15 min | 30 days PITR |
| PostgreSQL | Neon | Daily snapshots | 24h | 30 min | 7 days |
| Redis | Upstash | Managed snapshots | 1h | 10 min | 7 days |
| Media (R2) | Cloudflare R2 | Cross-region replication | 0 (sync) | Instant | Permanent |
| Config/Secrets | Doppler | Version history | Immediate | Immediate | Permanent |
| Code | GitHub | Git history | Immediate | Immediate | Permanent |
| App config | IaC (fly.toml) | Git history | Immediate | Immediate | Permanent |

**RPO = Recovery Point Objective** (max data loss acceptable)
**RTO = Recovery Time Objective** (max time to restore service)

### Neon PITR (Point-in-Time Recovery)

```bash
# Neon's continuous WAL archiving is the most powerful backup feature:
# You can restore to any second in the past 30 days.

# Scenario: accidental DELETE of all listings in a city
# Recovery: restore Neon branch to the exact moment before the DELETE

# Via Neon console:
# 1. Go to project → Branches
# 2. Create branch from main at timestamp: "2026-04-20 14:32:00"
# 3. The branch is ready in < 10 seconds (no data transfer, just pointer update)
# 4. Connect staging app to this branch to verify data is intact
# 5. Export just the affected table:
#    pg_dump --table=listings "postgresql://...branch-url..." > listings_backup.sql
# 6. Import into production:
#    psql "postgresql://...production-url..." < listings_backup.sql

# Via Neon API (automatable):
curl -X POST "https://console.neon.tech/api/v2/projects/${PROJECT_ID}/branches" \
  -H "Authorization: Bearer ${NEON_API_KEY}" \
  -d '{
    "branch": {
      "name": "recovery-2026-04-20-1432",
      "parent_id": "br-main-xxxx",
      "parent_timestamp": "2026-04-20T14:32:00.000Z"
    }
  }'
```

### Additional PostgreSQL Backup (Belt-and-Suspenders)

```bash
# Weekly pg_dump to Cloudflare R2 (in addition to Neon PITR)
# This protects against: Neon outage, accidental project deletion

# apps/worker/src/jobs/weekly-backup.job.ts (runs Sunday 2am CT)
@Cron('0 2 * * 0')
async runWeeklyBackup() {
  const timestamp = format(new Date(), 'yyyy-MM-dd');
  const filename = `backup-${timestamp}.sql.gz`;
  const tempPath = `/tmp/${filename}`;

  // pg_dump with compression
  await exec(`pg_dump "${process.env.DATABASE_URL}" | gzip > ${tempPath}`);

  // Upload to R2 in a private backup bucket
  await this.r2.send(new PutObjectCommand({
    Bucket: 'muzgram-backups',   // Private bucket, not public
    Key: `postgres/${filename}`,
    Body: fs.createReadStream(tempPath),
    ContentType: 'application/gzip',
  }));

  // Verify backup file size (sanity check — empty backup = problem)
  const stats = fs.statSync(tempPath);
  if (stats.size < 1024) {
    await this.alerting.critical('Weekly backup appears empty', { size: stats.size });
  }

  // Cleanup
  fs.unlinkSync(tempPath);
  this.logger.log(`Weekly backup complete: ${filename} (${stats.size} bytes)`);

  // Prune backups older than 90 days
  await this.pruneOldBackups('postgres/', 90);
}
```

### R2 Cross-Region Replication

```
Cloudflare R2 stores data in multiple data centers by default (not just one region).
R2 is not single-region like S3 — it's Cloudflare's global object storage.

Additional protection: R2 Object Versioning
  - Enable versioning on muzgram-production bucket
  - Accidental deletes: object is soft-deleted, previous version retrievable
  - Overwrites: previous version preserved for 30 days

R2 versioning config (Cloudflare dashboard or Wrangler):
  wrangler r2 bucket versioning enable muzgram-production
```

### Disaster Recovery Runbook

```
Scenario 1: Fly.io region outage (US-East down)
  Impact: API unavailable for US users
  Response:
    1. Fly.io automatically fails over to machines in other regions if multi-region configured
    2. If single-region: DNS failover (Cloudflare → secondary API endpoint)
    3. Secondary region pre-warmed: keep 1 machine in us-west (lax) always running
    4. Neon: no action needed — Neon is multi-AZ by default
  RTO: 5–10 minutes if secondary region configured

Scenario 2: Database corruption / accidental mass delete
  Impact: Data loss
  Response:
    1. Immediately set API to maintenance mode (return 503 on all writes):
       flyctl secrets set MAINTENANCE_MODE=true --app muzgram-api
    2. Create Neon branch from PITR timestamp before incident
    3. Verify data integrity in the restored branch
    4. Export affected tables from restored branch
    5. Import into production
    6. Disable maintenance mode
  RTO: 30–60 minutes depending on data volume

Scenario 3: R2 accidental deletion of user media
  Impact: Broken images in app
  Response:
    1. R2 versioning: restore previous object version via Cloudflare console
    2. If no versioning: check R2 bucket logs for deleted object keys
    3. If original gone: check if Cloudflare CDN still has cached version
       (cache TTL is 1 year for immutable photos — likely still cached)
  RTO: Minutes for individual files

Scenario 4: Stripe webhook secret compromised
  Impact: Billing webhooks unverifiable → payment events dropped
  Response:
    1. Rotate webhook secret in Stripe dashboard
    2. Update in Doppler → auto-syncs to Fly.io within 60 seconds
    3. Replay missed webhook events from Stripe dashboard (Stripe stores 72h)
  RTO: < 5 minutes

Scenario 5: Clerk auth service outage (3rd-party)
  Impact: No new logins, existing sessions still valid (JWT)
  Response:
    1. Existing JWTs remain valid for their TTL (24h)
    2. Display in-app message: "Login temporarily unavailable"
    3. Monitor Clerk status page: status.clerk.com
    4. No action required — Clerk has 99.99% SLA
  RTO: Wait for Clerk recovery (typically < 30 minutes)
```

---

## 7. Monitoring and Observability

### Monitoring Stack (Cost-Optimized 2026)

```
MVP monitoring (free):
  Fly.io built-in metrics (CPU, RAM, request rate, error rate)
  Railway built-in logs
  Upstash dashboard (Redis metrics)
  Neon dashboard (PostgreSQL metrics)
  Expo dashboard (push notification delivery rate)
  Sentry free tier (5K errors/month, crash reporting for mobile)
  Cloudflare Analytics (traffic, cache hit rate, threat score)

MMP monitoring (~$50/month):
  Grafana Cloud free tier (50GB logs, 10K metrics series, 50GB traces)
  + Sentry Team ($26/month for 100K errors + performance)

Production monitoring ($200–500/month):
  Grafana Cloud Pro OR
  Self-hosted Grafana + Prometheus + Loki + Tempo on Hetzner ($40/month)
  Sentry Business ($80/month)
  PagerDuty free tier (5 users, 1 escalation policy)
```

### OpenTelemetry SDK Setup (Production)

```typescript
// apps/api/src/instrumentation.ts — loaded BEFORE main.ts

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const resource = new Resource({
  [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME ?? 'muzgram-api',
  [ATTR_SERVICE_VERSION]: process.env.GIT_SHA ?? 'unknown',
  'deployment.environment': process.env.NODE_ENV,
  'city.active': process.env.ACTIVE_CITIES ?? 'chicago',
});

const sdk = new NodeSDK({
  resource,

  // Traces → Grafana Tempo (or Honeycomb, or Jaeger)
  traceExporter: new OTLPTraceExporter({
    url: `${process.env.OTEL_COLLECTOR_URL}/v1/traces`,
    headers: { Authorization: `Bearer ${process.env.GRAFANA_OTLP_TOKEN}` },
  }),

  // Metrics → Grafana Mimir (Prometheus-compatible)
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `${process.env.OTEL_COLLECTOR_URL}/v1/metrics`,
      headers: { Authorization: `Bearer ${process.env.GRAFANA_OTLP_TOKEN}` },
    }),
    exportIntervalMillis: 15000,  // Export every 15 seconds
  }),

  // Logs → Grafana Loki
  logRecordProcessors: [
    new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: `${process.env.OTEL_COLLECTOR_URL}/v1/logs`,
        headers: { Authorization: `Bearer ${process.env.GRAFANA_OTLP_TOKEN}` },
      })
    ),
  ],

  // Auto-instruments: HTTP, Express, NestJS, PostgreSQL, Redis, Bull, AWS SDK
  instrumentations: [getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-fs': { enabled: false },  // Too noisy
    '@opentelemetry/instrumentation-dns': { enabled: false }, // Too noisy
  })],
});

sdk.start();

process.on('SIGTERM', () => sdk.shutdown());
```

### Structured Logging

```typescript
// packages/logger/src/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  // JSON output in production — parsed by Loki/CloudWatch/Datadog automatically
  // Pretty output in development — human-readable
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,

  // Base fields on every log line — makes filtering trivial in Grafana
  base: {
    service: process.env.SERVICE_NAME,
    version: process.env.GIT_SHA,
    env: process.env.NODE_ENV,
  },

  // Redact sensitive fields from logs — never log PII
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'body.phone',
      'body.password',
      'user.phone',
      '*.cardNumber',
      '*.cvv',
    ],
    censor: '[REDACTED]',
  },
});

// Usage — every log includes trace_id for correlation with traces
export function logWithTrace(traceId: string) {
  return logger.child({ traceId });
}
```

### Grafana Dashboard — Muzgram-Specific Panels

```
Dashboard: Muzgram Operations

Row 1 — Real-time Health
  Panel: API Request Rate (req/s) — line chart, 1min window
  Panel: API Error Rate (%) — stat, red if > 1%
  Panel: Feed Composition P95 (ms) — gauge, red if > 500ms
  Panel: Active Users (last 5min) — stat
  Panel: Push Notification Delivery Rate — stat, red if < 90%

Row 2 — Business Intelligence (the actual product metrics)
  Panel: DAU by city — stacked bar chart
  Panel: New listings today — stat per city
  Panel: Events happening tonight — stat
  Panel: WhatsApp shares (last 24h) — stat
  Panel: Map tab open rate — percentage

Row 3 — Database
  Panel: PostgreSQL connections (primary + replica)
  Panel: Slow queries (> 100ms) — table with query text
  Panel: Neon compute credits used — gauge
  Panel: Redis memory usage — gauge

Row 4 — Infrastructure
  Panel: Fly.io machine count by service — bar chart
  Panel: Upstash Redis requests/sec — line chart
  Panel: R2 bandwidth (egress) — stat
  Panel: Typesense index size — stat

Row 5 — Moderation Queue
  Panel: Pending moderation items — stat (red if > 20)
  Panel: Auto-approved vs manual review ratio — pie chart
  Panel: Reports in last 24h — stat
  Panel: Average moderation time — stat
```

### Alert Configuration (Grafana Alerting)

```yaml
# grafana/alerts/production.yaml

groups:
  - name: critical
    rules:
      - alert: APIDown
        expr: up{job="muzgram-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "API is down"
          runbook: "https://notion.muzgram.com/runbooks/api-down"

      - alert: HighErrorRate
        expr: |
          rate(http_requests_total{status=~"5.."}[5m])
          / rate(http_requests_total[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Error rate {{ $value | humanizePercentage }} (threshold: 5%)"

      - alert: FeedSlowP95
        expr: |
          histogram_quantile(0.95,
            rate(feed_composition_duration_ms_bucket[5m])
          ) > 1000
        for: 3m
        labels:
          severity: critical
        annotations:
          summary: "Feed P95 latency {{ $value }}ms — users experiencing slow loads"

      - alert: DatabaseConnectionsHigh
        expr: pg_stat_activity_count > 80
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL connections at {{ $value }}/100 — add PgBouncer soon"

  - name: business-health
    rules:
      - alert: EmptyFeedRate
        expr: |
          rate(feed_empty_responses_total[10m])
          / rate(feed_responses_total[10m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "5%+ of users seeing empty feed — content emergency"

      - alert: ModerationQueueBacklog
        expr: moderation_queue_depth > 50
        for: 15m
        labels:
          severity: warning

      - alert: PushDeliveryLow
        expr: |
          rate(notifications_delivered_total[10m])
          / rate(notifications_sent_total[10m]) < 0.80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Push delivery rate {{ $value | humanizePercentage }} — check Expo Push"
```

### Mobile App Monitoring

```typescript
// apps/mobile/src/lib/monitoring.ts

import * as Sentry from '@sentry/react-native';

// Initialize Sentry for crash reporting
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_ENV,
  release: `muzgram@${Application.nativeApplicationVersion}`,

  // Performance monitoring — track slow screens
  tracesSampleRate: process.env.EXPO_PUBLIC_ENV === 'production' ? 0.1 : 1.0,
  // 10% of sessions in production (enough for trends without overhead)

  // Don't capture: PII, location data, user content
  beforeSend(event) {
    delete event.user?.email;
    delete event.user?.username;
    return event;
  },
});

// Custom breadcrumbs for debugging production issues
export function trackScreenView(screenName: string) {
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: screenName,
    level: 'info',
  });
}

// Track JS bundle performance
export function trackFeedLoad(durationMs: number, itemCount: number) {
  Sentry.metrics.distribution('feed_load_duration', durationMs, {
    unit: 'millisecond',
    tags: { item_count: String(itemCount) },
  });
}
```

---

## 8. Cost-Conscious Decisions — Startup Stage

### The Cost Philosophy

Every infrastructure decision at the startup stage should pass this test:
**"Does this cost provide direct user value, or am I paying for ops comfort?"**

Kubernetes, multi-region active-active, custom CDN configuration, Datadog, and Terraform at day zero are ops comfort. Users don't feel these. Save the money for the things that make the product better.

### MVP Cost Breakdown (Target: < $100/month)

```
Fixed costs:
  Railway (API + Worker + DB + Redis) ────── $40/month
  Cloudflare R2 (pay-per-use, < 50GB) ───── $2/month
  Cloudflare Free tier ───────────────────── $0/month
  Doppler Starter ────────────────────────── $0/month
  EAS Build (free tier, 30 builds/month) ─── $0/month
  Sentry (free tier, 5K errors) ───────────── $0/month
  Grafana Cloud free tier ────────────────── $0/month
  GitHub (free for private repos) ────────── $0/month
  Domain (muzgram.com) ───────────────────── $1/month (~$12/year)
  ─────────────────────────────────────────────────────
  Total: ~$43/month

Variable costs (traffic-dependent):
  Clerk (free: 10K MAU) ──────────────────── $0 until 10K users
  Mapbox (free: 50K map loads/month) ──────── $0 until 50K loads/month
  Google Vision (free: 1K units/month) ────── ~$3–10 at 1K–3K photos/month
  Expo Push (free) ────────────────────────── $0

At 500 users (MVP target): total ~$55/month
At 2,000 users (good traction): total ~$80/month
At 5,000 users (MMP ready): total ~$130/month → switch to production stack
```

### Cost Optimization Decisions Made

**1. Cloudflare R2 over AWS S3**
S3 charges for egress (data leaving S3 to users): $0.09/GB. At 1TB/month of media traffic, that's $90/month just in egress. R2 charges zero egress. At Muzgram's media-heavy use case (photos on every card), this matters from month 1.

**2. Neon over AWS RDS**
RDS minimum (db.t3.micro): $15/month. But it runs 24/7 at full spec. Neon autoscales to zero when idle — in staging and preview environments, you pay nothing when no one's using them. PR preview branches are instant and free. Neon at scale costs similar to RDS but you only pay for what you use.

**3. Upstash Redis over ElastiCache**
ElastiCache minimum (cache.t3.micro): $25/month, always-on. Upstash: $0 until you exceed 10K commands/day. At MVP, Redis is mostly idle. Pay-per-request is the right model until you're sustaining thousands of cache operations per minute.

**4. Fly.io over AWS ECS/Fargate**
Fargate requires: ECS cluster, ALB ($18/month), ECR registry, VPC, NAT Gateway ($45+/month), IAM roles, security groups. Fly.io: `flyctl deploy`. The ops cost of Fargate is 2–3 days/month of engineering time at startup scale. Fly.io is the right call until you have a dedicated DevOps hire or a specific AWS service dependency.

**5. Self-hosted Typesense on Hetzner over Algolia**
Algolia at 1M search operations: ~$500/month. Typesense on a Hetzner CPX21 (3vCPU/4GB): $12/month. Same feature set (typo tolerance, faceting, geo-search, instant results). The tradeoff is you manage the server — but one deploy script handles this.

**6. Grafana Cloud free tier over Datadog**
Datadog at 3 hosts: $54/month minimum, quickly becomes $200+/month with APM and logs. Grafana Cloud free tier: 50GB logs, 10K active metrics series, 50GB traces — covers Muzgram through MMP. When you outgrow free tier, Grafana Pro is $29/month, not $200.

**7. GitHub Actions over CircleCI or BuildKite**
GitHub Actions: free for public repos, 2,000 minutes/month free for private repos. Muzgram's CI pipeline (test + build + deploy): ~8 minutes per run. Free tier covers ~250 deployments/month. That's more than enough.

### What NOT to Buy Yet

| Service | Why Not Yet | Buy When |
|---|---|---|
| AWS WAF | Cloudflare free tier handles DDoS | When you have dedicated security requirements |
| Terraform / Pulumi | flyctl + railway CLI is sufficient | When you have > 2 engineers managing infra |
| Kubernetes | Massive ops overhead, wrong scale | When you have a dedicated platform team |
| DataDog | Too expensive for the insight | When you have > $50K MRR |
| PagerDuty paid | Free tier (5 users) is fine | When you have on-call rotation > 1 person |
| Multi-region | Not needed for Chicago launch | When you launch international cities |
| CDN for API responses | Cloudflare caches static assets, API is dynamic | Maybe never — APIs aren't CDN-friendly |
| Dedicated DB admin tool | Neon console + DBeaver (free) is fine | When queries get complex enough to need EXPLAIN ANALYZE on prod |

---

## 9. Scale-Up Decisions — Growth Stage

### The Scale Triggers

These are the specific metrics that signal it's time to upgrade each component. Not "when it feels slow" — when a specific number is crossed.

| Component | Current | Scale Trigger | Next Step | Cost Impact |
|---|---|---|---|---|
| API (Railway) | 1 container | > 200 req/s sustained | Migrate to Fly.io, 3 containers | +$30/month |
| PostgreSQL | Railway | > 80 connections OR > 100GB | Migrate to Neon | +$30/month |
| Redis | Railway | > 90% memory | Migrate to Upstash | Similar cost, better scaling |
| Workers | Railway | Bull queue > 500 jobs backed up | Separate worker containers, add replicas | +$20/month |
| Search | PostgreSQL FTS | > 500K content rows OR search > 500ms P95 | Deploy Typesense on Hetzner | +$12/month |
| Notifications | Inline in API | > 10K pushes/day OR latency > 5 sec | Dedicated notification service | +$10/month |
| Analytics | PostgreSQL | > 5M activity_logs rows | Add TimescaleDB OR move to ClickHouse | +$20/month |
| CDN | Cloudflare Free | > 1M requests/day OR need WAF | Cloudflare Pro | +$20/month |
| Monitoring | Free tiers | > 50GB logs/month | Grafana Cloud Pro | +$29/month |

### Migration Sequence (No Big Bang)

```
Week 1: Railway → Fly.io (API + Worker)
  - Deploy to Fly.io in parallel with Railway
  - Shift 10% of Cloudflare traffic to Fly.io
  - Monitor error rates, latency
  - Shift 100% when stable
  - Shut down Railway services

Week 2: Railway PostgreSQL → Neon
  - Create Neon project
  - Run pg_dump from Railway, pg_restore to Neon
  - Update DATABASE_URL in Doppler
  - Verify connection + run smoke tests
  - Switch over (< 5 min downtime window)

Week 3: Railway Redis → Upstash
  - Start fresh (Redis is ephemeral — cache and Bull state are transient)
  - Update REDIS_URL in Doppler
  - Instant switch, no data migration

Week 4: Deploy Typesense
  - Provision Hetzner CPX21 VPS
  - Install Typesense, join Tailscale
  - Run full index from PostgreSQL
  - Deploy search behind feature flag
  - Monitor search quality, enable 100%
```

### Fly.io Auto-Scaling Configuration

```toml
# Production auto-scaling — Muzgram's traffic is bursty (Ramadan nights, Eid)
# Need to scale fast, not just slow-and-steady

[http_service.concurrency]
  type = "requests"
  hard_limit = 250     # Start new machine when current machines hit 250 concurrent requests
  soft_limit = 200     # Begin warming new machine at 200

# Fly.io machines: start in < 500ms (not cold start like Lambda)
# Scale up: near-instant
# Scale down: after 5 minutes of low traffic

# Minimum machines: 3 (never drop below 3 — avoids cold start during sudden bursts)
# Maximum machines: 6 (cap prevents runaway costs from traffic spike or DDoS)
# Cost: 3 machines × $15/month = $45/month baseline, max $90/month during peak

# Ramadan prep: manually set min_machines_running = 5 during Ramadan season
# Then back to 3 after Eid
```

### Database Read Replica Strategy

```typescript
// When to add a read replica: when primary CPU > 70% consistently

// TypeORM multi-datasource setup
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        // Primary: writes only
        type: 'postgres',
        url: process.env.DATABASE_URL,
        name: 'primary',
        entities: [...],
        migrations: [...],
        migrationsRun: true,
      }),
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        // Replica: reads only — feed, map, search queries go here
        type: 'postgres',
        url: process.env.DATABASE_REPLICA_URL,
        name: 'replica',
        entities: [...],
        // NO migrations on replica — it follows primary via streaming replication
      }),
    }),
  ],
})

// In services: explicitly choose which connection to use
@Injectable()
export class FeedService {
  constructor(
    @InjectDataSource('replica') private replica: DataSource,
    @InjectDataSource('primary') private primary: DataSource,
  ) {}

  async getFeed(query: FeedQuery) {
    // READ → replica (never touches primary)
    return this.replica.query('SELECT ...', [query.cityId]);
  }

  async saveItem(userId: string, listingId: string) {
    // WRITE → primary only
    return this.primary.query('INSERT INTO saves ...', [userId, listingId]);
  }
}
```

### ClickHouse Migration for Analytics

```
Trigger: activity_logs table > 5M rows AND analytics queries > 30 seconds

ClickHouse is a columnar database optimized for analytical queries.
The same query that takes 45 seconds on PostgreSQL takes 200ms on ClickHouse.

Setup: Hetzner CCX13 (2vCPU/8GB/80GB) at $30/month

Schema design (columnar — different from PostgreSQL):
  CREATE TABLE events (
    event_date    Date,
    event_time    DateTime,
    user_id       String,
    city_id       LowCardinality(String),
    event_type    LowCardinality(String),
    entity_id     String,
    entity_type   LowCardinality(String),
    session_id    String,
    platform      LowCardinality(String),
    app_version   LowCardinality(String)
  ) ENGINE = MergeTree()
  PARTITION BY toYYYYMM(event_date)
  ORDER BY (city_id, event_type, event_date, user_id)
  TTL event_date + INTERVAL 2 YEAR;
  -- Automatically deletes data older than 2 years

Sync pipeline:
  PostgreSQL activity_logs → Bull job every 5 minutes → ClickHouse
  OR: Kafka topic → ClickHouse Kafka engine (at higher scale)

Retention queries that take 45s on PostgreSQL → 200ms on ClickHouse:
  SELECT
    toStartOfDay(event_time) AS day,
    city_id,
    uniqExact(user_id) AS dau,
    countIf(event_type = 'listing_saved') AS saves,
    countIf(event_type = 'listing_shared') AS shares
  FROM events
  WHERE event_date BETWEEN '2026-01-01' AND '2026-04-30'
  GROUP BY day, city_id
  ORDER BY day;
```

---

## 10. Cloud Provider Recommendations and Tradeoffs

### The Decision Framework

For a startup in 2026, the cloud choice is not "AWS vs GCP vs Azure." Those are all valid at scale. The real choice is: **how much ops do you want to manage, and what's your time worth?**

| Provider Category | Ops Overhead | Cost Efficiency | Best For |
|---|---|---|---|
| Railway / Render | Zero | Medium | MVP, first 6 months |
| Fly.io | Low | High | MMP, multi-city, startup production |
| Hetzner | Medium | Highest | Specific workloads (Typesense, ClickHouse) |
| AWS / GCP / Azure | High | Medium-High at scale | Enterprise, specific managed services |
| Cloudflare (R2, Workers, Pages) | Near-zero | Highest for media/edge | Always — replace S3 and CloudFront |

### Recommended Stack by Stage

```
Stage 1 — MVP (0–5K users, Chicago only)
  Compute:     Railway
  Database:    Railway PostgreSQL OR Neon (Neon is better if any CI/CD usage)
  Cache:       Railway Redis OR Upstash (Upstash if you use serverless anywhere)
  Storage:     Cloudflare R2 (non-negotiable — egress pricing makes S3 wrong)
  CDN:         Cloudflare Free
  Secrets:     Doppler Starter (free)
  CI/CD:       GitHub Actions (free)
  Mobile:      Expo EAS Build (free tier)
  Monitoring:  Grafana Cloud free + Sentry free

Stage 2 — MMP (5K–50K users, 2–3 cities)
  Compute:     Fly.io (migrate from Railway)
  Database:    Neon Serverless (primary + 1 read replica)
  Cache:       Upstash Redis Cluster
  Search:      Typesense on Hetzner CPX21
  Storage:     Cloudflare R2 (unchanged)
  CDN:         Cloudflare Pro ($20/month — WAF, bot management)
  Secrets:     Doppler Team ($10/month)
  CI/CD:       GitHub Actions
  Mobile:      EAS Build Pro ($99/month)
  Monitoring:  Grafana Cloud Pro ($29/month) + Sentry Team ($26/month)

Stage 3 — Production (50K–500K users, 5+ US cities)
  Compute:     Fly.io multi-region (iad + lax)
  Database:    Neon (primary + 2 replicas) OR migrate to managed PostgreSQL on AWS
  Cache:       Upstash Redis Global
  Search:      Typesense 3-node cluster (Hetzner)
  Analytics:   ClickHouse on Hetzner + PostHog Cloud
  Storage:     Cloudflare R2 (unchanged)
  CDN:         Cloudflare Pro or Business
  Secrets:     Doppler Team
  CI/CD:       GitHub Actions
  Monitoring:  Self-hosted Grafana stack on Hetzner OR Grafana Cloud Pro

Stage 4 — Global (500K+ users, international)
  Compute:     AWS ECS Fargate (multi-region) OR Fly.io global (simpler)
  Database:    Neon global OR CockroachDB serverless (cross-region writes)
  Cache:       Upstash Global (already designed for this)
  Search:      Typesense Cloud OR Algolia (operational simplicity at that scale)
  Analytics:   ClickHouse Cloud OR BigQuery
  Storage:     Cloudflare R2 (still the best egress pricing globally)
  CDN:         Cloudflare Enterprise (negotiated pricing)
  Monitoring:  Datadog (justified at $1M+ ARR when ops team exists)
```

### Provider Deep Dives

#### Cloudflare — Always Use This

```
Use Cloudflare for:
  - R2: object storage (replace S3) — zero egress pricing
  - DNS: fastest global DNS, free DNSSEC
  - CDN: media caching (photos, thumbnails served from 300+ PoPs globally)
  - DDoS: free Layer 3/4 protection, Layer 7 WAF from $20/month
  - Workers: edge compute for geo-routing, auth offload, personalization
  - Pages: static site hosting (marketing site, API docs) — free
  - KV: edge key-value store for city-level feature flags and static data
  - Turnstile: CAPTCHA alternative (better UX than reCAPTCHA, free)

Never use Cloudflare for:
  - Primary database (not their product)
  - Long-running background jobs (Workers have 30s CPU limit)
  - WebSocket connections (Workers do support it but primary API is better)

R2 vs S3 for Muzgram specifically:
  S3 egress: $0.09/GB. At 500GB/month media traffic = $45/month JUST in egress
  R2 egress: $0.00/GB. That's $45/month back in your pocket at low scale,
  $450+/month at 5TB scale. R2 is the correct choice, not a tradeoff.
```

#### Fly.io — The Right Production Compute

```
Why Fly.io over Railway for production:
  - Persistent volumes (Railway volumes are being deprecated)
  - Multi-region with <500ms machine startup (not cold-start serverless)
  - Private WireGuard network between services (no extra cost)
  - Rolling/blue-green deploys natively
  - flyctl secrets: manages secrets per-app (supplement with Doppler)
  - Machine-level SSH for debugging production issues
  - CPU burst: shared-cpu machines can burst above their allocation

Why Fly.io over AWS ECS:
  - No VPC, NAT Gateway, ALB, ECR, IAM roles, security groups to manage
  - ECS Fargate + ALB minimum cost: $45/month before you add anything
  - Fly.io minimum: $5/month (1 machine)
  - Ops overhead difference: 8h/month to manage ECS vs 1h/month for Fly
  - At $150K ARR, that 7h difference = more product shipped

When to switch from Fly.io to AWS:
  - You have a DevOps hire dedicated to infrastructure
  - You need AWS-specific services (SageMaker, Bedrock, Aurora, SQS)
  - You have enterprise customers requiring AWS infrastructure compliance
  - Your team already has deep AWS expertise
```

#### Neon — The Right PostgreSQL Choice

```
Why Neon for Muzgram specifically:
  1. Branch-per-PR: every pull request gets its own isolated PostgreSQL database
     → Instant (no pg_restore, just a pointer update)
     → Test migrations safely before production
     → Developers can experiment without affecting staging data
     → Cost: ~$0 for inactive branches (auto-suspend)

  2. Scale-to-zero in dev/staging: staging database costs nothing when not in use
     → Neon suspends compute after 5 minutes of inactivity
     → Wakes up in <1 second when first query arrives
     → Staging database: $0 at 3am on a Tuesday

  3. Autoscaling compute: primary scales 0.25vCPU → 4vCPU based on load
     → Handles Ramadan night traffic spikes automatically
     → No DBA intervention, no manual resize

  4. Built-in connection pooler: Neon includes PgBouncer on port :6543
     → Skip the separate PgBouncer setup
     → Pool supports 10,000 simultaneous connections → 10 actual PostgreSQL connections

  5. PITR to any second in 30 days (documented in Section 6)

Neon cost estimate:
  MVP (low traffic):  $19/month (Neon Launch plan)
  MMP (medium):       $69/month (Neon Scale plan — includes read replica)
  Production:         ~$150-300/month depending on compute usage
  
  vs RDS db.t3.small: $34/month (always-on, no branching, manual failover)
  vs PlanetScale: similar pricing, but MySQL not PostgreSQL (PostGIS requires PG)
```

#### Hetzner — Specific Workloads Only

```
Hetzner Cloud (EU-based, cheapest EU/US VPS pricing):
  CPX11 (2vCPU/2GB): $4.90/month  → Typesense single-node
  CPX21 (3vCPU/4GB): $9.90/month  → Typesense recommended
  CPX31 (4vCPU/8GB): $18.90/month → Typesense cluster node OR ClickHouse
  CCX13 (2vCPU/8GB/160GB NVMe): $30/month → ClickHouse (needs NVMe for columnar I/O)

Use Hetzner for: Typesense, ClickHouse, Grafana stack (self-hosted)
Use Fly.io for: Your application containers (better DX, rolling deploys, private networking)
Don't use Hetzner for: Primary API or database (no managed database, no auto-scaling)

Hetzner + Tailscale pattern:
  - Hetzner VPS runs Typesense
  - Fly.io machines connect via Tailscale (WireGuard mesh)
  - Typesense never exposed publicly — internal only
  - SSH access via Tailscale: no public SSH port needed
  - Cost: $0 for Tailscale (free tier covers this)
```

#### AWS — When It Makes Sense

```
AWS services worth using even at startup stage:
  - SES (Simple Email Service): transactional email at $0.10/1K emails
    → Better deliverability than SendGrid for the price
    → Setup: 1 hour. Use for: business invoices, critical alerts
  - Route 53: only if you need complex DNS routing (not needed — Cloudflare does this)
  - CloudWatch: only if you're all-in on AWS (Grafana Cloud is better for hybrid)

AWS services NOT worth it at Muzgram scale:
  - RDS: Railway/Neon is better at this stage
  - ElastiCache: Upstash is better for startup
  - S3: R2 is better (egress pricing)
  - ECS/Fargate: Fly.io is better (ops overhead)
  - API Gateway: NestJS on Fly handles this
  - Lambda: Not the right shape for a NestJS monolith
  - CloudFront: Cloudflare CDN does this and includes the origin R2

AWS becomes compelling when:
  - Series A+ company with dedicated DevOps
  - Need specific AWS services (Bedrock for AI features, Rekognition for moderation)
  - Enterprise sales requiring AWS compliance attestations
  - Team has strong AWS expertise already
```

### Final Provider Matrix

```
Service          | MVP          | MMP         | Production    | Why
─────────────────┼──────────────┼─────────────┼───────────────┼────────────────────
API Compute      | Railway      | Fly.io      | Fly.io        | Progressive complexity
Database         | Railway PG   | Neon        | Neon          | Branch-per-PR is essential
Redis            | Railway      | Upstash     | Upstash       | Serverless pricing
Object Storage   | Cloudflare R2| R2          | R2            | Zero egress, always
CDN              | Cloudflare ✓ | Cloudflare ✓| Cloudflare ✓  | Best-in-class, free
DNS              | Cloudflare ✓ | Cloudflare ✓| Cloudflare ✓  | Fastest DNS globally
Search           | PG FTS       | Typesense   | Typesense     | Cost vs Algolia
Analytics        | PG           | PostHog     | ClickHouse    | Scale-appropriate
Monitoring       | Free tiers   | Grafana Cld | Grafana Cld   | OpenTelemetry standard
Secrets          | Doppler ✓    | Doppler ✓   | Doppler ✓     | One source of truth
CI/CD            | GH Actions ✓ | GH Actions ✓| GH Actions ✓  | Free, powerful
Mobile Builds    | EAS Free     | EAS Pro     | EAS Pro       | Only option for Expo
Crash Reporting  | Sentry Free  | Sentry Team | Sentry Biz    | Best mobile SDK
Email            | AWS SES      | AWS SES     | AWS SES       | Best deliverability/$
DDoS/WAF         | CF Free      | CF Pro      | CF Pro        | Layer 7 WAF matters
```

---

## Infrastructure Cost Summary

```
Stage         | Monthly Cost | Revenue Context       | Infra % of Revenue
──────────────┼──────────────┼───────────────────────┼───────────────────
MVP Launch    | ~$55         | $0–$2,000 MRR        | < 3% at $2K MRR
Traction      | ~$130        | $2,000–$10,000 MRR   | < 2% at $10K MRR
MMP Active    | ~$350        | $10,000–$50,000 MRR  | < 1% at $50K MRR
Production    | ~$800        | $50,000+ MRR         | < 2% at $50K MRR
US Scale      | ~$2,500      | $200,000+ MRR        | < 2% at $200K MRR

Infrastructure should never exceed 5% of revenue. If it does,
either you're over-provisioned or you have a scaling architecture problem.
The decisions in this document keep infra cost well under that ceiling
through each growth stage.
```

---

## Quick Reference — Day-One Setup Checklist

```
Infrastructure bootstrap (do this once, takes ~4 hours):

Accounts to create:
  [ ] GitHub repository (private)
  [ ] Railway account (muzgram project)
  [ ] Cloudflare account (domain + R2 + CDN)
  [ ] Neon account (PostgreSQL)
  [ ] Upstash account (Redis)
  [ ] Doppler account (secrets)
  [ ] Expo account + EAS setup
  [ ] Sentry account (mobile crash reporting)
  [ ] Grafana Cloud account (monitoring)
  [ ] Clerk account (auth)
  [ ] Stripe account (billing — test mode first)

One-time configuration:
  [ ] Point muzgram.com DNS to Cloudflare
  [ ] Create R2 bucket (muzgram-production)
  [ ] Configure R2 custom domain: media.muzgram.com
  [ ] Create Neon project, run PostGIS migration
  [ ] Create Upstash Redis database
  [ ] Add all secrets to Doppler
  [ ] Connect Doppler → Railway (auto-sync)
  [ ] Set up GitHub Actions workflows (from Section 3)
  [ ] Run first Railway deploy
  [ ] Verify /health endpoint returns 200
  [ ] Verify media upload → R2 → CDN URL works
  [ ] Verify push notification sends and receives
  [ ] Set up Grafana dashboard (import template from Section 7)
  [ ] Configure first Grafana alert (API down)

Done. Ship the app.
```

> Next: When you're ready to begin building — see [11-engineering-execution-plan.md](11-engineering-execution-plan.md) for the sprint-by-sprint build sequence.
