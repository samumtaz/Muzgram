/**
 * Community Posts Seed
 *
 * Seeds realistic community posts from fictional Muslim community members.
 * Posts cover: food finds, event tips, local discoveries, questions, prayer times, Ramadan content.
 *
 * Run: pnpm --filter=@muzgram/api seed:posts
 */

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';

const db = new DataSource(dataSourceOptions);

// ── Fake community users ───────────────────────────────────────────────────────

const SEED_AUTHORS = [
  { clerkId: 'seed_author_001', name: 'Yusuf M.', neighborhood: 'Devon Ave', avatar: null },
  { clerkId: 'seed_author_002', name: 'Fatima Al-H.', neighborhood: 'Rogers Park', avatar: null },
  { clerkId: 'seed_author_003', name: 'Omar K.', neighborhood: 'Skokie', avatar: null },
  { clerkId: 'seed_author_004', name: 'Aisha B.', neighborhood: 'Bridgeview', avatar: null },
  { clerkId: 'seed_author_005', name: 'Bilal S.', neighborhood: 'Schaumburg', avatar: null },
  { clerkId: 'seed_author_006', name: 'Nadia R.', neighborhood: 'Bolingbrook', avatar: null },
  { clerkId: 'seed_author_007', name: 'Ibrahim T.', neighborhood: 'Albany Park', avatar: null },
  { clerkId: 'seed_author_008', name: 'Mariam Z.', neighborhood: 'Devon Ave', avatar: null },
];

async function ensureAuthor(author: typeof SEED_AUTHORS[0]): Promise<string> {
  const existing = await db.query<[{ id: string }]>(
    `SELECT id FROM users WHERE clerk_user_id = $1`, [author.clerkId]
  );
  if (existing.length) return existing[0].id;

  await db.query(`
    INSERT INTO users (id, clerk_user_id, phone, display_name, avatar_url, is_active,
      notification_prefs, trust_tier, notifications_sent_today, reports_submitted_count,
      reports_received_count, created_at, updated_at)
    VALUES (gen_random_uuid(), $1, $2, $3, $4, true, '{}', 2, 0, 0, 0, NOW(), NOW())
  `, [author.clerkId, `+1555000${SEED_AUTHORS.indexOf(author).toString().padStart(4, '0')}`, author.name, author.avatar]);

  const [{ id }] = await db.query<[{ id: string }]>(
    `SELECT id FROM users WHERE clerk_user_id = $1`, [author.clerkId]
  );
  return id;
}

async function insertPost(post: {
  authorId: string;
  body: string;
  lat: number; lng: number;
  neighborhood: string;
  cityId: string;
  linkedListingSlug?: string;
  mediaUrls?: string[];
  savesCount?: number;
  createdHoursAgo?: number;
}) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const createdAt = post.createdHoursAgo
    ? new Date(Date.now() - post.createdHoursAgo * 60 * 60 * 1000)
    : new Date();

  let linkedListingId: string | null = null;
  if (post.linkedListingSlug) {
    const rows = await db.query<[{ id: string }]>(
      `SELECT id FROM listings WHERE slug = $1`, [post.linkedListingSlug]
    );
    linkedListingId = rows[0]?.id ?? null;
  }

  const mediaArray = post.mediaUrls && post.mediaUrls.length > 0 ? `{${post.mediaUrls.join(',')}}` : '{}';

  await db.query(`
    INSERT INTO community_posts (
      id, author_id, body, media_urls, "linkedListingId", "linkedEventId",
      city_id, location, lat, lng, neighborhood,
      status, "reportWeight", save_count, share_count,
      "expiresAt", created_at, updated_at
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4, NULL,
      $5, ST_SetSRID(ST_MakePoint($7, $6), 4326), $6, $7, $8,
      'active', 0, $9, 0,
      $10, $11, $11
    )
  `, [
    post.authorId, post.body, mediaArray, linkedListingId,
    post.cityId, post.lat, post.lng, post.neighborhood,
    post.savesCount ?? 0,
    expiresAt, createdAt,
  ]);

  console.log(`  ✓ Post by ${post.neighborhood}: "${post.body.substring(0, 60)}..."`);
}

async function seed() {
  await db.initialize();
  console.log('🌱 Seeding community posts...\n');

  // ── Create authors ──────────────────────────────────────────────────────────
  console.log('👤 Creating seed authors...');
  const authorIds: Record<string, string> = {};
  for (const author of SEED_AUTHORS) {
    authorIds[author.clerkId] = await ensureAuthor(author);
    console.log(`  ✓ ${author.name}`);
  }

  const [
    yusuf, fatima, omar, aisha, bilal, nadia, ibrahim, mariam
  ] = SEED_AUTHORS.map(a => authorIds[a.clerkId]);

  // ── Community Posts ─────────────────────────────────────────────────────────
  console.log('\n📝 Seeding community posts...');

  // ── Food discoveries ────────────────────────────────────────────────────────

  await insertPost({
    authorId: yusuf,
    body: "Okay I need everyone to know about the weekend nihari at Sabri Nihari. I set an alarm for 10am, got there at 10:30 — SOLD OUT. 😭 The guy told me it goes fast on Saturdays. Next week I'm going at 9. This is serious business.",
    lat: 41.9979, lng: -87.6900,
    neighborhood: 'Devon Ave', cityId: 'chicago-devon',
    linkedListingSlug: 'sabri-nihari',
    savesCount: 34,
    createdHoursAgo: 6,
  });

  await insertPost({
    authorId: fatima,
    body: "Hidden gem alert 🚨 Turkish Village Cafe on Clark St does the most incredible menemen (Turkish scrambled eggs with tomato and peppers). This is not your average halal breakfast spot. €9 for something that tastes like your desi khala made it. Been going every Sunday for a month now.",
    lat: 41.9740, lng: -87.6651,
    neighborhood: 'Andersonville', cityId: 'chicago-devon',
    linkedListingSlug: 'turkish-village-cafe',
    savesCount: 67,
    createdHoursAgo: 18,
  });

  await insertPost({
    authorId: omar,
    body: "Usmania Chinese on Devon is wildly underrated. Yes it sounds strange. Yes it's Pakistani-Chinese fusion. Yes it absolutely works. The manchurian chicken and their garlic noodles at midnight after isha is elite. Open late which is the other reason it's perfect.",
    lat: 41.9979, lng: -87.6930,
    neighborhood: 'Devon Ave', cityId: 'chicago-devon',
    linkedListingSlug: 'usmania-chinese',
    savesCount: 89,
    createdHoursAgo: 32,
  });

  await insertPost({
    authorId: aisha,
    body: "I've been on a mission to find the best halal burger in Chicago and I finally think I found it at Halal Town Steakhouse on Devon. Thick patty, brioche bun, perfectly seasoned. The smash burger situation is real. They're also open until 2am which is criminally convenient after taraweeh.",
    lat: 41.998, lng: -87.685,
    neighborhood: 'Devon Ave', cityId: 'chicago-devon',
    linkedListingSlug: 'halal-town-steakhouse',
    savesCount: 112,
    createdHoursAgo: 48,
  });

  await insertPost({
    authorId: bilal,
    body: "Kabul House in Skokie is underrated for how consistently good it is. The shorwa (broth soup) is perfect on cold nights and the portions are absurd. Brought 4 people, spent $60 total and everyone left stuffed. Family-friendly, parking is easy, and they never rush you out.",
    lat: 42.0387, lng: -87.7334,
    neighborhood: 'Skokie', cityId: 'chicago-skokie',
    linkedListingSlug: 'kabul-house',
    savesCount: 45,
    createdHoursAgo: 72,
  });

  await insertPost({
    authorId: ibrahim,
    body: "Al-Rachid Bakery on Devon is doing baklava the RIGHT way — fresh phyllo, local honey, pistachios you can actually taste. None of that pre-packaged stuff. Pick up a box for eid gifts instead of those chocolate boxes everyone gets. Trust me on this one.",
    lat: 41.9979, lng: -87.6955,
    neighborhood: 'Devon Ave', cityId: 'chicago-devon',
    linkedListingSlug: 'al-rachid-bakery',
    savesCount: 78,
    createdHoursAgo: 90,
  });

  // ── Mosque & prayer tips ────────────────────────────────────────────────────

  await insertPost({
    authorId: mariam,
    body: "Mosque Foundation in Bridgeview has free Quran classes on Saturday mornings — adults and kids. They have separate sisters' classes with a really knowledgeable teacher. If you've been meaning to improve your tajweed this is the sign. Registration opens on their website.",
    lat: 41.7406, lng: -87.8603,
    neighborhood: 'Bridgeview', cityId: 'chicago-bridgeview',
    linkedListingSlug: 'mosque-foundation-bridgeview',
    savesCount: 156,
    createdHoursAgo: 24,
  });

  await insertPost({
    authorId: yusuf,
    body: "Friday parking tip for Devon Ave jumu'ah: skip the main lot (nightmare) and park on Mozart Ave or Richmond Ave and walk 5 minutes. You'll save 20 minutes of circling and arrive way less stressed. Also the 12:45 khutbah at MCC tends to have more parking than the 1:15.",
    lat: 41.9979, lng: -87.6835,
    neighborhood: 'West Ridge', cityId: 'chicago-devon',
    savesCount: 203,
    createdHoursAgo: 120,
  });

  await insertPost({
    authorId: omar,
    body: "Islamic Foundation of Villa Park has the best Eid prayer setup in the suburbs — they do it at the DuPage County Fairgrounds so there's actually room for everyone. Starts at 8am sharp. Get there at 7:30 for good spots. Family-friendly with a fair/carnival after. Worth the drive from the city.",
    lat: 41.8868, lng: -87.9727,
    neighborhood: 'Villa Park', cityId: 'chicago-schaumburg',
    savesCount: 334,
    createdHoursAgo: 144,
  });

  // ── Events & community announcements ───────────────────────────────────────

  await insertPost({
    authorId: fatima,
    body: "Anyone going to the Halal Food Festival in Grant Park this summer? Went last year and it was PACKED — 50+ vendors, live music (nasheeds), and the lamb chops from that one vendor (forgot the name) were unreal. Follow them on Instagram for early ticket announcements. Last year they sold out.",
    lat: 41.8847, lng: -87.6201,
    neighborhood: 'Loop', cityId: 'chicago-devon',
    savesCount: 89,
    createdHoursAgo: 36,
  });

  await insertPost({
    authorId: aisha,
    body: "MCC is doing a sisters' halaqa this Sunday at 3pm — the topic is practical duas for daily life. It's in-person at the Elston Ave location. No registration needed, just show up. They said the space fits 80 sisters comfortably. Bring a friend who's been meaning to come.",
    lat: 41.9556, lng: -87.7273,
    neighborhood: 'Irving Park', cityId: 'chicago-devon',
    savesCount: 67,
    createdHoursAgo: 12,
  });

  await insertPost({
    authorId: bilal,
    body: "Dar El Salam in Schaumburg is hosting a youth basketball tournament next month — ages 12-18, brothers and sisters. Registration is $15/team. Great way to get kids active in a halal environment with other Muslim youth. Details on their website. My son's team is already in 🏀",
    lat: 42.0000, lng: -88.0580,
    neighborhood: 'Schaumburg', cityId: 'chicago-schaumburg',
    savesCount: 45,
    createdHoursAgo: 60,
  });

  // ── Local discoveries & reviews ─────────────────────────────────────────────

  await insertPost({
    authorId: nadia,
    body: "Patel Brothers is doing a Ramadan sale on basmati rice, lentils, and dates — ends this weekend. Stock up now. The Tilda rice is back in stock which is the only rice my mom approves of for biryani so I'm grabbing 10kg. Devon Ave parking is rough on weekends so go early morning.",
    lat: 41.9979, lng: -87.6927,
    neighborhood: 'Devon Ave', cityId: 'chicago-devon',
    linkedListingSlug: 'patel-brothers',
    savesCount: 178,
    createdHoursAgo: 8,
  });

  await insertPost({
    authorId: ibrahim,
    body: "Finally tried Ghareeb Nawaz at 2am after a late night and I understand the hype now. It was packed at 2am. PACKED. Students, uncles, cab drivers, everyone — $6 plates of food that somehow hit different at that hour. The dal fry and naan combo is the move. 24 hours is carrying this city.",
    lat: 41.9979, lng: -87.6820,
    neighborhood: 'Devon Ave', cityId: 'chicago-devon',
    linkedListingSlug: 'ghareeb-nawaz',
    savesCount: 245,
    createdHoursAgo: 55,
  });

  await insertPost({
    authorId: mariam,
    body: "For anyone in the Bridgeview area — Al-Salam on 87th is doing a free iftar on the last Friday of the month, open to the whole community. No signup, just show up before maghrib. They've been doing this quietly for 3 years and most people don't know. Spread the word not the sign-up sheet.",
    lat: 41.7490, lng: -87.8586,
    neighborhood: 'Bridgeview', cityId: 'chicago-bridgeview',
    savesCount: 312,
    createdHoursAgo: 96,
  });

  await insertPost({
    authorId: yusuf,
    body: "Hot take: Anmol Restaurant on Devon has the best mithai (sweets) on the entire block. People sleep on it because of the more famous spots but the gajar halwa and barfi from Anmol is freshly made and doesn't taste like it's been sitting. Perfect for any occasion. Also their nihari is solid.",
    lat: 41.9979, lng: -87.6912,
    neighborhood: 'Devon Ave', cityId: 'chicago-devon',
    linkedListingSlug: 'anmol-restaurant',
    savesCount: 67,
    createdHoursAgo: 168,
  });

  await insertPost({
    authorId: omar,
    body: "Question for Skokie folks — anyone know if Jerusalem Restaurant on Dempster does catering for small events? Looking for something for a family walima (around 30 people). Their food is consistently good and I'd rather support a local halal spot than a generic catering company.",
    lat: 42.0387, lng: -87.7440,
    neighborhood: 'Skokie', cityId: 'chicago-skokie',
    linkedListingSlug: 'jerusalem-restaurant-skokie',
    savesCount: 12,
    createdHoursAgo: 14,
  });

  await insertPost({
    authorId: fatima,
    body: "Reminder that Devon Halal Meat does custom cuts and they'll process a whole lamb if you call ahead. Way cheaper than buying pre-cut for a big family event. The uncle there remembers what cut you like if you've been a few times. This is what halal shopping is supposed to feel like.",
    lat: 41.9979, lng: -87.6968,
    neighborhood: 'Devon Ave', cityId: 'chicago-devon',
    linkedListingSlug: 'devon-halal-meat',
    savesCount: 134,
    createdHoursAgo: 200,
  });

  await insertPost({
    authorId: bilal,
    body: "Islamic Center of Naperville just opened a new community hall — they're accepting bookings for weddings, aqiqa, and community events. The space fits 200 people, full kitchen, AV setup included. Way more affordable than typical banquet halls and obviously halal-friendly environment.",
    lat: 41.7234, lng: -88.1510,
    neighborhood: 'Naperville', cityId: 'chicago-naperville',
    savesCount: 89,
    createdHoursAgo: 48,
  });

  await insertPost({
    authorId: nadia,
    body: "Tried the new Kababeque in Bolingbrook last week — seekh kabab and karahi were both really solid. The space is nice, parking is easy (it's the suburbs so obviously), and the price is fair. Good alternative for southwest suburb folks who don't want to drive to Devon every time.",
    lat: 41.6810, lng: -88.0840,
    neighborhood: 'Bolingbrook', cityId: 'chicago-bolingbrook',
    linkedListingSlug: 'kababeque-bolingbrook',
    savesCount: 34,
    createdHoursAgo: 28,
  });

  await insertPost({
    authorId: ibrahim,
    body: "Al-Bawadi Grill near Milwaukee Ave is one of those spots I keep going back to and every time it's exactly what I needed. The hummus is made fresh, the pita is always warm, and the service is actually warm too (rare). It's not cheap but for the quality it's honest pricing. Lebanese done right.",
    lat: 41.9894, lng: -87.8088,
    neighborhood: 'Norwood Park', cityId: 'chicago-devon',
    linkedListingSlug: 'al-bawadi-grill',
    savesCount: 98,
    createdHoursAgo: 110,
  });

  await db.destroy();
  console.log('\n✅ Community posts seed complete!');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
