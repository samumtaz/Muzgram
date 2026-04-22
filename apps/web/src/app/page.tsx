import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { query } from '@/lib/db';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ListingCard, type ListingCardProps } from '@/components/feed/ListingCard';
import { EventCard, type EventCardProps } from '@/components/feed/EventCard';
import { InstallCTA } from '@/components/conversion/InstallCTA';

export const metadata: Metadata = {
  title: 'Muzgram — Halal Spots, Events & Services for Muslims',
  description:
    'Find halal restaurants, events, and community services near you. Where your community eats, goes out, and connects.',
  alternates: { canonical: 'https://muzgram.com' },
};

// Static — no revalidate (content comes from Chicago queries below)

type ListingRow = ListingCardProps & { id: string };
type EventRow = Omit<EventCardProps, 'citySlug'> & { id: string };

const CATEGORIES = [
  { slug: 'eat', label: 'Eat', icon: '🍽', desc: 'Halal restaurants, food trucks & cafés' },
  { slug: 'go-out', label: 'Go Out', icon: '🎉', desc: 'Desi parties, events & nightlife' },
  { slug: 'connect', label: 'Connect', icon: '🤝', desc: 'Services, mosques & community' },
];

export default async function HomePage() {
  const [listings, events] = await Promise.all([
    query<ListingRow>(`
      SELECT l.id, l.slug, c.slug AS city_slug, l.name,
             l.main_category, l.primary_photo_url, l.neighborhood,
             l.address, l.is_featured, l.save_count,
             sc.name AS subcategory_name
      FROM listings l
      JOIN cities c ON l.city_id = c.id
      LEFT JOIN listing_subcategories sc ON l.subcategory_id = sc.id
      WHERE c.slug = 'chicago'
        AND l.is_active = true
      ORDER BY l.is_featured DESC, l.save_count DESC
      LIMIT 6
    `).catch(() => [] as ListingRow[]),
    query<EventRow>(`
      SELECT e.id, e.slug, e.title, e.start_at, e.cover_photo_url,
             e.price_cents, e.is_featured,
             l.name AS venue_name, l.neighborhood
      FROM events e
      JOIN cities c ON e.city_id = c.id
      LEFT JOIN listings l ON e.listing_id = l.id
      WHERE c.slug = 'chicago'
        AND e.is_active = true
        AND e.start_at > NOW()
      ORDER BY e.is_featured DESC, e.start_at ASC
      LIMIT 4
    `).catch(() => [] as EventRow[]),
  ]);

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-background pt-16 pb-12 px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="text-brand-gold text-sm font-semibold uppercase tracking-widest mb-4">
              Chicago · Now Live
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-text-primary leading-tight mb-4">
              Find Halal Spots, Events{' '}
              <span className="text-brand-gold">&amp; Services</span> Near You
            </h1>
            <p className="text-text-secondary text-lg mb-8">
              Discover where your community eats, goes out, and connects.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://apps.apple.com/app/muzgram/id0000000000?utm_source=web&utm_medium=hero&utm_campaign=homepage"
                className="flex items-center justify-center gap-2 bg-brand-gold text-text-inverse font-semibold px-6 py-3 rounded-pill hover:bg-brand-gold-light transition-colors"
                rel="noopener"
              >
                <span>🍎</span> Download for iOS
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.muzgram.android&utm_source=web&utm_medium=hero&utm_campaign=homepage"
                className="flex items-center justify-center gap-2 border border-surface-border text-text-primary font-semibold px-6 py-3 rounded-pill hover:border-brand-gold transition-colors"
                rel="noopener"
              >
                <span>▶</span> Download for Android
              </a>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-text-primary font-bold text-2xl mb-6">Browse Chicago</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/chicago/${cat.slug}`}
                className="group flex items-center gap-4 rounded-card bg-surface border border-surface-border p-5 hover:border-brand-gold/50 transition-colors"
              >
                <span className="text-3xl">{cat.icon}</span>
                <div>
                  <div className="text-text-primary font-semibold">{cat.label}</div>
                  <div className="text-text-muted text-sm">{cat.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Listings */}
        {listings.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-text-primary font-bold text-2xl">Top Spots in Chicago</h2>
              <Link href="/chicago/eat" className="text-brand-gold text-sm hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((listing, i) => (
                <ListingCard key={listing.id} {...listing} priority={i < 3} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Events */}
        {events.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-text-primary font-bold text-2xl">Upcoming Events</h2>
              <Link href="/chicago/go-out" className="text-brand-gold text-sm hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {events.map((event) => (
                <EventCard key={event.id} {...event} citySlug="chicago" />
              ))}
            </div>
          </section>
        )}

        {/* For Businesses */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <div className="rounded-card bg-surface-elevated border border-surface-border p-8 text-center">
            <h2 className="text-text-primary font-bold text-2xl mb-2">
              Own a Halal Business?
            </h2>
            <p className="text-text-secondary mb-5">
              Get discovered by thousands of Muslims in Chicago. Manage your listing, collect
              leads, and grow your community.
            </p>
            <Link
              href="/for-businesses"
              className="inline-block bg-brand-gold text-text-inverse font-semibold px-6 py-3 rounded-pill hover:bg-brand-gold-light transition-colors"
            >
              List Your Business →
            </Link>
          </div>
        </section>

        {/* Install CTA */}
        <section className="max-w-2xl mx-auto px-4 pb-16">
          <InstallCTA
            headline="Get Muzgram on your phone"
            subtext="Live map, community posts, push notifications for new events — only in the app."
          />
        </section>
      </main>
      <Footer />
    </>
  );
}
