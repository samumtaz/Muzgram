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
interface SubcategoryRow { id: string; slug: string; name: string; }
interface ListingRow {
  id: string; slug: string; name: string; main_category: string;
  subcategory_name: string | null; neighborhood: string | null; address: string | null;
  primary_photo_url: string | null; is_featured: boolean; save_count: number;
  city_slug: string; description: string | null; price_range: string | null;
}

export async function generateStaticParams() {
  const rows = await query<{ city: string; sub: string }>(`
    SELECT DISTINCT c.slug AS city, sc.slug AS sub
    FROM listings l
    JOIN cities c ON l.city_id = c.id
    JOIN listing_subcategories sc ON l.subcategory_id = sc.id
    WHERE c.launch_status = 'active'
      AND l.is_active = true
      AND sc.main_category = 'eat'
  `).catch(() => []);
  return rows;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; sub: string }>;
}): Promise<Metadata> {
  const { city, sub } = await params;
  const [cityRow, subRow] = await Promise.all([
    withCache(`seo:city:${city}:name`, 3600, () =>
      query<CityRow>(`SELECT id, slug, name FROM cities WHERE slug = $1 AND launch_status = 'active' LIMIT 1`, [city])
        .then((r) => r[0] ?? null)
    ),
    query<SubcategoryRow>(`SELECT id, slug, name FROM listing_subcategories WHERE slug = $1 AND main_category = 'eat' LIMIT 1`, [sub])
      .then((r) => r[0] ?? null),
  ]);
  if (!cityRow || !subRow) return {};
  const title = `${subRow.name} in ${cityRow.name} | Muzgram`;
  const description = `Find halal ${subRow.name.toLowerCase()} in ${cityRow.name}. Muslim-verified listings on Muzgram.`;
  return {
    title, description,
    alternates: { canonical: `https://muzgram.com/${city}/eat/${sub}` },
    openGraph: { title, description, url: `https://muzgram.com/${city}/eat/${sub}`, siteName: 'Muzgram' },
  };
}

export default async function EatSubcategoryPage({
  params,
}: {
  params: Promise<{ city: string; sub: string }>;
}) {
  const { city, sub } = await params;

  const [cityRows, subRows, listings] = await Promise.all([
    query<CityRow>(`SELECT id, slug, name FROM cities WHERE slug = $1 AND launch_status = 'active' LIMIT 1`, [city]),
    query<SubcategoryRow>(`SELECT id, slug, name FROM listing_subcategories WHERE slug = $1 AND main_category = 'eat' LIMIT 1`, [sub]),
    withCache(`seo:eat:${sub}:${city}`, 86400, () =>
      query<ListingRow>(`
        SELECT l.id, l.slug, c.slug AS city_slug, l.name, l.main_category,
               l.primary_photo_url, l.neighborhood, l.address, l.is_featured,
               l.save_count, sc.name AS subcategory_name, l.description, l.price_range
        FROM listings l
        JOIN cities c ON l.city_id = c.id
        LEFT JOIN listing_subcategories sc ON l.subcategory_id = sc.id
        WHERE c.slug = $1
          AND l.main_category = 'eat'
          AND l.is_active = true
          AND sc.slug = $2
        ORDER BY l.is_featured DESC, l.save_count DESC
        LIMIT 60
      `, [city, sub])
    ),
  ]);

  const cityData = cityRows[0];
  const subData = subRows[0];
  if (!cityData || !subData) notFound();

  const schema = buildBreadcrumbSchema([
    { name: 'Home', url: 'https://muzgram.com' },
    { name: cityData.name, url: `https://muzgram.com/${city}` },
    { name: 'Eat', url: `https://muzgram.com/${city}/eat` },
    { name: subData.name, url: `https://muzgram.com/${city}/eat/${sub}` },
  ]);

  return (
    <>
      <SchemaScript schema={[schema]} />
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <BreadcrumbNav items={[
          { name: 'Home', url: 'https://muzgram.com' },
          { name: cityData.name, url: `https://muzgram.com/${city}` },
          { name: 'Eat', url: `https://muzgram.com/${city}/eat` },
          { name: subData.name, url: `https://muzgram.com/${city}/eat/${sub}` },
        ]} />

        <div className="mt-6 mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">
            {subData.name} in {cityData.name}
          </h1>
          <p className="text-text-secondary text-lg">
            Halal {subData.name.toLowerCase()} in {cityData.name} — Muslim-verified listings.
          </p>
        </div>

        {listings.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-text-secondary">No {subData.name.toLowerCase()} listed yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {listings.map((l) => (
              <ListingCard key={l.id} {...l} citySlug={l.city_slug} />
            ))}
          </div>
        )}

        <div className="mt-8 text-sm text-text-muted">
          <Link href={`/${city}/eat`} className="text-brand-gold hover:underline">
            ← All food in {cityData.name}
          </Link>
        </div>
        <section className="mt-12"><InstallCTA /></section>
      </main>
      <Footer />
      <AppDownloadBanner />
    </>
  );
}
