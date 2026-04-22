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
  id: string; slug: string; title: string; start_time: string;
  end_time: string | null; venue_name: string | null; address: string | null;
  cover_image_url: string | null; is_free: boolean; price_cents: number | null;
  organizer_name: string | null; city_slug: string; day_label: string;
}

function getWeekendRange(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 6=Sat
  const daysUntilFri = day === 5 ? 0 : day === 6 ? 6 : (5 - day + 7) % 7;
  const friday = new Date(now);
  friday.setDate(now.getDate() + daysUntilFri);
  friday.setHours(0, 0, 0, 0);
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  sunday.setHours(23, 59, 59, 999);
  return { start: friday, end: sunday };
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
  const title = `Things to Do This Weekend in ${cityRow.name} | Muzgram`;
  const description = `Muslim-friendly events this weekend in ${cityRow.name}. Halal restaurants, community events, Friday prayers, and more.`;
  return {
    title, description,
    alternates: { canonical: `https://muzgram.com/${city}/this-weekend` },
    openGraph: { title, description, url: `https://muzgram.com/${city}/this-weekend`, siteName: 'Muzgram' },
  };
}

export default async function ThisWeekendPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const { start, end } = getWeekendRange();

  const [cityRows, events] = await Promise.all([
    query<CityRow>(`SELECT id, slug, name FROM cities WHERE slug = $1 AND launch_status = 'active' LIMIT 1`, [city]),
    query<EventRow>(`
      SELECT e.id, e.slug, e.title, e.start_time, e.end_time,
             e.venue_name, e.address, e.cover_image_url, e.is_free,
             e.price_cents, e.organizer_name, c.slug AS city_slug,
             TO_CHAR(e.start_time AT TIME ZONE 'America/Chicago', 'Day') AS day_label
      FROM events e
      JOIN cities c ON e.city_id = c.id
      WHERE c.slug = $1
        AND e.is_active = true
        AND e.start_time >= $2
        AND e.start_time <= $3
      ORDER BY e.start_time ASC
      LIMIT 60
    `, [city, start.toISOString(), end.toISOString()]),
  ]);

  const cityData = cityRows[0];
  if (!cityData) notFound();

  const schema = buildBreadcrumbSchema([
    { name: 'Home', url: 'https://muzgram.com' },
    { name: cityData.name, url: `https://muzgram.com/${city}` },
    { name: 'This Weekend', url: `https://muzgram.com/${city}/this-weekend` },
  ]);

  const dateFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const grouped = events.reduce<Record<string, EventRow[]>>((acc, e) => {
    const key = dateFmt.format(new Date(e.start_time));
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  return (
    <>
      <SchemaScript schema={[schema]} />
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <BreadcrumbNav items={[
          { name: 'Home', url: 'https://muzgram.com' },
          { name: cityData.name, url: `https://muzgram.com/${city}` },
          { name: 'This Weekend', url: `https://muzgram.com/${city}/this-weekend` },
        ]} />

        <div className="mt-6 mb-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🗓️</span>
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
              This Weekend in {cityData.name}
            </h1>
          </div>
          <p className="text-text-secondary text-lg">
            Muslim-friendly events happening Friday through Sunday in {cityData.name}.
          </p>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🗓️</div>
            <p className="text-text-secondary text-lg mb-2">No events this weekend yet.</p>
            <Link href={`/${city}/events`} className="text-brand-gold hover:underline text-sm">
              Browse all upcoming events →
            </Link>
          </div>
        ) : (
          <div className="space-y-10 mb-12">
            {Object.entries(grouped).map(([day, dayEvents]) => (
              <section key={day}>
                <h2 className="text-lg font-semibold text-text-primary mb-4 pb-2 border-b border-surface-tertiary">
                  {day}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dayEvents.map((e) => (
                    <Link
                      key={e.id}
                      href={`/${city}/events/${e.slug}`}
                      className="block bg-surface-secondary rounded-xl overflow-hidden hover:ring-1 hover:ring-brand-gold transition-all"
                    >
                      {e.cover_image_url && (
                        <img
                          src={e.cover_image_url}
                          alt={e.title}
                          className="w-full h-40 object-cover"
                          loading="lazy"
                        />
                      )}
                      <div className="p-4">
                        <div className="text-brand-gold text-xs font-semibold uppercase tracking-wide mb-1">
                          {timeFmt.format(new Date(e.start_time))}
                        </div>
                        <h3 className="font-semibold text-text-primary text-base leading-snug mb-1 line-clamp-2">
                          {e.title}
                        </h3>
                        {e.venue_name && (
                          <p className="text-text-muted text-sm">{e.venue_name}</p>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-text-muted text-xs truncate max-w-[120px]">{e.organizer_name ?? ''}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${e.is_free ? 'bg-emerald-900/50 text-emerald-400' : 'bg-surface-tertiary text-text-secondary'}`}>
                            {e.is_free ? 'Free' : e.price_cents ? `$${(e.price_cents / 100).toFixed(0)}` : 'Paid'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
          <Link href={`/${city}`} className="text-brand-gold hover:underline">
            ← Back to {cityData.name}
          </Link>
          <Link href={`/${city}/events`} className="text-brand-gold hover:underline">
            All upcoming events →
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
