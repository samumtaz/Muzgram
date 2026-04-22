import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { query } from '@/lib/db';
import { withCache } from '@/lib/cache/redis';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AppDownloadBanner } from '@/components/layout/AppDownloadBanner';
import { ListingCard } from '@/components/feed/ListingCard';
import { EventCard } from '@/components/feed/EventCard';
import { SchemaScript } from '@/components/seo/SchemaScript';
import { BreadcrumbNav } from '@/components/seo/BreadcrumbNav';
import { buildLocalBusinessSchema } from '@/lib/schema/business.schema';
import { buildBreadcrumbSchema } from '@/lib/schema/breadcrumb.schema';
import { cityTitle, cityDescription } from '@/lib/seo/titles';

export const revalidate = 21600; // 6h
export const dynamicParams = true;

interface CityRow {
  id: string;
  slug: string;
  name: string;
  seo_description: string | null;
  listing_count: number;
  event_count: number;
  meta_title: string | null;
  meta_description: string | null;
}

interface ClusterCity {
  slug: string;
  name: string;
}

const CATEGORY_LINKS = [
  { slug: 'eat', label: 'Eat', icon: '🍽', desc: 'Halal restaurants & cafés' },
  { slug: 'go-out', label: 'Go Out', icon: '🎉', desc: 'Events & nightlife' },
  { slug: 'connect', label: 'Connect', icon: '🤝', desc: 'Services & community' },
  { slug: 'mosques', label: 'Mosques', icon: '🕌', desc: 'Mosques & Islamic centres' },
];

export async function generateStaticParams() {
  const cities = await query<{ slug: string }>(`
    SELECT slug FROM cities WHERE launch_status = 'active'
  `);
  return cities.map((c) => ({ city: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  const cityData = await withCache(
    `seo:city:${city}`,
    3600,
    () => query<CityRow>(
      `SELECT id, slug, name,
              COALESCE(listing_count, 0) AS listing_count,
              COALESCE(event_count, 0) AS event_count,
              NULL::text AS meta_title,
              NULL::text AS meta_description
       FROM cities WHERE slug = $1 AND launch_status = 'active' LIMIT 1`,
      [city],
    ).then((rows) => rows[0] ?? null),
  );

  if (!cityData) return {};

  const title = cityData.meta_title ?? cityTitle(cityData.name);
  const description =
    cityData.meta_description ??
    cityDescription(cityData.name, cityData.listing_count, cityData.event_count);

  return {
    title,
    description,
    alternates: { canonical: `https://muzgram.com/${city}` },
    openGraph: {
      title,
      description,
      url: `https://muzgram.com/${city}`,
      siteName: 'Muzgram',
    },
  };
}

export default async function CityHubPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;

  const [cityRows, topListings, upcomingEvents, clusterCities] = await Promise.all([
    query<CityRow>(
      `SELECT id, slug, name, listing_count, event_count,
              NULL::text AS seo_description
       FROM cities WHERE slug = $1 AND launch_status = 'active' LIMIT 1`,
      [city],
    ),
    query<{
      id: string; slug: string; name: string; main_category: string;
      subcategory_name: string | null; neighborhood: string | null; address: string | null;
      primary_photo_url: string | null; is_featured: boolean; save_count: number;
      city_slug: string; latitude: number | null; longitude: number | null;
      phone: string | null; website: string | null; description: string | null;
      price_range: string | null;
    }>(`
      SELECT l.id, l.slug, c.slug AS city_slug, l.name, l.main_category,
             l.primary_photo_url, l.neighborhood, l.address, l.is_featured,
             l.save_count, sc.name AS subcategory_name,
             l.latitude, l.longitude, l.phone, l.website, l.description, l.price_range
      FROM listings l
      JOIN cities c ON l.city_id = c.id
      LEFT JOIN listing_subcategories sc ON l.subcategory_id = sc.id
      WHERE c.slug = $1 AND l.is_active = true
      ORDER BY l.is_featured DESC, l.save_count DESC
      LIMIT 12
    `, [city]),
    query<{
      id: string; slug: string; title: string; start_at: string;
      cover_photo_url: string | null; price_cents: number | null;
      is_featured: boolean; venue_name: string | null; neighborhood: string | null;
    }>(`
      SELECT e.id, e.slug, e.title, e.start_at, e.cover_photo_url, e.price_cents,
             e.is_featured, l.name AS venue_name, l.neighborhood
      FROM events e
      JOIN cities c ON e.city_id = c.id
      LEFT JOIN listings l ON e.listing_id = l.id
      WHERE c.slug = $1 AND e.is_active = true AND e.start_at > NOW()
      ORDER BY e.is_featured DESC, e.start_at ASC
      LIMIT 4
    `, [city]),
    query<ClusterCity>(`
      SELECT c2.slug, c2.name
      FROM cities c1
      JOIN cities c2 ON c2.cluster_city_id = c1.cluster_city_id
      WHERE c1.slug = $1 AND c2.slug != $1 AND c2.launch_status = 'active'
      LIMIT 8
    `, [city]),
  ]);

  const cityData = cityRows[0];
  if (!cityData) notFound();

  const schemaItems = [
    buildBreadcrumbSchema([
      { name: 'Home', url: 'https://muzgram.com' },
      { name: cityData.name, url: `https://muzgram.com/${city}` },
    ]),
    ...topListings.slice(0, 5).map((l) =>
      buildLocalBusinessSchema({ ...l, city_name: cityData.name }),
    ),
  ];

  return (
    <>
      <SchemaScript schema={schemaItems} />
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <BreadcrumbNav
          items={[
            { name: 'Home', url: 'https://muzgram.com' },
            { name: cityData.name, url: `https://muzgram.com/${city}` },
          ]}
        />

        <div className="mt-6 mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">
            Halal Spots &amp; Events in {cityData.name}
          </h1>
          {cityData.seo_description && (
            <p className="text-text-secondary text-lg max-w-2xl">{cityData.seo_description}</p>
          )}
          <div className="flex gap-4 mt-3 text-sm text-text-muted">
            {cityData.listing_count > 0 && (
              <span>{cityData.listing_count} listings</span>
            )}
            {cityData.event_count > 0 && (
              <span>{cityData.event_count} upcoming events</span>
            )}
          </div>
        </div>

        {/* Category navigation */}
        <section className="mb-12">
          <h2 className="text-text-primary font-semibold text-lg mb-4">Browse by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CATEGORY_LINKS.map((cat) => (
              <Link
                key={cat.slug}
                href={`/${city}/${cat.slug}`}
                className="flex flex-col items-center gap-2 rounded-card bg-surface border border-surface-border p-4 hover:border-brand-gold/50 transition-colors text-center"
              >
                <span className="text-2xl">{cat.icon}</span>
                <div>
                  <div className="text-text-primary font-medium text-sm">{cat.label}</div>
                  <div className="text-text-muted text-xs hidden sm:block">{cat.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Top listings */}
        {topListings.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-text-primary font-bold text-xl">
                Top Spots in {cityData.name}
              </h2>
              <Link href={`/${city}/eat`} className="text-brand-gold text-sm hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topListings.map((listing, i) => (
                <ListingCard key={listing.id} {...listing} citySlug={listing.city_slug} priority={i < 3} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming events */}
        {upcomingEvents.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-text-primary font-bold text-xl">
                Upcoming Events in {cityData.name}
              </h2>
              <Link
                href={`/${city}/go-out`}
                className="text-brand-gold text-sm hover:underline"
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} {...event} citySlug={city} />
              ))}
            </div>
          </section>
        )}

        {/* Cluster cities / neighborhood nav */}
        {clusterCities.length > 0 && (
          <section className="mb-12">
            <h2 className="text-text-secondary text-sm font-medium mb-3">
              Also in the Chicago area
            </h2>
            <div className="flex flex-wrap gap-2">
              {clusterCities.map((c) => (
                <Link
                  key={c.slug}
                  href={`/${c.slug}`}
                  className="text-sm text-text-secondary border border-surface-border rounded-pill px-3 py-1.5 hover:border-brand-gold/50 hover:text-text-primary transition-colors"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
      <AppDownloadBanner />
    </>
  );
}
