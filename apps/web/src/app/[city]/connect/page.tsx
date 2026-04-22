import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { query } from '@/lib/db';
import { withCache } from '@/lib/cache/redis';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AppDownloadBanner } from '@/components/layout/AppDownloadBanner';
import { ListingCard } from '@/components/feed/ListingCard';
import { SchemaScript } from '@/components/seo/SchemaScript';
import { BreadcrumbNav } from '@/components/seo/BreadcrumbNav';
import { buildBreadcrumbSchema } from '@/lib/schema/breadcrumb.schema';
import { categoryTitle } from '@/lib/seo/titles';

export const revalidate = 21600;
export const dynamicParams = true;

interface CityRow { id: string; slug: string; name: string; }
interface ListingRow {
  id: string; slug: string; name: string; main_category: string;
  subcategory_name: string | null; neighborhood: string | null; address: string | null;
  primary_photo_url: string | null; is_featured: boolean; save_count: number;
  city_slug: string; description: string | null; price_range: string | null;
}

export async function generateStaticParams() {
  const cities = await query<{ slug: string }>(`SELECT slug FROM cities WHERE launch_status = 'active'`);
  return cities.map((c) => ({ city: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  const cityRow = await withCache(`seo:city:${city}:name`, 3600, () =>
    query<CityRow>(`SELECT id, slug, name FROM cities WHERE slug = $1 AND launch_status = 'active' LIMIT 1`, [city])
      .then((rows) => rows[0] ?? null)
  );
  if (!cityRow) return {};
  const title = categoryTitle('connect', cityRow.name);
  const description = `Muslim community services, Islamic schools, halal photographers, and business professionals in ${cityRow.name}. Download Muzgram.`;
  return {
    title,
    description,
    alternates: { canonical: `https://muzgram.com/${city}/connect` },
    openGraph: { title, description, url: `https://muzgram.com/${city}/connect`, siteName: 'Muzgram' },
  };
}

export default async function ConnectCategoryPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;

  const [cityRows, listings] = await Promise.all([
    query<CityRow>(`SELECT id, slug, name FROM cities WHERE slug = $1 AND launch_status = 'active' LIMIT 1`, [city]),
    withCache(`seo:cat:connect:${city}`, 3600, () =>
      query<ListingRow>(`
        SELECT l.id, l.slug, c.slug AS city_slug, l.name, l.main_category,
               l.primary_photo_url, l.neighborhood, l.address, l.is_featured,
               l.save_count, sc.name AS subcategory_name, l.description, l.price_range
        FROM listings l
        JOIN cities c ON l.city_id = c.id
        LEFT JOIN listing_subcategories sc ON l.subcategory_id = sc.id
        WHERE c.slug = $1 AND l.main_category = 'connect' AND l.is_active = true
        ORDER BY l.is_featured DESC, l.save_count DESC
        LIMIT 60
      `, [city])
    ),
  ]);

  const cityData = cityRows[0];
  if (!cityData) notFound();

  const schema = buildBreadcrumbSchema([
    { name: 'Home', url: 'https://muzgram.com' },
    { name: cityData.name, url: `https://muzgram.com/${city}` },
    { name: 'Community & Services', url: `https://muzgram.com/${city}/connect` },
  ]);

  return (
    <>
      <SchemaScript schema={[schema]} />
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <BreadcrumbNav items={[
          { name: 'Home', url: 'https://muzgram.com' },
          { name: cityData.name, url: `https://muzgram.com/${city}` },
          { name: 'Community & Services', url: `https://muzgram.com/${city}/connect` },
        ]} />

        <div className="mt-6 mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">
            Muslim Services in {cityData.name}
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl">
            Find Muslim-owned businesses, community services, Islamic schools, halal photographers, and professional services in {cityData.name}.
          </p>
          <div className="flex gap-4 mt-3 text-sm text-text-muted">
            <span>{listings.length} services</span>
            <Link href={`/${city}`} className="text-brand-gold hover:underline">
              ← Back to {cityData.name}
            </Link>
          </div>
        </div>

        {listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing, i) => (
              <ListingCard key={listing.id} {...listing} citySlug={listing.city_slug} priority={i < 6} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-text-muted text-lg">No services listed yet in {cityData.name}.</p>
            <p className="text-text-muted text-sm mt-2">
              Run a Muslim-owned service? Get listed on Muzgram.
            </p>
          </div>
        )}

        <section className="mt-16 text-center">
          <p className="text-text-secondary mb-4">
            Connect with the Muslim community on the Muzgram app.
          </p>
          <div className="flex gap-3 justify-center">
            <a
              href="https://apps.apple.com/app/muzgram/id0000000000"
              className="bg-brand-gold text-text-inverse font-semibold px-6 py-3 rounded-pill hover:bg-brand-gold-light transition-colors"
              rel="noopener"
            >
              Download for iOS
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.muzgram.android"
              className="border border-brand-gold text-brand-gold font-semibold px-6 py-3 rounded-pill hover:bg-brand-gold/10 transition-colors"
              rel="noopener"
            >
              Download for Android
            </a>
          </div>
        </section>
      </main>
      <Footer />
      <AppDownloadBanner />
    </>
  );
}
