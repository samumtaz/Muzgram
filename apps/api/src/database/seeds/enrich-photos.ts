/**
 * Photo Enrichment Script
 *
 * Looks up each manually-seeded listing (no photo, source=manual) in Google
 * Places API and sets thumbnailUrl + mediaUrls from the first few results.
 *
 * Usage:
 *   pnpm --filter=@muzgram/api enrich:photos
 *   pnpm --filter=@muzgram/api enrich:photos -- --dry-run
 *
 * Requires GOOGLE_PLACES_API_KEY in apps/api/.env
 * Enable "Places API" at console.cloud.google.com → APIs & Services → Library
 */

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const DRY_RUN = process.argv.includes('--dry-run');
const DELAY_MS = 200; // stay well under 10 req/s free tier limit

const TEXT_SEARCH_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const PHOTO_URL = 'https://maps.googleapis.com/maps/api/place/photo';

function photoRef(ref: string, maxWidth = 800): string {
  return `${PHOTO_URL}?maxwidth=${maxWidth}&photo_reference=${ref}&key=${API_KEY}`;
}

async function findPhotos(name: string, address: string): Promise<string[]> {
  const query = `${name} ${address}`;
  const params = new URLSearchParams({ query, key: API_KEY!, language: 'en', region: 'us' });
  const res = await fetch(`${TEXT_SEARCH_URL}?${params}`);
  const data = await res.json() as any;

  if (data.status !== 'OK' || !data.results?.length) return [];

  const photos: Array<{ photo_reference: string }> = data.results[0].photos ?? [];
  return photos.slice(0, 5).map((p) => photoRef(p.photo_reference, 1200));
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!API_KEY) {
    console.error('GOOGLE_PLACES_API_KEY not set in apps/api/.env');
    console.error('Add it and enable "Places API" in Google Cloud Console.');
    process.exit(1);
  }

  const db = new DataSource(dataSourceOptions);
  await db.initialize();
  console.log('Connected to database\n');

  const listings = await db.query<{ id: string; name: string; address: string }[]>(`
    SELECT id, name, address
    FROM listings
    WHERE primary_photo_url IS NULL
      AND (media_urls IS NULL OR array_length(media_urls, 1) IS NULL)
      AND address IS NOT NULL
      AND status = 'active'
    ORDER BY name
  `);

  console.log(`${listings.length} listings need photos\n`);

  let updated = 0;
  let noPhoto = 0;
  let errors = 0;

  for (const listing of listings) {
    try {
      process.stdout.write(`  ${listing.name} ... `);
      const photos = await findPhotos(listing.name, listing.address);

      if (!photos.length) {
        console.log('no photo found');
        noPhoto++;
        await sleep(DELAY_MS);
        continue;
      }

      const [thumbnail, ...rest] = photos;
      console.log(`got ${photos.length} photo(s)`);

      if (!DRY_RUN) {
        await db.query(
          `UPDATE listings
           SET primary_photo_url = $1, media_urls = $2::text[], updated_at = NOW()
           WHERE id = $3`,
          [thumbnail, photos, listing.id],
        );
      }

      updated++;
      await sleep(DELAY_MS);
    } catch (e: any) {
      console.log(`ERROR: ${e.message}`);
      errors++;
      await sleep(DELAY_MS * 2);
    }
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`Updated : ${updated}`);
  console.log(`No photo: ${noPhoto}`);
  console.log(`Errors  : ${errors}`);
  if (DRY_RUN) console.log(`\n(DRY RUN — nothing was written)`);

  await db.destroy();
}

main().catch(console.error);
