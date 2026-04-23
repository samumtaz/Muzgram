/**
 * Chicago Launch Seed
 *
 * Seeds:
 *   - 29 Chicago metro cities/clusters (4 active, 25 inactive)
 *   - 16 listing subcategories
 *   - 40+ Devon Ave anchor businesses
 *   - 50+ businesses across outer clusters and suburbs
 *   - 8 upcoming events
 *
 * Run: pnpm --filter=@muzgram/api seed:chicago
 */

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';

const db = new DataSource(dataSourceOptions);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function upsertCity(db: DataSource, city: {
  slug: string; name: string; state: string;
  centerLat: number; centerLng: number; isActive: boolean;
}) {
  await db.query(`
    INSERT INTO cities (id, slug, name, state, country, center_lat, center_lng, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), $1, $2, $3, 'US', $4, $5, $6, NOW(), NOW())
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, is_active = EXCLUDED.is_active
  `, [city.slug, city.name, city.state, city.centerLat, city.centerLng, city.isActive]);

  const [{ id }] = await db.query<[{ id: string }]>(`SELECT id FROM cities WHERE slug = $1`, [city.slug]);
  return id as string;
}

async function upsertCategory(db: DataSource, cat: {
  slug: string; name: string; mainCategory: string;
}) {
  await db.query(`
    INSERT INTO listing_categories (id, slug, name, main_category, icon_name, sort_order, created_at, updated_at)
    VALUES (gen_random_uuid(), $1, $2, $3::listing_main_category_enum, 'circle', 0, NOW(), NOW())
    ON CONFLICT (slug) DO NOTHING
  `, [cat.slug, cat.name, cat.mainCategory]);

  const [{ id }] = await db.query<[{ id: string }]>(`SELECT id FROM listing_categories WHERE slug = $1`, [cat.slug]);
  return id as string;
}

// Maps seed halal strings to valid enum values
function toHalalEnum(val: string): string {
  if (val === 'certified') return 'ifanca';
  if (val === 'self_declared') return 'self_certified';
  return 'none';
}

async function upsertListing(db: DataSource, listing: {
  slug: string; name: string; description: string; mainCategory: string;
  categorySlug: string; citySlug: string; address: string; neighborhood: string;
  lat: number; lng: number; phone?: string; website?: string;
  halalCertification: string; priceRange?: string;
}) {
  const [city] = await db.query<[{ id: string }]>(`SELECT id FROM cities WHERE slug = $1`, [listing.citySlug]);
  const [category] = await db.query<[{ id: string }]>(`SELECT id FROM listing_categories WHERE slug = $1`, [listing.categorySlug]);

  if (!city || !category) {
    console.warn(`Skipping "${listing.name}" — city or category not found`);
    return null;
  }

  await db.query(`
    INSERT INTO listings (
      id, slug, name, description, main_category, category_id, city_id,
      address, neighborhood, location, lat, lng, phone, website,
      halal_certification, status
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4::listing_main_category_enum, $5, $6,
      $7, $8, ST_SetSRID(ST_MakePoint($10, $9), 4326), $9, $10, $11, $12,
      $13::halal_certification_enum, 'active'
    )
    ON CONFLICT (slug) DO UPDATE
      SET name = EXCLUDED.name, description = EXCLUDED.description,
          phone = EXCLUDED.phone, website = EXCLUDED.website
  `, [
    listing.slug, listing.name, listing.description, listing.mainCategory,
    category.id, city.id,
    listing.address, listing.neighborhood ?? null, listing.lat, listing.lng,
    listing.phone ?? null, listing.website ?? null,
    toHalalEnum(listing.halalCertification),
  ]);

  const [{ id }] = await db.query<[{ id: string }]>(`SELECT id FROM listings WHERE slug = $1`, [listing.slug]);
  console.log(`  ✓ ${listing.name}`);
  return id as string;
}

async function ensureSeedUser(db: DataSource): Promise<string> {
  const SEED_CLERK_ID = 'seed_system_user_001';
  const rows = await db.query<[{ id: string }]>(`SELECT id FROM users WHERE clerk_user_id = $1`, [SEED_CLERK_ID]);
  if (rows.length) return rows[0].id;

  await db.query(`
    INSERT INTO users (id, clerk_user_id, phone, display_name, is_active, notification_prefs,
      trust_tier, notifications_sent_today, reports_submitted_count, reports_received_count,
      created_at, updated_at)
    VALUES (gen_random_uuid(), $1, '+10000000000', 'Muzgram Seed', true, '{}', 0, 0, 0, 0, NOW(), NOW())
  `, [SEED_CLERK_ID]);

  const [{ id }] = await db.query<[{ id: string }]>(`SELECT id FROM users WHERE clerk_user_id = $1`, [SEED_CLERK_ID]);
  return id;
}

async function upsertEvent(db: DataSource, organizerId: string, event: {
  slug: string; title: string; description: string;
  citySlug: string; listingSlug?: string;
  startAt: Date; endAt?: Date;
  address: string; lat: number; lng: number;
  isFree: boolean; priceCents?: number; ticketUrl?: string;
}) {
  const [city] = await db.query<[{ id: string }]>(`SELECT id FROM cities WHERE slug = $1`, [event.citySlug]);
  if (!city) return;

  const [eventsCategory] = await db.query<[{ id: string }]>(`SELECT id FROM listing_categories WHERE slug = 'events'`);
  if (!eventsCategory) return;

  let listingId: string | null = null;
  if (event.listingSlug) {
    const [l] = await db.query<[{ id: string }]>(`SELECT id FROM listings WHERE slug = $1`, [event.listingSlug]);
    listingId = l?.id ?? null;
  }

  const endAt = event.endAt ?? new Date(event.startAt.getTime() + 3 * 60 * 60 * 1000);

  await db.query(`
    INSERT INTO events (
      id, slug, title, description, category_id, organizer_id, city_id, listing_id,
      address, location, lat, lng,
      start_at, end_at, is_free, ticket_url, status, is_featured,
      is_recurring, is_online, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7,
      $8, ST_SetSRID(ST_MakePoint($10, $9), 4326), $9, $10,
      $11, $12, $13, $14, 'active', false,
      false, false, NOW(), NOW()
    )
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title, start_at = EXCLUDED.start_at,
      end_at = EXCLUDED.end_at, updated_at = NOW()
  `, [
    event.slug, event.title, event.description, eventsCategory.id, organizerId, city.id, listingId,
    event.address, event.lat, event.lng,
    event.startAt, endAt, event.isFree, event.ticketUrl ?? null,
  ]);

  console.log(`  ✓ Event: ${event.title}`);
}

// ─── Main Seed ────────────────────────────────────────────────────────────────

async function seed() {
  await db.initialize();
  console.log('🌱 Seeding Chicago launch data...\n');

  // ── Cities ──────────────────────────────────────────────────────────────

  console.log('📍 Cities...');
  // Core launch clusters (active)
  await upsertCity(db, { slug: 'chicago-devon', name: 'Devon Ave / Rogers Park', state: 'IL', centerLat: 41.9979, centerLng: -87.6983, isActive: true });
  await upsertCity(db, { slug: 'chicago-bridgeview', name: 'Bridgeview / SW Suburbs', state: 'IL', centerLat: 41.7406, centerLng: -87.8603, isActive: true });
  await upsertCity(db, { slug: 'chicago-skokie', name: 'Skokie / North Shore', state: 'IL', centerLat: 42.0334, centerLng: -87.7334, isActive: true });
  await upsertCity(db, { slug: 'chicago-schaumburg', name: 'Schaumburg / NW Suburbs', state: 'IL', centerLat: 42.0334, centerLng: -88.0834, isActive: true });
  await upsertCity(db, { slug: 'chicago-bolingbrook', name: 'Bolingbrook / West Suburbs', state: 'IL', centerLat: 41.6978, centerLng: -88.0684, isActive: false });
  await upsertCity(db, { slug: 'chicago-south', name: 'South Side / Hyde Park', state: 'IL', centerLat: 41.8020, centerLng: -87.5990, isActive: false });
  // North Side Chicago neighborhoods
  await upsertCity(db, { slug: 'chicago-rogers-park', name: 'Rogers Park', state: 'IL', centerLat: 42.0085, centerLng: -87.6683, isActive: false });
  await upsertCity(db, { slug: 'chicago-west-ridge', name: 'West Ridge', state: 'IL', centerLat: 41.9979, centerLng: -87.6835, isActive: false });
  await upsertCity(db, { slug: 'chicago-albany-park', name: 'Albany Park', state: 'IL', centerLat: 41.9674, centerLng: -87.7273, isActive: false });
  // South Side Chicago
  await upsertCity(db, { slug: 'chicago-hyde-park', name: 'Hyde Park', state: 'IL', centerLat: 41.7943, centerLng: -87.5907, isActive: false });
  // SW Cook County suburbs
  await upsertCity(db, { slug: 'chicago-oak-lawn', name: 'Oak Lawn', state: 'IL', centerLat: 41.7195, centerLng: -87.7479, isActive: false });
  await upsertCity(db, { slug: 'chicago-palos-hills', name: 'Palos Hills', state: 'IL', centerLat: 41.6997, centerLng: -87.8256, isActive: false });
  await upsertCity(db, { slug: 'chicago-orland-park', name: 'Orland Park', state: 'IL', centerLat: 41.6306, centerLng: -87.8534, isActive: false });
  await upsertCity(db, { slug: 'chicago-tinley-park', name: 'Tinley Park', state: 'IL', centerLat: 41.5731, centerLng: -87.7867, isActive: false });
  // Western suburbs (DuPage / Kane)
  await upsertCity(db, { slug: 'chicago-lombard', name: 'Lombard', state: 'IL', centerLat: 41.8878, centerLng: -88.0073, isActive: false });
  await upsertCity(db, { slug: 'chicago-naperville', name: 'Naperville', state: 'IL', centerLat: 41.7508, centerLng: -88.1535, isActive: false });
  await upsertCity(db, { slug: 'chicago-aurora', name: 'Aurora', state: 'IL', centerLat: 41.7606, centerLng: -88.3201, isActive: false });
  await upsertCity(db, { slug: 'chicago-villa-park', name: 'Villa Park', state: 'IL', centerLat: 41.8878, centerLng: -87.9754, isActive: false });
  await upsertCity(db, { slug: 'chicago-city', name: 'Chicago', state: 'IL', centerLat: 41.8781, centerLng: -87.6298, isActive: false });
  // Additional suburbs (all inactive — activate when ready)
  await upsertCity(db, { slug: 'chicago-elgin', name: 'Elgin', state: 'IL', centerLat: 41.8900, centerLng: -88.2934, isActive: false });
  await upsertCity(db, { slug: 'chicago-hanover-park', name: 'Hanover Park', state: 'IL', centerLat: 41.9994, centerLng: -88.1431, isActive: false });
  await upsertCity(db, { slug: 'chicago-glendale-heights', name: 'Glendale Heights', state: 'IL', centerLat: 41.9200, centerLng: -88.0800, isActive: false });
  await upsertCity(db, { slug: 'chicago-addison', name: 'Addison', state: 'IL', centerLat: 41.9317, centerLng: -87.9887, isActive: false });
  await upsertCity(db, { slug: 'chicago-des-plaines', name: 'Des Plaines', state: 'IL', centerLat: 42.0334, centerLng: -87.8834, isActive: false });
  await upsertCity(db, { slug: 'chicago-downers-grove', name: 'Downers Grove', state: 'IL', centerLat: 41.8081, centerLng: -88.0109, isActive: false });
  await upsertCity(db, { slug: 'chicago-arlington-heights', name: 'Arlington Heights', state: 'IL', centerLat: 42.0884, centerLng: -87.9806, isActive: false });
  await upsertCity(db, { slug: 'chicago-palatine', name: 'Palatine', state: 'IL', centerLat: 42.1103, centerLng: -88.0342, isActive: false });
  await upsertCity(db, { slug: 'chicago-waukegan', name: 'Waukegan', state: 'IL', centerLat: 42.3636, centerLng: -87.8448, isActive: false });
  await upsertCity(db, { slug: 'chicago-joliet', name: 'Joliet / Plainfield', state: 'IL', centerLat: 41.5250, centerLng: -88.0817, isActive: false });

  // ── Categories ───────────────────────────────────────────────────────────

  console.log('\n🗂 Categories...');
  await upsertCategory(db, { slug: 'halal-restaurants', name: 'Halal Restaurant', mainCategory: 'eat' });
  await upsertCategory(db, { slug: 'shawarma-grills', name: 'Shawarma & Grill', mainCategory: 'eat' });
  await upsertCategory(db, { slug: 'south-asian', name: 'South Asian', mainCategory: 'eat' });
  await upsertCategory(db, { slug: 'middle-eastern', name: 'Middle Eastern', mainCategory: 'eat' });
  await upsertCategory(db, { slug: 'bakeries-desserts', name: 'Bakery & Desserts', mainCategory: 'eat' });
  await upsertCategory(db, { slug: 'halal-grocery', name: 'Halal Grocery', mainCategory: 'eat' });
  await upsertCategory(db, { slug: 'halal-butcher', name: 'Halal Butcher', mainCategory: 'eat' });
  await upsertCategory(db, { slug: 'hookah-lounge', name: 'Hookah Lounge', mainCategory: 'go_out' });
  await upsertCategory(db, { slug: 'cafe-tea', name: 'Café & Tea', mainCategory: 'eat' });
  await upsertCategory(db, { slug: 'mosque', name: 'Mosque', mainCategory: 'connect' });
  await upsertCategory(db, { slug: 'islamic-school', name: 'Islamic School', mainCategory: 'connect' });
  await upsertCategory(db, { slug: 'community-org', name: 'Community Org', mainCategory: 'connect' });
  await upsertCategory(db, { slug: 'professional-services', name: 'Professional Services', mainCategory: 'connect' });
  await upsertCategory(db, { slug: 'clothing-boutique', name: 'Clothing & Boutique', mainCategory: 'connect' });
  await upsertCategory(db, { slug: 'events', name: 'Events', mainCategory: 'go_out' });
  await upsertCategory(db, { slug: 'yemeni-coffee', name: 'Yemeni Coffee', mainCategory: 'go_out' });
  await upsertCategory(db, { slug: 'event-venue', name: 'Event Venue', mainCategory: 'go_out' });

  // ── Devon Ave Businesses (anchor cluster) ────────────────────────────────

  console.log('\n🍽 Devon Ave businesses...');

  const devonRestaurants = [
    { name: 'Noon O Kabab', desc: 'Persian cuisine known for authentic kabobs, stews, and rice dishes. A Devon Ave institution since 1991.', cat: 'middle-eastern', addr: '4661 N Kedzie Ave, Chicago, IL 60625', hood: 'Albany Park', lat: 41.9676, lng: -87.7071, phone: '(773) 279-9309', halal: 'self_declared', price: '$$' },
    { name: 'Sabri Nihari', desc: 'Famous for slow-cooked nihari and Pakistani specialties. Weekend nihari sells out by noon.', cat: 'south-asian', addr: '2502 W Devon Ave, Chicago, IL 60659', hood: 'Devon Ave', lat: 41.9979, lng: -87.6900, phone: '(773) 465-3272', halal: 'self_declared', price: '$' },
    { name: 'Ghareeb Nawaz', desc: 'Legendary for cheap, hearty Pakistani food. Packed 24/7 with students, families, and late-night crowds.', cat: 'south-asian', addr: '2032 W Devon Ave, Chicago, IL 60659', hood: 'Devon Ave', lat: 41.9979, lng: -87.6820, phone: '(773) 761-5300', halal: 'self_declared', price: '$' },
    { name: 'Al Bawadi Grill', desc: 'Lebanese-American grill serving shawarma, falafel, and fresh mezze. One of the best Middle Eastern spots in Chicago.', cat: 'middle-eastern', addr: '6317 N Milwaukee Ave, Chicago, IL 60646', hood: 'Norwood Park', lat: 41.9894, lng: -87.8088, phone: '(773) 631-4800', website: 'https://albawadi.com', halal: 'certified', price: '$$' },
    { name: 'Charcoal Delights', desc: 'Beloved Pakistani grill house with charcoal-cooked seekh kebabs and karahi. BYOB and cash only.', cat: 'halal-restaurants', addr: '2032 W Devon Ave, Chicago, IL 60659', hood: 'Devon Ave', lat: 41.9978, lng: -87.6821, phone: '(773) 274-7034', halal: 'self_declared', price: '$' },
    { name: 'Anmol Restaurant', desc: 'Pakistani comfort food and sweets in a cozy Devon Ave spot. Try the haleem and mithai.', cat: 'south-asian', addr: '2555 W Devon Ave, Chicago, IL 60659', hood: 'Devon Ave', lat: 41.9979, lng: -87.6912, phone: '(773) 764-1010', halal: 'self_declared', price: '$' },
    { name: 'Zam Zam Restaurant', desc: 'Family-run Afghan restaurant serving qabili palaw, mantu, and lamb dishes.', cat: 'halal-restaurants', addr: '2527 W Devon Ave, Chicago, IL 60659', hood: 'Devon Ave', lat: 41.9979, lng: -87.6905, phone: '(773) 262-5500', halal: 'self_declared', price: '$$' },
    { name: 'India House', desc: 'Upscale Indian dining with halal options. Popular for business lunches and family celebrations.', cat: 'south-asian', addr: '2548 W Devon Ave, Chicago, IL 60659', hood: 'Devon Ave', lat: 41.9979, lng: -87.6908, phone: '(773) 338-2929', halal: 'self_declared', price: '$$$' },
    { name: 'Kabul House', desc: 'Authentic Afghan cuisine in Skokie. Known for generous portions of kebabs and shorwa.', cat: 'halal-restaurants', addr: '3320 Dempster St, Skokie, IL 60076', hood: 'Skokie', lat: 42.0387, lng: -87.7334, phone: '(847) 763-9930', website: 'https://kabulhouse.com', halal: 'self_declared', price: '$$' },
    { name: 'Usmania Chinese', desc: 'Halal Chinese-Pakistani fusion — a unique Devon Ave specialty. Try the manchurian and fried rice.', cat: 'halal-restaurants', addr: '2627 W Devon Ave, Chicago, IL 60659', hood: 'Devon Ave', lat: 41.9979, lng: -87.6930, phone: '(773) 274-4800', halal: 'self_declared', price: '$' },
    { name: 'Al-Khayam Restaurant', desc: 'Iranian restaurant known for its lamb dishes and saffron rice. Great vegetarian options too.', cat: 'middle-eastern', addr: '2401 W Devon Ave, Chicago, IL 60659', hood: 'Devon Ave', lat: 41.9979, lng: -87.6875, phone: '(773) 338-4222', halal: 'self_declared', price: '$$' },
    { name: 'Chopal Kabab', desc: 'Casual Pakistani kabab joint perfect for quick halal bites. Try the chapli kabab.', cat: 'shawarma-grills', addr: '2359 W Devon Ave, Chicago, IL 60659', hood: 'Devon Ave', lat: 41.9979, lng: -87.6863, phone: '(773) 764-2441', halal: 'self_declared', price: '$' },
    { name: 'Turkish Village Cafe', desc: 'Authentic Turkish breakfast and lunch cafe. Best menemen and simit on the north side.', cat: 'cafe-tea', addr: '5026 N Clark St, Chicago, IL 60640', hood: 'Andersonville', lat: 41.9740, lng: -87.6651, phone: '(773) 944-1882', halal: 'self_declared', price: '$' },
    { name: 'Al-Rachid Bakery', desc: 'Middle Eastern bakery with fresh pita, baklava, and Lebanese pastries baked daily.', cat: 'bakeries-desserts', addr: '2754 W Devon Ave, Chicago, IL 60659', hood: 'Devon Ave', lat: 41.9979, lng: -87.6955, phone: '(773) 465-6888', halal: 'certified', price: '$' },
    { name: 'Suparossa Restaurant', desc: 'Italian-owned halal pizza and pasta spot popular with the Devon Ave community.', cat: 'halal-restaurants', addr: '2601 W Devon Ave, Chicago, IL 60659', hood: 'Devon Ave', lat: 41.9979, lng: -87.6924, halal: 'self_declared', price: '$' },
  ];

  for (const r of devonRestaurants) {
    await upsertListing(db, {
      slug: slug(r.name),
      name: r.name, description: r.desc,
      mainCategory: ['cafe-tea', 'bakeries-desserts', 'halal-grocery', 'halal-butcher'].includes(r.cat) ? 'eat' : r.cat === 'hookah-lounge' ? 'go_out' : 'eat',
      categorySlug: r.cat, citySlug: 'chicago-devon',
      address: r.addr, neighborhood: r.hood,
      lat: r.lat, lng: r.lng,
      phone: r.phone, website: (r as any).website,
      halalCertification: r.halal, priceRange: r.price,
    });
  }

  // Devon Ave hookah & upscale
  await upsertListing(db, {
    slug: slug('Halal Town Steakhouse'),
    name: 'Halal Town Steakhouse & Breakfast',
    description: 'Upscale halal American steakhouse and all-day breakfast on Devon Ave. Steaks, burgers, and classic American plates — all halal certified. Open until 2am.',
    mainCategory: 'eat', categorySlug: 'halal-restaurants', citySlug: 'chicago-devon',
    address: '2439 W Devon Ave, Chicago, IL 60659', neighborhood: 'Devon Ave',
    lat: 41.998, lng: -87.685, phone: '(872) 302-4199', website: 'https://halaltownsteakhouseandbreakfast.com',
    halalCertification: 'certified',
  });
  await upsertListing(db, {
    slug: slug('Samah Hookah Lounge'),
    name: 'Samah Hookah Lounge',
    description: 'The go-to hookah lounge on Devon Ave. Premium coals, top shisha brands (Fumari, Al-Fakher, Starbuzz), and a laid-back atmosphere. Open Thursday–Sunday until 1–3am.',
    mainCategory: 'go_out', categorySlug: 'hookah-lounge', citySlug: 'chicago-devon',
    address: '1219 W Devon Ave, Chicago, IL 60660', neighborhood: 'Rogers Park',
    lat: 42.002, lng: -87.652, phone: '(773) 293-7856', website: 'https://samahhookah.com',
    halalCertification: 'none',
  });

  // Devon Ave Groceries & Services
  console.log('\n🛒 Devon Ave groceries & services...');
  const devonServices = [
    { name: 'Patel Brothers', desc: 'The largest South Asian grocery chain in the US. Everything from spices to fresh produce to halal meat.', cat: 'halal-grocery', addr: '2610 W Devon Ave, Chicago, IL 60659', hood: 'Devon Ave', lat: 41.9979, lng: -87.6927, phone: '(773) 262-7777', website: 'https://patelbros.com', halal: 'self_declared' },
    { name: 'Al-Khayam Market', desc: 'Halal Middle Eastern grocery with fresh produce, spices, and prepared foods.', cat: 'halal-grocery', addr: '2740 W Devon Ave, Chicago, IL 60659', hood: 'Devon Ave', lat: 41.9979, lng: -87.6951, phone: '(773) 465-2888', halal: 'certified' },
    { name: 'Devon Halal Meat', desc: 'Full-service halal butcher with fresh-cut lamb, beef, chicken, and goat. Custom cuts available.', cat: 'halal-butcher', addr: '2817 W Devon Ave, Chicago, IL 60659', hood: 'Devon Ave', lat: 41.9979, lng: -87.6968, phone: '(773) 274-7020', halal: 'certified' },
    { name: 'India Sari Palace', desc: 'Traditional South Asian clothing store with saris, salwar kameez, and formal wear.', cat: 'clothing-boutique', addr: '2534 W Devon Ave, Chicago, IL 60659', hood: 'Devon Ave', lat: 41.9979, lng: -87.6907, phone: '(773) 338-4844', halal: 'unknown' },
    { name: 'Islamic Foundation of Villa Park', desc: 'Major Islamic center serving the western suburbs with daily prayers, Islamic school, and community programs.', cat: 'mosque', addr: '300 W Highridge Rd, Villa Park, IL 60181', hood: 'Villa Park', lat: 41.8868, lng: -87.9727, phone: '(630) 941-8800', website: 'https://ifvp.org', halal: 'unknown' },
    { name: 'Masjid Al-Faatir', desc: "Chicago's oldest African-American mosque, located on Devon Ave. Community masjid with daily prayers.", cat: 'mosque', addr: '1236 W Devon Ave, Chicago, IL 60660', hood: 'Rogers Park', lat: 42.0029, lng: -87.6621, phone: '(773) 338-3636', halal: 'unknown' },
    { name: 'ISNA Islamic Book Service', desc: 'Islamic books, gifts, and educational materials. Part of the ISNA campus.', cat: 'community-org', addr: '6555 S Cottage Grove Ave, Chicago, IL 60637', hood: 'Woodlawn', lat: 41.7747, lng: -87.6065, phone: '(773) 488-7700', halal: 'unknown' },
    { name: 'MCC – Muslim Community Center', desc: 'Full-service Islamic center with masjid, school, gym, and community hall in the north suburbs.', cat: 'mosque', addr: '4380 N Elston Ave, Chicago, IL 60641', hood: 'Irving Park', lat: 41.9556, lng: -87.7273, phone: '(773) 725-9047', website: 'https://mcc-chicago.org', halal: 'unknown' },
    { name: 'Chicago Halal Food Fest', desc: 'Annual halal food festival bringing 50+ vendors to Grant Park. Free admission.', cat: 'community-org', addr: '337 E Randolph St, Chicago, IL 60601', hood: 'Loop', lat: 41.8847, lng: -87.6201, halal: 'unknown' },
    { name: 'Crescent Moon Design', desc: 'Muslim-owned graphic design and print shop specializing in Islamic art and event materials.', cat: 'professional-services', addr: '2408 W Devon Ave, Chicago, IL 60659', hood: 'Devon Ave', lat: 41.9979, lng: -87.6877, phone: '(773) 761-2020', halal: 'unknown' },
  ];

  for (const s of devonServices) {
    const mc = s.cat === 'mosque' || s.cat === 'community-org' || s.cat === 'professional-services' || s.cat === 'clothing-boutique' ? 'connect' : 'eat';
    await upsertListing(db, {
      slug: slug(s.name), name: s.name, description: s.desc,
      mainCategory: mc, categorySlug: s.cat, citySlug: 'chicago-devon',
      address: s.addr, neighborhood: s.hood,
      lat: s.lat, lng: s.lng,
      phone: (s as any).phone, website: (s as any).website,
      halalCertification: s.halal,
    });
  }

  // ── Bridgeview / SW Suburbs ───────────────────────────────────────────────

  console.log('\n🏘 Bridgeview / SW Suburbs...');
  const bridgeviewPlaces = [
    { name: 'Mosque Foundation', desc: 'One of the largest mosques in the Midwest. Daily prayers, Friday khutbah, full-time Islamic school.', cat: 'mosque', addr: '7360 W 93rd St, Bridgeview, IL 60455', hood: 'Bridgeview', lat: 41.7406, lng: -87.8603, phone: '(708) 430-5666', website: 'https://mosquefoundation.org', halal: 'unknown' },
    { name: 'Al-Salam Restaurant', desc: 'Beloved Palestinian-American spot in Bridgeview for shawarma, falafel, and fresh juice.', cat: 'middle-eastern', addr: '7830 W 87th St, Bridgeview, IL 60455', hood: 'Bridgeview', lat: 41.7490, lng: -87.8586, phone: '(708) 598-5400', halal: 'certified' },
    { name: 'Naf Naf Grill', desc: 'Fast-casual Middle Eastern chain known for shawarma and fresh pita. Halal certified.', cat: 'shawarma-grills', addr: '9501 S Roberts Rd, Hickory Hills, IL 60457', hood: 'Hickory Hills', lat: 41.7234, lng: -87.8420, phone: '(708) 598-3500', website: 'https://nafnafgrill.com', halal: 'certified' },
    { name: 'Turath Restaurant', desc: 'Palestinian home cooking in Bridgeview. Known for musakhan, mansaf, and family platters.', cat: 'middle-eastern', addr: '7800 W 87th St, Bridgeview, IL 60455', hood: 'Bridgeview', lat: 41.7491, lng: -87.8582, phone: '(708) 907-2221', halal: 'self_declared' },
    { name: 'Salam Restaurant', desc: 'Authentic Yemeni cuisine in Bridgeview. Try the mandi and saltah.', cat: 'halal-restaurants', addr: '8241 S Harlem Ave, Bridgeview, IL 60455', hood: 'Bridgeview', lat: 41.7430, lng: -87.8084, phone: '(708) 598-1800', halal: 'self_declared' },
    { name: 'Mediterranean Palace', desc: 'Large banquet hall and restaurant serving Lebanese and Mediterranean cuisine for events.', cat: 'halal-restaurants', addr: '7350 W 87th St, Bridgeview, IL 60455', hood: 'Bridgeview', lat: 41.7491, lng: -87.8488, phone: '(708) 430-0060', halal: 'self_declared' },
  ];

  for (const p of bridgeviewPlaces) {
    const mc = p.cat === 'mosque' ? 'connect' : 'eat';
    await upsertListing(db, {
      slug: slug(p.name) + '-bridgeview', name: p.name, description: p.desc,
      mainCategory: mc, categorySlug: p.cat, citySlug: 'chicago-bridgeview',
      address: p.addr, neighborhood: p.hood, lat: p.lat, lng: p.lng,
      phone: (p as any).phone, website: (p as any).website,
      halalCertification: p.halal,
    });
  }

  // ── Skokie / North Shore ──────────────────────────────────────────────────

  console.log('\n🏙 Skokie / North Shore...');
  const skokiePlaces = [
    { name: 'Hakka Bakka', desc: 'Pakistani-Chinese fusion restaurant in Skokie. Best manchurian and nihari outside of Devon.', cat: 'halal-restaurants', addr: '5103 Oakton St, Skokie, IL 60076', hood: 'Skokie', lat: 42.0214, lng: -87.7334, phone: '(847) 673-4100', halal: 'self_declared', price: '$' },
    { name: 'Maza Mediterranean', desc: 'Lebanese and Mediterranean cuisine in downtown Skokie. Great lunch specials and shawarma.', cat: 'middle-eastern', addr: '3701 W Dempster St, Skokie, IL 60076', hood: 'Skokie', lat: 42.0387, lng: -87.7600, phone: '(847) 329-8500', halal: 'self_declared', price: '$$' },
    { name: 'MCC Chicago – North', desc: 'Muslim Community Center north campus. Masjid, weekend school, and sports facilities.', cat: 'mosque', addr: '4380 Oakton St, Skokie, IL 60076', hood: 'Skokie', lat: 42.0232, lng: -87.7334, phone: '(847) 982-8866', website: 'https://mcc-chicago.org', halal: 'unknown' },
    { name: 'Pakistan Restaurant', desc: 'No-frills authentic Pakistani food in Skokie. Regulars swear by the biryani and karahi.', cat: 'south-asian', addr: '4120 Dempster St, Skokie, IL 60076', hood: 'Skokie', lat: 42.0387, lng: -87.7463, phone: '(847) 673-2333', halal: 'self_declared', price: '$' },
    { name: 'Jerusalem Restaurant', desc: 'Long-running Middle Eastern BYOB in Skokie. Known for generous portions and fresh hummus.', cat: 'middle-eastern', addr: '3907 W Dempster St, Skokie, IL 60076', hood: 'Skokie', lat: 42.0387, lng: -87.7440, phone: '(847) 675-3555', halal: 'certified', price: '$$' },
  ];

  for (const p of skokiePlaces) {
    const mc = p.cat === 'mosque' ? 'connect' : 'eat';
    await upsertListing(db, {
      slug: slug(p.name) + '-skokie', name: p.name, description: p.desc,
      mainCategory: mc, categorySlug: p.cat, citySlug: 'chicago-skokie',
      address: p.addr, neighborhood: p.hood, lat: p.lat, lng: p.lng,
      phone: (p as any).phone, website: (p as any).website,
      halalCertification: p.halal,
    });
  }

  // ── Schaumburg / NW Suburbs ───────────────────────────────────────────────

  console.log('\n🌆 Schaumburg / NW Suburbs...');
  const schaumburgPlaces = [
    { name: 'Islamic Foundation of Villa Park', desc: 'Major Islamic center serving the western suburbs.', cat: 'mosque', addr: '300 W Highridge Rd, Villa Park, IL 60181', hood: 'Villa Park', lat: 41.8868, lng: -87.9727, phone: '(630) 941-8800', website: 'https://ifvp.org', halal: 'unknown' },
    { name: 'Al Nile Restaurant', desc: 'Sudanese and East African cuisine in Schaumburg. Unique flavors not found elsewhere in the area.', cat: 'halal-restaurants', addr: '850 E Higgins Rd, Schaumburg, IL 60173', hood: 'Schaumburg', lat: 42.0334, lng: -88.0600, phone: '(847) 397-9292', halal: 'certified', price: '$$' },
    { name: 'Kababji Restaurant', desc: 'Lebanese grill in the northwest suburbs. Fresh shawarma, kafta, and mezze.', cat: 'shawarma-grills', addr: '1575 E Higgins Rd, Elk Grove Village, IL 60007', hood: 'Elk Grove Village', lat: 41.9780, lng: -87.9640, phone: '(847) 956-8600', halal: 'self_declared', price: '$$' },
    { name: 'Mediterranean Breeze', desc: 'Greek and Lebanese fusion with halal options. Popular for Sunday brunch and family dinners.', cat: 'halal-restaurants', addr: '730 E Algonquin Rd, Schaumburg, IL 60173', hood: 'Schaumburg', lat: 42.0334, lng: -88.0834, phone: '(847) 397-2500', halal: 'self_declared', price: '$$' },
  ];

  for (const p of schaumburgPlaces) {
    const mc = p.cat === 'mosque' ? 'connect' : 'eat';
    await upsertListing(db, {
      slug: slug(p.name) + '-schaumburg', name: p.name, description: p.desc,
      mainCategory: mc, categorySlug: p.cat, citySlug: 'chicago-schaumburg',
      address: p.addr, neighborhood: p.hood, lat: p.lat, lng: p.lng,
      phone: (p as any).phone, website: (p as any).website,
      halalCertification: p.halal,
    });
  }

  // ── Yemeni coffee / cafés added to existing clusters ─────────────────────

  console.log('\n☕ Yemeni coffee & cafés (existing clusters)...');
  await upsertListing(db, {
    slug: 'the-qahwa-bridgeview', name: 'The Qahwa',
    description: 'Authentic Yemeni café in Bridgeview. A late-night hub during Ramadan and year-round social spot for the community. Rich qishr, Yemeni tea, and traditional sweets.',
    mainCategory: 'go_out', categorySlug: 'yemeni-coffee', citySlug: 'chicago-bridgeview',
    address: '7544 W 103rd St, Bridgeview, IL 60455', neighborhood: 'Bridgeview',
    lat: 41.706, lng: -87.816, phone: '(708) 930-5772', halalCertification: 'self_declared',
  });
  await upsertListing(db, {
    slug: 'qahwah-house-skokie', name: 'Qahwah House',
    description: 'National Yemeni coffee chain serving single-origin beans sourced directly from Yemen. Signature qahwah, iced lattes, and traditional pastries in a cozy atmosphere.',
    mainCategory: 'go_out', categorySlug: 'yemeni-coffee', citySlug: 'chicago-skokie',
    address: '5238 W Touhy Ave, Skokie, IL 60077', neighborhood: 'Skokie',
    lat: 42.012, lng: -87.769, website: 'https://qahwahhouse.com', halalCertification: 'self_declared',
  });

  // ── Bridgeview additional ──────────────────────────────────────────────────

  console.log('\n🍖 Additional Bridgeview...');
  await upsertListing(db, {
    slug: "m-dakhan-bridgeview", name: "M'daKhan",
    description: "Smoked and grilled halal Middle Eastern cuisine certified by the Illinois Department of Agriculture. Known for marinated meats, kebabs, and authentic Arabic BBQ flavors.",
    mainCategory: 'eat', categorySlug: 'shawarma-grills', citySlug: 'chicago-bridgeview',
    address: '9115 S Harlem Ave, Bridgeview, IL 60455', neighborhood: 'Bridgeview',
    lat: 41.737, lng: -87.809, phone: '(708) 229-8855', website: 'https://mdakhan.com',
    halalCertification: 'certified',
  });

  // ── Albany Park ────────────────────────────────────────────────────────────

  console.log('\n🏡 Albany Park...');
  await upsertListing(db, {
    slug: 'halal-inn-pizza-albany-park', name: 'Halal Inn',
    description: 'Neighborhood halal pizza, wings, and grilled chicken spot in Albany Park. Solid late-night option on Kedzie.',
    mainCategory: 'eat', categorySlug: 'halal-restaurants', citySlug: 'chicago-albany-park',
    address: '4825 N Kedzie Ave, Chicago, IL 60625', neighborhood: 'Albany Park',
    lat: 41.969, lng: -87.705, phone: '(773) 681-0933', halalCertification: 'self_declared',
  });
  await upsertListing(db, {
    slug: 'qamaria-yemeni-coffee-albany-park', name: 'Qamaria Yemeni Coffee',
    description: 'Yemeni specialty coffee sourced from single farms in Haraz, Yemen. Flagship Chicago location in Albany Park. Known for traditional qishr, iced coffees, and a welcoming atmosphere.',
    mainCategory: 'go_out', categorySlug: 'yemeni-coffee', citySlug: 'chicago-albany-park',
    address: '4728 N Kedzie Ave, Chicago, IL 60625', neighborhood: 'Albany Park',
    lat: 41.968, lng: -87.705, phone: '(313) 970-3641', website: 'https://qamariacoffee.com',
    halalCertification: 'self_declared',
  });
  await upsertListing(db, {
    slug: 'bamyan-kabob-albany-park', name: 'Bamyan Kabob',
    description: 'Authentic Afghan kabobs and rice dishes in a cozy North Side spot. Zabiha halal. Great qabili palaw and lamb kabobs.',
    mainCategory: 'eat', categorySlug: 'halal-restaurants', citySlug: 'chicago-albany-park',
    address: '5701 N California Ave, Chicago, IL 60659', neighborhood: 'Albany Park',
    lat: 41.985, lng: -87.697, phone: '(773) 961-7902', halalCertification: 'certified',
  });

  // ── West Ridge ────────────────────────────────────────────────────────────

  console.log('\n🌆 West Ridge...');
  await upsertListing(db, {
    slug: 'nyc-halal-eats-west-ridge', name: 'NYC Halal Eats',
    description: 'Authentic New York-style halal cart food on Devon Ave. Famous for the chicken and rice over white sauce, chop cheese, and Philly cheesesteaks. Open late.',
    mainCategory: 'eat', categorySlug: 'halal-restaurants', citySlug: 'chicago-west-ridge',
    address: '2657 W Devon Ave, Chicago, IL 60659', neighborhood: 'West Ridge',
    lat: 41.998, lng: -87.692, halalCertification: 'self_declared',
  });

  // ── Oak Lawn ──────────────────────────────────────────────────────────────

  console.log('\n🏘 Oak Lawn...');
  await upsertListing(db, {
    slug: 'baba-saj-oak-lawn', name: 'Baba Saj',
    description: "Family-owned Palestinian restaurant and bakery serving Chicago's #1 rated shawarma. Traditional recipes including saj bread, hummus, and falafel. Open until midnight daily.",
    mainCategory: 'eat', categorySlug: 'middle-eastern', citySlug: 'chicago-oak-lawn',
    address: '11026 S Cicero Ave, Oak Lawn, IL 60453', neighborhood: 'Oak Lawn',
    lat: 41.720, lng: -87.747, phone: '(708) 952-4959', website: 'https://babasaj.com',
    halalCertification: 'self_declared',
  });
  await upsertListing(db, {
    slug: 'hakuna-matata-oak-lawn', name: 'Hakuna Matata',
    description: 'Family-owned halal restaurant serving shawarma, falafel, beef and lamb gyro in wraps or bowls. Open late — one of the most popular late-night halal spots in the SW suburbs.',
    mainCategory: 'eat', categorySlug: 'shawarma-grills', citySlug: 'chicago-oak-lawn',
    address: '6035 W 95th St, Oak Lawn, IL 60453', neighborhood: 'Oak Lawn',
    lat: 41.722, lng: -87.775, phone: '(708) 575-0303', website: 'https://hakunamatatail.com',
    halalCertification: 'self_declared',
  });

  // ── Palos Hills ────────────────────────────────────────────────────────────

  console.log('\n🌳 Palos Hills...');
  await upsertListing(db, {
    slug: 'palos-islamic-center', name: 'Palos Islamic Center',
    description: 'Full-service Islamic center in Palos Park serving the Palos Hills and SW suburbs community. Daily prayers, Quran classes, and community programs.',
    mainCategory: 'connect', categorySlug: 'mosque', citySlug: 'chicago-palos-hills',
    address: '12300 S 80th Ave, Palos Park, IL 60464', neighborhood: 'Palos Park',
    lat: 41.670, lng: -87.822, phone: '(708) 888-7074', website: 'https://palosic.org',
    halalCertification: 'none',
  });

  // ── Orland Park ────────────────────────────────────────────────────────────

  console.log('\n🛍 Orland Park...');
  await upsertListing(db, {
    slug: 'al-bahaar-orland-park', name: 'Al-Bahaar',
    description: 'Palestinian-owned Mediterranean seafood restaurant by the owners of Al Bawadi. Opened 2024. Known for fresh seafood with Arabian spices, kebabs, and a stunning dining room near Orland Square Mall.',
    mainCategory: 'eat', categorySlug: 'middle-eastern', citySlug: 'chicago-orland-park',
    address: '39 Orland Square Dr, Orland Park, IL 60462', neighborhood: 'Orland Park',
    lat: 41.634, lng: -87.858, phone: '(708) 653-0009', website: 'https://albahaar.com',
    halalCertification: 'self_declared',
  });
  await upsertListing(db, {
    slug: 'prayer-center-orland-park', name: 'Prayer Center of Orland Park',
    description: 'One of the largest Islamic centers in the SW suburbs. Full-time masjid, community programs, Islamic school, and active youth programs.',
    mainCategory: 'connect', categorySlug: 'mosque', citySlug: 'chicago-orland-park',
    address: '16530 104th Ave, Orland Park, IL 60467', neighborhood: 'Orland Park',
    lat: 41.598, lng: -87.825, phone: '(708) 428-1400', website: 'https://orlandparkprayercenter.org',
    halalCertification: 'none',
  });
  await upsertListing(db, {
    slug: 'hakuna-matata-orland-park', name: 'Hakuna Matata',
    description: 'Popular halal shawarma and gyro spot with a Orland Park location. Family-friendly, open late. Same quality as the Oak Lawn flagship.',
    mainCategory: 'eat', categorySlug: 'shawarma-grills', citySlug: 'chicago-orland-park',
    address: '15615 S Harlem Ave Unit B, Orland Park, IL 60462', neighborhood: 'Orland Park',
    lat: 41.616, lng: -87.809, phone: '(708) 529-8880', halalCertification: 'self_declared',
  });

  // ── Lombard ────────────────────────────────────────────────────────────────

  console.log('\n🏙 Lombard...');
  await upsertListing(db, {
    slug: 'darussalam-foundation-lombard', name: 'DarusSalam Foundation',
    description: 'Mosque and Islamic seminary in Lombard. Home to Masjid DarusSalam and the DarusSalam Seminary, one of the few institutions in North America training scholars in traditional Islamic sciences.',
    mainCategory: 'connect', categorySlug: 'mosque', citySlug: 'chicago-lombard',
    address: '21W525 North Ave, Lombard, IL 60148', neighborhood: 'Lombard',
    lat: 41.887, lng: -88.020, phone: '(630) 360-2373', website: 'https://masjidds.org',
    halalCertification: 'none',
  });
  await upsertListing(db, {
    slug: 'the-halal-burger-lombard', name: 'The Halal Burger',
    description: 'Halal burgers, hot dogs, and American classics in Lombard. Open until 1am on weekdays and 2am on weekends — the go-to late-night halal spot for the western suburbs.',
    mainCategory: 'eat', categorySlug: 'halal-restaurants', citySlug: 'chicago-lombard',
    address: '916 E Roosevelt Rd, Lombard, IL 60148', neighborhood: 'Lombard',
    lat: 41.874, lng: -88.000, halalCertification: 'self_declared',
  });
  await upsertListing(db, {
    slug: 'qahwah-house-lombard', name: 'Qahwah House',
    description: 'Yemeni coffee chain bringing single-origin beans sourced from Yemen to the western suburbs. Signature qahwah (spiced coffee), iced drinks, and traditional pastries.',
    mainCategory: 'go_out', categorySlug: 'yemeni-coffee', citySlug: 'chicago-lombard',
    address: '406 E Roosevelt Rd, Lombard, IL 60148', neighborhood: 'Lombard',
    lat: 41.873, lng: -88.001, website: 'https://qahwahhouse.com', halalCertification: 'self_declared',
  });

  // ── Villa Park ────────────────────────────────────────────────────────────

  console.log('\n🏘 Villa Park...');
  await upsertListing(db, {
    slug: 'islamic-foundation-villa-park', name: 'Islamic Foundation of Villa Park',
    description: 'One of the largest and most active Islamic centers in the western suburbs. Full-time masjid, Islamic school (IFVP school), weekend school, youth programs, and community events.',
    mainCategory: 'connect', categorySlug: 'mosque', citySlug: 'chicago-villa-park',
    address: '300 W Highridge Rd, Villa Park, IL 60181', neighborhood: 'Villa Park',
    lat: 41.888, lng: -87.973, phone: '(630) 941-8800', website: 'https://ifvp.org',
    halalCertification: 'none',
  });

  // ── Naperville ────────────────────────────────────────────────────────────

  console.log('\n🌇 Naperville...');
  await upsertListing(db, {
    slug: 'islamic-center-naperville', name: 'Islamic Center of Naperville',
    description: 'One of the most prominent Islamic centers in the Midwest, established in 1991. Full-service masjid, Arabic and religious classes, sports court, and a vibrant community including food after Jummah.',
    mainCategory: 'connect', categorySlug: 'mosque', citySlug: 'chicago-naperville',
    address: '2844 W Ogden Ave, Naperville, IL 60540', neighborhood: 'Naperville',
    lat: 41.752, lng: -88.152, phone: '(630) 426-3335', website: 'https://icnmasjid.org',
    halalCertification: 'none',
  });
  await upsertListing(db, {
    slug: 'saras-grill-naperville', name: "Sara's Grill & Eastern Cuisine",
    description: 'Family-owned zabiha halal Pakistani and Northern Indian restaurant in SE Naperville. One of the highest-rated halal restaurants in the western suburbs.',
    mainCategory: 'eat', categorySlug: 'south-asian', citySlug: 'chicago-naperville',
    address: '2860 Show Place Dr Ste 104, Naperville, IL 60564', neighborhood: 'Naperville',
    lat: 41.735, lng: -88.133, phone: '(630) 717-7865', halalCertification: 'certified',
  });
  await upsertListing(db, {
    slug: 'zem-zem-market-naperville', name: 'Zem Zem Market',
    description: 'Hand-slaughtered zabiha halal meat and grocery in Naperville. Full halal butcher with lamb, beef, chicken, goat, and veal. Also carries Middle Eastern and South Asian groceries.',
    mainCategory: 'eat', categorySlug: 'halal-butcher', citySlug: 'chicago-naperville',
    address: '888 S Route 59 Ste 112, Naperville, IL 60540', neighborhood: 'Naperville',
    lat: 41.763, lng: -88.121, phone: '(630) 922-8105', halalCertification: 'certified',
  });
  await upsertListing(db, {
    slug: 'habibi-shawarma-naperville', name: 'Habibi Shawarma',
    description: 'Halal-certified Middle Eastern shawarma restaurant that opened in Naperville in 2025. Fresh-made shawarma, falafel, and Mediterranean plates.',
    mainCategory: 'eat', categorySlug: 'shawarma-grills', citySlug: 'chicago-naperville',
    address: '955 W 75th St, Naperville, IL 60565', neighborhood: 'Naperville',
    lat: 41.744, lng: -88.130, phone: '(630) 961-9204', website: 'https://habibishawarmas.com',
    halalCertification: 'certified',
  });

  // ── Hyde Park ──────────────────────────────────────────────────────────────

  console.log('\n🎓 Hyde Park...');
  await upsertListing(db, {
    slug: 'kabob-it-hyde-park', name: 'Kabob It',
    description: 'Halal Mediterranean restaurant in Hyde Park near U of C. Known for 24-hour marinated kabobs, fresh salads, and campus-friendly prices. Named Chicago Bears Small Business All-Pro 2025.',
    mainCategory: 'eat', categorySlug: 'halal-restaurants', citySlug: 'chicago-hyde-park',
    address: '5706 S University Ave, Chicago, IL 60637', neighborhood: 'Hyde Park',
    lat: 41.793, lng: -87.597, halalCertification: 'self_declared',
  });
  await upsertListing(db, {
    slug: 'valley-of-jordan-hyde-park', name: 'Valley of Jordan',
    description: 'Middle Eastern market and deli in Hyde Park. Carry a wide selection of halal meats, freshly made hummus, shawarma sandwiches, and Mediterranean grocery items. Open Sundays.',
    mainCategory: 'eat', categorySlug: 'halal-grocery', citySlug: 'chicago-hyde-park',
    address: '1009 E 53rd St, Chicago, IL 60615', neighborhood: 'Hyde Park',
    lat: 41.800, lng: -87.608, halalCertification: 'self_declared',
  });

  // ── Aurora ────────────────────────────────────────────────────────────────

  console.log('\n🌃 Aurora...');
  await upsertListing(db, {
    slug: 'fox-valley-muslim-community-center', name: 'Fox Valley Muslim Community Center',
    description: 'Community mosque serving the Aurora and Fox Valley area. Daily prayers, Quranic education, youth programs, and interfaith community outreach.',
    mainCategory: 'connect', categorySlug: 'mosque', citySlug: 'chicago-aurora',
    address: '1187 Timberlake Dr, Aurora, IL 60506', neighborhood: 'Aurora',
    lat: 41.741, lng: -88.330, phone: '(630) 801-9808', website: 'https://auroramasjid.org',
    halalCertification: 'none',
  });

  // ── Villa Park additions ──────────────────────────────────────────────────

  console.log('\n🍛 Villa Park additions...');
  await upsertListing(db, {
    slug: 'shahi-nihari-and-chopsticks', name: 'Shahi Nihari & Chopsticks',
    description: "Villa Park's fastest-growing halal restaurant. Zabiha halal Pakistani-Indo-Chinese fusion — authentic nihari, biryani, karahi, and Chinese-Pakistani specialties. Fresh, bold flavors that keep regulars coming back.",
    mainCategory: 'eat', categorySlug: 'south-asian', citySlug: 'chicago-villa-park',
    address: '541 W North Ave, Villa Park, IL 60181', neighborhood: 'Villa Park',
    lat: 41.888, lng: -87.985, phone: '(630) 792-8839', website: 'https://shahinihariandchopsticks.com',
    halalCertification: 'certified',
  });

  // ── Bridgeview / Worth additions ──────────────────────────────────────────

  console.log('\n🍽 Fattoush (Worth / SW suburbs)...');
  await upsertListing(db, {
    slug: 'fattoush-worth', name: 'Fattoush',
    description: 'HFSAA-certified Lebanese restaurant and hookah lounge in Worth (SW suburbs). Full menu of authentic mezze, grills, and fresh juices — plus a premium hookah lounge open until midnight daily.',
    mainCategory: 'eat', categorySlug: 'middle-eastern', citySlug: 'chicago-bridgeview',
    address: '10700 S Harlem Ave, Worth, IL 60482', neighborhood: 'Worth',
    lat: 41.687, lng: -87.809, phone: '(708) 671-9999', website: 'https://fattoushchicago.com',
    halalCertification: 'certified',
  });

  // ── Chicago event venues (consistent anchor venues only) ──────────────────

  console.log('\n🎤 Chicago event venues...');
  await upsertListing(db, {
    slug: 'alhambra-palace-chicago', name: 'Alhambra Palace',
    description: 'Moroccan-inspired restaurant and live entertainment venue in the West Loop. Consistently hosts Arabic concerts, South Asian events, and community celebrations in an ornate setting.',
    mainCategory: 'go_out', categorySlug: 'event-venue', citySlug: 'chicago-city',
    address: '1240 W Randolph St, Chicago, IL 60607', neighborhood: 'West Loop',
    lat: 41.8837, lng: -87.6606, halalCertification: 'self_declared',
  });
  await upsertListing(db, {
    slug: 'downtown-islamic-center-chicago', name: 'Downtown Islamic Center',
    description: 'Masjid and community center in the South Loop serving downtown Chicago workers and residents. Hosts regular lectures, Jummah, and open mosque events.',
    mainCategory: 'connect', categorySlug: 'mosque', citySlug: 'chicago-city',
    address: '231 S State St, Chicago, IL 60604', neighborhood: 'South Loop',
    lat: 41.8802, lng: -87.6279, halalCertification: 'none',
  });

  // ── Chicago (general / no specific neighborhood cluster) ─────────────────

  console.log('\n🏙 Chicago general...');
  await upsertListing(db, {
    slug: 'masada-chicago', name: 'Masada',
    description: 'Sprawling Middle Eastern restaurant and hookah lounge in Logan Square. Large-format mezze, halal grills, outdoor patio, and live entertainment (DJs, live bands, belly dancers) Wed–Sat from 8pm to 3am.',
    mainCategory: 'go_out', categorySlug: 'hookah-lounge', citySlug: 'chicago-city',
    address: '2206 N California Ave, Chicago, IL 60647', neighborhood: 'Logan Square',
    lat: 41.922, lng: -87.698, phone: '(773) 697-8397', halalCertification: 'self_declared',
  });

  // ── Schaumburg additions ──────────────────────────────────────────────────

  console.log('\n🕌 Schaumburg additions...');
  await upsertListing(db, {
    slug: 'masjid-al-huda-schaumburg', name: 'Masjid Al Huda',
    description: 'Active masjid in Schaumburg serving the northwest suburbs Muslim community. Daily prayers, Friday khutbah, and Islamic programs.',
    mainCategory: 'connect', categorySlug: 'mosque', citySlug: 'chicago-schaumburg',
    address: '1081 W Irving Park Rd, Schaumburg, IL 60193', neighborhood: 'Schaumburg',
    lat: 42.0246, lng: -88.1010, phone: '(630) 529-1786', halalCertification: 'none',
  });

  // ── Elgin ─────────────────────────────────────────────────────────────────

  console.log('\n🌃 Elgin...');
  await upsertListing(db, {
    slug: 'icc-elgin', name: 'ICC Elgin',
    description: 'Islamic Community Center serving Elgin and the Fox Valley corridor. Daily prayers, weekend Islamic school, youth sports, and community events.',
    mainCategory: 'connect', categorySlug: 'mosque', citySlug: 'chicago-elgin',
    address: '345 Heine Ave, Elgin, IL 60123', neighborhood: 'Elgin',
    lat: 42.0391, lng: -88.3101, phone: '(847) 695-3338', halalCertification: 'none',
  });

  // ── Hanover Park ──────────────────────────────────────────────────────────

  console.log('\n🏘 Hanover Park...');
  await upsertListing(db, {
    slug: 'islamic-center-hanover-park', name: 'Islamic Center of Hanover Park',
    description: 'Community masjid in Hanover Park serving families across Schaumburg, Hanover Park, and Streamwood. Daily prayers and Islamic education programs.',
    mainCategory: 'connect', categorySlug: 'mosque', citySlug: 'chicago-hanover-park',
    address: '7212 Walnut Ave, Hanover Park, IL 60133', neighborhood: 'Hanover Park',
    lat: 41.9994, lng: -88.1431, halalCertification: 'none',
  });

  // ── Glendale Heights ──────────────────────────────────────────────────────

  console.log('\n🍗 Glendale Heights...');
  await upsertListing(db, {
    slug: 'fahrenheit-halal-glendale-heights', name: 'Fahrenheit Halal',
    description: 'Popular halal chicken and comfort food spot in Glendale Heights. Known for crispy fried chicken, burgers, and late-night bites. A go-to for the Muslim community in the western suburbs.',
    mainCategory: 'eat', categorySlug: 'halal-restaurants', citySlug: 'chicago-glendale-heights',
    address: '136 E Army Trail Rd, Glendale Heights, IL 60139', neighborhood: 'Glendale Heights',
    lat: 41.9194, lng: -88.0620, phone: '(847) 466-5705', halalCertification: 'self_declared',
  });

  // ── Addison ───────────────────────────────────────────────────────────────

  console.log('\n🕌 Addison...');
  await upsertListing(db, {
    slug: 'masjid-al-jameel-addison', name: 'Masjid Al Jameel',
    description: 'Active Islamic center in Addison serving DuPage County Muslims. Daily prayers, Quran classes, and weekend Islamic school.',
    mainCategory: 'connect', categorySlug: 'mosque', citySlug: 'chicago-addison',
    address: '625 N Swift Rd, Addison, IL 60101', neighborhood: 'Addison',
    lat: 41.9328, lng: -88.0002, halalCertification: 'none',
  });

  // ── Des Plaines ───────────────────────────────────────────────────────────

  console.log('\n🛒 Des Plaines...');
  await upsertListing(db, {
    slug: 'aladdin-kitchen-market-des-plaines', name: 'Aladdin Kitchen and Market',
    description: 'Middle Eastern halal grocery and deli in Des Plaines. Fresh halal meats, prepared foods, Mediterranean spices, and specialty ingredients. A staple for the northwest suburbs Muslim community.',
    mainCategory: 'eat', categorySlug: 'halal-grocery', citySlug: 'chicago-des-plaines',
    address: '810 Elmhurst Rd, Des Plaines, IL 60016', neighborhood: 'Des Plaines',
    lat: 42.0346, lng: -87.9302, phone: '(224) 806-3120', halalCertification: 'self_declared',
  });

  // ── Downers Grove ─────────────────────────────────────────────────────────

  console.log('\n🍽 Downers Grove...');
  await upsertListing(db, {
    slug: 'anjir-uzbek-halal-downers-grove', name: 'Anjir Uzbek Halal Cuisine',
    description: 'Authentic Uzbek halal restaurant in Downers Grove. One of the only Uzbek restaurants in the Chicago suburbs. Known for plov, lagman, samsa, and shashlik. Whole lamb and osh available for catering.',
    mainCategory: 'eat', categorySlug: 'halal-restaurants', citySlug: 'chicago-downers-grove',
    address: '1340 Butterfield Rd, Downers Grove, IL 60515', neighborhood: 'Downers Grove',
    lat: 41.8131, lng: -88.0423, phone: '(630) 541-9004', halalCertification: 'self_declared',
  });

  // ── Arlington Heights ─────────────────────────────────────────────────────

  console.log('\n🍜 Arlington Heights...');
  await upsertListing(db, {
    slug: 'uyghur-lagman-house-arlington-heights', name: 'Uyghur Lagman House',
    description: 'Authentic Uyghur halal restaurant in Arlington Heights. Hand-pulled lagman noodles, fried rice, lamb dishes, and Central Asian specialties. One of the very few Uyghur restaurants in the Midwest.',
    mainCategory: 'eat', categorySlug: 'halal-restaurants', citySlug: 'chicago-arlington-heights',
    address: '2997 Kirchoff Rd, Arlington Heights, IL 60004', neighborhood: 'Arlington Heights',
    lat: 42.0869, lng: -87.9800, halalCertification: 'self_declared',
  });

  // ── Palatine ──────────────────────────────────────────────────────────────

  console.log('\n🔥 Palatine...');
  await upsertListing(db, {
    slug: 'makki-grill-palatine', name: 'Makki Grill',
    description: 'Halal grill and Mediterranean restaurant in Palatine. Known for charcoal-grilled kebabs, shawarma, and fresh mezze. Family-friendly with catering available.',
    mainCategory: 'eat', categorySlug: 'shawarma-grills', citySlug: 'chicago-palatine',
    address: '805 N Quentin Rd, Palatine, IL 60067', neighborhood: 'Palatine',
    lat: 42.1182, lng: -88.0348, phone: '(224) 801-8125', halalCertification: 'self_declared',
  });

  // ── Waukegan ──────────────────────────────────────────────────────────────

  console.log('\n🛒 Waukegan...');
  await upsertListing(db, {
    slug: 'shalimar-grocery-waukegan', name: 'Shalimar Grocery',
    description: 'South Asian and Middle Eastern halal grocery store in Waukegan. Full selection of halal meats, spices, fresh produce, and specialty goods for the North Shore Muslim community.',
    mainCategory: 'eat', categorySlug: 'halal-grocery', citySlug: 'chicago-waukegan',
    address: '332 S Green Bay Rd, Waukegan, IL 60085', neighborhood: 'Waukegan',
    lat: 42.3567, lng: -87.8495, halalCertification: 'self_declared',
  });

  // ── Joliet / Plainfield ───────────────────────────────────────────────────

  console.log('\n🕌 Joliet / Plainfield...');
  await upsertListing(db, {
    slug: 'islamic-center-romeoville', name: 'Islamic Center of Romeoville',
    description: 'Community masjid serving the Joliet, Romeoville, and Plainfield Muslim community in Will County. Daily prayers, Friday khutbah, Islamic education, and community events.',
    mainCategory: 'connect', categorySlug: 'mosque', citySlug: 'chicago-joliet',
    address: '14455 S Budler Rd, Plainfield, IL 60544', neighborhood: 'Plainfield',
    lat: 41.5793, lng: -88.1946, halalCertification: 'none',
  });

  // ── Seed user (required for event organizerId) ───────────────────────────

  const organizerId = await ensureSeedUser(db);

  // ── Events ───────────────────────────────────────────────────────────────
  // Dates anchored to Islamic calendar 1447 AH:
  //   Ramadan 1447:    ~Feb 28 – Mar 29, 2026
  //   Eid al-Fitr:     ~Mar 30, 2026
  //   Eid al-Adha:     ~Jun 6, 2026
  // Mix of past (history) and upcoming events

  console.log('\n📅 Events...');

  // ── Past events (history / social proof) ────────────────────────────────

  await upsertEvent(db, organizerId, {
    slug: 'ciogc-ramadan-iftar-2026', title: 'CIOGC Ramadan Iftar Dinner',
    description: 'Annual interfaith iftar dinner hosted by the Council of Islamic Organizations of Greater Chicago. 500+ attendees, community leaders, and open to all.',
    citySlug: 'chicago-devon', listingSlug: 'mcc-–-muslim-community-center',
    startAt: new Date('2026-03-15T19:30:00'), endAt: new Date('2026-03-15T22:00:00'),
    address: '4380 N Elston Ave, Chicago, IL 60641',
    lat: 41.9556, lng: -87.7273, isFree: true,
  });

  await upsertEvent(db, organizerId, {
    slug: 'eid-al-fitr-prayer-bridgeview-2026', title: 'Eid al-Fitr Prayer — Mosque Foundation',
    description: 'Eid al-Fitr prayer at one of the largest mosques in the Midwest. Multiple prayer times. Arrive early for parking.',
    citySlug: 'chicago-bridgeview', listingSlug: 'mosque-foundation-bridgeview',
    startAt: new Date('2026-03-30T07:30:00'), endAt: new Date('2026-03-30T10:00:00'),
    address: '7360 W 93rd St, Bridgeview, IL 60455',
    lat: 41.7406, lng: -87.8603, isFree: true,
  });

  await upsertEvent(db, organizerId, {
    slug: 'desi-night-samah-apr-2026', title: 'Desi Night Out',
    description: 'Late-night desi party at Samah Hookah Lounge on Devon. DJ spinning Bollywood, Bhangra, and Punjabi hits. Doors open 9pm.',
    citySlug: 'chicago-devon', listingSlug: 'samah-hookah-lounge',
    startAt: new Date('2026-04-04T21:00:00'), endAt: new Date('2026-04-05T02:00:00'),
    address: '1219 W Devon Ave, Chicago, IL 60660',
    lat: 42.002, lng: -87.652, isFree: false, priceCents: 1500,
  });

  // ── Upcoming events ──────────────────────────────────────────────────────

  await upsertEvent(db, organizerId, {
    slug: 'bhangra-night-masada-may-2026', title: 'Bhangra Night @ Masada',
    description: "Bhangra and Punjabi hits all night at Masada Logan Square. Live DJ, hookah, and full menu. 21+.",
    citySlug: 'chicago-city',
    startAt: new Date('2026-05-09T21:00:00'), endAt: new Date('2026-05-10T03:00:00'),
    address: '2206 N California Ave, Chicago, IL 60647',
    lat: 41.922, lng: -87.698, isFree: false, priceCents: 2000,
  });

  await upsertEvent(db, organizerId, {
    slug: 'mosque-foundation-open-house-may-2026', title: 'Mosque Foundation Family Open House',
    description: 'Annual open house at Mosque Foundation. Tours, food stalls, games for kids, and Islamic art exhibition. All are welcome.',
    citySlug: 'chicago-bridgeview', listingSlug: 'mosque-foundation-bridgeview',
    startAt: new Date('2026-05-10T11:00:00'), endAt: new Date('2026-05-10T17:00:00'),
    address: '7360 W 93rd St, Bridgeview, IL 60455',
    lat: 41.7406, lng: -87.8603, isFree: true,
  });

  await upsertEvent(db, organizerId, {
    slug: 'muslim-entrepreneurs-chicago-may-2026', title: 'Muslim Entrepreneurs Network — Chicago',
    description: 'Monthly meetup for Muslim business owners and founders. Pitch competition, mentorship speed-rounds, and halal food.',
    citySlug: 'chicago-devon',
    startAt: new Date('2026-05-16T18:00:00'), endAt: new Date('2026-05-16T21:00:00'),
    address: '1603 Orrington Ave, Evanston, IL 60201',
    lat: 42.0476, lng: -87.6875, isFree: false, priceCents: 2500,
  });

  await upsertEvent(db, organizerId, {
    slug: 'mcc-youth-basketball-2026', title: 'MCC Youth Basketball Tournament',
    description: 'Annual Muslim youth basketball tournament at MCC. Ages 12–18. Register your team by May 10.',
    citySlug: 'chicago-skokie', listingSlug: 'mcc-chicago-–-north-skokie',
    startAt: new Date('2026-05-17T09:00:00'), endAt: new Date('2026-05-17T18:00:00'),
    address: '4380 Oakton St, Skokie, IL 60076',
    lat: 42.0232, lng: -87.7334, isFree: false, priceCents: 1500,
  });

  await upsertEvent(db, organizerId, {
    slug: 'halal-street-food-schaumburg-may-2026', title: 'Halal Street Food Market — Schaumburg',
    description: 'Monthly outdoor halal food market at Woodfield. 20+ vendors, live music, and family activities in the northwest suburbs.',
    citySlug: 'chicago-schaumburg',
    startAt: new Date('2026-05-23T12:00:00'), endAt: new Date('2026-05-23T20:00:00'),
    address: 'Woodfield Mall, Schaumburg, IL 60173',
    lat: 42.0334, lng: -88.0834, isFree: true,
  });

  await upsertEvent(db, organizerId, {
    slug: 'devon-ave-food-walk-may-2026', title: 'Devon Ave Food Walk',
    description: 'Self-guided eating tour of Devon Ave. Start at Noon O Kabab, end at Al-Rachid Bakery. Map dropped in the Muzgram feed.',
    citySlug: 'chicago-devon',
    startAt: new Date('2026-05-24T13:00:00'), endAt: new Date('2026-05-24T17:00:00'),
    address: '2502 W Devon Ave, Chicago, IL 60659',
    lat: 41.9979, lng: -87.6900, isFree: true,
  });

  await upsertEvent(db, organizerId, {
    slug: 'darussalam-scholars-night-may-2026', title: 'Scholars Night — DarusSalam',
    description: 'Monthly lecture and Q&A with DarusSalam Seminary scholars. Open to the public. Light refreshments after.',
    citySlug: 'chicago-lombard', listingSlug: 'darussalam-foundation-lombard',
    startAt: new Date('2026-05-30T19:00:00'), endAt: new Date('2026-05-30T21:30:00'),
    address: '21W525 North Ave, Lombard, IL 60148',
    lat: 41.887, lng: -88.020, isFree: true,
  });

  await upsertEvent(db, organizerId, {
    slug: 'eid-adha-prayer-bridgeview-2026', title: 'Eid al-Adha Prayer — Mosque Foundation',
    description: 'Eid al-Adha prayer at Mosque Foundation. Multiple prayer times starting 7am. Community feast and activities to follow.',
    citySlug: 'chicago-bridgeview', listingSlug: 'mosque-foundation-bridgeview',
    startAt: new Date('2026-06-06T07:00:00'), endAt: new Date('2026-06-06T11:00:00'),
    address: '7360 W 93rd St, Bridgeview, IL 60455',
    lat: 41.7406, lng: -87.8603, isFree: true,
  });

  await upsertEvent(db, organizerId, {
    slug: 'eid-adha-community-feast-skokie-2026', title: 'Eid al-Adha Community Feast',
    description: 'Post-Eid community feast at MCC Skokie. Qurbani meat distribution and communal meal. Families welcome.',
    citySlug: 'chicago-skokie', listingSlug: 'mcc-chicago-–-north-skokie',
    startAt: new Date('2026-06-07T12:00:00'), endAt: new Date('2026-06-07T16:00:00'),
    address: '4380 Oakton St, Skokie, IL 60076',
    lat: 42.0232, lng: -87.7334, isFree: true,
  });

  await upsertEvent(db, organizerId, {
    slug: 'arabic-night-masada-jun-2026', title: 'Arabic Night ft. Live Oud @ Masada',
    description: 'Live Arabic music night — oud and percussion 9–11pm, DJ takes over until close. Full menu and hookah at Masada Logan Square.',
    citySlug: 'chicago-city',
    startAt: new Date('2026-06-12T21:00:00'), endAt: new Date('2026-06-13T02:00:00'),
    address: '2206 N California Ave, Chicago, IL 60647',
    lat: 41.922, lng: -87.698, isFree: false, priceCents: 1500,
  });

  await upsertEvent(db, organizerId, {
    slug: 'icn-community-bazaar-2026', title: 'ICN Community Bazaar',
    description: 'Annual community bazaar at the Islamic Center of Naperville. 30+ vendors, food court, kids activities, and raffle. One of the biggest Muslim community events in DuPage County.',
    citySlug: 'chicago-naperville', listingSlug: 'islamic-center-naperville',
    startAt: new Date('2026-06-14T10:00:00'), endAt: new Date('2026-06-14T18:00:00'),
    address: '2844 W Ogden Ave, Naperville, IL 60540',
    lat: 41.752, lng: -88.152, isFree: true,
  });

  await upsertEvent(db, organizerId, {
    slug: 'devon-mela-jun-2026', title: 'Devon Ave Mela',
    description: 'Street festival on Devon Ave with South Asian and Middle Eastern food, live music, henna, traditional clothing, and community booths.',
    citySlug: 'chicago-devon',
    startAt: new Date('2026-06-20T12:00:00'), endAt: new Date('2026-06-20T21:00:00'),
    address: 'Devon Ave between Western & California, Chicago, IL',
    lat: 41.9979, lng: -87.6900, isFree: true,
  });

  await upsertEvent(db, organizerId, {
    slug: 'iman-chicago-gala-2026', title: 'IMAN Chicago Annual Gala',
    description: 'IMAN (Inner-City Muslim Action Network) annual fundraising gala. Live performances, community awards, and dinner. Tickets required.',
    citySlug: 'chicago-south',
    startAt: new Date('2026-06-27T18:30:00'), endAt: new Date('2026-06-27T23:00:00'),
    address: '2744 W 63rd St, Chicago, IL 60629',
    lat: 41.7747, lng: -87.6918, isFree: false, priceCents: 7500, ticketUrl: 'https://iman.org',
  });

  await upsertEvent(db, organizerId, {
    slug: 'icc-elgin-summer-cookout-2026', title: 'ICC Elgin Summer Cookout',
    description: 'Annual summer cookout at ICC Elgin. Grilled halal food, kids games, and community bonding for the Fox Valley Muslim community.',
    citySlug: 'chicago-elgin', listingSlug: 'icc-elgin',
    startAt: new Date('2026-07-04T13:00:00'), endAt: new Date('2026-07-04T20:00:00'),
    address: '345 Heine Ave, Elgin, IL 60123',
    lat: 42.0391, lng: -88.3101, isFree: true,
  });

  await upsertEvent(db, organizerId, {
    slug: 'bollywood-bhangra-masada-aug-2026', title: 'Bollywood & Bhangra Night @ Masada',
    description: 'Summer desi night at Masada Logan Square. DJ spinning Bollywood classics and Bhangra hits. Hookah, bottle service, full menu. 21+.',
    citySlug: 'chicago-city',
    startAt: new Date('2026-08-01T21:00:00'), endAt: new Date('2026-08-02T03:00:00'),
    address: '2206 N California Ave, Chicago, IL 60647',
    lat: 41.922, lng: -87.698, isFree: false, priceCents: 2500,
  });

  await upsertEvent(db, organizerId, {
    slug: 'fox-valley-muslim-community-fair-2026', title: 'Fox Valley Muslim Community Fair',
    description: 'Annual community fair hosted by Fox Valley Muslim Community Center. Family-friendly, halal food trucks, games, and Islamic art.',
    citySlug: 'chicago-aurora', listingSlug: 'fox-valley-muslim-community-center',
    startAt: new Date('2026-08-08T11:00:00'), endAt: new Date('2026-08-08T18:00:00'),
    address: '1187 Timberlake Dr, Aurora, IL 60506',
    lat: 41.741, lng: -88.330, isFree: true,
  });

  // ── Real upcoming events (sourced from Eventbrite / Sulekha) ─────────────
  // Events are address-based — no listingSlug since party venues rotate

  console.log('\n🎟 Real upcoming events...');

  await upsertEvent(db, organizerId, {
    slug: 'mumbai-to-chicago-bollywood-apr-2026', title: 'Mumbai to Chicago: Bollywood Party',
    description: "Tamasha Nights' Chicago flagship Bollywood party. DJ Browny spinning Bollywood and Hindi hits. USA's #1 desi party experience. 21+.",
    citySlug: 'chicago-city',
    startAt: new Date('2026-04-25T22:00:00'), endAt: new Date('2026-04-26T02:00:00'),
    address: '157 W Ontario St, Chicago, IL 60654',
    lat: 41.8930, lng: -87.6341, isFree: false, priceCents: 2600,
    ticketUrl: 'https://events.sulekha.com/mumbai-to-chicago-bollywood-party-at-fame-nightclub_event-in_chicago-il_399605',
  });

  await upsertEvent(db, organizerId, {
    slug: 'dj-chetas-live-chicago-apr-2026', title: 'DJ Chetas Live — Chicago',
    description: 'DJ Chetas performing live at TAO Chicago. Bollywood, Bhangra, and EDC fusion — one of the biggest names in the South Asian DJ circuit.',
    citySlug: 'chicago-city',
    startAt: new Date('2026-04-30T21:00:00'), endAt: new Date('2026-05-01T02:00:00'),
    address: '632 N Dearborn St, Chicago, IL 60654',
    lat: 41.8935, lng: -87.6310, isFree: false, priceCents: 4000,
    ticketUrl: 'https://events.sulekha.com/dj-chetas-live-chicago_event-in_chicago-il_399603',
  });

  await upsertEvent(db, organizerId, {
    slug: 'anuv-jain-dastakhat-chicago-2026', title: 'Anuv Jain: Dastakhat US Tour',
    description: 'Indie-folk sensation Anuv Jain brings his Dastakhat tour to Chicago. Intimate venue, heartfelt Hindi originals.',
    citySlug: 'chicago-city',
    startAt: new Date('2026-05-01T20:00:00'), endAt: new Date('2026-05-01T23:00:00'),
    address: '322 W Armitage Ave, Chicago, IL 60614',
    lat: 41.9185, lng: -87.6477, isFree: false, priceCents: 4900,
    ticketUrl: 'https://events.sulekha.com/anuv-jain-dastakhat-us-tour-chicago-il_event-in_chicago-il_398724',
  });

  await upsertEvent(db, organizerId, {
    slug: 'imam-siraj-wahhaj-chicago-may-2026', title: 'Khutbah & Family Night — Imam Siraj Wahhaj',
    description: 'An evening with Imam Siraj Wahhaj — one of the most recognized Islamic scholars in America. Khutbah, Q&A, and family gathering on the South Side.',
    citySlug: 'chicago-south',
    startAt: new Date('2026-05-01T18:30:00'), endAt: new Date('2026-05-01T21:00:00'),
    address: '5700 S Maryland Ave, Chicago, IL 60637',
    lat: 41.7920, lng: -87.5970, isFree: true,
    ticketUrl: 'https://www.eventbrite.com/e/khutbah-family-night-with-imam-siraj-wahhaj-tickets-1987946824466',
  });

  await upsertEvent(db, organizerId, {
    slug: 'open-mosque-day-downtown-may-2026', title: 'Open Mosque Day',
    description: 'Curious about Islam? Downtown Islamic Center opens its doors for guided tours, Q&A with scholars, and community conversation. Everyone welcome.',
    citySlug: 'chicago-city', listingSlug: 'downtown-islamic-center-chicago',
    startAt: new Date('2026-05-03T10:00:00'), endAt: new Date('2026-05-03T14:00:00'),
    address: '231 S State St, Chicago, IL 60604',
    lat: 41.8802, lng: -87.6279, isFree: true,
    ticketUrl: 'https://www.eventbrite.com/e/curious-about-islam-come-to-open-mosque-day-tickets-1987393760236',
  });

  await upsertEvent(db, organizerId, {
    slug: 'indo-house-spring-social-may-2026', title: 'Indo-House: Spring Social 2.0',
    description: 'Sanu Production presents Indo-House — a fusion dance party blending Bollywood, afrobeats, and electronic beats. Spring edition at Azul, West Town.',
    citySlug: 'chicago-city',
    startAt: new Date('2026-05-16T20:00:00'), endAt: new Date('2026-05-17T02:00:00'),
    address: '1459 W Chicago Ave, Chicago, IL 60642',
    lat: 41.8959, lng: -87.6621, isFree: false, priceCents: 2000,
  });

  await upsertEvent(db, organizerId, {
    slug: 'haricharan-live-chicago-2026', title: 'Haricharan Live Concert',
    description: 'South Indian playback singer Haricharan performs live in Chicago. Known for his work in Tamil and Telugu cinema. Full live band.',
    citySlug: 'chicago-city', listingSlug: 'alhambra-palace-chicago',
    startAt: new Date('2026-05-24T20:00:00'), endAt: new Date('2026-05-24T23:00:00'),
    address: '1240 W Randolph St, Chicago, IL 60607',
    lat: 41.8837, lng: -87.6606, isFree: false, priceCents: 2500,
    ticketUrl: 'https://events.sulekha.com/haricharan-live-chicago-usa-2026_event-in_chicago-il_399567',
  });

  await upsertEvent(db, organizerId, {
    slug: 'bollywood-boat-party-chicago-may-2026', title: "Chicago's Ultimate Bollywood Boat Party",
    description: 'Bollywood boat party on Lake Michigan. DJ, lights, city skyline views, and Bollywood/Bhangra hits from 8pm to midnight. Boarding from Navy Pier.',
    citySlug: 'chicago-city',
    startAt: new Date('2026-05-30T20:00:00'), endAt: new Date('2026-05-31T00:00:00'),
    address: '600 E Grand Ave, Chicago, IL 60611',
    lat: 41.8917, lng: -87.6086, isFree: false, priceCents: 6500,
    ticketUrl: 'https://events.sulekha.com/chicago-s-ultimate-bollywood-boat-party-2026-kickoff_event-in_chicago-il_399307',
  });

  // ── Update city listing counts ────────────────────────────────────────────

  console.log('\n📊 Updating city listing counts...');
  await db.query(`
    UPDATE cities c SET updated_at = NOW()
    WHERE id IN (SELECT DISTINCT city_id FROM listings WHERE status = 'active')
  `);

  console.log('\n✅ Chicago seed complete!');
  await db.destroy();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
