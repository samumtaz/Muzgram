# Muzgram — QA & Testing Strategy

> Last updated: 2026-04-21
> Stack: NestJS API · React Native Expo · PostgreSQL + PostGIS · Redis · Bull queues · Clerk · Stripe · Cloudflare R2 · Expo Push · Mapbox · Google Vision
> Companion docs: 07-backend-architecture.md · 09-mobile-architecture.md · 20-cloud-infrastructure.md

---

## Strategic Framing

Testing for a startup is an investment-vs-risk calculation, not a coverage religion. The goal is:

- **MVP:** Ship without data loss, auth failures, or broken payments. Cover the 5 flows that kill the product if they break.
- **MMP:** Add confidence for the new features that have real money attached (Stripe, lead packages, reviews). Automate regression so new features don't break old ones.
- **Production:** Full observability, load validation, chaos engineering, and release gates. Testing is now a system, not a checklist.

Every test decision in this document is Muzgram-specific. Generic Jest boilerplate lives in documentation. This document lives in the codebase.

---

## Document Map

1. [Unit Testing Strategy](#1-unit-testing-strategy)
2. [Integration Testing Strategy](#2-integration-testing-strategy)
3. [API Testing](#3-api-testing)
4. [Mobile App Testing](#4-mobile-app-testing)
5. [Location & Geolocation Testing](#5-location--geolocation-testing)
6. [Media Upload Testing](#6-media-upload-testing)
7. [Notifications Testing](#7-notifications-testing)
8. [Moderation Workflow Testing](#8-moderation-workflow-testing)
9. [Payment Testing](#9-payment-testing)
10. [Admin Dashboard Testing](#10-admin-dashboard-testing)
11. [Load Testing](#11-load-testing)
12. [Launch Readiness Checklist](#12-launch-readiness-checklist)

---

## Tier Structure

Each section is broken into three tiers:

| Tier | When | Philosophy |
|---|---|---|
| **MVP** | Before Chicago launch | Cover the kill-the-product failures only |
| **MMP** | Before Stripe + search + RSVP ship | Automate regression, cover money flows |
| **Production** | Before multi-city + global scale | System-level confidence, chaos, load gates |

---

## 1. Unit Testing Strategy

### Framework Setup

```typescript
// Jest + ts-jest for NestJS backend
// Vitest for packages/utils, packages/types (faster, ESM-native)
// React Native Testing Library for mobile components

// jest.config.ts (root)
export default {
  projects: [
    '<rootDir>/apps/api/jest.config.ts',
    '<rootDir>/apps/worker/jest.config.ts',
    '<rootDir>/packages/utils/jest.config.ts',
  ],
};

// apps/api/jest.config.ts
export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s', '!**/*.module.ts', '!**/main.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  setupFilesAfterFramework: ['<rootDir>/../test/setup.ts'],
};
```

### MVP — What Gets Unit Tests

**Only pure business logic. Not controllers, not DB calls, not HTTP.**

```typescript
// 1. Feed scoring engine — the heart of the product
// apps/api/src/feed/feed-scoring.service.spec.ts

describe('FeedScoringService', () => {
  let service: FeedScoringService;

  beforeEach(() => {
    service = new FeedScoringService();
  });

  describe('scoreContent', () => {
    it('gives featured listings a +200 boost', () => {
      const item = makeFeedItem({ isFeatured: true });
      const user = makeUserContext({ lat: item.lat, lng: item.lng });
      const score = service.score(item, user);
      expect(score).toBeGreaterThanOrEqual(200);
    });

    it('gives proximity boost for items within 500m', () => {
      const nearby = makeFeedItem({ distanceMeters: 400 });
      const far = makeFeedItem({ distanceMeters: 5000 });
      const user = makeUserContext({});
      expect(service.score(nearby, user)).toBeGreaterThan(service.score(far, user));
    });

    it('gives recency boost for items posted within the last hour', () => {
      const fresh = makeFeedItem({ createdAt: subMinutes(new Date(), 30) });
      const old = makeFeedItem({ createdAt: subDays(new Date(), 7) });
      const user = makeUserContext({});
      expect(service.score(fresh, user)).toBeGreaterThan(service.score(old, user));
    });

    it('gives Tier 4 content +30 trust boost over Tier 0', () => {
      const trusted = makeFeedItem({ authorTrustTier: 4 });
      const untrusted = makeFeedItem({ authorTrustTier: 0 });
      const user = makeUserContext({});
      expect(service.score(trusted, user) - service.score(untrusted, user)).toBe(30);
    });

    it('caps composition: max 1-in-5 featured items', () => {
      const items = [
        makeFeedItem({ isFeatured: true }),
        makeFeedItem({ isFeatured: true }),
        makeFeedItem({ isFeatured: true }),
        makeFeedItem({ isFeatured: false }),
        makeFeedItem({ isFeatured: false }),
      ];
      const composed = service.compose(items, makeUserContext({}));
      const featuredCount = composed.filter(i => i.isFeatured).length;
      expect(featuredCount).toBeLessThanOrEqual(Math.ceil(composed.length / 5));
    });
  });
});
```

```typescript
// 2. Business hours logic — "open now" is used everywhere
// packages/utils/src/hours.spec.ts

describe('isOpenNow', () => {
  it('returns true when current time is within open hours', () => {
    const hours = [{ day: 'friday', open: '11:00', close: '23:00' }];
    // Mock: Friday at 2pm
    jest.setSystemTime(new Date('2026-04-17T14:00:00'));
    expect(isOpenNow(hours)).toBe(true);
  });

  it('returns false when closed for the day', () => {
    const hours = [{ day: 'friday', open: '11:00', close: '23:00' }];
    // Mock: Saturday (no Saturday hours defined)
    jest.setSystemTime(new Date('2026-04-18T14:00:00'));
    expect(isOpenNow(hours)).toBe(false);
  });

  it('handles midnight crossover correctly (open 10pm–2am)', () => {
    const hours = [{ day: 'friday', open: '22:00', close: '02:00' }];
    jest.setSystemTime(new Date('2026-04-18T01:00:00')); // Saturday 1am
    expect(isOpenNow(hours)).toBe(true);
  });

  it('returns false at exactly closing time', () => {
    const hours = [{ day: 'friday', open: '11:00', close: '23:00' }];
    jest.setSystemTime(new Date('2026-04-17T23:00:00'));
    expect(isOpenNow(hours)).toBe(false);
  });

  it('handles Ramadan suhoor hours (3am–5am)', () => {
    const hours = [{ day: 'saturday', open: '03:00', close: '05:00' }];
    jest.setSystemTime(new Date('2026-04-19T04:00:00'));
    expect(isOpenNow(hours)).toBe(true);
  });
});
```

```typescript
// 3. Slug generation — must be deterministic, no collisions
// packages/utils/src/slug.spec.ts

describe('generateListingSlug', () => {
  it('lowercases and hyphenates', () => {
    expect(generateListingSlug('Sabri Nihari Restaurant')).toBe('sabri-nihari-restaurant');
  });

  it('removes special characters', () => {
    expect(generateListingSlug("Al-Basha's Grill & Bar")).toBe('al-bashas-grill-bar');
  });

  it('deduplicates hyphens', () => {
    expect(generateListingSlug('Noon  O  Kabab')).toBe('noon-o-kabab');
  });

  it('is idempotent — same input always same output', () => {
    const slug1 = generateListingSlug('Test Restaurant');
    const slug2 = generateListingSlug('Test Restaurant');
    expect(slug1).toBe(slug2);
  });
});

describe('generateEventSlug', () => {
  it('appends date to prevent collision on recurring events', () => {
    const date = new Date('2026-04-28');
    expect(generateEventSlug('Eid Bazaar', date)).toBe('eid-bazaar-april-28');
  });
});
```

```typescript
// 4. Trust tier permission matrix
// apps/api/src/trust/trust.service.spec.ts

describe('TrustService', () => {
  it('Tier 0 users cannot post', () => {
    expect(canPost(TrustTier.UNVERIFIED)).toBe(false);
  });

  it('Tier 1 users have daily post limit of 5', () => {
    expect(getDailyPostLimit(TrustTier.BASIC)).toBe(5);
  });

  it('Tier 3+ content is auto-approved', () => {
    expect(isContentAutoApproved(TrustTier.VERIFIED)).toBe(true);
    expect(isContentAutoApproved(TrustTier.ESTABLISHED)).toBe(false);
  });

  it('report weight is 2.0 for Tier 4 anchor users', () => {
    expect(getReportWeight(TrustTier.ANCHOR)).toBe(2.0);
  });

  it('auto-hides content when weighted report score reaches 3.0', () => {
    const reports = [
      { weight: 1.0 },  // Tier 3 user
      { weight: 1.0 },  // Tier 3 user
      { weight: 1.0 },  // Tier 3 user
    ];
    expect(shouldAutoHide(reports)).toBe(true);
  });
});
```

```typescript
// 5. SEO metadata generation — title/description formulas
// apps/web/src/lib/seo.spec.ts

describe('generateTitle', () => {
  it('city eat page title includes city name and count', () => {
    const title = TITLE_FORMULAS.cityEat('Chicago', 180);
    expect(title).toContain('Chicago');
    expect(title).toContain('180+');
    expect(title.length).toBeLessThanOrEqual(60);
  });

  it('event title includes event name and date', () => {
    const title = TITLE_FORMULAS.event('Eid Bazaar', 'April 28', 'Chicago');
    expect(title).toContain('Eid Bazaar');
    expect(title).toContain('April 28');
  });
});
```

### MVP Coverage Target

```
Business logic (scoring, hours, slugs, trust): 80%+ branch coverage
Pure utility functions (packages/utils): 90%+ branch coverage
Controllers/Services: Not targeted — covered by integration tests
Database queries: Not targeted — covered by integration tests

Total unit tests at MVP: ~80–120 tests
Run time: < 30 seconds
```

### MMP Additions

```typescript
// Add unit tests for new MMP features:

// 6. Stripe price calculation (before real money flows)
describe('calculateProRatedPrice', () => {
  it('correctly pro-rates a monthly subscription mid-cycle', () => {
    // Business upgrades from free to Pro on the 15th of a 30-day month
    // Should pay 50% of $49 = $24.50
    const price = calculateProRata(49, new Date('2026-04-15'), new Date('2026-04-30'));
    expect(price).toBe(24.50);
  });
});

// 7. Search ranking (Typesense result re-ranking)
describe('SearchRankingService', () => {
  it('boosts verified businesses over unverified at same relevance score', () => {
    const verified = makeSearchResult({ isVerified: true, textScore: 0.9 });
    const unverified = makeSearchResult({ isVerified: false, textScore: 0.9 });
    expect(rerank([verified, unverified])[0]).toBe(verified);
  });
});

// 8. Event RSVP capacity
describe('RSVPService', () => {
  it('returns waitlist when at capacity', () => {
    const event = makeEvent({ capacity: 100, rsvpCount: 100 });
    expect(getRSVPStatus(event)).toBe('waitlist');
  });
});

// 9. Personalization score overlay
describe('PersonalizationService', () => {
  it('boosts south-asian food for users with high south-asian interaction score', () => {
    const user = makeUser({ topCategories: ['south-asian'] });
    const items = [
      makeFeedItem({ category: 'south-asian' }),
      makeFeedItem({ category: 'mediterranean' }),
    ];
    const boosted = applyPersonalization(items, user);
    expect(boosted[0].category).toBe('south-asian');
  });
});
```

### Production Additions

```
- Property-based testing (fast-check) for slug generation edge cases
- Snapshot tests for SEO metadata output (catch regressions in title formulas)
- Mutation testing (Stryker) on scoring engine — verify tests actually fail when logic breaks
- Coverage gate: CI fails if branch coverage on business logic drops below 80%
```

---

## 2. Integration Testing Strategy

### Philosophy

Integration tests hit a real database (Neon branch) and real Redis. They do NOT mock:
- Database queries
- Redis operations
- File system operations

They DO mock:
- External HTTP APIs (Clerk, Stripe, Mapbox, Google Vision, Expo Push)
- Email/SMS delivery
- Time (jest.useFakeTimers for scheduled jobs)

### Test Database Setup

```typescript
// apps/api/test/setup.ts

import { DataSource } from 'typeorm';
import { execSync } from 'child_process';

let testDataSource: DataSource;

beforeAll(async () => {
  // Use Neon branch for integration tests
  // In CI: DATABASE_URL points to a dedicated Neon branch
  // Locally: DATABASE_URL points to docker-compose postgres
  testDataSource = new DataSource({
    type: 'postgres',
    url: process.env.TEST_DATABASE_URL,
    entities: [...],
    synchronize: false,
  });

  await testDataSource.initialize();

  // Run migrations on test database
  execSync('npm run migration:run --workspace=apps/api', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
  });
});

afterAll(async () => {
  await testDataSource.destroy();
});

beforeEach(async () => {
  // Truncate all tables between tests — clean slate
  // Order matters: FK constraints
  await testDataSource.query(`
    TRUNCATE TABLE saves, community_posts, events, listings,
                   users, cities CASCADE
  `);

  // Re-seed reference data (cities, categories — they don't change between tests)
  await seedReferenceData(testDataSource);
});

// Test data factories
export function makeCity(overrides = {}): Promise<City> {
  return testDataSource.getRepository(City).save({
    id: randomUUID(),
    name: 'Chicago',
    slug: 'chicago',
    launchStatus: 'active',
    lat: 41.8781,
    lng: -87.6298,
    ...overrides,
  });
}

export function makeListing(cityId: string, overrides = {}): Promise<Listing> {
  return testDataSource.getRepository(Listing).save({
    id: randomUUID(),
    cityId,
    name: 'Test Restaurant',
    slug: 'test-restaurant',
    category: 'restaurant',
    lat: 41.9742,
    lng: -87.6691,
    isActive: true,
    trustTier: 1,
    ...overrides,
  });
}
```

### MVP Integration Tests

```typescript
// apps/api/test/integration/feed.integration.spec.ts

describe('Feed API — Integration', () => {
  it('returns listings sorted by distance when user is near them', async () => {
    const city = await makeCity();
    const nearby = await makeListing(city.id, { lat: 41.9740, lng: -87.6690 }); // 20m away
    const far = await makeListing(city.id, { lat: 41.9900, lng: -87.6900 });    // 2km away

    const response = await request(app.getHttpServer())
      .get('/feed')
      .query({ lat: 41.9742, lng: -87.6691, cityId: city.id })
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(200);

    const ids = response.body.data.map((i: any) => i.id);
    expect(ids.indexOf(nearby.id)).toBeLessThan(ids.indexOf(far.id));
  });

  it('excludes inactive listings from feed', async () => {
    const city = await makeCity();
    await makeListing(city.id, { isActive: false, name: 'Inactive Place' });
    const active = await makeListing(city.id, { isActive: true, name: 'Active Place' });

    const response = await request(app.getHttpServer())
      .get('/feed')
      .query({ lat: 41.9742, lng: -87.6691, cityId: city.id })
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(200);

    const names = response.body.data.map((i: any) => i.name);
    expect(names).not.toContain('Inactive Place');
    expect(names).toContain('Active Place');
  });

  it('featured listings always appear before organic at same distance', async () => {
    const city = await makeCity();
    const organic = await makeListing(city.id, { lat: 41.9740, lng: -87.6690, isFeatured: false });
    const featured = await makeListing(city.id, { lat: 41.9740, lng: -87.6690, isFeatured: true });

    const response = await request(app.getHttpServer())
      .get('/feed')
      .query({ lat: 41.9742, lng: -87.6691, cityId: city.id })
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(200);

    const ids = response.body.data.map((i: any) => i.id);
    expect(ids.indexOf(featured.id)).toBeLessThan(ids.indexOf(organic.id));
  });

  it('returns empty array (not 404) when city has no content', async () => {
    const emptyCity = await makeCity({ slug: 'empty-city', launchStatus: 'active' });

    const response = await request(app.getHttpServer())
      .get('/feed')
      .query({ lat: 41.9742, lng: -87.6691, cityId: emptyCity.id })
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(200);

    expect(response.body.data).toEqual([]);
    expect(response.body.meta.total).toBe(0);
  });
});
```

```typescript
// apps/api/test/integration/auth.integration.spec.ts

describe('Auth — Integration', () => {
  it('rejects requests without Authorization header', async () => {
    await request(app.getHttpServer())
      .get('/feed')
      .query({ lat: 41.9742, lng: -87.6691 })
      .expect(401);
  });

  it('rejects expired JWT tokens', async () => {
    const expiredToken = generateExpiredToken(testUserId);
    await request(app.getHttpServer())
      .get('/feed')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('creates user record on first login via Clerk webhook', async () => {
    const clerkWebhookPayload = makeClerkUserCreatedEvent({
      id: 'user_test_123',
      phone_numbers: [{ phone_number: '+1234567890' }],
    });

    await request(app.getHttpServer())
      .post('/webhooks/clerk')
      .set('svix-id', 'test-svix-id')
      .set('svix-timestamp', Date.now().toString())
      .set('svix-signature', signClerkWebhook(clerkWebhookPayload))
      .send(clerkWebhookPayload)
      .expect(200);

    const user = await db.query(
      'SELECT * FROM users WHERE clerk_id = $1',
      ['user_test_123']
    );
    expect(user.rows).toHaveLength(1);
  });
});
```

```typescript
// apps/api/test/integration/saves.integration.spec.ts

describe('Save / Unsave — Integration', () => {
  it('saves a listing and returns it in saved items', async () => {
    const city = await makeCity();
    const listing = await makeListing(city.id);

    await request(app.getHttpServer())
      .post(`/listings/${listing.id}/save`)
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(200);

    const saved = await request(app.getHttpServer())
      .get('/me/saved')
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(200);

    expect(saved.body.data.map((i: any) => i.id)).toContain(listing.id);
  });

  it('unsaving a listing removes it from saved items', async () => {
    const city = await makeCity();
    const listing = await makeListing(city.id);

    // Save then unsave
    await request(app.getHttpServer())
      .post(`/listings/${listing.id}/save`)
      .set('Authorization', `Bearer ${testUserToken}`);

    await request(app.getHttpServer())
      .delete(`/listings/${listing.id}/save`)
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(200);

    const saved = await request(app.getHttpServer())
      .get('/me/saved')
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(200);

    expect(saved.body.data.map((i: any) => i.id)).not.toContain(listing.id);
  });

  it('double-saving the same listing is idempotent (no duplicate)', async () => {
    const city = await makeCity();
    const listing = await makeListing(city.id);

    await request(app.getHttpServer())
      .post(`/listings/${listing.id}/save`)
      .set('Authorization', `Bearer ${testUserToken}`);

    await request(app.getHttpServer())
      .post(`/listings/${listing.id}/save`)
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(200); // Not 409

    const count = await db.query(
      'SELECT COUNT(*) FROM saves WHERE user_id = $1 AND listing_id = $2',
      [testUserId, listing.id]
    );
    expect(parseInt(count.rows[0].count)).toBe(1);
  });
});
```

### MMP Integration Tests

```typescript
// Stripe webhook idempotency — CRITICAL
describe('Stripe Webhooks — Integration', () => {
  it('processing the same webhook event twice is idempotent', async () => {
    const event = makeStripeCheckoutEvent({ businessId: testBusinessId });

    await request(app.getHttpServer())
      .post('/webhooks/stripe')
      .set('stripe-signature', signStripeEvent(event))
      .send(event)
      .expect(200);

    // Process same event again (Stripe retries)
    await request(app.getHttpServer())
      .post('/webhooks/stripe')
      .set('stripe-signature', signStripeEvent(event))
      .send(event)
      .expect(200);

    // Business subscription should only be activated once
    const subs = await db.query(
      'SELECT COUNT(*) FROM subscriptions WHERE business_id = $1',
      [testBusinessId]
    );
    expect(parseInt(subs.rows[0].count)).toBe(1);
  });

  it('activates featured placement when checkout.session.completed fires', async () => {
    const event = makeStripeCheckoutEvent({
      businessId: testBusinessId,
      productId: 'featured_spot_monthly',
    });

    await request(app.getHttpServer())
      .post('/webhooks/stripe')
      .set('stripe-signature', signStripeEvent(event))
      .send(event);

    const business = await db.query(
      'SELECT is_featured FROM businesses WHERE id = $1',
      [testBusinessId]
    );
    expect(business.rows[0].is_featured).toBe(true);
  });

  it('removes featured placement when subscription is canceled', async () => {
    // Setup: business is featured
    await db.query('UPDATE businesses SET is_featured = true WHERE id = $1', [testBusinessId]);

    const event = makeStripeSubscriptionDeletedEvent({ businessId: testBusinessId });

    await request(app.getHttpServer())
      .post('/webhooks/stripe')
      .set('stripe-signature', signStripeEvent(event))
      .send(event);

    const business = await db.query(
      'SELECT is_featured FROM businesses WHERE id = $1',
      [testBusinessId]
    );
    expect(business.rows[0].is_featured).toBe(false);
  });
});
```

---

## 3. API Testing

### Contract Testing with Supertest

Every public API endpoint has a contract test. These run on every PR and prevent breaking changes.

```typescript
// apps/api/test/contracts/listings.contract.spec.ts

describe('GET /listings/:id', () => {
  it('returns RFC 9457 error for unknown listing', async () => {
    const response = await request(app.getHttpServer())
      .get('/listings/non-existent-id')
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(404);

    // RFC 9457 Problem Details format — the contract
    expect(response.body).toMatchObject({
      type: expect.stringContaining('muzgram.com/errors/'),
      title: expect.any(String),
      status: 404,
      detail: expect.any(String),
    });
  });

  it('returns listing with required fields', async () => {
    const listing = await makeListing((await makeCity()).id);

    const response = await request(app.getHttpServer())
      .get(`/listings/${listing.id}`)
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(200);

    // These fields must ALWAYS be present — mobile app depends on them
    expect(response.body).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      category: expect.any(String),
      lat: expect.any(Number),
      lng: expect.any(Number),
      cityId: expect.any(String),
      isActive: expect.any(Boolean),
      halalStatus: expect.stringMatching(/^(certified|self_declared|unknown)$/),
      createdAt: expect.any(String),
    });
  });

  it('returns 401 without auth token', async () => {
    const listing = await makeListing((await makeCity()).id);
    await request(app.getHttpServer())
      .get(`/listings/${listing.id}`)
      .expect(401);
  });
});

describe('GET /feed', () => {
  it('requires lat and lng query params', async () => {
    const response = await request(app.getHttpServer())
      .get('/feed')
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(400);

    expect(response.body.type).toContain('validation');
  });

  it('returns cursor-based pagination', async () => {
    const city = await makeCity();
    // Create 25 listings
    await Promise.all(Array.from({ length: 25 }, () => makeListing(city.id)));

    const page1 = await request(app.getHttpServer())
      .get('/feed')
      .query({ lat: 41.9742, lng: -87.6691, cityId: city.id, limit: 10 })
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(200);

    expect(page1.body.meta.nextCursor).toBeTruthy();
    expect(page1.body.data).toHaveLength(10);

    const page2 = await request(app.getHttpServer())
      .get('/feed')
      .query({ lat: 41.9742, lng: -87.6691, cityId: city.id, limit: 10, cursor: page1.body.meta.nextCursor })
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(200);

    // No overlap between pages
    const page1Ids = new Set(page1.body.data.map((i: any) => i.id));
    const page2Ids = page2.body.data.map((i: any) => i.id);
    expect(page2Ids.some((id: string) => page1Ids.has(id))).toBe(false);
  });
});
```

### Rate Limiting Tests

```typescript
// apps/api/test/contracts/rate-limiting.spec.ts

describe('Rate Limiting', () => {
  it('blocks unauthenticated requests after 30/minute', async () => {
    // Fire 31 requests from same IP
    const requests = Array.from({ length: 31 }, () =>
      request(app.getHttpServer()).get('/feed').query({ lat: 0, lng: 0 })
    );
    const responses = await Promise.all(requests);
    const blocked = responses.filter(r => r.status === 429);
    expect(blocked.length).toBeGreaterThan(0);
    expect(blocked[0].body.status).toBe(429);
    expect(blocked[0].headers['retry-after']).toBeDefined();
  });

  it('returns Retry-After header on rate limit', async () => {
    // Exhaust limit
    for (let i = 0; i < 31; i++) {
      await request(app.getHttpServer()).get('/feed').query({ lat: 0, lng: 0 });
    }
    const response = await request(app.getHttpServer()).get('/feed').query({ lat: 0, lng: 0 });
    expect(response.headers['retry-after']).toBeDefined();
    expect(parseInt(response.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('Tier 0 users cannot create community posts (rate limit = 0)', async () => {
    const tier0Token = await createTestUserWithTier(TrustTier.UNVERIFIED);
    const response = await request(app.getHttpServer())
      .post('/community-posts')
      .set('Authorization', `Bearer ${tier0Token}`)
      .send({ text: 'Test post', cityId: testCityId })
      .expect(403);
    expect(response.body.type).toContain('trust-tier-insufficient');
  });
});
```

### API Versioning Tests

```typescript
// Ensure v1 endpoints still work after v2 ships (MMP)
describe('API Version Compatibility', () => {
  it('v1 feed endpoint still returns expected shape after v2 launch', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/feed')
      .query({ lat: 41.9742, lng: -87.6691 })
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(200);

    // v1 contract fields — must not be removed or renamed
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('meta.nextCursor');
  });
});
```

### Postman / Bruno Collections (Manual API Testing)

```
/test/api-collections/
  muzgram-mvp.postman_collection.json       ← import into Postman
  muzgram-mvp.bruno/                        ← alternative: Bruno (open source, git-friendly)
    auth/
      01-clerk-webhook-user-created.bru
      02-get-my-profile.bru
    feed/
      01-get-feed-chicago.bru
      02-get-feed-empty-city.bru
      03-get-feed-unauthenticated.bru
    listings/
      01-get-listing-detail.bru
      02-save-listing.bru
      03-unsave-listing.bru
    events/
      01-create-event.bru
      02-get-event-detail.bru
    community-posts/
      01-create-post.bru
      02-create-post-tier0-blocked.bru
    payments/
      01-stripe-checkout-webhook.bru
      02-subscription-canceled-webhook.bru

Environment variables in collection:
  BASE_URL: https://api-staging.muzgram.com
  AUTH_TOKEN: {{run get-token first}}
  TEST_CITY_ID: chicago
  TEST_LISTING_ID: {{from seed data}}
```

---

## 4. Mobile App Testing

### Framework

```typescript
// React Native Testing Library + Jest + Maestro (E2E)
// apps/mobile/jest.config.ts

export default {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  setupFilesAfterFramework: [
    '@testing-library/jest-native/extend-expect',
    './test/setup.ts',
  ],
};
```

### Component Tests (MVP)

```typescript
// apps/mobile/src/components/__tests__/ListingCard.spec.tsx

describe('ListingCard', () => {
  it('renders business name and category', () => {
    const { getByText } = render(
      <ListingCard listing={makeListing({ name: 'Sabri Nihari', category: 'restaurant' })} />
    );
    expect(getByText('Sabri Nihari')).toBeTruthy();
  });

  it('shows halal badge for certified listings', () => {
    const { getByTestId } = render(
      <ListingCard listing={makeListing({ halalStatus: 'certified' })} />
    );
    expect(getByTestId('halal-badge')).toBeTruthy();
  });

  it('does NOT show halal badge for unknown status', () => {
    const { queryByTestId } = render(
      <ListingCard listing={makeListing({ halalStatus: 'unknown' })} />
    );
    expect(queryByTestId('halal-badge')).toBeNull();
  });

  it('shows "Open Now" label when business is open', () => {
    jest.setSystemTime(new Date('2026-04-17T14:00:00')); // Friday 2pm
    const listing = makeListing({
      hours: [{ day: 'friday', open: '11:00', close: '23:00' }],
    });
    const { getByText } = render(<ListingCard listing={listing} />);
    expect(getByText('Open Now')).toBeTruthy();
  });

  it('shows "Closed" label when business is closed', () => {
    jest.setSystemTime(new Date('2026-04-17T09:00:00')); // Friday 9am (not open yet)
    const listing = makeListing({
      hours: [{ day: 'friday', open: '11:00', close: '23:00' }],
    });
    const { getByText } = render(<ListingCard listing={listing} />);
    expect(getByText('Closed')).toBeTruthy();
  });

  it('triggers save callback on heart tap', async () => {
    const onSave = jest.fn();
    const { getByTestId } = render(
      <ListingCard listing={makeListing()} onSave={onSave} />
    );
    await userEvent.press(getByTestId('save-button'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('optimistically toggles save state before API response', async () => {
    const { getByTestId } = render(
      <ListingCard listing={makeListing({ isSaved: false })} />
    );
    const saveButton = getByTestId('save-button');
    await userEvent.press(saveButton);
    // Should immediately show saved state, not wait for API
    expect(saveButton).toHaveProp('accessibilityState', { checked: true });
  });
});
```

```typescript
// apps/mobile/src/screens/__tests__/FeedScreen.spec.tsx

describe('FeedScreen', () => {
  it('shows skeleton loading state while fetching', () => {
    // Mock TanStack Query loading state
    jest.mocked(useFeed).mockReturnValue({ isLoading: true, data: undefined });
    const { getAllByTestId } = render(<FeedScreen />);
    expect(getAllByTestId('skeleton-card').length).toBeGreaterThan(0);
  });

  it('shows empty state when city has no content', () => {
    jest.mocked(useFeed).mockReturnValue({ isLoading: false, data: { pages: [{ data: [] }] } });
    const { getByTestId } = render(<FeedScreen />);
    expect(getByTestId('empty-state')).toBeTruthy();
  });

  it('empty state copy does not say "no Islamic content"', () => {
    jest.mocked(useFeed).mockReturnValue({ isLoading: false, data: { pages: [{ data: [] }] } });
    const { getByTestId } = render(<FeedScreen />);
    const emptyText = getByTestId('empty-state').props.children;
    expect(emptyText).not.toMatch(/islamic/i);
    expect(emptyText).not.toMatch(/muslim community/i);
  });

  it('shows error state with retry button on network failure', async () => {
    jest.mocked(useFeed).mockReturnValue({ isError: true, error: new Error('Network error'), refetch: jest.fn() });
    const { getByTestId } = render(<FeedScreen />);
    expect(getByTestId('error-state')).toBeTruthy();
    expect(getByTestId('retry-button')).toBeTruthy();
  });
});
```

### Maestro E2E Tests (Critical User Flows)

```yaml
# apps/mobile/e2e/flows/browse-and-save.yaml
# Runs on physical device or simulator via Maestro Cloud

appId: com.muzgram.app
---
- launchApp:
    clearState: true

# Onboarding: enter location
- assertVisible: "What's your neighborhood?"
- tapOn: "Chicago"
- tapOn: "Continue"

# Feed loads
- assertVisible:
    id: "feed-screen"
- assertNotVisible:
    text: "No Islamic content"  # Brand identity check

# Tap first listing
- tapOn:
    index: 0
    id: "listing-card"
- assertVisible:
    id: "listing-detail"
- assertVisible:
    id: "save-button"

# Save it
- tapOn:
    id: "save-button"
- assertVisible:
    id: "save-button-saved"  # Optimistic UI

# Navigate to saved items
- tapOn:
    id: "profile-tab"
- tapOn:
    id: "saved-items"
- assertVisible:
    id: "saved-listing-card"
```

```yaml
# apps/mobile/e2e/flows/create-community-post.yaml

appId: com.muzgram.app
---
- launchApp:
    clearState: false  # Already logged in

# Navigate to post creation
- tapOn:
    id: "post-tab"
- assertVisible:
    id: "post-type-selector"
- tapOn:
    text: "Community Post"

# Fill form
- tapOn:
    id: "post-text-input"
- inputText: "Just tried this shawarma spot — honestly underrated"
- tapOn:
    id: "location-tag"
- tapOn:
    text: "West Rogers Park"

# Submit
- tapOn:
    id: "submit-post-button"
- assertVisible:
    text: "Post shared!"

# Verify it appears in feed
- tapOn:
    id: "feed-tab"
- assertVisible:
    text: "Just tried this shawarma spot"
```

```yaml
# apps/mobile/e2e/flows/whatsapp-share.yaml
# Test the primary viral loop

appId: com.muzgram.app
---
- launchApp
- tapOn:
    index: 0
    id: "listing-card"
- tapOn:
    id: "share-button"
- assertVisible:
    id: "share-sheet"
- assertVisible:
    text: "WhatsApp"
# Deep link format test
- tapOn:
    text: "Copy Link"
- assertVisible:
    text: "Link copied"
```

### Brand Identity Automated Checks

```typescript
// Automated scan for brand anti-patterns in rendered UI text
// runs as part of E2E test suite

const FORBIDDEN_PHRASES = [
  /islamic\s+event/i,
  /muslim\s+community/i,
  /halal\s+restaurant.*listing/i,
  /the\s+muslim\s+community/i,
  /sharia.?compliant/i,
  /no\s+islamic\s+content/i,
  /ummah/i,  // Should never appear in UI copy (only internal)
];

describe('Brand Identity — UI Copy Compliance', () => {
  it('FeedScreen contains no forbidden phrases', () => {
    const { baseElement } = render(<FeedScreen />);
    const text = baseElement.textContent ?? '';
    FORBIDDEN_PHRASES.forEach(pattern => {
      expect(text).not.toMatch(pattern);
    });
  });

  it('EmptyState contains no forbidden phrases', () => {
    const { baseElement } = render(<EmptyState type="feed" city="Chicago" />);
    const text = baseElement.textContent ?? '';
    FORBIDDEN_PHRASES.forEach(pattern => {
      expect(text).not.toMatch(pattern);
    });
  });
});
```

---

## 5. Location & Geolocation Testing

### Why This Is Hard

Muzgram's core value is "near me." Every feed query, map query, and distance calculation depends on correct geolocation. Wrong coordinates = wrong results = users trust the app less than Google Maps.

### Unit Tests for Geo Logic

```typescript
// packages/utils/src/geo.spec.ts

describe('Geo Utilities', () => {
  describe('calculateDistance', () => {
    it('calculates distance between two Chicago points accurately', () => {
      // Devon Ave to Sabri Nihari — known distance ~0.3km
      const devonAve = { lat: 41.9982, lng: -87.6850 };
      const sabriNihari = { lat: 41.9742, lng: -87.6691 };
      const distance = calculateDistance(devonAve, sabriNihari);
      // Accept ±50m tolerance (Haversine formula is approximate)
      expect(distance).toBeGreaterThan(2600);
      expect(distance).toBeLessThan(2800);
    });

    it('returns 0 for identical coordinates', () => {
      const point = { lat: 41.9742, lng: -87.6691 };
      expect(calculateDistance(point, point)).toBe(0);
    });

    it('is commutative (A→B = B→A)', () => {
      const a = { lat: 41.9982, lng: -87.6850 };
      const b = { lat: 41.9742, lng: -87.6691 };
      expect(calculateDistance(a, b)).toBeCloseTo(calculateDistance(b, a), 0);
    });
  });

  describe('detectCityFromCoordinates', () => {
    it('detects Chicago from Devon Ave coordinates', async () => {
      const city = await detectCity(41.9982, -87.6850);
      expect(city.slug).toBe('chicago');
    });

    it('detects Naperville from Naperville coordinates', async () => {
      const city = await detectCity(41.7508, -88.1535);
      expect(city.slug).toBe('naperville');
    });

    it('returns null for coordinates outside any active city', async () => {
      // Coordinates in rural Iowa
      const city = await detectCity(41.6005, -93.6091);
      expect(city).toBeNull();
    });

    it('detects nearest cluster when on boundary between two', async () => {
      // Point exactly between Bridgeview and Chicago
      const city = await detectCity(41.8500, -87.7300);
      // Should return whichever cluster center is closer
      expect(['chicago', 'bridgeview']).toContain(city?.slug);
    });
  });

  describe('geohash clustering', () => {
    it('groups nearby pins into the same cluster at zoom 12', () => {
      const pins = [
        { lat: 41.9742, lng: -87.6691 },
        { lat: 41.9745, lng: -87.6693 }, // 30m away
      ];
      const clusters = clusterPins(pins, { zoom: 12 });
      expect(clusters).toHaveLength(1);
      expect(clusters[0].count).toBe(2);
    });

    it('shows individual pins at high zoom', () => {
      const pins = [
        { lat: 41.9742, lng: -87.6691 },
        { lat: 41.9745, lng: -87.6693 },
      ];
      const clusters = clusterPins(pins, { zoom: 18 });
      expect(clusters).toHaveLength(2);
    });
  });
});
```

### PostGIS Query Tests

```typescript
// apps/api/test/integration/geo.integration.spec.ts

describe('PostGIS Queries — Integration', () => {
  it('returns listings within radius using PostGIS ST_DWithin', async () => {
    const city = await makeCity();
    const close = await makeListing(city.id, { lat: 41.9742, lng: -87.6691 });    // At origin
    const edge = await makeListing(city.id, { lat: 41.9832, lng: -87.6691 });     // ~1km north
    const outside = await makeListing(city.id, { lat: 42.0500, lng: -87.6691 }); // ~8.5km north

    const results = await listingService.findNearby({
      lat: 41.9742,
      lng: -87.6691,
      radiusMeters: 2000,
      cityId: city.id,
    });

    const ids = results.map(r => r.id);
    expect(ids).toContain(close.id);
    expect(ids).toContain(edge.id);
    expect(ids).not.toContain(outside.id);
  });

  it('returns results sorted by distance ASC', async () => {
    const city = await makeCity();
    const far = await makeListing(city.id, { lat: 41.9832, lng: -87.6691 });
    const near = await makeListing(city.id, { lat: 41.9743, lng: -87.6692 });

    const results = await listingService.findNearby({
      lat: 41.9742, lng: -87.6691, radiusMeters: 5000, cityId: city.id,
    });

    const ids = results.map(r => r.id);
    expect(ids.indexOf(near.id)).toBeLessThan(ids.indexOf(far.id));
  });
});
```

### Mobile Geolocation Mock Strategy

```typescript
// apps/mobile/test/mocks/location.ts

// Mock Expo Location for all tests
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: {
      latitude: 41.9742,   // West Rogers Park, Chicago
      longitude: -87.6691,
      accuracy: 10,
    },
  }),
  watchPositionAsync: jest.fn().mockReturnValue({ remove: jest.fn() }),
}));

// Test: location permission denied
it('shows manual location entry when permission is denied', async () => {
  jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValueOnce({
    status: 'denied',
  });
  const { getByTestId } = render(<LocationPrompt />);
  // Should show city picker, not auto-detect
  expect(getByTestId('manual-city-picker')).toBeTruthy();
});

// Test: location outside service area
it('shows "coming soon" message for unsupported cities', async () => {
  jest.mocked(Location.getCurrentPositionAsync).mockResolvedValueOnce({
    coords: { latitude: 29.7604, longitude: -95.3698 }, // Houston (not live yet)
  });
  const { getByText } = render(<FeedScreen />);
  await waitFor(() => expect(getByText(/coming soon/i)).toBeTruthy());
});
```

### Geolocation Edge Cases to Test

```
Test matrix for geolocation:
  ✓ GPS permission granted, user in active city
  ✓ GPS permission granted, user outside any city (rural)
  ✓ GPS permission granted, user on city boundary
  ✓ GPS permission denied — manual city picker shown
  ✓ GPS permission granted but location service off (iOS setting)
  ✓ GPS returns stale coordinates (accuracy > 1000m)
  ✓ GPS coordinates in water/ocean (edge case for global expansion)
  ✓ User manually overrides detected city
  ✓ User moves cities mid-session (feed should refresh)
  ✓ Near-me web pages: Cloudflare geo-detection header present/absent
```

---

## 6. Media Upload Testing

### Upload Flow Tests

```typescript
// apps/api/test/integration/media.integration.spec.ts

describe('Media Upload — Integration', () => {
  describe('Presigned URL generation', () => {
    it('generates a valid presigned upload URL', async () => {
      const response = await request(app.getHttpServer())
        .post('/media/upload-url')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ contentType: 'image/jpeg', entityType: 'listing', entityId: testListingId })
        .expect(200);

      expect(response.body.uploadUrl).toMatch(/^https:\/\//);
      expect(response.body.key).toMatch(/^photos\//);
      expect(response.body.expiresIn).toBe(300);
    });

    it('rejects upload URL request for invalid content types', async () => {
      await request(app.getHttpServer())
        .post('/media/upload-url')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ contentType: 'application/pdf', entityType: 'listing', entityId: testListingId })
        .expect(400);
    });

    it('rejects upload URL for a listing the user does not own', async () => {
      const otherUsersListing = await makeListing((await makeCity()).id, { ownerId: 'other-user' });
      await request(app.getHttpServer())
        .post('/media/upload-url')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ contentType: 'image/jpeg', entityType: 'listing', entityId: otherUsersListing.id })
        .expect(403);
    });
  });

  describe('Upload confirmation', () => {
    it('links confirmed photo to listing', async () => {
      const key = `photos/${testUserId}/${randomUUID()}.webp`;

      // Simulate: R2 upload completed, now confirm to API
      await request(app.getHttpServer())
        .post('/media/confirm')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ key, entityType: 'listing', entityId: testListingId })
        .expect(200);

      const listing = await request(app.getHttpServer())
        .get(`/listings/${testListingId}`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(listing.body.photos.map((p: any) => p.key)).toContain(key);
    });

    it('rejects confirmation for a key not belonging to the user', async () => {
      const foreignKey = `photos/other-user-id/${randomUUID()}.webp`;
      await request(app.getHttpServer())
        .post('/media/confirm')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ key: foreignKey, entityType: 'listing', entityId: testListingId })
        .expect(403);
    });
  });

  describe('Moderation gate', () => {
    it('queues uploaded photo for AI moderation before showing publicly', async () => {
      const key = `photos/${testUserId}/${randomUUID()}.webp`;
      await confirmUpload(key, testListingId);

      // Photo exists in DB but is pending moderation
      const photo = await db.query('SELECT * FROM listing_photos WHERE key = $1', [key]);
      expect(photo.rows[0].moderation_status).toBe('pending');
      expect(photo.rows[0].is_public).toBe(false);
    });

    it('makes photo public after moderation approval', async () => {
      const key = `photos/${testUserId}/${randomUUID()}.webp`;
      await confirmUpload(key, testListingId);

      // Simulate moderation approval
      await moderationService.approve(key);

      const photo = await db.query('SELECT * FROM listing_photos WHERE key = $1', [key]);
      expect(photo.rows[0].is_public).toBe(true);
    });
  });
});
```

### File Security Tests

```typescript
describe('File Upload Security', () => {
  it('rejects files with mismatched MIME type and content', async () => {
    // File claims to be image/jpeg but is actually a PHP script
    const maliciousFile = Buffer.from('<?php system($_GET["cmd"]); ?>');

    const response = await request(app.getHttpServer())
      .post('/media/scan')
      .set('Authorization', `Bearer ${testUserToken}`)
      .set('Content-Type', 'image/jpeg')
      .send(maliciousFile)
      .expect(400);

    expect(response.body.detail).toContain('Invalid file type');
  });

  it('rejects files over 10MB', async () => {
    const oversizeFile = Buffer.alloc(11 * 1024 * 1024); // 11MB
    await request(app.getHttpServer())
      .post('/media/upload-url')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send({ contentType: 'image/jpeg', size: oversizeFile.length })
      .expect(400);
  });

  it('strips EXIF GPS data from uploaded photos', async () => {
    // Load a JPEG with embedded GPS coordinates
    const exifPhoto = fs.readFileSync('./test/fixtures/photo-with-gps-exif.jpg');
    // Run through our strip pipeline
    const stripped = await mediaService.processUpload(exifPhoto);
    const exif = await exifReader(stripped);
    expect(exif.GPSLatitude).toBeUndefined();
    expect(exif.GPSLongitude).toBeUndefined();
  });
});
```

### Mobile Upload Flow Tests

```typescript
describe('PhotoUploadFlow — Mobile', () => {
  it('shows progress indicator during upload', async () => {
    // Mock slow upload (simulates real-world latency)
    jest.mocked(uploadToR2).mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 1000))
    );

    const { getByTestId } = render(<PhotoUploadButton />);
    await userEvent.press(getByTestId('upload-photo-button'));
    expect(getByTestId('upload-progress')).toBeTruthy();
  });

  it('shows error state and retry on upload failure', async () => {
    jest.mocked(uploadToR2).mockRejectedValueOnce(new Error('Network error'));

    const { getByTestId, getByText } = render(<PhotoUploadButton />);
    await userEvent.press(getByTestId('upload-photo-button'));
    await waitFor(() => expect(getByText('Upload failed')).toBeTruthy());
    expect(getByTestId('retry-upload-button')).toBeTruthy();
  });

  it('thumbnail renders before full image loads', async () => {
    const { getByTestId } = render(
      <ListingPhoto src="https://media.muzgram.com/photos/test.webp" blurHash="LKO2?U%2Tw=w" />
    );
    // Blur hash placeholder should render immediately
    expect(getByTestId('blur-placeholder')).toBeTruthy();
  });
});
```

---

## 7. Notifications Testing

### Push Notification Unit Tests

```typescript
// apps/worker/src/notifications/notification.service.spec.ts

describe('NotificationService', () => {
  describe('shouldSendNotification', () => {
    it('does not send during prayer times if user opted into quiet mode', () => {
      const user = makeUser({ quietDuringPrayer: true });
      // Mock: Maghrib prayer time is 7:45pm
      jest.setSystemTime(new Date('2026-04-17T19:45:00'));
      expect(shouldSendNotification(user, 'marketing')).toBe(false);
    });

    it('always sends critical notifications regardless of prayer time', () => {
      const user = makeUser({ quietDuringPrayer: true });
      jest.setSystemTime(new Date('2026-04-17T19:45:00'));
      expect(shouldSendNotification(user, 'critical')).toBe(true);
    });

    it('respects user notification frequency preference', () => {
      const user = makeUser({ notifFrequency: 'weekly', lastNotifSentAt: subDays(new Date(), 2) });
      expect(shouldSendNotification(user, 'event_nearby')).toBe(false);
    });

    it('does not send more than 3 notifications per day per user', async () => {
      const userId = testUserId;
      // Simulate 3 notifications already sent today
      await mockNotificationCount(userId, 3);
      expect(await canSendToUser(userId)).toBe(false);
    });
  });

  describe('notification copy compliance', () => {
    it('event nearby notification does not say "Islamic event"', () => {
      const notification = buildEventNearbyNotification({
        eventName: 'Community Iftar',
        distance: '0.8km',
      });
      expect(notification.body).not.toMatch(/islamic event/i);
      expect(notification.body).toContain('0.8km');
    });

    it('notification body length is under 150 characters', () => {
      const notification = buildEventNearbyNotification({
        eventName: 'A Very Long Event Name That Goes On And On And On',
        distance: '2.1km',
      });
      expect(notification.body.length).toBeLessThanOrEqual(150);
    });
  });
});
```

### Integration Tests for Push Delivery

```typescript
// apps/worker/test/integration/push.integration.spec.ts

describe('Push Notification Delivery — Integration', () => {
  beforeEach(() => {
    // Mock Expo Push API — never hit real push in tests
    jest.mocked(expoPush.sendPushNotificationsAsync).mockResolvedValue([{
      status: 'ok',
      id: 'mock-receipt-id',
    }]);
  });

  it('sends event nearby notification to users within 2km', async () => {
    const city = await makeCity();
    const event = await makeEvent(city.id, { lat: 41.9742, lng: -87.6691 });

    // User within 2km
    const nearbyUser = await makeUser({ lat: 41.9800, lng: -87.6700, pushToken: 'ExponentPushToken[test]' });
    // User beyond 2km
    const farUser = await makeUser({ lat: 42.0500, lng: -87.7000, pushToken: 'ExponentPushToken[far]' });

    await notificationService.sendEventNearbyNotifications(event);

    const sent = jest.mocked(expoPush.sendPushNotificationsAsync).mock.calls.flat().flat();
    const sentTokens = sent.map((n: any) => n.to);

    expect(sentTokens).toContain('ExponentPushToken[test]');
    expect(sentTokens).not.toContain('ExponentPushToken[far]');
  });

  it('handles invalid push tokens gracefully without crashing', async () => {
    const user = await makeUser({ pushToken: 'invalid-token' });
    jest.mocked(expoPush.sendPushNotificationsAsync).mockResolvedValueOnce([{
      status: 'error',
      message: 'InvalidCredentials',
    }]);

    // Should not throw
    await expect(
      notificationService.sendEventNearbyNotifications(testEvent)
    ).resolves.not.toThrow();

    // Invalid token should be cleared from user record
    const updatedUser = await db.query('SELECT push_token FROM users WHERE id = $1', [user.id]);
    expect(updatedUser.rows[0].push_token).toBeNull();
  });

  it('does not double-send when Bull job runs twice (idempotent)', async () => {
    const event = await makeEvent(testCityId);

    await notificationService.sendEventNearbyNotifications(event);
    await notificationService.sendEventNearbyNotifications(event); // Duplicate

    // Should only have sent once (idempotency via notification_log table)
    expect(expoPush.sendPushNotificationsAsync).toHaveBeenCalledTimes(1);
  });
});
```

### Notification End-to-End Test

```yaml
# apps/mobile/e2e/flows/notification-deep-link.yaml
# Tests the full loop: push received → tap → correct screen opens

appId: com.muzgram.app
---
# Simulate receiving a push notification via Maestro
- sendNotification:
    title: "Eid Bazaar · 0.8km away"
    body: "Starting now 🌙"
    data:
      type: "event"
      entityId: "eid-bazaar-chicago-april-28"

# Tap notification from lock screen
- tapOn:
    text: "Eid Bazaar · 0.8km away"

# Should deep link to event detail
- assertVisible:
    id: "event-detail-screen"
- assertVisible:
    text: "Eid Bazaar"

# Not the feed or home screen
- assertNotVisible:
    id: "feed-screen"
```

---

## 8. Moderation Workflow Testing

```typescript
// apps/worker/test/integration/moderation.integration.spec.ts

describe('Moderation Pipeline — Integration', () => {
  describe('Text scan', () => {
    it('auto-rejects known spam phrases via Bloom filter', async () => {
      const post = await createPost({ text: 'click here for free money www.spam.com' });
      const result = await moderationPipeline.scan(post);
      expect(result.approved).toBe(false);
      expect(result.flags).toContain('spam_bloom_filter');
    });

    it('auto-approves clean community post from Tier 3 user', async () => {
      const tier3User = await makeUserWithTier(TrustTier.VERIFIED);
      const post = await createPost({
        text: 'Just found the best shawarma in West Ridge — highly recommend!',
        authorId: tier3User.id,
      });
      const result = await moderationPipeline.scan(post);
      expect(result.approved).toBe(true);
      expect(result.requiresHumanReview).toBe(false);
    });

    it('flags posts containing suspicious external links', async () => {
      const post = await createPost({ text: 'Great deals at http://suspicious-site.com/halal' });
      const result = await moderationPipeline.scan(post);
      expect(result.flags).toContain('external_link');
      expect(result.requiresHumanReview).toBe(true);
    });
  });

  describe('Image scan', () => {
    it('rejects NSFW images detected by Google Vision', async () => {
      // Mock Vision API returning adult content
      jest.mocked(visionClient.safeSearch).mockResolvedValueOnce({
        adult: 'VERY_LIKELY',
        violence: 'UNLIKELY',
      });
      const result = await moderationPipeline.scanImage('https://example.com/photo.jpg');
      expect(result.nsfw).toBe(true);
      expect(result.approved).toBe(false);
    });

    it('rejects duplicate photos via pHash matching', async () => {
      const originalHash = 'aabbccdd11223344';
      await db.query('INSERT INTO known_bad_phashes (hash) VALUES ($1)', [originalHash]);
      jest.mocked(phashService.compute).mockResolvedValueOnce(originalHash);

      const result = await moderationPipeline.scanImage('https://example.com/duplicate.jpg');
      expect(result.isDuplicate).toBe(true);
    });
  });

  describe('Community reporting', () => {
    it('auto-hides content when weighted report score reaches 3.0', async () => {
      const post = await createPost({ text: 'Legitimate post' });

      // 3 Tier-3 users report it (weight 1.0 each = 3.0 total)
      for (let i = 0; i < 3; i++) {
        const reporter = await makeUserWithTier(TrustTier.VERIFIED);
        await reportService.createReport({
          contentId: post.id,
          reporterId: reporter.id,
          reason: 'misleading',
        });
      }

      const updatedPost = await db.query('SELECT is_hidden FROM posts WHERE id = $1', [post.id]);
      expect(updatedPost.rows[0].is_hidden).toBe(true);
    });

    it('does NOT auto-hide when only Tier 0 users report (weight 0.2 each)', async () => {
      const post = await createPost({ text: 'Legitimate post' });

      // 10 Tier-0 users report it — total weight = 2.0 (below 3.0 threshold)
      for (let i = 0; i < 10; i++) {
        const reporter = await makeUserWithTier(TrustTier.UNVERIFIED);
        await reportService.createReport({
          contentId: post.id,
          reporterId: reporter.id,
          reason: 'spam',
        });
      }

      const updatedPost = await db.query('SELECT is_hidden FROM posts WHERE id = $1', [post.id]);
      expect(updatedPost.rows[0].is_hidden).toBe(false);
    });
  });

  describe('Moderation admin actions', () => {
    it('admin approval makes pending content public', async () => {
      const post = await createPost({ moderationStatus: 'pending', isPublic: false });
      await adminModerationService.approve(post.id, adminUserId);

      const updated = await db.query('SELECT moderation_status, is_public FROM posts WHERE id = $1', [post.id]);
      expect(updated.rows[0].moderation_status).toBe('approved');
      expect(updated.rows[0].is_public).toBe(true);
    });

    it('rejection decrements author trust score and logs violation', async () => {
      const author = await makeUserWithTier(TrustTier.BASIC);
      const post = await createPost({ authorId: author.id });

      await adminModerationService.reject(post.id, adminUserId, 'nsfw_content');

      const violation = await db.query(
        'SELECT * FROM user_violations WHERE user_id = $1',
        [author.id]
      );
      expect(violation.rows).toHaveLength(1);
      expect(violation.rows[0].violation_type).toBe('nsfw_content');
    });
  });
});
```

---

## 9. Payment Testing

### The Golden Rule

**Never hit Stripe live API in tests. Always use Stripe test mode keys. Never put real card numbers in test fixtures.**

```typescript
// test/fixtures/stripe.ts

// Stripe test card numbers (safe to commit — these are public test values)
export const STRIPE_TEST_CARDS = {
  success: '4242424242424242',
  declineInsufficientFunds: '4000000000009995',
  declineCardExpired: '4000000000000069',
  requiresAuthentication: '4000002500003155',
  // Never: real card numbers
};

// Mock Stripe SDK for unit tests
jest.mock('stripe', () => ({
  checkout: {
    sessions: {
      create: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test-session' }),
    },
  },
  webhooks: {
    constructEvent: jest.fn(), // Tested separately with real signatures
  },
}));
```

### Stripe Webhook Tests (Critical)

```typescript
// apps/api/test/integration/payments.integration.spec.ts

describe('Payment Flows — Integration', () => {
  // These tests use STRIPE_TEST_SECRET_KEY and real Stripe test webhooks

  describe('Featured Spot purchase', () => {
    it('activates featured status on checkout.session.completed', async () => {
      const business = await makeBusiness(testCityId);
      expect(business.isFeatured).toBe(false);

      // Simulate Stripe firing checkout.session.completed webhook
      await sendStripeWebhook('checkout.session.completed', {
        metadata: {
          businessId: business.id,
          product: 'featured_spot_monthly',
        },
        payment_status: 'paid',
      });

      const updated = await businessService.findOne(business.id);
      expect(updated.isFeatured).toBe(true);
      expect(updated.featuredUntil).toBeDefined();
    });

    it('creates subscription record in DB', async () => {
      const business = await makeBusiness(testCityId);
      await sendStripeWebhook('checkout.session.completed', {
        metadata: { businessId: business.id, product: 'featured_spot_monthly' },
        subscription: 'sub_test_123',
        payment_status: 'paid',
      });

      const sub = await db.query(
        'SELECT * FROM subscriptions WHERE business_id = $1',
        [business.id]
      );
      expect(sub.rows[0].stripe_subscription_id).toBe('sub_test_123');
      expect(sub.rows[0].status).toBe('active');
    });
  });

  describe('Payment failure / dunning', () => {
    it('marks subscription past_due on first payment failure', async () => {
      const business = await makeBusinessWithSub(testCityId);

      await sendStripeWebhook('invoice.payment_failed', {
        subscription: business.stripeSubscriptionId,
        attempt_count: 1,
      });

      const sub = await db.query(
        'SELECT status FROM subscriptions WHERE business_id = $1',
        [business.id]
      );
      expect(sub.rows[0].status).toBe('past_due');
    });

    it('cancels subscription and removes featured status after all retries exhausted', async () => {
      const business = await makeBusinessWithSub(testCityId, { isFeatured: true });

      await sendStripeWebhook('customer.subscription.deleted', {
        id: business.stripeSubscriptionId,
        metadata: { businessId: business.id },
      });

      const updated = await businessService.findOne(business.id);
      expect(updated.isFeatured).toBe(false);

      const sub = await db.query(
        'SELECT status FROM subscriptions WHERE business_id = $1',
        [business.id]
      );
      expect(sub.rows[0].status).toBe('canceled');
    });
  });

  describe('Webhook security', () => {
    it('rejects webhooks with invalid Stripe signature', async () => {
      const payload = JSON.stringify({ type: 'checkout.session.completed' });
      const response = await request(app.getHttpServer())
        .post('/webhooks/stripe')
        .set('stripe-signature', 'invalid-signature')
        .send(payload)
        .expect(400);

      expect(response.body.detail).toContain('signature');
    });

    it('webhook is idempotent — double delivery has no side effects', async () => {
      const business = await makeBusiness(testCityId);
      const event = makeStripeEvent('checkout.session.completed', {
        metadata: { businessId: business.id, product: 'featured_spot_monthly' },
      });

      // Send twice (Stripe retry simulation)
      await sendStripeWebhookRaw(event);
      await sendStripeWebhookRaw(event);

      const subs = await db.query(
        'SELECT COUNT(*) FROM subscriptions WHERE business_id = $1',
        [business.id]
      );
      expect(parseInt(subs.rows[0].count)).toBe(1); // Not 2
    });
  });
});
```

### Manual Payment Test Scenarios

```
Manual test checklist (run before every Stripe-touching release):

CHECKOUT FLOWS:
  [ ] Featured Spot Monthly → Stripe Checkout → success → business is_featured = true
  [ ] Featured Spot Monthly → Stripe Checkout → card declined → business unchanged
  [ ] Featured Spot Monthly → Stripe Checkout → 3DS required → passes → business featured
  [ ] Business Pro Monthly → success → analytics dashboard unlocked
  [ ] Boosted Event → one-time payment → event appears featured in feed

SUBSCRIPTION MANAGEMENT:
  [ ] Business cancels via Customer Portal → is_featured removed within 48h grace period
  [ ] Business updates payment method via Customer Portal → subscription continues
  [ ] Business upgrades plan → pro-rata charge calculated correctly

DUNNING:
  [ ] Simulate failed payment: test card 4000000000009995
  [ ] Day 0: payment fails → past_due status, email sent
  [ ] Day 3: retry → if success → active restored
  [ ] Day 7: retry → if fails again → cancellation flow
  [ ] All dunning emails deliver and contain correct business name / renewal link

RECEIPTS:
  [ ] Stripe sends receipt email to business owner email
  [ ] Receipt shows correct amount and period
  [ ] VAT/tax handled correctly for non-US businesses (Year 2+)
```

---

## 10. Admin Dashboard Testing

```typescript
// apps/admin/src/tests/moderation-queue.spec.tsx

describe('Moderation Queue — Admin', () => {
  it('loads pending items sorted by priority', async () => {
    mockApi.get('/admin/moderation/queue').reply(200, {
      items: [
        makePendingContent({ priority: 'high', reportedAt: new Date() }),
        makePendingContent({ priority: 'normal', reportedAt: subHours(new Date(), 2) }),
      ],
    });

    render(<ModerationQueue />);
    await waitFor(() => {
      const items = screen.getAllByTestId('moderation-item');
      expect(items[0]).toHaveAttribute('data-priority', 'high');
    });
  });

  it('approve action sends correct API call and removes item from queue', async () => {
    const itemId = 'test-item-id';
    const approveMock = mockApi.post(`/admin/moderation/${itemId}/approve`).reply(200);

    render(<ModerationQueue />);
    await userEvent.click(screen.getByTestId(`approve-${itemId}`));

    expect(approveMock.isDone()).toBe(true);
    expect(screen.queryByTestId(`item-${itemId}`)).not.toBeInTheDocument();
  });

  it('requires confirmation before banning a user', async () => {
    render(<ModerationQueue />);
    await userEvent.click(screen.getByTestId('ban-user-button'));

    // Confirmation dialog must appear before action
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
  });
});
```

```typescript
// Admin auth: verify admin routes are protected
describe('Admin Route Protection', () => {
  it('redirects unauthenticated users to login', async () => {
    render(<MemoryRouter initialEntries={['/admin/moderation']}><AdminRoutes /></MemoryRouter>);
    expect(screen.queryByTestId('moderation-queue')).not.toBeInTheDocument();
    expect(window.location.href).toContain('/login');
  });

  it('shows 403 for authenticated non-admin users', async () => {
    mockCurrentUser({ role: 'user' });
    render(<MemoryRouter initialEntries={['/admin']}><AdminRoutes /></MemoryRouter>);
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });
});
```

---

## 11. Load Testing

### Tool: k6

```javascript
// test/load/feed.k6.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const feedLoadTime = new Trend('feed_load_time');

// MVP smoke test: 10 virtual users for 1 minute
// Run before every production deploy
export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 10,
      duration: '1m',
      tags: { test_type: 'smoke' },
    },

    // MMP load test: Chicago launch day simulation
    // Assumes 500 concurrent users (conservative launch estimate)
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },   // Ramp up
        { duration: '5m', target: 500 },   // Hold at Chicago launch load
        { duration: '2m', target: 0 },     // Ramp down
      ],
      tags: { test_type: 'load' },
    },

    // Production stress test: Ramadan night scenario
    // 3× normal Friday night traffic
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 500 },
        { duration: '5m', target: 1500 },  // Ramadan night peak
        { duration: '2m', target: 2000 },  // Spike
        { duration: '5m', target: 1500 },
        { duration: '3m', target: 0 },
      ],
      tags: { test_type: 'stress' },
    },
  },

  thresholds: {
    // Feed must respond in < 500ms for 95% of requests
    'feed_load_time': ['p(95)<500'],
    // Error rate must stay below 1%
    'errors': ['rate<0.01'],
    // HTTP errors must stay below 0.5%
    'http_req_failed': ['rate<0.005'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://api-staging.muzgram.com';

// Chicago West Rogers Park coordinates
const CHICAGO_COORDS = { lat: 41.9982, lng: -87.6850 };
const TEST_TOKEN = __ENV.TEST_AUTH_TOKEN;

export default function () {
  // Simulate the primary user journey
  const headers = { Authorization: `Bearer ${TEST_TOKEN}` };

  // 1. Load feed (primary action — most frequent)
  const feedStart = Date.now();
  const feedRes = http.get(
    `${BASE_URL}/feed?lat=${CHICAGO_COORDS.lat}&lng=${CHICAGO_COORDS.lng}&cityId=chicago`,
    { headers }
  );
  feedLoadTime.add(Date.now() - feedStart);

  check(feedRes, {
    'feed status is 200': (r) => r.status === 200,
    'feed returns data array': (r) => JSON.parse(r.body).data !== undefined,
    'feed response < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1); // Simulate user reading feed

  // 2. Load listing detail (secondary action)
  const listings = JSON.parse(feedRes.body).data;
  if (listings.length > 0) {
    const listingRes = http.get(`${BASE_URL}/listings/${listings[0].id}`, { headers });
    check(listingRes, {
      'listing detail is 200': (r) => r.status === 200,
      'listing detail < 300ms': (r) => r.timings.duration < 300,
    }) || errorRate.add(1);
  }

  sleep(2); // User reads listing

  // 3. Save a listing (write action — less frequent)
  if (listings.length > 0 && Math.random() < 0.3) { // 30% save rate
    const saveRes = http.post(
      `${BASE_URL}/listings/${listings[0].id}/save`,
      null,
      { headers }
    );
    check(saveRes, {
      'save is 200': (r) => r.status === 200,
    }) || errorRate.add(1);
  }

  sleep(1);
}
```

### Load Test Scenarios by Event Type

```javascript
// test/load/scenarios.js

// Scenario 1: Normal Friday evening (baseline)
// Assumes: 200 concurrent users, mostly feed browsing
export const fridayEvening = {
  executor: 'constant-vus',
  vus: 200,
  duration: '10m',
};

// Scenario 2: Eid morning — highest single-day traffic expected
// "What's open on Eid?" — read-heavy, mostly map + listing queries
export const eidMorning = {
  executor: 'ramping-vus',
  stages: [
    { duration: '5m', target: 1000 },  // Everyone checks at once
    { duration: '10m', target: 800 },  // Sustained
    { duration: '5m', target: 200 },   // Drops off as people leave for Eid
  ],
};

// Scenario 3: Ramadan Iftar time (7-9pm) — busiest recurring window
// Highly location-specific: users checking "what's open for iftar near me"
export const iftarRush = {
  executor: 'ramping-vus',
  stages: [
    { duration: '3m', target: 500 },
    { duration: '5m', target: 1200 }, // Peak: sunset -30min to sunset +60min
    { duration: '5m', target: 600 },
    { duration: '2m', target: 0 },
  ],
};

// Scenario 4: Desi party event post goes viral on WhatsApp
// Sudden spike: 0→500 users in 2 minutes
export const viralWhatsAppShare = {
  executor: 'ramping-arrival-rate',
  startRate: 10,
  timeUnit: '1s',
  preAllocatedVUs: 500,
  stages: [
    { duration: '30s', target: 200 }, // Someone shares the link
    { duration: '2m', target: 500 },  // Goes viral in group chats
    { duration: '5m', target: 300 },  // Sustained curiosity
    { duration: '5m', target: 50 },   // Drops off
  ],
};
```

### Performance Baselines and Gates

```
Performance SLOs — CI fails if these are breached on load tests:

Endpoint                  | P50    | P95    | P99    | Error Rate
──────────────────────────┼────────┼────────┼────────┼───────────
GET /feed                 | 80ms   | 300ms  | 500ms  | < 0.1%
GET /listings/:id         | 40ms   | 150ms  | 300ms  | < 0.1%
GET /map/clusters         | 60ms   | 250ms  | 400ms  | < 0.1%
POST /listings/:id/save   | 50ms   | 200ms  | 350ms  | < 0.1%
POST /community-posts     | 100ms  | 400ms  | 700ms  | < 0.5%
GET /events               | 60ms   | 200ms  | 400ms  | < 0.1%
POST /webhooks/stripe     | 200ms  | 800ms  | 1500ms | < 0.5%

Database query targets:
  Feed composition query    | < 50ms  (with spatial index)
  Map cluster query         | < 30ms  (with PostGIS ST_Simplify)
  Listing detail query      | < 10ms  (with covering index)
  Search (Typesense)        | < 50ms  (local node)
```

### Database Load Tests

```typescript
// test/load/db-load.ts — run against staging Neon branch
// Tests the PostGIS queries under concurrent load

async function runConcurrentFeedQueries(concurrency: number) {
  const queries = Array.from({ length: concurrency }, () =>
    db.query(`
      SELECT l.*, ST_Distance(
        l.location::geography,
        ST_MakePoint($1, $2)::geography
      ) AS distance
      FROM listings l
      WHERE l.city_id = $3
        AND l.is_active = true
        AND ST_DWithin(
          l.location::geography,
          ST_MakePoint($1, $2)::geography,
          5000
        )
      ORDER BY distance ASC, l.save_count DESC
      LIMIT 20
    `, [-87.6850, 41.9982, 'chicago'])
  );

  const start = Date.now();
  await Promise.all(queries);
  const duration = Date.now() - start;

  console.log(`${concurrency} concurrent queries: ${duration}ms total, ${duration/concurrency}ms avg`);
}

// Expected results (with spatial index):
// 10 concurrent:   < 200ms total
// 50 concurrent:   < 500ms total
// 100 concurrent:  < 1000ms total (triggers PgBouncer addition if slower)
```

---

## 12. Launch Readiness Checklist

### MVP Launch Checklist (Chicago)

```
FUNCTIONALITY — must pass before any user downloads the app

Auth:
  [ ] Phone OTP login works end-to-end on real device (iOS + Android)
  [ ] Session persists across app restarts
  [ ] Logout clears all local state (no residual data)
  [ ] Multiple devices: logging in on Device B doesn't break Device A session

Feed:
  [ ] Feed loads in < 3 seconds on 4G connection (tested with throttled network)
  [ ] Feed shows content from correct city based on user location
  [ ] Feed shows empty state (not crash) when no content available
  [ ] Featured listings appear above organic at same distance
  [ ] "Open Now" label is accurate (tested at various times of day)
  [ ] Scroll to bottom triggers next page load (pagination works)
  [ ] Pull-to-refresh updates content

Map:
  [ ] Map loads with correct initial position (user's location)
  [ ] Pins render for all active listings in viewport
  [ ] Tapping pin opens listing detail
  [ ] Category filter chips work (show only selected category)
  [ ] Map clusters at low zoom, shows individual pins at high zoom
  [ ] Map works when location permission is denied (shows city center)

Listings:
  [ ] All 40+ seed listings visible on map and in feed
  [ ] Listing detail shows: name, category, hours, address, phone, photos, halal badge
  [ ] "Get Directions" opens Apple/Google Maps with correct address
  [ ] "Call" taps dial the correct number
  [ ] Hours display is accurate for current day
  [ ] Save / unsave is optimistic (instant) and persists after app restart

Events:
  [ ] All seeded events appear in Go Out section
  [ ] Event detail shows: title, date/time, location, description, price
  [ ] "External link" button works (WhatsApp/Eventbrite)
  [ ] Past events do not appear in upcoming events list

Community Posts:
  [ ] Tier 0 users cannot post (see appropriate message)
  [ ] Tier 1+ users can create text posts
  [ ] Post with photo works (upload + display)
  [ ] Post appears in feed within 60 seconds of creation
  [ ] Posts expire and disappear after 7 days

Sharing:
  [ ] WhatsApp share button generates correct deep link URL
  [ ] Deep link URL opens correct listing/event in app (if installed)
  [ ] Deep link URL opens correct web page (if app not installed)
  [ ] Share sheet shows WhatsApp prominently (not buried)

Notifications:
  [ ] Push notification opt-in prompt appears at right moment (not at cold open)
  [ ] Test notification delivers within 30 seconds of send
  [ ] Tapping notification deep-links to correct content
  [ ] Notification does not appear for content the user already viewed

CONTENT — must be true before launch day
  [ ] 40+ active business listings (verified, not just stubbed)
  [ ] 15+ events in next 30 days
  [ ] All featured founding member businesses have photos
  [ ] All listing phone numbers are verified (called/tested)
  [ ] All listing hours are accurate (checked in last 7 days)
  [ ] No placeholder text ("Lorem ipsum", "Business name here") in any listing
  [ ] 5+ community posts seeded per top 10 businesses

PERFORMANCE:
  [ ] Feed load P95 < 500ms (verified with k6 smoke test)
  [ ] App cold start < 3 seconds (measured on iPhone 12 equivalent)
  [ ] App size < 50MB (over-the-air iOS download limit)
  [ ] No memory leaks: 10 minutes of browsing, memory stable
  [ ] Image loading: no blank spaces visible (blur placeholders work)
  [ ] Offline mode: shows cached content, not blank screen

SECURITY:
  [ ] All API endpoints require auth (no accidental public endpoints)
  [ ] Stripe test mode → live mode confirmed switched in production
  [ ] No test API keys in production environment (check Doppler)
  [ ] Admin panel not accessible without admin role
  [ ] Media uploads: EXIF stripped, size validated, type validated

MONITORING:
  [ ] Sentry configured and receiving test error
  [ ] Grafana dashboard live with: API error rate, feed response time
  [ ] Grafana alert: "API down" → pings founder immediately
  [ ] Upstash Redis dashboard accessible
  [ ] Neon database dashboard accessible
  [ ] Cloudflare analytics showing traffic (not zeros)

PAYMENTS (even if not using Stripe yet):
  [ ] Founding member Zelle/Venmo payment confirmed before listing goes live
  [ ] Manual featured listing tracking doc created (Google Sheet)
  [ ] All paying businesses confirmed their listing is showing correctly

COMPLIANCE:
  [ ] Privacy policy page live at muzgram.com/privacy
  [ ] Terms of service page live at muzgram.com/terms
  [ ] App Store listing: age rating, categories, description reviewed
  [ ] EXIF stripping on all uploaded photos (confirmed in test above)

APP STORE:
  [ ] iOS build submitted and approved (24-48h before launch)
  [ ] Android build submitted and approved (4-8h before launch)
  [ ] App Store screenshots accurate (not placeholder)
  [ ] App description reviewed for brand compliance (no "Islamic events")
  [ ] TestFlight: 10+ real users tested with no crashes

DAY 1 READINESS:
  [ ] Founder's phone available all day for support
  [ ] Slack #incidents channel set up with alert routing
  [ ] Rollback procedure documented and tested (< 5 min)
  [ ] Backup: if app crashes, web pages (muzgram.com/chicago) still work
  [ ] First 20 founding members briefed and ready to post on Day 1
```

### MMP Launch Checklist

```
In addition to MVP checklist items, before MMP releases:

STRIPE SELF-SERVE:
  [ ] Stripe Checkout tested with all plan types (Featured, Pro, Boosted Event)
  [ ] All Stripe webhook events handled and tested (10 event types)
  [ ] Customer Portal: business can cancel, update payment, view invoices
  [ ] Dunning emails: all 3 dunning emails deliver with correct content
  [ ] Stripe live mode webhooks verified with Stripe CLI
  [ ] Pro-rata pricing tested: mid-cycle upgrade calculates correctly
  [ ] Failed payment: business sees degraded state (not featured) after grace period

SEARCH (Typesense):
  [ ] Typesense index synced with all production businesses (verify count matches DB)
  [ ] Search returns results in < 100ms (measured from mobile on 4G)
  [ ] Typo tolerance: "shawarma" vs "shawerma" returns same results
  [ ] Geo-boosting: nearby results appear above distant results for same query
  [ ] City isolation: searching in Chicago doesn't return Houston results
  [ ] Zero-result queries logged for content strategy review

REVIEWS (MMP):
  [ ] Only authenticated users can leave reviews
  [ ] User can only review a listing once (duplicate check)
  [ ] Review moderation: flagged reviews hidden pending review
  [ ] Aggregate rating recalculates correctly after new review
  [ ] Review schema shows in Google Rich Results Test

RSVP:
  [ ] Going / Interested / Not Going states work
  [ ] RSVP count updates in real-time (or < 60s)
  [ ] Calendar export generates valid .ics file (tested in iOS Calendar, Google Calendar)
  [ ] RSVP notification sends to organizer when going count hits milestone

BUSINESS ANALYTICS:
  [ ] Business Pro dashboard loads with correct data for past 30 days
  [ ] View count matches activity_logs (no discrepancy > 5%)
  [ ] Weekly WhatsApp report sends every Monday 8am
  [ ] Business can see their position vs category average
```

### Production Launch Checklist

```
In addition to MMP items, before multi-city production scale:

INFRASTRUCTURE:
  [ ] Load test passed: 1,500 concurrent users, < 500ms P95 feed
  [ ] Database read replica active and taking read traffic
  [ ] PgBouncer connection pooling verified (connections < 80% of limit)
  [ ] Typesense 3-node cluster operational (not single node)
  [ ] Auto-scaling tested: traffic spike → new containers spin up < 2min
  [ ] Rollback tested: can revert to previous version in < 5 minutes
  [ ] Chaos engineering: kill 1 API container → traffic reroutes, no user impact

MULTI-CITY:
  [ ] New city provisioning script tested on staging (T-30 → T-0)
  [ ] City-isolated feed: Chicago users cannot see Houston content
  [ ] Geo-detection accuracy: 95%+ correct city detection from coordinates
  [ ] Near-me Cloudflare Worker tested from VPN in each target city

OBSERVABILITY:
  [ ] Full OpenTelemetry traces flowing to Grafana Tempo
  [ ] P95 feed latency alarm tested (fires within 2 min of threshold breach)
  [ ] PagerDuty on-call rotation set up (not just Slack)
  [ ] Runbook for each alert condition documented in Notion
  [ ] Synthetic monitoring: Grafana runs feed query every 60s from 3 regions

SECURITY:
  [ ] Penetration test conducted (at minimum: OWASP Top 10 scan)
  [ ] All secrets rotated before production launch
  [ ] Rate limiting verified under load (does not block legitimate users)
  [ ] SQL injection scan: all parameterized queries (no raw string concat)
  [ ] Dependency audit: no HIGH/CRITICAL CVEs (npm audit)
  [ ] SBOM generated and stored

DATA:
  [ ] Neon PITR tested: restore to a point 24h ago, verify data integrity
  [ ] Weekly pg_dump to R2 tested: restore from dump completes successfully
  [ ] GDPR delete endpoint tested: user deleted → all PII removed within 24h
  [ ] Data export tested: user requests export → receives valid JSON

COMPLIANCE:
  [ ] GDPR consent flow live for EU users
  [ ] Privacy policy updated for all new data categories (MMP additions)
  [ ] App Store age rating reviewed for event content (desi parties, nightlife)
  [ ] Cookie policy: if web app uses cookies, banner compliant
```

---

## Test Infrastructure Summary

```
Tool              | Purpose                          | Stage
──────────────────┼──────────────────────────────────┼──────────────
Jest + ts-jest    | Unit + integration (API)         | MVP → Production
Vitest            | Unit (packages, utilities)       | MVP → Production
RNTL              | Component tests (mobile)         | MVP → Production
Maestro           | E2E flows (mobile)               | MMP → Production
Supertest         | API contract tests               | MVP → Production
Bruno             | Manual API testing collections   | MVP → Production
k6                | Load testing                     | MMP → Production
Neon branching    | Isolated test databases per PR   | MVP → Production
Sentry            | Crash reporting (mobile)         | MVP → Production
Grafana           | Performance regression detection | MMP → Production
TruffleHog        | Secret scanning in CI            | MVP → Production
npm audit         | Dependency CVE scanning          | MVP → Production

CI gates (PRs blocked if these fail):
  ✓ TypeScript type check
  ✓ ESLint
  ✓ Unit tests (all)
  ✓ Integration tests (all)
  ✓ API contract tests
  ✓ npm audit (HIGH/CRITICAL)
  ✓ Secret scan (TruffleHog)
  ✓ Build succeeds (Docker image builds)
  ✓ Smoke test on preview deployment
  ✓ Brand copy compliance scan (forbidden phrases)
```

> Next: see [20-cloud-infrastructure.md](20-cloud-infrastructure.md) for how tests run in CI/CD pipeline, and [19-production-architecture.md](19-production-architecture.md) for scale-specific testing considerations.
