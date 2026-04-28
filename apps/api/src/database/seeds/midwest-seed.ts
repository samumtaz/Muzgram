/**
 * Midwest Regional Seed
 *
 * Seeds Muslim-community businesses across:
 *   - Dearborn / Detroit, MI  (largest Arab-American Muslim community in the US)
 *   - Grand Rapids, MI
 *   - Ann Arbor, MI
 *   - Milwaukee, WI
 *   - Kenosha / Racine, WI
 *   - Indianapolis, IN
 *   - Gary / Hammond, IN  (Chicago border)
 *   - South Bend, IN
 *   - More Chicago suburbs (Schaumburg, Bolingbrook, Naperville)
 *
 * Run: pnpm --filter=@muzgram/api seed:midwest
 */

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';

const db = new DataSource(dataSourceOptions);

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function upsertCity(city: {
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

async function upsertCategory(cat: { slug: string; name: string; mainCategory: string }) {
  await db.query(`
    INSERT INTO listing_categories (id, slug, name, main_category, icon_name, sort_order, created_at, updated_at)
    VALUES (gen_random_uuid(), $1, $2, $3::listing_main_category_enum, 'circle', 0, NOW(), NOW())
    ON CONFLICT (slug) DO NOTHING
  `, [cat.slug, cat.name, cat.mainCategory]);

  const [{ id }] = await db.query<[{ id: string }]>(`SELECT id FROM listing_categories WHERE slug = $1`, [cat.slug]);
  return id as string;
}

function toHalalEnum(val: string): string {
  if (val === 'certified') return 'ifanca';
  if (val === 'self_declared') return 'self_certified';
  return 'none';
}

async function upsertListing(listing: {
  slug: string; name: string; description: string; mainCategory: string;
  categorySlug: string; citySlug: string; address: string; neighborhood: string;
  lat: number; lng: number; phone?: string; website?: string;
  halalCertification: string;
}) {
  const [city] = await db.query<[{ id: string }]>(`SELECT id FROM cities WHERE slug = $1`, [listing.citySlug]);
  const [category] = await db.query<[{ id: string }]>(`SELECT id FROM listing_categories WHERE slug = $1`, [listing.categorySlug]);

  if (!city || !category) {
    console.warn(`  ⚠ Skipping "${listing.name}" — city "${listing.citySlug}" or category "${listing.categorySlug}" not found`);
    return null;
  }

  await db.query(`
    INSERT INTO listings (
      id, slug, name, description, main_category, category_id, city_id,
      address, neighborhood, location, lat, lng, phone, website,
      halal_certification, status, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4::listing_main_category_enum, $5, $6,
      $7, $8, ST_SetSRID(ST_MakePoint($10, $9), 4326), $9, $10, $11, $12,
      $13::halal_certification_enum, 'active', NOW(), NOW()
    )
    ON CONFLICT (slug) DO UPDATE
      SET name = EXCLUDED.name, description = EXCLUDED.description,
          phone = EXCLUDED.phone, website = EXCLUDED.website, updated_at = NOW()
  `, [
    listing.slug, listing.name, listing.description, listing.mainCategory,
    category.id, city.id,
    listing.address, listing.neighborhood, listing.lat, listing.lng,
    listing.phone ?? null, listing.website ?? null,
    toHalalEnum(listing.halalCertification),
  ]);

  console.log(`  ✓ ${listing.name}`);
}

async function upsertEvent(organizerId: string, event: {
  slug: string; title: string; description: string;
  citySlug: string; address: string; lat: number; lng: number;
  startAt: Date; endAt?: Date; isFree: boolean; ticketUrl?: string;
}) {
  const [city] = await db.query<[{ id: string }]>(`SELECT id FROM cities WHERE slug = $1`, [event.citySlug]);
  const [eventsCategory] = await db.query<[{ id: string }]>(`SELECT id FROM listing_categories WHERE slug = 'events'`);
  if (!city || !eventsCategory) return;

  const endAt = event.endAt ?? new Date(event.startAt.getTime() + 3 * 60 * 60 * 1000);

  await db.query(`
    INSERT INTO events (
      id, slug, title, description, category_id, organizer_id, city_id,
      address, location, lat, lng, start_at, end_at,
      is_free, ticket_url, status, is_featured, is_recurring, is_online, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5, $6,
      $7, ST_SetSRID(ST_MakePoint($9, $8), 4326), $8, $9, $10, $11,
      $12, $13, 'active', false, false, false, NOW(), NOW()
    )
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title, start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at, updated_at = NOW()
  `, [
    event.slug, event.title, event.description, eventsCategory.id, organizerId, city.id,
    event.address, event.lat, event.lng,
    event.startAt, endAt, event.isFree, event.ticketUrl ?? null,
  ]);

  console.log(`  ✓ Event: ${event.title}`);
}

async function ensureSeedUser(): Promise<string> {
  const SEED_CLERK_ID = 'seed_system_user_001';
  const rows = await db.query<[{ id: string }]>(`SELECT id FROM users WHERE clerk_user_id = $1`, [SEED_CLERK_ID]);
  if (rows.length) return rows[0].id;

  await db.query(`
    INSERT INTO users (id, clerk_user_id, phone, display_name, is_active, notification_prefs,
      trust_tier, notifications_sent_today, reports_submitted_count, reports_received_count,
      created_at, updated_at)
    VALUES (gen_random_uuid(), $1, '+10000000001', 'Muzgram Seed', true, '{}', 0, 0, 0, 0, NOW(), NOW())
  `, [SEED_CLERK_ID]);

  const [{ id }] = await db.query<[{ id: string }]>(`SELECT id FROM users WHERE clerk_user_id = $1`, [SEED_CLERK_ID]);
  return id;
}

async function seed() {
  await db.initialize();
  console.log('🌱 Seeding Midwest regional data...\n');

  const organizerId = await ensureSeedUser();

  // ── Cities ────────────────────────────────────────────────────────────────

  console.log('📍 Cities...');

  // Michigan
  await upsertCity({ slug: 'dearborn-mi', name: 'Dearborn / Metro Detroit', state: 'MI', centerLat: 42.3223, centerLng: -83.1763, isActive: true });
  await upsertCity({ slug: 'grand-rapids-mi', name: 'Grand Rapids', state: 'MI', centerLat: 42.9634, centerLng: -85.6681, isActive: true });
  await upsertCity({ slug: 'ann-arbor-mi', name: 'Ann Arbor', state: 'MI', centerLat: 42.2808, centerLng: -83.7430, isActive: false });
  await upsertCity({ slug: 'lansing-mi', name: 'Lansing / East Lansing', state: 'MI', centerLat: 42.7325, centerLng: -84.5555, isActive: false });
  await upsertCity({ slug: 'flint-mi', name: 'Flint', state: 'MI', centerLat: 43.0125, centerLng: -83.6875, isActive: false });

  // Wisconsin
  await upsertCity({ slug: 'milwaukee-wi', name: 'Milwaukee', state: 'WI', centerLat: 43.0389, centerLng: -87.9065, isActive: true });
  await upsertCity({ slug: 'kenosha-wi', name: 'Kenosha / Racine', state: 'WI', centerLat: 42.5847, centerLng: -87.8212, isActive: false });
  await upsertCity({ slug: 'madison-wi', name: 'Madison', state: 'WI', centerLat: 43.0731, centerLng: -89.4012, isActive: false });

  // Indiana
  await upsertCity({ slug: 'indianapolis-in', name: 'Indianapolis', state: 'IN', centerLat: 39.7684, centerLng: -86.1581, isActive: true });
  await upsertCity({ slug: 'gary-hammond-in', name: 'Gary / Hammond', state: 'IN', centerLat: 41.5700, centerLng: -87.4500, isActive: true });
  await upsertCity({ slug: 'south-bend-in', name: 'South Bend / Mishawaka', state: 'IN', centerLat: 41.6764, centerLng: -86.2520, isActive: false });
  await upsertCity({ slug: 'fort-wayne-in', name: 'Fort Wayne', state: 'IN', centerLat: 41.0793, centerLng: -85.1394, isActive: false });

  // ── Extra categories ──────────────────────────────────────────────────────

  console.log('\n🗂 Categories...');
  await upsertCategory({ slug: 'halal-restaurants', name: 'Halal Restaurant', mainCategory: 'eat' });
  await upsertCategory({ slug: 'shawarma-grills', name: 'Shawarma & Grill', mainCategory: 'eat' });
  await upsertCategory({ slug: 'south-asian', name: 'South Asian', mainCategory: 'eat' });
  await upsertCategory({ slug: 'middle-eastern', name: 'Middle Eastern', mainCategory: 'eat' });
  await upsertCategory({ slug: 'bakeries-desserts', name: 'Bakery & Desserts', mainCategory: 'eat' });
  await upsertCategory({ slug: 'halal-grocery', name: 'Halal Grocery', mainCategory: 'eat' });
  await upsertCategory({ slug: 'halal-butcher', name: 'Halal Butcher', mainCategory: 'eat' });
  await upsertCategory({ slug: 'cafe-tea', name: 'Café & Tea', mainCategory: 'eat' });
  await upsertCategory({ slug: 'yemeni-coffee', name: 'Yemeni Coffee', mainCategory: 'go_out' });
  await upsertCategory({ slug: 'hookah-lounge', name: 'Hookah Lounge', mainCategory: 'go_out' });
  await upsertCategory({ slug: 'event-venue', name: 'Event Venue', mainCategory: 'go_out' });
  await upsertCategory({ slug: 'events', name: 'Events', mainCategory: 'go_out' });
  await upsertCategory({ slug: 'mosque', name: 'Mosque', mainCategory: 'connect' });
  await upsertCategory({ slug: 'islamic-school', name: 'Islamic School', mainCategory: 'connect' });
  await upsertCategory({ slug: 'community-org', name: 'Community Org', mainCategory: 'connect' });
  await upsertCategory({ slug: 'professional-services', name: 'Professional Services', mainCategory: 'connect' });
  await upsertCategory({ slug: 'clothing-boutique', name: 'Clothing & Boutique', mainCategory: 'connect' });

  // ── Dearborn / Metro Detroit ───────────────────────────────────────────────
  // Dearborn has the highest concentration of Arab-Americans and Muslims in the US.
  // Michigan Ave and Ford Rd are the heart of this community.

  console.log('\n🕌 Dearborn / Metro Detroit...');

  const dearbornPlaces = [
    // Restaurants
    { name: 'Al-Ameer Restaurant', desc: 'A Dearborn institution for 40+ years. Legendary for Lebanese rotisserie chicken, garlic sauce, and fresh pita. Always packed — expect a wait on weekends.', cat: 'middle-eastern', mc: 'eat', addr: '19300 Michigan Ave, Dearborn, MI 48126', hood: 'Dearborn', lat: 42.3214, lng: -83.2202, phone: '(313) 582-8185', website: 'https://alameerrestaurant.com', halal: 'certified' },
    { name: 'La Pita Restaurant', desc: 'Fast-casual Lebanese on Michigan Ave. Known for massive shawarma wraps, fresh falafel, and affordable family platters.', cat: 'shawarma-grills', mc: 'eat', addr: '14921 Michigan Ave, Dearborn, MI 48126', hood: 'Dearborn', lat: 42.3133, lng: -83.1840, phone: '(313) 584-5555', website: 'https://lapitausa.com', halal: 'certified' },
    { name: 'Scheherazade Restaurant', desc: 'Upscale Lebanese dining in West Dearborn. Excellent mezze spread, perfectly grilled kebabs, and fresh tabbouleh.', cat: 'middle-eastern', mc: 'eat', addr: '22036 Michigan Ave, Dearborn, MI 48124', hood: 'West Dearborn', lat: 42.3140, lng: -83.2450, phone: '(313) 562-2100', halal: 'self_declared' },
    { name: 'Lebanese Village Restaurant', desc: 'Authentic home-style Lebanese cooking. Try the kibbeh, stuffed grape leaves, and baklava made fresh daily.', cat: 'middle-eastern', mc: 'eat', addr: '8750 N Telegraph Rd, Dearborn Heights, MI 48127', hood: 'Dearborn Heights', lat: 42.3350, lng: -83.2645, phone: '(313) 561-7377', halal: 'self_declared' },
    { name: 'Qahwah House Dearborn', desc: 'Yemeni specialty coffee house with a premium sourced single-origin qahwah. Cardamom-spiced coffee, house-baked dates, and a warm atmosphere. The OG NYC chain now in Dearborn.', cat: 'yemeni-coffee', mc: 'go_out', addr: '14850 Michigan Ave, Dearborn, MI 48126', hood: 'Dearborn', lat: 42.3132, lng: -83.1833, phone: '(313) 914-0033', website: 'https://qahwahhouse.com', halal: 'certified' },
    { name: 'Shatila Bakery & Cafe', desc: 'World-famous Lebanese pastry shop since 1979. Baklava, kunafa, mamoul, and seasonal sweets made fresh. Ships nationwide.', cat: 'bakeries-desserts', mc: 'eat', addr: '14300 Michigan Ave, Dearborn, MI 48126', hood: 'Dearborn', lat: 42.3130, lng: -83.1765, phone: '(313) 581-4888', website: 'https://shatila.com', halal: 'certified' },
    { name: 'Green Land Restaurant', desc: 'Yemeni and Middle Eastern staples in the heart of Dearborn. Famous for mandi (slow-roasted lamb and rice).', cat: 'halal-restaurants', mc: 'eat', addr: '13921 Michigan Ave, Dearborn, MI 48126', hood: 'Dearborn', lat: 42.3127, lng: -83.1720, phone: '(313) 582-0035', halal: 'self_declared' },
    { name: 'Al-Sajjad Restaurant', desc: 'Pakistani and Indian cuisine in Dearborn. Excellent nihari, biryani, and karahi for the South Asian community in Metro Detroit.', cat: 'south-asian', mc: 'eat', addr: '4840 Schaefer Rd, Dearborn, MI 48126', hood: 'Dearborn', lat: 42.3260, lng: -83.2028, phone: '(313) 584-6262', halal: 'self_declared' },
    { name: 'Mediterranean Village', desc: 'Casual Lebanese diner popular with Dearborn locals. Generous portions of shawarma, kafta, and garlic spread.', cat: 'shawarma-grills', mc: 'eat', addr: '23155 Michigan Ave, Dearborn, MI 48124', hood: 'West Dearborn', lat: 42.3142, lng: -83.2550, phone: '(313) 562-2999', halal: 'self_declared' },
    { name: 'Bucharest Grill Dearborn', desc: 'Beloved Detroit-born halal grill known for perfectly seasoned chicken, gyros, and Romanian-inspired street food. Cash only at the original.', cat: 'halal-restaurants', mc: 'eat', addr: '2681 E Jefferson Ave, Dearborn, MI 48123', hood: 'Dearborn', lat: 42.3290, lng: -83.0455, phone: '(313) 965-3111', website: 'https://bucharestgrill.com', halal: 'self_declared' },
    { name: 'Al-Taj Sweets', desc: 'Lebanese and Middle Eastern sweets and fresh juices. Famous for fresh-squeezed pomegranate juice and house-made ice cream.', cat: 'bakeries-desserts', mc: 'eat', addr: '7224 W Warren Ave, Dearborn, MI 48126', hood: 'Dearborn', lat: 42.3220, lng: -83.1980, phone: '(313) 584-1122', halal: 'self_declared' },
    { name: 'Motor City Java House', desc: 'Muslim-owned specialty coffee and smoothie bar in Detroit. Halal snacks, excellent cold brew, and a community gathering spot.', cat: 'cafe-tea', mc: 'eat', addr: '7743 W Vernor Hwy, Detroit, MI 48209', hood: 'Southwest Detroit', lat: 42.3320, lng: -83.1580, phone: '(313) 389-7960', halal: 'self_declared' },
    // Groceries & Markets
    { name: 'International Market Dearborn', desc: 'The go-to halal supermarket on Michigan Ave. Full halal meat counter, Middle Eastern pantry staples, fresh produce, and bulk spices.', cat: 'halal-grocery', mc: 'eat', addr: '13609 Michigan Ave, Dearborn, MI 48126', hood: 'Dearborn', lat: 42.3126, lng: -83.1703, phone: '(313) 582-9000', halal: 'certified' },
    { name: 'Quality Foods Market', desc: 'Dearborn\'s cornerstone halal supermarket with a full-service butcher, prepared foods, and a wide selection of Middle Eastern specialty items.', cat: 'halal-grocery', mc: 'eat', addr: '9921 W Vernor Hwy, Detroit, MI 48209', hood: 'Southwest Detroit', lat: 42.3274, lng: -83.1750, phone: '(313) 842-4400', halal: 'certified' },
    // Mosques & Community
    { name: 'Islamic Center of America', desc: 'The largest mosque in North America. Stunning 120,000 sq ft facility with a 3,000-person prayer hall, Islamic school, library, and community center. Open to visitors.', cat: 'mosque', mc: 'connect', addr: '19500 Ford Rd, Dearborn, MI 48128', hood: 'Dearborn', lat: 42.3098, lng: -83.2354, phone: '(313) 593-0000', website: 'https://icofa.com', halal: 'none' },
    { name: 'American Muslim Society – Dix Mosque', desc: 'One of the oldest mosques in North America, established in 1937. Historic Lebanese-American mosque serving Dearborn for nearly 90 years.', cat: 'mosque', mc: 'connect', addr: '9945 Dix Ave, Dearborn, MI 48120', hood: 'Dearborn', lat: 42.2915, lng: -83.1765, phone: '(313) 842-4500', halal: 'none' },
    { name: 'Muslim Center of Detroit', desc: 'Full-service Islamic center with masjid, weekend school, and youth programs on the east side of Detroit.', cat: 'mosque', mc: 'connect', addr: '11551 Conant St, Detroit, MI 48212', hood: 'East Detroit', lat: 42.3930, lng: -83.0310, phone: '(313) 368-0615', website: 'https://muslimcenter.org', halal: 'none' },
    { name: 'Arab American National Museum', desc: 'The only museum in the US dedicated to Arab American history and culture. Exhibits on art, music, immigration, and community. Free Thursdays.', cat: 'community-org', mc: 'connect', addr: '13624 Michigan Ave, Dearborn, MI 48126', hood: 'Dearborn', lat: 42.3126, lng: -83.1706, phone: '(313) 582-2266', website: 'https://arabamericanmuseum.org', halal: 'none' },
    { name: 'ACCESS – Arab Community Center', desc: 'The largest Arab American human services nonprofit in the US. Health, employment, immigration, and community services for Metro Detroit.', cat: 'community-org', mc: 'connect', addr: '2651 Saulino Ct, Dearborn, MI 48120', hood: 'Dearborn', lat: 42.2980, lng: -83.1620, phone: '(313) 842-7010', website: 'https://accesscommunity.org', halal: 'none' },
  ];

  for (const p of dearbornPlaces) {
    await upsertListing({
      slug: slug(p.name) + '-dearborn',
      name: p.name, description: p.desc,
      mainCategory: p.mc, categorySlug: p.cat,
      citySlug: 'dearborn-mi',
      address: p.addr, neighborhood: p.hood,
      lat: p.lat, lng: p.lng,
      phone: p.phone, website: (p as any).website,
      halalCertification: p.halal,
    });
  }

  // ── Grand Rapids, MI ──────────────────────────────────────────────────────

  console.log('\n🏙 Grand Rapids, MI...');
  const grandRapidsPlaces = [
    { name: 'Noodles & More GR', desc: 'Halal noodle restaurant on the southeast side of Grand Rapids. Popular with the local Somali and Muslim community.', cat: 'halal-restaurants', mc: 'eat', addr: '4255 Kalamazoo Ave SE, Grand Rapids, MI 49508', hood: 'Southeast GR', lat: 42.9130, lng: -85.6350, phone: '(616) 281-7448', halal: 'self_declared' },
    { name: 'Al-Saha Lebanese Grill', desc: 'Authentic Lebanese cuisine in downtown Grand Rapids. Fresh shawarma, hummus, and daily specials. Dine-in and carry-out.', cat: 'middle-eastern', mc: 'eat', addr: '15 Ionia Ave SW, Grand Rapids, MI 49503', hood: 'Downtown GR', lat: 42.9608, lng: -85.6698, phone: '(616) 776-1012', halal: 'certified' },
    { name: 'Halal Kitchen GR', desc: 'Family-owned halal restaurant serving East African and Middle Eastern dishes. Try the goat stew and rice pilaf.', cat: 'halal-restaurants', mc: 'eat', addr: '4265 Division Ave S, Grand Rapids, MI 49548', hood: 'Division South', lat: 42.8970, lng: -85.6580, phone: '(616) 452-3000', halal: 'self_declared' },
    { name: 'Islamic Mosque of Grand Rapids', desc: 'The main mosque serving Grand Rapids Muslims since 1982. Friday jumu\'ah, weekend school, and full community programs.', cat: 'mosque', mc: 'connect', addr: '126 Eastern Ave SE, Grand Rapids, MI 49503', hood: 'Southeast GR', lat: 42.9550, lng: -85.6562, phone: '(616) 452-2504', website: 'https://imgr.org', halal: 'none' },
    { name: 'Muslim Community Association GR', desc: 'Growing Islamic center on the northeast side of Grand Rapids. New masjid building with youth and family programs.', cat: 'mosque', mc: 'connect', addr: '4005 Remembrance Rd NW, Grand Rapids, MI 49534', hood: 'Northwest GR', lat: 43.0030, lng: -85.7080, phone: '(616) 735-0045', halal: 'none' },
    { name: 'International Halal Market GR', desc: 'The best halal grocery in Grand Rapids. Full halal meat counter, African and Middle Eastern specialty items.', cat: 'halal-grocery', mc: 'eat', addr: '1500 Eastern Ave SE, Grand Rapids, MI 49507', hood: 'Southeast GR', lat: 42.9430, lng: -85.6450, phone: '(616) 243-4444', halal: 'certified' },
  ];

  for (const p of grandRapidsPlaces) {
    await upsertListing({
      slug: slug(p.name) + '-grand-rapids',
      name: p.name, description: p.desc,
      mainCategory: p.mc, categorySlug: p.cat,
      citySlug: 'grand-rapids-mi',
      address: p.addr, neighborhood: p.hood,
      lat: p.lat, lng: p.lng,
      phone: p.phone, website: (p as any).website,
      halalCertification: p.halal,
    });
  }

  // ── Ann Arbor, MI ─────────────────────────────────────────────────────────

  console.log('\n🎓 Ann Arbor, MI...');
  const annArborPlaces = [
    { name: 'Jerusalem Garden', desc: 'Ann Arbor\'s favorite Middle Eastern spot for 25+ years. Known for falafel, shawarma, and fresh-baked pita. Steps from University of Michigan campus.', cat: 'middle-eastern', mc: 'eat', addr: '307 S Fifth Ave, Ann Arbor, MI 48104', hood: 'Downtown', lat: 42.2785, lng: -83.7440, phone: '(734) 995-5060', website: 'https://jerusalemgarden.net', halal: 'certified' },
    { name: 'Pita Cafe Ann Arbor', desc: 'Lebanese cafe with a loyal student following. Affordable pita wraps, mezze plates, and freshly blended juices near UM campus.', cat: 'shawarma-grills', mc: 'eat', addr: '621 E Liberty St, Ann Arbor, MI 48104', hood: 'Kerrytown', lat: 42.2813, lng: -83.7380, phone: '(734) 994-1236', halal: 'self_declared' },
    { name: 'Islamic Center of Ann Arbor', desc: 'Masjid serving the University of Michigan Muslim community and Ann Arbor residents. Daily prayers, khutbah, and active MSA programs.', cat: 'mosque', mc: 'connect', addr: '2301 Plymouth Rd, Ann Arbor, MI 48105', hood: 'North Ann Arbor', lat: 42.3080, lng: -83.7334, phone: '(734) 665-4249', website: 'https://icaa.us', halal: 'none' },
    { name: 'Halal Meats Ann Arbor', desc: 'Full-service halal butcher and grocery near UM campus. Fresh-cut lamb, beef, chicken, and goat. Community staple for 20+ years.', cat: 'halal-butcher', mc: 'eat', addr: '2126 W Stadium Blvd, Ann Arbor, MI 48103', hood: 'Stadium', lat: 42.2720, lng: -83.7600, phone: '(734) 668-8700', halal: 'certified' },
  ];

  for (const p of annArborPlaces) {
    await upsertListing({
      slug: slug(p.name) + '-ann-arbor',
      name: p.name, description: p.desc,
      mainCategory: p.mc, categorySlug: p.cat,
      citySlug: 'ann-arbor-mi',
      address: p.addr, neighborhood: p.hood,
      lat: p.lat, lng: p.lng,
      phone: p.phone, website: (p as any).website,
      halalCertification: p.halal,
    });
  }

  // ── Milwaukee, WI ─────────────────────────────────────────────────────────

  console.log('\n🦅 Milwaukee, WI...');
  const milwaukeePlaces = [
    { name: 'Safari Restaurant Milwaukee', desc: 'Somali and East African cuisine in Milwaukee\'s growing Muslim community. Try the canjeero, suqaar, and maraq. Warm family atmosphere.', cat: 'halal-restaurants', mc: 'eat', addr: '1243 W Burnham St, Milwaukee, WI 53204', hood: 'Walker\'s Point', lat: 43.0162, lng: -87.9480, phone: '(414) 672-1330', halal: 'self_declared' },
    { name: 'Al-Madina Mediterranean', desc: 'Mediterranean and Middle Eastern restaurant on the south side of Milwaukee. Excellent shawarma, fresh hummus, and daily specials.', cat: 'middle-eastern', mc: 'eat', addr: '5220 S 27th St, Milwaukee, WI 53221', hood: 'South Milwaukee', lat: 42.9660, lng: -87.9500, phone: '(414) 281-2222', halal: 'certified' },
    { name: 'Halal Brothers MKE', desc: 'Casual halal grill popular with the Milwaukee Muslim community. Chicken over rice, shawarma wraps, and fresh salads.', cat: 'shawarma-grills', mc: 'eat', addr: '4801 W Villard Ave, Milwaukee, WI 53218', hood: 'Villard', lat: 43.1070, lng: -87.9720, phone: '(414) 445-5000', halal: 'self_declared' },
    { name: 'Pakistani Cuisine MKE', desc: 'Authentic Pakistani home cooking in Milwaukee. Weekly specials include nihari on weekends, biryani on Fridays.', cat: 'south-asian', mc: 'eat', addr: '4620 N 76th St, Milwaukee, WI 53218', hood: 'Northwest Milwaukee', lat: 43.0940, lng: -87.9952, phone: '(414) 464-8800', halal: 'self_declared' },
    { name: 'Nile Restaurant MKE', desc: 'Sudanese and East African cuisine in Milwaukee. Warm hospitality and authentic dishes for the community.', cat: 'halal-restaurants', mc: 'eat', addr: '6620 W North Ave, Milwaukee, WI 53213', hood: 'Wauwatosa', lat: 43.0560, lng: -87.9880, phone: '(414) 476-9500', halal: 'self_declared' },
    { name: 'Islamic Society of Milwaukee', desc: 'The central mosque serving Milwaukee Muslims since 1967. Full Friday services, Islamic school, and extensive community programs on the south side.', cat: 'mosque', mc: 'connect', addr: '4707 S 13th St, Milwaukee, WI 53221', hood: 'South Milwaukee', lat: 42.9748, lng: -87.9350, phone: '(414) 282-1812', website: 'https://islamicsocietyofmilwaukee.org', halal: 'none' },
    { name: 'Masjid Al-Noor Milwaukee', desc: 'Growing Milwaukee Islamic center on the northwest side. Friday jumu\'ah, weekend school, and youth programs.', cat: 'mosque', mc: 'connect', addr: '5235 N 60th St, Milwaukee, WI 53218', hood: 'Northwest Milwaukee', lat: 43.1040, lng: -87.9890, phone: '(414) 436-6600', halal: 'none' },
    { name: 'Al-Baraka Halal Market', desc: 'Milwaukee\'s best halal grocery on the south side. Fresh halal meats, African staples, and Middle Eastern pantry items.', cat: 'halal-grocery', mc: 'eat', addr: '4940 S 27th St, Milwaukee, WI 53221', hood: 'South Milwaukee', lat: 42.9620, lng: -87.9500, phone: '(414) 281-8800', halal: 'certified' },
  ];

  for (const p of milwaukeePlaces) {
    await upsertListing({
      slug: slug(p.name) + '-milwaukee',
      name: p.name, description: p.desc,
      mainCategory: p.mc, categorySlug: p.cat,
      citySlug: 'milwaukee-wi',
      address: p.addr, neighborhood: p.hood,
      lat: p.lat, lng: p.lng,
      phone: p.phone, website: (p as any).website,
      halalCertification: p.halal,
    });
  }

  // ── Gary / Hammond, IN ────────────────────────────────────────────────────
  // Directly bordering Chicago on the Indiana side — many Muslim families in the area.

  console.log('\n🏭 Gary / Hammond, IN...');
  const garyPlaces = [
    { name: 'Chicken Shack Hammond', desc: 'Popular halal fried chicken and grill on Indianapolis Blvd. Local favorite for family dinners and takeout.', cat: 'halal-restaurants', mc: 'eat', addr: '4720 Indianapolis Blvd, Hammond, IN 46327', hood: 'Hammond', lat: 41.5850, lng: -87.4980, phone: '(219) 937-1234', halal: 'self_declared' },
    { name: 'Mediterranean Grill Hammond', desc: 'Gyros, shawarma, and Mediterranean plates near the Chicago-Indiana border. Quick and affordable halal eats.', cat: 'shawarma-grills', mc: 'eat', addr: '6632 Indianapolis Blvd, Hammond, IN 46324', hood: 'Hammond', lat: 41.6100, lng: -87.4950, phone: '(219) 845-6767', halal: 'self_declared' },
    { name: 'Masjid Al-Mumin Hammond', desc: 'African American Muslim masjid serving Hammond and Gary. Long-established community mosque with Friday services and programs.', cat: 'mosque', mc: 'connect', addr: '550 173rd St, Hammond, IN 46324', hood: 'Hammond', lat: 41.5960, lng: -87.5010, phone: '(219) 844-2255', halal: 'none' },
    { name: 'Islamic Center of Northwest Indiana', desc: 'Full-service Islamic center in Merrillville serving the greater Gary metro area. Daily prayers, Islamic weekend school, and social services.', cat: 'mosque', mc: 'connect', addr: '8585 Broadway, Merrillville, IN 46410', hood: 'Merrillville', lat: 41.4730, lng: -87.3380, phone: '(219) 736-7266', website: 'https://icni.org', halal: 'none' },
    { name: 'Halal Palace Gary', desc: 'Halal chicken, burgers, and Middle Eastern staples serving the Gary Muslim community. Open late on weekends.', cat: 'halal-restaurants', mc: 'eat', addr: '4220 W 5th Ave, Gary, IN 46406', hood: 'Gary', lat: 41.5940, lng: -87.3830, phone: '(219) 944-5500', halal: 'self_declared' },
    { name: 'Al-Amin Halal Market', desc: 'Halal grocery and butcher shop in Hammond. Fresh-cut halal meats, African and Middle Eastern specialty items.', cat: 'halal-grocery', mc: 'eat', addr: '4515 Calumet Ave, Hammond, IN 46327', hood: 'Hammond', lat: 41.5815, lng: -87.5120, phone: '(219) 932-4488', halal: 'certified' },
  ];

  for (const p of garyPlaces) {
    await upsertListing({
      slug: slug(p.name) + '-gary-hammond',
      name: p.name, description: p.desc,
      mainCategory: p.mc, categorySlug: p.cat,
      citySlug: 'gary-hammond-in',
      address: p.addr, neighborhood: p.hood,
      lat: p.lat, lng: p.lng,
      phone: p.phone, website: (p as any).website,
      halalCertification: p.halal,
    });
  }

  // ── Indianapolis, IN ──────────────────────────────────────────────────────

  console.log('\n🏀 Indianapolis, IN...');
  const indianapolisPlaces = [
    { name: 'Jerusalem Restaurant Indy', desc: 'Indianapolis\'s most beloved Middle Eastern restaurant for 30+ years. Generous portions of hummus, shawarma, and fresh falafel. Dine-in and carryout on E 38th St.', cat: 'middle-eastern', mc: 'eat', addr: '8960 E 38th St, Indianapolis, IN 46226', hood: 'East Indianapolis', lat: 39.8226, lng: -86.0264, phone: '(317) 897-9100', halal: 'certified' },
    { name: 'Sahara Restaurant Indy', desc: 'Family-run Middle Eastern restaurant in Indianapolis. Excellent chicken kabsa, fresh salads, and warm hospitality.', cat: 'halal-restaurants', mc: 'eat', addr: '3850 N Keystone Ave, Indianapolis, IN 46205', hood: 'Keystone', lat: 39.8350, lng: -86.1170, phone: '(317) 251-7444', halal: 'self_declared' },
    { name: 'Aladdin Halal Restaurant', desc: 'Casual halal spot in Indianapolis serving gyros, shawarma, and kabobs. Popular with the local Muslim community for Friday lunch.', cat: 'shawarma-grills', mc: 'eat', addr: '4402 Lafayette Rd, Indianapolis, IN 46254', hood: 'West Indianapolis', lat: 39.8316, lng: -86.2170, phone: '(317) 387-9600', halal: 'self_declared' },
    { name: 'Tandoori Bites Indy', desc: 'South Asian halal restaurant in Indianapolis. Curries, biryani, and tandoori dishes made fresh daily. Loved by Pakistani and Indian families in the city.', cat: 'south-asian', mc: 'eat', addr: '5230 W 38th St, Indianapolis, IN 46254', hood: 'West Indianapolis', lat: 39.8348, lng: -86.2280, phone: '(317) 329-8100', halal: 'self_declared' },
    { name: 'Islamic Society of North America – HQ', desc: 'National headquarters of ISNA located in Plainfield, IN near Indianapolis. Major Islamic conference center, bookstore, and community programs. The annual ISNA convention is held here.', cat: 'community-org', mc: 'connect', addr: '6555 S County Road 750 E, Plainfield, IN 46168', hood: 'Plainfield', lat: 39.7042, lng: -86.4070, phone: '(317) 839-8157', website: 'https://isna.net', halal: 'none' },
    { name: 'Islamic Society of Greater Indianapolis', desc: 'The main Islamic center serving Indianapolis with a full-service masjid, Islamic school, and community programs. Friday jumu\'ah draws hundreds of worshippers.', cat: 'mosque', mc: 'connect', addr: '4002 E 38th St, Indianapolis, IN 46218', hood: 'East Indianapolis', lat: 39.8350, lng: -86.1080, phone: '(317) 545-5544', website: 'https://isgi.org', halal: 'none' },
    { name: 'Masjid Al-Fajr Indianapolis', desc: 'African American Muslim masjid in Indianapolis. Friday khutbah, youth programs, and community outreach serving the westside.', cat: 'mosque', mc: 'connect', addr: '2040 N Lafayette Rd, Indianapolis, IN 46222', hood: 'Westside Indy', lat: 39.8040, lng: -86.1902, phone: '(317) 631-8730', halal: 'none' },
    { name: 'International Halal Market Indy', desc: 'Best halal grocery in Indianapolis. Full halal meat department, South Asian spices, and Middle Eastern staples.', cat: 'halal-grocery', mc: 'eat', addr: '4302 N Keystone Ave, Indianapolis, IN 46205', hood: 'Keystone', lat: 39.8452, lng: -86.1170, phone: '(317) 255-2222', halal: 'certified' },
  ];

  for (const p of indianapolisPlaces) {
    await upsertListing({
      slug: slug(p.name) + '-indy',
      name: p.name, description: p.desc,
      mainCategory: p.mc, categorySlug: p.cat,
      citySlug: 'indianapolis-in',
      address: p.addr, neighborhood: p.hood,
      lat: p.lat, lng: p.lng,
      phone: p.phone, website: (p as any).website,
      halalCertification: p.halal,
    });
  }

  // ── South Bend / Mishawaka, IN ────────────────────────────────────────────

  console.log('\n🏈 South Bend / Mishawaka, IN...');
  const southBendPlaces = [
    { name: 'Heartland Shawarma', desc: 'Halal shawarma and Mediterranean wraps near the University of Notre Dame. Popular with Muslim students and faculty.', cat: 'shawarma-grills', mc: 'eat', addr: '52592 US-31, South Bend, IN 46637', hood: 'North South Bend', lat: 41.7280, lng: -86.2510, phone: '(574) 855-4444', halal: 'self_declared' },
    { name: 'Islamic Center of South Bend', desc: 'Main masjid serving the South Bend Muslim community, including students from Notre Dame and Indiana University South Bend. Active MSA and family programs.', cat: 'mosque', mc: 'connect', addr: '812 S 31st St, South Bend, IN 46615', hood: 'South Bend', lat: 41.6590, lng: -86.2320, phone: '(574) 232-9990', halal: 'none' },
    { name: 'Halal Stop South Bend', desc: 'Convenient halal carryout spot in Mishawaka serving halal burgers, fried chicken, and gyros. A go-to for halal-conscious families in the area.', cat: 'halal-restaurants', mc: 'eat', addr: '3218 Grape Rd, Mishawaka, IN 46545', hood: 'Mishawaka', lat: 41.6840, lng: -86.1800, phone: '(574) 255-6600', halal: 'self_declared' },
  ];

  for (const p of southBendPlaces) {
    await upsertListing({
      slug: slug(p.name) + '-south-bend',
      name: p.name, description: p.desc,
      mainCategory: p.mc, categorySlug: p.cat,
      citySlug: 'south-bend-in',
      address: p.addr, neighborhood: p.hood,
      lat: p.lat, lng: p.lng,
      phone: p.phone,
      halalCertification: p.halal,
    });
  }

  // ── More Chicago Suburbs (Schaumburg, Bolingbrook, Naperville) ─────────────

  console.log('\n🏘 More Chicago suburbs...');
  const schaumbergPlaces = [
    { name: 'Reza\'s Restaurant Schaumburg', desc: 'Upscale Persian restaurant in the northwest suburbs. Excellent lamb kebabs, fesenjan, and ghormeh sabzi in an elegant setting.', cat: 'middle-eastern', mc: 'eat', addr: '1950 E Higgins Rd, Schaumburg, IL 60173', hood: 'Schaumburg', lat: 42.0350, lng: -88.0060, phone: '(847) 885-8898', website: 'https://rezasrestaurant.com', halal: 'self_declared', city: 'chicago-schaumburg' },
    { name: 'Al-Rayan Grill Schaumburg', desc: 'Palestinian and Middle Eastern grill in Schaumburg. Local Muslim community staple for Friday family dinners.', cat: 'shawarma-grills', mc: 'eat', addr: '860 E Higgins Rd, Schaumburg, IL 60173', hood: 'Schaumburg', lat: 42.0180, lng: -88.0460, phone: '(847) 240-7700', halal: 'certified', city: 'chicago-schaumburg' },
    { name: 'Dar El Salam Schaumburg', desc: 'Full-service Islamic center and masjid in Schaumburg. Friday jumu\'ah, Islamic school, and Ramadan programs serving the northwest suburbs.', cat: 'mosque', mc: 'connect', addr: '1035 S Roselle Rd, Schaumburg, IL 60193', hood: 'Schaumburg', lat: 42.0000, lng: -88.0580, phone: '(847) 301-5050', website: 'https://darelsalam.org', halal: 'none', city: 'chicago-schaumburg' },
    { name: 'Islamic Foundation Mosque', desc: 'Large suburban Islamic center in Villa Park/Schaumburg area with a full-time Islamic school and mosque. One of the most active community centers in the suburbs.', cat: 'mosque', mc: 'connect', addr: '300 W Highridge Rd, Villa Park, IL 60181', hood: 'Villa Park', lat: 41.8868, lng: -87.9727, phone: '(630) 941-8800', website: 'https://ifvp.org', halal: 'none', city: 'chicago-schaumburg' },
    { name: 'Kababeque Bolingbrook', desc: 'Popular Pakistani and Afghan kabab house in Bolingbrook. Known for seekh kabab, karahi, and family platters.', cat: 'halal-restaurants', mc: 'eat', addr: '311 N Weber Rd, Bolingbrook, IL 60490', hood: 'Bolingbrook', lat: 41.6810, lng: -88.0840, phone: '(630) 226-1555', halal: 'self_declared', city: 'chicago-bolingbrook' },
    { name: 'Pak-Punjab Restaurant Bolingbrook', desc: 'Authentic Punjabi cuisine in Bolingbrook. Weekend specials of nihari and paya draw crowds from across the southwest suburbs.', cat: 'south-asian', mc: 'eat', addr: '540 N Weber Rd, Bolingbrook, IL 60490', hood: 'Bolingbrook', lat: 41.6940, lng: -88.0840, phone: '(630) 771-9191', halal: 'self_declared', city: 'chicago-bolingbrook' },
    { name: 'Islamic Center of Naperville', desc: 'DuPage County\'s largest Islamic center. Beautiful new facility with mosque, full-time school, gym, and social hall serving western suburbs.', cat: 'mosque', mc: 'connect', addr: '4835 Ellsworth St, Naperville, IL 60564', hood: 'Naperville', lat: 41.7234, lng: -88.1510, phone: '(630) 961-0222', website: 'https://icnaperville.org', halal: 'none', city: 'chicago-naperville' },
    { name: 'Sabri Nihari Naperville', desc: 'Outpost of the Devon Ave nihari institution in the western suburbs. Same legendary slow-cooked beef nihari in a larger setting.', cat: 'south-asian', mc: 'eat', addr: '2735 Showplace Dr, Naperville, IL 60564', hood: 'Naperville', lat: 41.7480, lng: -88.1380, phone: '(630) 355-4848', halal: 'self_declared', city: 'chicago-naperville' },
  ];

  for (const p of schaumbergPlaces) {
    await upsertListing({
      slug: slug(p.name),
      name: p.name, description: p.desc,
      mainCategory: p.mc, categorySlug: p.cat,
      citySlug: p.city,
      address: p.addr, neighborhood: p.hood,
      lat: p.lat, lng: p.lng,
      phone: p.phone, website: (p as any).website,
      halalCertification: p.halal,
    });
  }

  // ── Regional Events ───────────────────────────────────────────────────────

  console.log('\n📅 Regional events...');
  const now = new Date();

  await upsertEvent(organizerId, {
    slug: 'dearborn-iftar-dinner-2026',
    title: 'Dearborn Community Iftar Dinner',
    description: 'Annual community iftar dinner hosted by the Islamic Center of America. Open to all. Dates, soup, and a full Middle Eastern spread. 500+ attendees expected.',
    citySlug: 'dearborn-mi',
    address: '19500 Ford Rd, Dearborn, MI 48128',
    lat: 42.3098, lng: -83.2354,
    startAt: new Date(now.getFullYear(), now.getMonth() + 1, 15, 19, 0),
    isFree: true,
  });

  await upsertEvent(organizerId, {
    slug: 'milwaukee-muslim-fest-2026',
    title: 'Milwaukee Muslim Fest',
    description: 'Annual outdoor festival celebrating Muslim culture, food, and community in Milwaukee. Live nasheed performances, halal food vendors, kids\' activities, and business expo.',
    citySlug: 'milwaukee-wi',
    address: 'Henry Maier Festival Park, Milwaukee, WI 53202',
    lat: 43.0285, lng: -87.8990,
    startAt: new Date(now.getFullYear(), now.getMonth() + 2, 20, 11, 0),
    endAt: new Date(now.getFullYear(), now.getMonth() + 2, 20, 20, 0),
    isFree: false,
    ticketUrl: 'https://milwaukeemuslimfest.com',
  });

  await upsertEvent(organizerId, {
    slug: 'indy-isna-regional-conference-2026',
    title: 'ISNA Regional Conference',
    description: 'Islamic Society of North America regional conference bringing speakers, scholars, and community leaders from across the Midwest. Keynotes, panels, and networking.',
    citySlug: 'indianapolis-in',
    address: '6555 S County Road 750 E, Plainfield, IN 46168',
    lat: 39.7042, lng: -86.4070,
    startAt: new Date(now.getFullYear(), now.getMonth() + 1, 8, 9, 0),
    endAt: new Date(now.getFullYear(), now.getMonth() + 1, 9, 18, 0),
    isFree: false,
    ticketUrl: 'https://isna.net',
  });

  await upsertEvent(organizerId, {
    slug: 'gr-muslim-leadership-summit-2026',
    title: 'Grand Rapids Muslim Leadership Summit',
    description: 'Half-day leadership and professional development summit for Muslim professionals in West Michigan. Mentorship, business networking, and community building.',
    citySlug: 'grand-rapids-mi',
    address: 'Grand Valley State University, Grand Rapids, MI 49503',
    lat: 42.9608, lng: -85.6698,
    startAt: new Date(now.getFullYear(), now.getMonth() + 1, 22, 10, 0),
    isFree: true,
  });

  await upsertEvent(organizerId, {
    slug: 'chicago-midwest-halal-expo-2026',
    title: 'Midwest Halal Food & Business Expo',
    description: 'The largest halal food and business expo in the Midwest. 80+ vendors, live cooking demos, halal certification workshops, and an investor pitch competition for Muslim entrepreneurs.',
    citySlug: 'chicago-schaumburg',
    address: 'Schaumburg Convention Center, 1551 N Thoreau Dr, Schaumburg, IL 60173',
    lat: 42.0350, lng: -88.0600,
    startAt: new Date(now.getFullYear(), now.getMonth() + 2, 5, 10, 0),
    endAt: new Date(now.getFullYear(), now.getMonth() + 2, 6, 18, 0),
    isFree: false,
    ticketUrl: 'https://midwesthalalexpo.com',
  });

  await db.destroy();
  console.log('\n✅ Midwest seed complete!');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
