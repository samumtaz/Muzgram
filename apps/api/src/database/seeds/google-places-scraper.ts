/**
 * Google Places API → Muzgram Seeder
 *
 * Pulls real business data from the Google Places API (legal, ToS-compliant)
 * and upserts into Muzgram's listings table.
 *
 * Prerequisites:
 *   - GOOGLE_PLACES_API_KEY env var (get one at console.cloud.google.com)
 *   - Enable "Places API (New)" in your Google Cloud project
 *   - DATABASE_URL env var pointing to your Supabase DB
 *
 * Usage:
 *   pnpm --filter=@muzgram/api seed:places
 *   pnpm --filter=@muzgram/api seed:places -- --dry-run
 *   pnpm --filter=@muzgram/api seed:places -- --queries="halal restaurant chicago,mosque chicago"
 *
 * Cost estimate: ~$0.032 per Text Search request + $0.017 per Place Details.
 *   For 30 queries × 3 pages + details: ~$8-15 total, covered by free tier.
 */

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';

// ─── Config ───────────────────────────────────────────────────────────────────

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const DRY_RUN = process.argv.includes('--dry-run');
const CUSTOM_QUERIES = process.argv
  .find((a) => a.startsWith('--queries='))
  ?.replace('--queries=', '')
  .split(',')
  .map((q) => q.trim());

const PLACES_TEXT_SEARCH_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const PLACES_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';
const PLACES_PHOTO_URL = 'https://maps.googleapis.com/maps/api/place/photo';

// ─── Search queries ────────────────────────────────────────────────────────────
// Organized by cluster so we get good geographic spread.
// Each query returns up to 60 results (20 per page, 3 pages).

const DEFAULT_QUERIES: { query: string; citySlug: string; mainCategory: string; subCategory: string }[] = [
  // ── Devon Ave / West Ridge ─────────────────────────────────────────────────
  { query: 'halal restaurant Devon Avenue Chicago', citySlug: 'chicago-devon', mainCategory: 'eat', subCategory: 'halal-restaurant' },
  { query: 'Pakistani restaurant Devon Avenue Chicago', citySlug: 'chicago-devon', mainCategory: 'eat', subCategory: 'halal-restaurant' },
  { query: 'Indian restaurant Devon Avenue Chicago', citySlug: 'chicago-devon', mainCategory: 'eat', subCategory: 'halal-restaurant' },
  { query: 'Afghan restaurant Chicago', citySlug: 'chicago-devon', mainCategory: 'eat', subCategory: 'halal-restaurant' },
  { query: 'Middle Eastern restaurant Devon Chicago', citySlug: 'chicago-devon', mainCategory: 'eat', subCategory: 'halal-restaurant' },
  { query: 'Muslim owned grocery Devon Avenue Chicago', citySlug: 'chicago-devon', mainCategory: 'eat', subCategory: 'halal-grocery' },
  { query: 'halal grocery store West Ridge Chicago', citySlug: 'chicago-devon', mainCategory: 'eat', subCategory: 'halal-grocery' },
  { query: 'South Asian sweets bakery Devon Chicago', citySlug: 'chicago-devon', mainCategory: 'eat', subCategory: 'cafe-bakery' },
  { query: 'halal butcher shop Chicago', citySlug: 'chicago-devon', mainCategory: 'eat', subCategory: 'halal-grocery' },
  { query: 'mosque Devon Avenue Chicago', citySlug: 'chicago-devon', mainCategory: 'connect', subCategory: 'mosque' },
  { query: 'Islamic center West Ridge Chicago', citySlug: 'chicago-devon', mainCategory: 'connect', subCategory: 'mosque' },
  { query: 'Muslim school Chicago', citySlug: 'chicago-devon', mainCategory: 'connect', subCategory: 'islamic-school' },
  { query: 'desi clothing store Devon Chicago', citySlug: 'chicago-devon', mainCategory: 'go_out', subCategory: 'shopping' },
  { query: 'South Asian jewelry Devon Chicago', citySlug: 'chicago-devon', mainCategory: 'go_out', subCategory: 'shopping' },

  // ── Bridgeview / Orland ───────────────────────────────────────────────────
  { query: 'halal restaurant Bridgeview Illinois', citySlug: 'chicago-bridgeview', mainCategory: 'eat', subCategory: 'halal-restaurant' },
  { query: 'mosque Bridgeview Illinois', citySlug: 'chicago-bridgeview', mainCategory: 'connect', subCategory: 'mosque' },
  { query: 'Islamic center Bridgeview Illinois', citySlug: 'chicago-bridgeview', mainCategory: 'connect', subCategory: 'mosque' },
  { query: 'halal restaurant Palos Hills Illinois', citySlug: 'chicago-bridgeview', mainCategory: 'eat', subCategory: 'halal-restaurant' },
  { query: 'Arab restaurant Orland Park Illinois', citySlug: 'chicago-bridgeview', mainCategory: 'eat', subCategory: 'halal-restaurant' },

  // ── Skokie / Evanston ────────────────────────────────────────────────────
  { query: 'halal restaurant Skokie Illinois', citySlug: 'chicago-skokie', mainCategory: 'eat', subCategory: 'halal-restaurant' },
  { query: 'Pakistani restaurant Skokie Illinois', citySlug: 'chicago-skokie', mainCategory: 'eat', subCategory: 'halal-restaurant' },
  { query: 'mosque Skokie Evanston Illinois', citySlug: 'chicago-skokie', mainCategory: 'connect', subCategory: 'mosque' },
  { query: 'halal food Evanston Illinois', citySlug: 'chicago-skokie', mainCategory: 'eat', subCategory: 'halal-restaurant' },

  // ── Schaumburg / Naperville ───────────────────────────────────────────────
  { query: 'halal restaurant Schaumburg Illinois', citySlug: 'chicago-schaumburg', mainCategory: 'eat', subCategory: 'halal-restaurant' },
  { query: 'mosque Schaumburg Illinois', citySlug: 'chicago-schaumburg', mainCategory: 'connect', subCategory: 'mosque' },
  { query: 'halal restaurant Naperville Illinois', citySlug: 'chicago-schaumburg', mainCategory: 'eat', subCategory: 'halal-restaurant' },
  { query: 'Islamic center Naperville Illinois', citySlug: 'chicago-schaumburg', mainCategory: 'connect', subCategory: 'mosque' },

  // ── Bolingbrook ──────────────────────────────────────────────────────────
  { query: 'halal restaurant Bolingbrook Illinois', citySlug: 'chicago-bolingbrook', mainCategory: 'eat', subCategory: 'halal-restaurant' },
  { query: 'mosque Bolingbrook Illinois', citySlug: 'chicago-bolingbrook', mainCategory: 'connect', subCategory: 'mosque' },

  // ── Events & Activities ───────────────────────────────────────────────────
  { query: 'hookah lounge halal Chicago', citySlug: 'chicago-devon', mainCategory: 'go_out', subCategory: 'cafe-hookah' },
  { query: 'Islamic bookstore Chicago', citySlug: 'chicago-devon', mainCategory: 'go_out', subCategory: 'shopping' },
  { query: 'Muslim community center Chicago', citySlug: 'chicago-devon', mainCategory: 'connect', subCategory: 'community-center' },
  { query: 'halal cafe Chicago', citySlug: 'chicago-devon', mainCategory: 'eat', subCategory: 'cafe-bakery' },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry: { location: { lat: number; lng: number } };
  rating?: number;
  user_ratings_total?: number;
  business_status?: string;
  types?: string[];
  photos?: Array<{ photo_reference: string; width: number; height: number }>;
  price_level?: number;
}

interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  url?: string;
  types?: string[];
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
    periods?: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  };
  geometry: { location: { lat: number; lng: number } };
  rating?: number;
  user_ratings_total?: number;
  photos?: Array<{ photo_reference: string; width: number; height: number }>;
  vicinity?: string;
  editorial_summary?: { overview?: string };
  business_status?: string;
}

// ─── API calls ───────────────────────────────────────────────────────────────

async function textSearch(query: string, pageToken?: string): Promise<{
  results: PlaceResult[];
  nextPageToken?: string;
  status: string;
}> {
  const params = new URLSearchParams({
    query,
    key: API_KEY!,
    language: 'en',
    region: 'us',
    ...(pageToken ? { pagetoken: pageToken } : {}),
  });

  const res = await fetch(`${PLACES_TEXT_SEARCH_URL}?${params}`);
  return res.json() as any;
}

async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const fields = [
    'place_id', 'name', 'formatted_address', 'formatted_phone_number',
    'international_phone_number', 'website', 'url', 'opening_hours',
    'geometry', 'rating', 'user_ratings_total', 'photos', 'vicinity',
    'editorial_summary', 'business_status',
  ].join(',');

  const params = new URLSearchParams({ place_id: placeId, fields, key: API_KEY!, language: 'en' });
  const res = await fetch(`${PLACES_DETAILS_URL}?${params}`);
  const data = await res.json() as any;
  return data.result ?? null;
}

function getPhotoUrl(photoReference: string, maxWidth = 800): string {
  return `${PLACES_PHOTO_URL}?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${API_KEY}`;
}

// ─── Data mapping ─────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseHours(details: PlaceDetails): Record<string, { open: string; close: string }> | null {
  if (!details.opening_hours?.periods) return null;

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const result: Record<string, { open: string; close: string }> = {};

  for (const period of details.opening_hours.periods) {
    const day = days[period.open.day];
    if (!day) continue;
    const open = `${period.open.time.slice(0, 2)}:${period.open.time.slice(2)}`;
    const close = period.close
      ? `${period.close.time.slice(0, 2)}:${period.close.time.slice(2)}`
      : '23:59';
    result[day] = { open, close };
  }

  return Object.keys(result).length > 0 ? result : null;
}

function extractNeighborhood(address: string): string {
  // "6022 N Oakley Ave, Chicago, IL 60659, USA" → try to extract Chicago neighborhood
  // For non-Chicago suburbs, use the city name
  const parts = address.split(',').map((p) => p.trim());
  if (parts.length >= 2) {
    const city = parts[parts.length - 3] ?? parts[1];
    if (city && city !== 'Chicago') return city;
  }
  return 'Chicago';
}

function categorizeByTypes(types: string[]): { isHalal: boolean; description: string } {
  const isRestaurant = types.some((t) =>
    ['restaurant', 'food', 'meal_takeaway', 'meal_delivery'].includes(t)
  );
  const isMosque = types.some((t) => ['mosque', 'place_of_worship'].includes(t));
  const isGrocery = types.some((t) =>
    ['grocery_or_supermarket', 'supermarket', 'store'].includes(t)
  );

  let description = '';
  if (isMosque) description = 'Mosque and Islamic center serving the local Muslim community.';
  else if (isRestaurant) description = 'Halal-certified restaurant serving the local community.';
  else if (isGrocery) description = 'Halal grocery and specialty food store.';

  return { isHalal: !isMosque, description };
}

// ─── DB upsert ───────────────────────────────────────────────────────────────

// Cache category slug → UUID lookups
const categoryIdCache = new Map<string, string>();

async function resolveCategoryId(db: DataSource, categorySlug: string, mainCategory: string): Promise<string> {
  if (categoryIdCache.has(categorySlug)) return categoryIdCache.get(categorySlug)!;

  // Try exact slug match first
  let rows = await db.query<[{ id: string }]>(
    `SELECT id FROM listing_categories WHERE slug = $1 LIMIT 1`,
    [categorySlug],
  );

  // Fall back to first category in the main_category
  if (!rows[0]) {
    rows = await db.query<[{ id: string }]>(
      `SELECT id FROM listing_categories WHERE main_category = $1 ORDER BY name LIMIT 1`,
      [mainCategory],
    );
  }

  if (!rows[0]) throw new Error(`No category found for slug="${categorySlug}" main="${mainCategory}"`);

  categoryIdCache.set(categorySlug, rows[0].id);
  return rows[0].id;
}

async function upsertListing(
  db: DataSource,
  cityId: string,
  categorySlug: string,
  mainCategory: string,
  details: PlaceDetails,
  hintDescription: string,
): Promise<{ inserted: boolean }> {
  const categoryId = await resolveCategoryId(db, categorySlug, mainCategory);
  const hours = parseHours(details);
  const { isHalal, description } = categorizeByTypes(details.types ?? []);
  const finalDescription = details.editorial_summary?.overview ?? hintDescription ?? description;
  const phone = details.formatted_phone_number ?? details.international_phone_number ?? null;
  const thumbnailUrl = details.photos?.[0]
    ? getPhotoUrl(details.photos[0].photo_reference, 800)
    : null;
  const mediaUrls = (details.photos ?? [])
    .slice(0, 5)
    .map((p) => getPhotoUrl(p.photo_reference, 1200));

  const baseSlug = slugify(details.name);
  const address = details.formatted_address ?? details.vicinity ?? null;
  const neighborhood = address ? extractNeighborhood(address) : 'Chicago';

  const result = await db.query<Array<{ id: string; inserted: boolean }>>(`
    INSERT INTO listings (
      id, city_id, category_id, name, slug, address, neighborhood,
      lat, lng, phone, website,
      main_category,
      description, hours,
      thumbnail_url, media_urls,
      is_halal_verified, halal_certification,
      status, source, external_id,
      rating, rating_count,
      created_at, updated_at
    ) VALUES (
      gen_random_uuid(), $1, $2, $3,
      (SELECT CASE
        WHEN NOT EXISTS (SELECT 1 FROM listings WHERE slug = $4) THEN $4
        ELSE $4 || '-' || substr(md5(random()::text), 1, 6)
      END),
      $5, $6, $7, $8, $9, $10,
      $11,
      $12, $13::jsonb,
      $14, $15::jsonb,
      $16, $17,
      'active', 'google_places', $18,
      $19, $20,
      NOW(), NOW()
    )
    ON CONFLICT (external_id) DO UPDATE SET
      name         = EXCLUDED.name,
      address      = EXCLUDED.address,
      lat          = EXCLUDED.lat,
      lng          = EXCLUDED.lng,
      phone        = EXCLUDED.phone,
      website      = EXCLUDED.website,
      hours        = EXCLUDED.hours,
      rating       = EXCLUDED.rating,
      rating_count = EXCLUDED.rating_count,
      updated_at   = NOW()
    RETURNING id, (xmax = 0) AS inserted
  `, [
    cityId,
    categoryId,
    details.name,
    baseSlug,
    address,
    neighborhood,
    details.geometry.location.lat,
    details.geometry.location.lng,
    phone,
    details.website ?? null,
    mainCategory,
    finalDescription || null,
    hours ? JSON.stringify(hours) : null,
    thumbnailUrl,
    JSON.stringify(mediaUrls),
    isHalal,
    isHalal ? 'owner_verified' : null,
    details.place_id,
    details.rating ?? null,
    details.user_ratings_total ?? null,
  ]);

  return { inserted: result[0]?.inserted ?? false };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY is not set. Get one at console.cloud.google.com');
    process.exit(1);
  }

  console.log(`🗺️  Google Places → Muzgram seeder`);
  console.log(`   Dry run: ${DRY_RUN}`);
  console.log(`   Queries: ${CUSTOM_QUERIES ? CUSTOM_QUERIES.length : DEFAULT_QUERIES.length}`);
  console.log('');

  const queries = CUSTOM_QUERIES
    ? CUSTOM_QUERIES.map((q) => ({
        query: q,
        citySlug: 'chicago-devon',
        mainCategory: 'eat',
        subCategory: 'halal-restaurant',
      }))
    : DEFAULT_QUERIES;

  // Connect to DB
  const db = new DataSource(dataSourceOptions);
  if (!DRY_RUN) {
    await db.initialize();
    console.log('✅ Database connected\n');
  }

  // Resolve city IDs
  const cityIdCache = new Map<string, string>();
  if (!DRY_RUN) {
    const cities = await db.query<Array<{ id: string; slug: string }>>('SELECT id, slug FROM cities');
    for (const city of cities) cityIdCache.set(city.slug, city.id);
  }

  const seen = new Set<string>(); // deduplicate place_ids across queries
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalFetched = 0;

  for (const queryConfig of queries) {
    const { query, citySlug, mainCategory, subCategory } = queryConfig;
    const cityId = cityIdCache.get(citySlug);

    if (!DRY_RUN && !cityId) {
      console.warn(`⚠️  City slug "${citySlug}" not found in DB — run chicago-seed first. Skipping.`);
      continue;
    }

    console.log(`🔍 Searching: "${query}"`);

    // Fetch up to 3 pages (60 results)
    let pageToken: string | undefined;
    let pageNum = 0;
    const pageResults: PlaceResult[] = [];

    do {
      if (pageToken) {
        // Google requires a short delay between paginated requests
        await sleep(2000);
      }

      const response = await textSearch(query, pageToken);

      if (response.status !== 'OK' && response.status !== 'ZERO_RESULTS') {
        console.warn(`   ⚠️  API status: ${response.status}`);
        break;
      }

      pageResults.push(...(response.results ?? []));
      pageToken = response.nextPageToken;
      pageNum++;
    } while (pageToken && pageNum < 3);

    console.log(`   Found ${pageResults.length} places`);

    // Fetch details and upsert each
    for (const place of pageResults) {
      if (seen.has(place.place_id)) {
        totalSkipped++;
        continue;
      }
      seen.add(place.place_id);

      // Skip permanently closed
      if (place.business_status === 'PERMANENTLY_CLOSED' || place.business_status === 'CLOSED_PERMANENTLY') {
        totalSkipped++;
        continue;
      }

      totalFetched++;

      if (DRY_RUN) {
        console.log(`   [DRY] ${place.name} — ${place.formatted_address ?? 'no address'}`);
        continue;
      }

      // Fetch full details (hours, phone, website, photos)
      await sleep(100); // be polite, avoid rate-limit
      const details = await getPlaceDetails(place.place_id);
      if (!details) {
        totalSkipped++;
        continue;
      }

      try {
        const { inserted } = await upsertListing(db, cityId!, subCategory, mainCategory, details, '');
        if (inserted) {
          totalInserted++;
          process.stdout.write(`   ✅ ${details.name}\n`);
        } else {
          totalUpdated++;
          process.stdout.write(`   🔄 ${details.name} (updated)\n`);
        }
      } catch (err: any) {
        console.warn(`   ❌ ${place.name}: ${err.message}`);
        totalSkipped++;
      }
    }

    console.log('');
  }

  if (!DRY_RUN) {
    // Update listing counts per city
    await db.query(`
      UPDATE cities c
      SET listings_count = (SELECT COUNT(*) FROM listings l WHERE l.city_id = c.id AND l.status = 'active')
    `);

    // Refresh full-text search vectors
    await db.query(`
      UPDATE listings
      SET search_vector = to_tsvector('english',
        COALESCE(name, '') || ' ' ||
        COALESCE(description, '') || ' ' ||
        COALESCE(address, '') || ' ' ||
        COALESCE(neighborhood, '')
      )
      WHERE source = 'google_places'
    `);

    await db.destroy();
  }

  console.log('─────────────────────────────');
  console.log(`✅ Done`);
  console.log(`   Fetched:  ${totalFetched}`);
  if (!DRY_RUN) {
    console.log(`   Inserted: ${totalInserted}`);
    console.log(`   Updated:  ${totalUpdated}`);
  }
  console.log(`   Skipped:  ${totalSkipped} (duplicates/closed)`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
