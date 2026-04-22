import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { query } from '@/lib/db';
import { withCache } from '@/lib/cache/redis';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AppDownloadBanner } from '@/components/layout/AppDownloadBanner';
import { EventCard } from '@/components/feed/EventCard';
import { InstallCTA } from '@/components/conversion/InstallCTA';
import { SchemaScript } from '@/components/seo/SchemaScript';
import { BreadcrumbNav } from '@/components/seo/BreadcrumbNav';
import { buildBreadcrumbSchema } from '@/lib/schema/breadcrumb.schema';

export const revalidate = 3600;
export const dynamicParams = true;

interface EventRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  cover_photo_url: string | null;
  price_cents: number | null;
  is_featured: boolean;
  is_free: boolean;
  ticket_url: string | null;
  is_online: boolean;
  online_url: string | null;
  address: string | null;
  city_name: string;
  city_slug: string;
  venue_name: string | null;
  neighborhood: string | null;
  tags: string[] | null;
}

export async function generateStaticParams() {
  const rows = await query<{ city: string; slug: string }>(`
    SELECT c.slug AS city, e.slug
    FROM events e
    JOIN cities c ON e.city_id = c.id
    WHERE e.is_active = true AND e.slug IS NOT NULL AND c.launch_status = 'active'
    ORDER BY e.start_at DESC
    LIMIT 5000
  `);
  return rows;
}

async function getEvent(city: string, slug: string): Promise<EventRow | null> {
  return withCache(`seo:event:${city}:${slug}`, 1800, async () => {
    const rows = await query<EventRow>(
      `SELECT e.id, e.slug, e.title, e.description, e.start_at, e.end_at,
              e.cover_photo_url, e.price_cents, e.is_featured, e.is_free,
              e.ticket_url, e.is_online, e.online_url, e.address, e.tags,
              c.name AS city_name, c.slug AS city_slug,
              l.name AS venue_name, l.neighborhood
       FROM events e
       JOIN cities c ON e.city_id = c.id
       LEFT JOIN listings l ON e.listing_id = l.id
       WHERE c.slug = $1 AND e.slug = $2 AND e.is_active = true
       LIMIT 1`,
      [city, slug],
    );
    return rows[0] ?? null;
  });
}

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; slug: string }>;
}): Promise<Metadata> {
  const { city, slug } = await params;
  const event = await getEvent(city, slug);
  if (!event) return {};

  const title = `${event.title} — ${event.city_name} | Muzgram`;
  const description =
    event.description?.slice(0, 155) ??
    `${event.title} in ${event.city_name}. ${event.is_free ? 'Free event.' : ''} Find it on Muzgram.`;
  const canonical = `https://muzgram.com/${city}/events/${slug}`;
  const image = event.cover_photo_url ?? 'https://muzgram.com/og-default.jpg';

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
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ city: string; slug: string }>;
}) {
  const { city, slug } = await params;
  const event = await getEvent(city, slug);

  if (!event) {
    const moved = await query<{ city_slug: string; slug: string }>(
      `SELECT c.slug AS city_slug, e.slug
       FROM events e JOIN cities c ON e.city_id = c.id
       WHERE e.slug = $1 AND e.is_active = true LIMIT 1`,
      [slug],
    );
    if (moved[0]) permanentRedirect(`/${moved[0].city_slug}/events/${moved[0].slug}`);
    notFound();
  }

  const more = await query<{
    id: string; slug: string; title: string; start_at: string;
    cover_photo_url: string | null; price_cents: number | null;
    is_featured: boolean; venue_name: string | null; neighborhood: string | null;
  }>(`
    SELECT e2.id, e2.slug, e2.title, e2.start_at, e2.cover_photo_url, e2.price_cents,
           e2.is_featured, l.name AS venue_name, l.neighborhood
    FROM events e2
    JOIN cities c ON e2.city_id = c.id
    LEFT JOIN listings l ON e2.listing_id = l.id
    WHERE e2.city_id = (SELECT city_id FROM events WHERE slug = $1 LIMIT 1)
      AND e2.slug != $1
      AND e2.is_active = true
      AND e2.start_at > NOW()
    ORDER BY e2.is_featured DESC, e2.start_at ASC
    LIMIT 4
  `, [slug]);

  const isPast = event.end_at
    ? new Date(event.end_at) < new Date()
    : new Date(event.start_at) < new Date();

  const priceLabel =
    event.is_free || event.price_cents === 0 || event.price_cents === null
      ? 'Free'
      : `$${(event.price_cents / 100).toFixed(0)}`;

  const schema = buildBreadcrumbSchema([
    { name: 'Home', url: 'https://muzgram.com' },
    { name: event.city_name, url: `https://muzgram.com/${city}` },
    { name: 'Events', url: `https://muzgram.com/${city}/go-out` },
    { name: event.title, url: `https://muzgram.com/${city}/events/${slug}` },
  ]);

  return (
    <>
      <SchemaScript schema={[schema]} />
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <BreadcrumbNav items={[
          { name: 'Home', url: 'https://muzgram.com' },
          { name: event.city_name, url: `https://muzgram.com/${city}` },
          { name: 'Events', url: `https://muzgram.com/${city}/go-out` },
          { name: event.title, url: `https://muzgram.com/${city}/events/${slug}` },
        ]} />

        {/* Hero */}
        {event.cover_photo_url && (
          <div className="relative w-full aspect-[16/7] rounded-card overflow-hidden mt-4 bg-surface-elevated">
            <Image
              src={event.cover_photo_url}
              alt={event.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 896px) 100vw, 896px"
            />
          </div>
        )}

        {/* Title */}
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {isPast && (
              <span className="text-xs text-text-muted bg-surface-elevated border border-surface-border px-2 py-0.5 rounded-badge">
                Past Event
              </span>
            )}
            {!isPast && event.is_free && (
              <span className="text-xs text-green-400 bg-green-900/20 border border-green-700/40 px-2 py-0.5 rounded-badge">
                Free
              </span>
            )}
            {event.is_featured && !isPast && (
              <span className="text-xs text-brand-gold border border-brand-gold/40 px-2 py-0.5 rounded-badge">
                Featured
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-text-primary">{event.title}</h1>
          {(event.venue_name || event.neighborhood) && (
            <p className="text-text-secondary mt-1">
              {event.venue_name ?? event.neighborhood}, {event.city_name}
            </p>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Details */}
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-text-muted text-xs uppercase tracking-wide mb-1">Date & Time</div>
              <div className="text-text-primary text-sm">{formatEventDate(event.start_at)}</div>
              {event.end_at && (
                <div className="text-text-muted text-xs mt-0.5">
                  Ends {formatEventDate(event.end_at)}
                </div>
              )}
            </div>

            {event.address && (
              <div>
                <div className="text-text-muted text-xs uppercase tracking-wide mb-1">Location</div>
                <div className="text-text-primary text-sm">{event.address}</div>
              </div>
            )}

            <div>
              <div className="text-text-muted text-xs uppercase tracking-wide mb-1">Price</div>
              <div className="text-text-primary text-sm font-medium">{priceLabel}</div>
            </div>

            {event.is_online && event.online_url && (
              <div>
                <div className="text-text-muted text-xs uppercase tracking-wide mb-1">Online Link</div>
                <a
                  href={event.online_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-gold text-sm hover:underline"
                >
                  Join Online
                </a>
              </div>
            )}

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {event.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs text-text-muted border border-surface-border px-2 py-0.5 rounded-badge"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Open in App CTA */}
          <div>
            <a
              href={`muzgram://events/${slug}?utm_source=web&utm_medium=detail_cta&utm_campaign=seo_page`}
              className="flex items-center justify-center gap-2 bg-brand-gold text-text-inverse font-semibold w-full py-3 rounded-pill hover:bg-brand-gold-light transition-colors mb-3"
            >
              {!isPast && event.ticket_url ? 'Get Tickets in App' : 'Open in Muzgram App'}
            </a>
            {!isPast && event.ticket_url && (
              <a
                href={event.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center border border-brand-gold text-brand-gold font-medium w-full py-3 rounded-pill hover:bg-brand-gold/10 transition-colors mb-3"
              >
                Get Tickets →
              </a>
            )}
            <div className="flex gap-2">
              <a
                href="https://apps.apple.com/app/muzgram/id0000000000?utm_source=web&utm_medium=event_cta"
                className="flex-1 text-center text-sm border border-surface-border text-text-secondary py-2 rounded-pill hover:border-brand-gold/50 transition-colors"
                rel="noopener"
              >
                App Store
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.muzgram.android&utm_source=web&utm_medium=event_cta"
                className="flex-1 text-center text-sm border border-surface-border text-text-secondary py-2 rounded-pill hover:border-brand-gold/50 transition-colors"
                rel="noopener"
              >
                Google Play
              </a>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="sm:col-span-2">
              <div className="text-text-muted text-xs uppercase tracking-wide mb-2">About This Event</div>
              <p className="text-text-secondary leading-relaxed">{event.description}</p>
            </div>
          )}
        </div>

        {/* More events */}
        {more.length > 0 && (
          <section className="mt-12">
            <h2 className="text-text-primary font-bold text-xl mb-4">
              More Events in {event.city_name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {more.map((e) => (
                <EventCard key={e.id} {...e} citySlug={city} />
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link
                href={`/${city}/go-out`}
                className="text-brand-gold hover:underline text-sm"
              >
                View all events in {event.city_name} →
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
