import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { query } from '@/lib/db';
import { withCache } from '@/lib/cache/redis';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AppDownloadBanner } from '@/components/layout/AppDownloadBanner';
import { ListingCard } from '@/components/feed/ListingCard';
import { InstallCTA } from '@/components/conversion/InstallCTA';
import { SchemaScript } from '@/components/seo/SchemaScript';
import { BreadcrumbNav } from '@/components/seo/BreadcrumbNav';
import { buildBreadcrumbSchema } from '@/lib/schema/breadcrumb.schema';

export const revalidate = 86400;
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
  const title = `Mosques & Islamic Centers in ${cityRow.name} | Muzgram`;
  const description = `Find mosques, Islamic centers, and Friday prayer (Jummah) locations in ${cityRow.name}. Muslim-verified listings on Muzgram.`;
  return {
    title, description,
    alternates: { canonical: `https://muzgram.com/${city}/mosques` },
    openGraph: { title, description, url: `https://muzgram.com/${city}/mosques`, siteName: 'Muzgram' },
  };
}

export default async function MosquesCategoryPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;

  const [cityRows, mosques] = await Promise.all([
    query<CityRow>(`SELECT id, slug, name FROM cities WHERE slug = $1 AND launch_status = 'active' LIMIT 1`, [city]),
    withCache(`seo:cat:mosques:${city}`, 86400, () =>
      query<ListingRow>(`
        SELECT l.id, l.slug, c.slug AS city_slug, l.name, l.main_category,
               l.primary_photo_url, l.neighborhood, l.address, l.is_featured,
               l.save_count, sc.name AS subcategory_name, l.description, l.price_range
        FROM listings l
        JOIN cities c ON l.city_id = c.id
        LEFT JOIN listing_subcategories sc ON l.subcategory_id = sc.id
        WHERE c.slug = $1 AND l.main_category = 'connect'
          AND l.is_active = true
          AND (sc.slug = 'mosques' OR l.name ILIKE '%mosque%' OR l.name ILIKE '%islamic%' OR l.name ILIKE '%masjid%')
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
    { name: 'Mosques', url: `https://muzgram.com/${city}/mosques` },
  ]);

  return (
    <>
      <SchemaScript schema={[schema]} />
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <BreadcrumbNav items={[
          { name: 'Home', url: 'https://muzgram.com' },
          { name: cityData.name, url: `https://muzgram.com/${city}` },
          { name: 'Mosques', url: `https://muzgram.com/${city}/mosques` },
        ]} />

        <div className="mt-6 mb-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🕌</span>
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
              Mosques in {cityData.name}
            </h1>
          </div>
          <p className="text-text-secondary text-lg">
            Friday prayer, Islamic centers, and community mosques in {cityData.name}.
          </p>
        </div>

        {mosques.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🕌</div>
            <p className="text-text-secondary">No mosques listed yet. Be the first to add one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {mosques.map((m) => (
              <ListingCard key={m.id} {...m} citySlug={m.city_slug} />
            ))}
          </div>
        )}

        <div className="mt-8 text-center text-sm text-text-muted">
          <Link href={`/${city}`} className="text-brand-gold hover:underline">
            ← Back to {cityData.name}
          </Link>
        </div>

        <section className="mt-12">
          <InstallCTA />
        </section>
      </main>
      <Footer />
      <AppDownloadBanner />
    </>
  );
}
