import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect, RedirectType } from 'next/navigation';
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
import { buildLocalBusinessSchema } from '@/lib/schema/business.schema';
import { buildBreadcrumbSchema } from '@/lib/schema/breadcrumb.schema';
import { businessTitle, businessDescription } from '@/lib/seo/titles';

export const revalidate = 86400; // 24h
export const dynamicParams = true;

interface ListingRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  main_category: string;
  primary_photo_url: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  hours_json: unknown;
  is_featured: boolean;
  save_count: number;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  price_range: string | null;
  city_name: string;
  city_slug: string;
  subcategory_name: string | null;
}

export async function generateStaticParams() {
  const rows = await query<{ city: string; slug: string }>(`
    SELECT c.slug AS city, l.slug
    FROM listings l
    JOIN cities c ON l.city_id = c.id
    WHERE l.is_active = true
      AND l.slug IS NOT NULL
      AND c.launch_status = 'active'
    ORDER BY l.save_count DESC
    LIMIT 10000
  `);
  return rows;
}

async function getListing(city: string, slug: string): Promise<ListingRow | null> {
  return withCache(`seo:listing:${city}:${slug}`, 3600, async () => {
    const rows = await query<ListingRow>(
      `SELECT l.id, l.slug, l.name, l.description, l.main_category,
              l.primary_photo_url, l.address, l.phone, l.website, l.hours_json,
              l.is_featured, l.save_count, l.neighborhood, l.latitude, l.longitude,
              l.price_range, c.name AS city_name, c.slug AS city_slug,
              sc.name AS subcategory_name
       FROM listings l
       JOIN cities c ON l.city_id = c.id
       LEFT JOIN listing_subcategories sc ON l.subcategory_id = sc.id
       WHERE c.slug = $1 AND l.slug = $2 AND l.is_active = true
       LIMIT 1`,
      [city, slug],
    );
    return rows[0] ?? null;
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; slug: string }>;
}): Promise<Metadata> {
  const { city, slug } = await params;
  const listing = await getListing(city, slug);
  if (!listing) return {};

  const title = businessTitle(
    listing.name,
    listing.subcategory_name,
    listing.neighborhood,
    listing.city_name,
  );
  const description = businessDescription(listing.name, listing.description, listing.city_name);
  const canonical = `https://muzgram.com/${city}/places/${slug}`;
  const image = listing.primary_photo_url ?? 'https://muzgram.com/og-default.jpg';

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Muzgram',
      type: 'website',
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function BusinessDetailPage({
  params,
}: {
  params: Promise<{ city: string; slug: string }>;
}) {
  const { city, slug } = await params;
  let listing = await getListing(city, slug);

  if (!listing) {
    // Check if listing moved to a different city
    const moved = await query<{ city_slug: string; slug: string }>(
      `SELECT c.slug AS city_slug, l.slug
       FROM listings l JOIN cities c ON l.city_id = c.id
       WHERE l.slug = $1 AND l.is_active = true LIMIT 1`,
      [slug],
    );
    if (moved[0]) {
      redirect(`/${moved[0].city_slug}/places/${moved[0].slug}`, RedirectType.permanent);
    }
    notFound();
  }

  const nearby = await query<{
    id: string; slug: string; name: string; main_category: string;
    subcategory_name: string | null; neighborhood: string | null; address: string | null;
    primary_photo_url: string | null; is_featured: boolean; save_count: number; city_slug: string;
  }>(`
    SELECT l2.id, l2.slug, c.slug AS city_slug, l2.name, l2.main_category,
           l2.primary_photo_url, l2.neighborhood, l2.address, l2.is_featured,
           l2.save_count, sc.name AS subcategory_name
    FROM listings l2
    JOIN cities c ON l2.city_id = c.id
    LEFT JOIN listing_subcategories sc ON l2.subcategory_id = sc.id
    WHERE l2.city_id = (SELECT city_id FROM listings WHERE slug = $1 LIMIT 1)
      AND l2.main_category = $2
      AND l2.slug != $1
      AND l2.is_active = true
    ORDER BY l2.save_count DESC
    LIMIT 4
  `, [slug, listing.main_category]);

  const categoryLabel = listing.subcategory_name ?? listing.main_category;
  const schemas = [
    buildLocalBusinessSchema({ ...listing, city_name: listing.city_name }),
    buildBreadcrumbSchema([
      { name: 'Home', url: 'https://muzgram.com' },
      { name: listing.city_name, url: `https://muzgram.com/${city}` },
      { name: categoryLabel, url: `https://muzgram.com/${city}/${listing.main_category}` },
      { name: listing.name, url: `https://muzgram.com/${city}/places/${slug}` },
    ]),
  ];

  return (
    <>
      <SchemaScript schema={schemas} />
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <BreadcrumbNav
          items={[
            { name: 'Home', url: 'https://muzgram.com' },
            { name: listing.city_name, url: `https://muzgram.com/${city}` },
            { name: categoryLabel, url: `https://muzgram.com/${city}/${listing.main_category}` },
            { name: listing.name, url: `https://muzgram.com/${city}/places/${slug}` },
          ]}
        />

        {/* Hero image */}
        {listing.primary_photo_url && (
          <div className="relative w-full aspect-[16/7] rounded-card overflow-hidden mt-4 bg-surface-elevated">
            <Image
              src={listing.primary_photo_url}
              alt={listing.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 896px) 100vw, 896px"
            />
          </div>
        )}

        {/* Title + badges */}
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs text-text-muted bg-surface-elevated border border-surface-border px-2 py-0.5 rounded-badge capitalize">
              {categoryLabel}
            </span>
            <span className="text-xs text-status-open bg-surface-elevated border border-status-open/30 px-2 py-0.5 rounded-badge">
              Halal ✓
            </span>
            {listing.is_featured && (
              <span className="text-xs text-brand-gold border border-brand-gold/40 px-2 py-0.5 rounded-badge">
                Featured
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold text-text-primary">{listing.name}</h1>

          {listing.neighborhood && (
            <p className="text-text-secondary mt-1">{listing.neighborhood}, {listing.city_name}</p>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Description */}
          {listing.description && (
            <div className="sm:col-span-2">
              <p className="text-text-secondary leading-relaxed">{listing.description}</p>
            </div>
          )}

          {/* Details */}
          <div className="flex flex-col gap-3">
            {listing.address && (
              <div>
                <div className="text-text-muted text-xs uppercase tracking-wide mb-1">Address</div>
                <div className="text-text-primary text-sm">{listing.address}</div>
              </div>
            )}
            {listing.phone && (
              <div>
                <div className="text-text-muted text-xs uppercase tracking-wide mb-1">Phone</div>
                <a href={`tel:${listing.phone}`} className="text-brand-gold text-sm hover:underline">
                  {listing.phone}
                </a>
              </div>
            )}
            {listing.website && (
              <div>
                <div className="text-text-muted text-xs uppercase tracking-wide mb-1">Website</div>
                <a
                  href={listing.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-gold text-sm hover:underline truncate block"
                >
                  {listing.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            {listing.price_range && (
              <div>
                <div className="text-text-muted text-xs uppercase tracking-wide mb-1">Price</div>
                <div className="text-text-primary text-sm">{listing.price_range}</div>
              </div>
            )}
          </div>

          {/* Open in App CTA */}
          <div>
            <a
              href={`muzgram://places/${slug}?utm_source=web&utm_medium=detail_cta&utm_campaign=seo_page`}
              className="flex items-center justify-center gap-2 bg-brand-gold text-text-inverse font-semibold w-full py-3 rounded-pill hover:bg-brand-gold-light transition-colors mb-3"
            >
              Open in Muzgram App
            </a>
            <div className="flex gap-2">
              <a
                href="https://apps.apple.com/app/muzgram/id0000000000?utm_source=web&utm_medium=detail_cta&utm_campaign=seo_page"
                className="flex-1 text-center text-sm border border-surface-border text-text-secondary py-2 rounded-pill hover:border-brand-gold/50 transition-colors"
                rel="noopener"
              >
                App Store
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.muzgram.android&utm_source=web&utm_medium=detail_cta&utm_campaign=seo_page"
                className="flex-1 text-center text-sm border border-surface-border text-text-secondary py-2 rounded-pill hover:border-brand-gold/50 transition-colors"
                rel="noopener"
              >
                Google Play
              </a>
            </div>
          </div>
        </div>

        {/* Nearby listings */}
        {nearby.length > 0 && (
          <section className="mt-12">
            <h2 className="text-text-primary font-bold text-xl mb-4">
              More {categoryLabel} in {listing.city_name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {nearby.map((l) => (
                <ListingCard key={l.id} {...l} />
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link
                href={`/${city}/${listing.main_category}`}
                className="text-brand-gold hover:underline text-sm"
              >
                View all {categoryLabel} in {listing.city_name} →
              </Link>
            </div>
          </section>
        )}

        <section className="mt-12">
          <InstallCTA />
        </section>
      </main>
      <Footer />
      <AppDownloadBanner />
    </>
  );
}
