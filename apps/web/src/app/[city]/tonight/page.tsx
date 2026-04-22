import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { query } from '@/lib/db';
import { withCache } from '@/lib/cache/redis';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AppDownloadBanner } from '@/components/layout/AppDownloadBanner';
import { InstallCTA } from '@/components/conversion/InstallCTA';
import { SchemaScript } from '@/components/seo/SchemaScript';
import { BreadcrumbNav } from '@/components/seo/BreadcrumbNav';
import { buildBreadcrumbSchema } from '@/lib/schema/breadcrumb.schema';

export const revalidate = 3600;
export const dynamicParams = true;

interface CityRow { id: string; slug: string; name: string; }
interface EventRow {
  id: string; slug: string; title: string; start_at: string;
  end_at: string | null; venue_name: string | null; address: string | null;
  cover_photo_url: string | null; is_free: boolean; price_cents: number | null;
  organizer_name: string | null; city_slug: string;
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
  const title = `Things to Do Tonight in ${cityRow.name} | Muzgram`;
  const description = `Muslim-friendly events happening tonight in ${cityRow.name}. Halal food, community gatherings, and more — updated daily.`;
  return {
    title, description,
    alternates: { canonical: `https://muzgram.com/${city}/tonight` },
    openGraph: { title, description, url: `https://muzgram.com/${city}/tonight`, siteName: 'Muzgram' },
  };
}

export default async function TonightPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [cityRows, events] = await Promise.all([
    query<CityRow>(`SELECT id, slug, name FROM cities WHERE slug = $1 AND launch_status = 'active' LIMIT 1`, [city]),
    query<EventRow>(`
      SELECT e.id, e.slug, e.title, e.start_at,
             e."endAt" AS end_at,
             e.venue_name, e.address, e.cover_photo_url, e.is_free,
             e.price_cents, e.organizer_name, c.slug AS city_slug
      FROM events e
      JOIN cities c ON e.city_id = c.id
      WHERE c.slug = $1
        AND e.is_active = true
        AND e.start_at >= $2
        AND e.start_at <= $3
      ORDER BY e.start_at ASC
      LIMIT 40
    `, [city, todayStart.toISOString(), todayEnd.toISOString()]).catch(() => [] as EventRow[]),
  ]);

  const cityData = cityRows[0];
  if (!cityData) notFound();

  const schema = buildBreadcrumbSchema([
    { name: 'Home', url: 'https://muzgram.com' },
    { name: cityData.name, url: `https://muzgram.com/${city}` },
    { name: 'Tonight', url: `https://muzgram.com/${city}/tonight` },
  ]);

  const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <>
      <SchemaScript schema={[schema]} />
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <BreadcrumbNav items={[
          { name: 'Home', url: 'https://muzgram.com' },
          { name: cityData.name, url: `https://muzgram.com/${city}` },
          { name: 'Tonight', url: `https://muzgram.com/${city}/tonight` },
        ]} />

        <div className="mt-6 mb-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🌙</span>
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
              Tonight in {cityData.name}
            </h1>
          </div>
          <p className="text-text-secondary text-lg">
            Muslim-friendly events happening today in {cityData.name}.
          </p>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🌙</div>
            <p className="text-text-secondary text-lg mb-2">No events tonight — check back tomorrow.</p>
            <Link href={`/${city}/this-weekend`} className="text-brand-gold hover:underline text-sm">
              See this weekend →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {events.map((e) => (
              <Link
                key={e.id}
                href={`/${city}/events/${e.slug}`}
                className="block bg-surface-secondary rounded-xl overflow-hidden hover:ring-1 hover:ring-brand-gold transition-all"
              >
                {e.cover_photo_url && (
                  <img
                    src={e.cover_photo_url}
                    alt={e.title}
                    className="w-full h-40 object-cover"
                    loading="lazy"
                  />
                )}
                <div className="p-4">
                  <div className="text-brand-gold text-xs font-semibold uppercase tracking-wide mb-1">
                    {fmt.format(new Date(e.start_at))}
                    {e.end_at ? ` – ${fmt.format(new Date(e.end_at))}` : ''}
                  </div>
                  <h2 className="font-semibold text-text-primary text-base leading-snug mb-1 line-clamp-2">
                    {e.title}
                  </h2>
                  {e.venue_name && (
                    <p className="text-text-muted text-sm">{e.venue_name}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-text-muted text-xs">{e.organizer_name ?? ''}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${e.is_free ? 'bg-emerald-900/50 text-emerald-400' : 'bg-surface-tertiary text-text-secondary'}`}>
                      {e.is_free ? 'Free' : e.price_cents ? `$${(e.price_cents / 100).toFixed(0)}` : 'Paid'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
          <Link href={`/${city}`} className="text-brand-gold hover:underline">
            ← Back to {cityData.name}
          </Link>
          <Link href={`/${city}/this-weekend`} className="text-brand-gold hover:underline">
            This weekend →
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
