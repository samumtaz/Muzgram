import Link from 'next/link';
import type { Metadata } from 'next';
import { query } from '@/lib/db';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Muzgram — Your Community\'s Spots, Events & Services',
  description:
    'Find halal restaurants, events, and community services near you. Where your community eats, goes out, and connects. Now live in Chicago.',
  alternates: { canonical: 'https://muzgram.com' },
};

interface ListingRow {
  id: string; slug: string; city_slug: string; name: string;
  main_category: string; primary_photo_url: string | null;
  neighborhood: string | null; subcategory_name: string | null;
  is_featured: boolean; save_count: number;
}
interface EventRow {
  id: string; slug: string; title: string; start_at: string;
  cover_photo_url: string | null; price_cents: number | null;
  is_featured: boolean; venue_name: string | null; is_free: boolean;
}

const COMING_SOON_CITIES = [
  { name: 'New York City', emoji: '🗽', pop: '600K+' },
  { name: 'Houston', emoji: '🤠', pop: '200K+' },
  { name: 'Detroit', emoji: '⚙️', pop: '150K+' },
  { name: 'Dallas', emoji: '⭐', pop: '120K+' },
  { name: 'Los Angeles', emoji: '🌴', pop: '250K+' },
  { name: 'Minneapolis', emoji: '❄️', pop: '100K+' },
];

const FEATURES = [
  {
    icon: '🍽',
    title: 'Your city\'s best spots',
    body: 'Halal restaurants, dessert spots, coffee shops, and everything your crew actually goes to — surfaced without making a big deal about it.',
  },
  {
    icon: '🎉',
    title: 'What\'s happening this weekend',
    body: 'Eid parties, cultural nights, professional mixers, community fundraisers. No more flooding 12 WhatsApp groups to find out.',
  },
  {
    icon: '🤝',
    title: 'Your people in a new city',
    body: 'Just moved here? Muzgram is the friend who\'s already lived here 3 years and knows where everyone goes.',
  },
];

export default async function HomePage() {
  const [listings, events] = await Promise.all([
    query<ListingRow>(`
      SELECT l.id, l.slug, c.slug AS city_slug, l.name, l.main_category,
             l.primary_photo_url, l.neighborhood, l.is_featured, l.save_count,
             sc.name AS subcategory_name
      FROM listings l
      JOIN cities c ON l.city_id = c.id
      LEFT JOIN listing_subcategories sc ON l.subcategory_id = sc.id
      WHERE c.slug = 'chicago' AND l.is_active = true
      ORDER BY l.is_featured DESC, l.save_count DESC
      LIMIT 8
    `).catch(() => [] as ListingRow[]),
    query<EventRow>(`
      SELECT e.id, e.slug, e.title, e.start_at, e.cover_photo_url,
             e.price_cents, e.is_featured, e.is_free, l.name AS venue_name
      FROM events e
      JOIN cities c ON e.city_id = c.id
      LEFT JOIN listings l ON e.listing_id = l.id
      WHERE c.slug = 'chicago' AND e.is_active = true AND e.start_at > NOW()
      ORDER BY e.is_featured DESC, e.start_at ASC
      LIMIT 6
    `).catch(() => [] as EventRow[]),
  ]);

  const timeFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <>
      <Header />
      <main className="overflow-x-hidden">

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="relative min-h-[92vh] flex items-center bg-background overflow-hidden">
          {/* Radial gold glow behind phone */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 70% 60% at 70% 50%, rgba(212,168,83,0.13) 0%, transparent 70%)',
            }}
          />
          {/* Subtle grid texture */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(#D4A853 1px, transparent 1px), linear-gradient(90deg, #D4A853 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          <div className="relative max-w-7xl mx-auto px-4 py-20 w-full grid lg:grid-cols-2 gap-12 items-center">
            {/* Left — copy */}
            <div>
              {/* Beta badge */}
              <div className="inline-flex items-center gap-2 bg-brand-gold/10 border border-brand-gold/30 rounded-pill px-4 py-1.5 mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-gold" />
                </span>
                <span className="text-brand-gold text-sm font-semibold tracking-wide">
                  Chicago — Now Live in Beta
                </span>
              </div>

              <h1 className="text-5xl sm:text-6xl font-bold text-text-primary leading-[1.08] mb-6">
                Your city.{' '}
                <span
                  className="text-brand-gold"
                  style={{ textShadow: '0 0 40px rgba(212,168,83,0.4)' }}
                >
                  Your scene.
                </span>
                <br />
                Your community.
              </h1>

              <p className="text-text-secondary text-xl leading-relaxed mb-10 max-w-lg">
                Discover where your community eats, goes out, and connects —
                without explaining yourself to an app that wasn&apos;t built for you.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <a
                  href="https://apps.apple.com/app/muzgram/id0000000000?utm_source=web&utm_medium=hero&utm_campaign=homepage"
                  className="flex items-center justify-center gap-3 bg-brand-gold text-text-inverse font-bold px-7 py-4 rounded-pill hover:bg-brand-gold-light transition-all hover:scale-[1.02] text-base"
                  rel="noopener"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  Download for iOS
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=com.muzgram.android&utm_source=web&utm_medium=hero&utm_campaign=homepage"
                  className="flex items-center justify-center gap-3 border-2 border-surface-border text-text-primary font-bold px-7 py-4 rounded-pill hover:border-brand-gold/60 hover:text-brand-gold transition-all text-base"
                  rel="noopener"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true"><path d="M3.18 23.76c.34.19.72.24 1.1.14l12.7-7.34-2.87-2.87-10.93 10.07zm16.85-11.69L17.25 10.4l-3.06 3.06 3.06 3.06 2.81-1.62c.8-.46.8-1.57-.03-2.03zM2.19 1.28C2.07 1.5 2 1.76 2 2.06v19.88c0 .3.07.56.19.78l.11.1 11.14-11.14v-.26L2.3 1.18l-.11.1zm10.25 10.8L5.48 5.12l10.82 6.25-3.86 3.86v-3.15z"/></svg>
                  Download for Android
                </a>
              </div>

              {/* Social proof micro-stats */}
              <div className="flex items-center gap-6 text-sm text-text-muted">
                <div className="flex items-center gap-1.5">
                  <span className="text-brand-gold">★★★★★</span>
                  <span>Beta launch</span>
                </div>
                <div className="w-px h-4 bg-surface-border" />
                <span>400,000+ Muslims in Chicago</span>
                <div className="w-px h-4 bg-surface-border" />
                <span>Free forever for users</span>
              </div>
            </div>

            {/* Right — Phone mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                {/* Glow effect under phone */}
                <div
                  className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-48 h-16 rounded-full blur-2xl"
                  style={{ background: 'rgba(212,168,83,0.25)' }}
                />
                {/* Phone frame */}
                <div
                  className="relative w-[280px] rounded-[44px] overflow-hidden shadow-2xl"
                  style={{
                    background: '#111',
                    border: '10px solid #222',
                    boxShadow: '0 0 0 1px #333, 0 40px 80px rgba(0,0,0,0.8), inset 0 0 0 1px #444',
                  }}
                >
                  {/* Notch */}
                  <div className="flex justify-center pt-3 pb-1">
                    <div className="w-24 h-5 rounded-full bg-[#0D0D0D]" />
                  </div>

                  {/* App UI mock */}
                  <div className="bg-[#0D0D0D] px-3 pb-6 space-y-3">
                    {/* App header */}
                    <div className="flex items-center justify-between py-2">
                      <span className="text-brand-gold font-bold text-lg">Muzgram</span>
                      <div className="w-7 h-7 rounded-full bg-surface-elevated" />
                    </div>

                    {/* Location pill */}
                    <div className="flex items-center gap-1.5 bg-surface rounded-pill px-3 py-1.5 w-fit text-xs text-text-secondary">
                      <span>📍</span>
                      <span>Chicago, IL</span>
                    </div>

                    {/* Mock event card */}
                    <div className="rounded-xl bg-surface-elevated overflow-hidden">
                      <div className="h-28 bg-gradient-to-br from-amber-900/40 to-orange-900/30 flex items-center justify-center text-3xl">
                        🎉
                      </div>
                      <div className="p-2.5">
                        <div className="text-brand-gold text-[10px] font-bold uppercase tracking-wide">Fri, May 2 · 7:00 PM</div>
                        <div className="text-text-primary text-xs font-semibold mt-0.5 leading-tight">Eid Celebration Night — Chicago</div>
                        <div className="text-text-muted text-[10px] mt-1">Navy Pier · Free</div>
                      </div>
                    </div>

                    {/* Mock listing row */}
                    <div className="flex gap-2 overflow-hidden">
                      {['🥗', '🍖', '☕'].map((emoji, i) => (
                        <div key={i} className="flex-shrink-0 w-[76px] rounded-lg bg-surface-elevated overflow-hidden">
                          <div className={`h-16 flex items-center justify-center text-2xl ${i === 0 ? 'bg-green-900/20' : i === 1 ? 'bg-orange-900/20' : 'bg-amber-900/20'}`}>
                            {emoji}
                          </div>
                          <div className="p-1.5">
                            <div className="text-text-primary text-[9px] font-semibold leading-tight">
                              {['Halal Burger Co', 'Shawarma Palace', 'Gold Brew'][i]}
                            </div>
                            <div className="text-text-muted text-[8px]">
                              {['Devon Ave', 'Rogers Park', 'Wicker Park'][i]}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Tab bar */}
                    <div className="flex justify-around pt-2 border-t border-surface-border">
                      {['🏠', '🗺', '＋', '🔔', '👤'].map((icon, i) => (
                        <div key={i} className={`text-lg ${i === 0 ? 'opacity-100' : 'opacity-30'}`}>
                          {icon}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating badges */}
                <div
                  className="absolute -left-8 top-20 bg-surface-elevated border border-surface-border rounded-xl px-3 py-2 shadow-xl text-xs"
                  style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
                >
                  <div className="text-brand-gold font-bold">★ 4.9</div>
                  <div className="text-text-muted">App Store</div>
                </div>
                <div
                  className="absolute -right-10 bottom-28 bg-surface-elevated border border-surface-border rounded-xl px-3 py-2 shadow-xl text-xs"
                  style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
                >
                  <div className="text-text-primary font-bold">🎉 New Event</div>
                  <div className="text-text-muted">Near you tonight</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </section>

        {/* ── LIVE FEED HIGHLIGHT ───────────────────────────────────────── */}
        {(listings.length > 0 || events.length > 0) && (
          <section className="py-20 bg-background">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <div className="text-brand-gold text-xs font-semibold uppercase tracking-widest mb-2">
                    Live from Chicago
                  </div>
                  <h2 className="text-3xl font-bold text-text-primary">
                    What&apos;s on the app right now
                  </h2>
                </div>
                <Link href="/chicago" className="text-brand-gold text-sm hover:underline hidden sm:block">
                  Explore Chicago →
                </Link>
              </div>

              {/* Events row */}
              {events.length > 0 && (
                <div className="mb-10">
                  <h3 className="text-text-secondary text-sm font-medium uppercase tracking-wide mb-4">
                    🎉 Upcoming Events
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {events.slice(0, 3).map((e) => (
                      <Link
                        key={e.id}
                        href={`/chicago/events/${e.slug}`}
                        className="group relative rounded-2xl overflow-hidden bg-surface-elevated border border-surface-border hover:border-brand-gold/40 transition-all hover:-translate-y-0.5"
                      >
                        {e.cover_photo_url ? (
                          <img
                            src={e.cover_photo_url}
                            alt={e.title}
                            className="w-full h-44 object-cover group-hover:scale-[1.02] transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-44 bg-gradient-to-br from-amber-900/30 to-orange-900/20 flex items-center justify-center text-5xl">
                            🎉
                          </div>
                        )}
                        <div className="p-4">
                          <div className="text-brand-gold text-xs font-bold uppercase tracking-wide mb-1">
                            {timeFmt.format(new Date(e.start_at))}
                          </div>
                          <h4 className="text-text-primary font-semibold leading-snug line-clamp-2 mb-1">
                            {e.title}
                          </h4>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-text-muted text-xs truncate max-w-[150px]">
                              {e.venue_name ?? 'Chicago'}
                            </span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${e.is_free ? 'bg-emerald-900/50 text-emerald-400' : 'bg-surface-border text-text-secondary'}`}>
                              {e.is_free ? 'Free' : e.price_cents ? `$${(e.price_cents / 100).toFixed(0)}` : 'Paid'}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Spots row */}
              {listings.length > 0 && (
                <div>
                  <h3 className="text-text-secondary text-sm font-medium uppercase tracking-wide mb-4">
                    📍 Top Spots
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {listings.slice(0, 8).map((l) => (
                      <Link
                        key={l.id}
                        href={`/chicago/${l.main_category}/${l.slug}`}
                        className="group rounded-xl overflow-hidden bg-surface-elevated border border-surface-border hover:border-brand-gold/40 transition-all hover:-translate-y-0.5"
                      >
                        {l.primary_photo_url ? (
                          <img
                            src={l.primary_photo_url}
                            alt={l.name}
                            className="w-full h-32 object-cover group-hover:scale-[1.03] transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-32 bg-gradient-to-br from-surface to-surface-border flex items-center justify-center text-3xl">
                            🍽
                          </div>
                        )}
                        <div className="p-3">
                          <div className="text-text-primary font-semibold text-sm leading-tight line-clamp-1">
                            {l.name}
                          </div>
                          <div className="text-text-muted text-xs mt-0.5">
                            {l.neighborhood ?? l.subcategory_name ?? 'Chicago'}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {listings.length === 0 && events.length === 0 && null}

              <div className="mt-8 text-center">
                <Link
                  href="/chicago"
                  className="inline-flex items-center gap-2 border border-brand-gold/40 text-brand-gold font-semibold px-6 py-3 rounded-pill hover:bg-brand-gold/10 transition-colors text-sm"
                >
                  See everything in Chicago →
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── WHY MUZGRAM ──────────────────────────────────────────────── */}
        <section className="py-24 bg-background-elevated">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-14">
              <div className="text-brand-gold text-xs font-semibold uppercase tracking-widest mb-3">Built different</div>
              <h2 className="text-4xl font-bold text-text-primary">
                The app your community actually needed
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl bg-surface border border-surface-border p-8 hover:border-brand-gold/30 transition-colors group"
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform"
                    style={{ background: 'rgba(212,168,83,0.1)', border: '1px solid rgba(212,168,83,0.2)' }}
                  >
                    {f.icon}
                  </div>
                  <h3 className="text-text-primary font-bold text-lg mb-3">{f.title}</h3>
                  <p className="text-text-secondary leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── COMING SOON CITIES ────────────────────────────────────────── */}
        <section className="py-24 bg-background overflow-hidden">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-14">
              <div className="text-brand-gold text-xs font-semibold uppercase tracking-widest mb-3">
                We&apos;re just getting started
              </div>
              <h2 className="text-4xl font-bold text-text-primary mb-4">
                Chicago is first. Your city is next.
              </h2>
              <p className="text-text-secondary text-lg max-w-xl mx-auto">
                We&apos;re expanding to every major Muslim metro in North America.
                Sign up to be notified when we launch near you.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Chicago — LIVE */}
              <Link
                href="/chicago"
                className="relative rounded-2xl p-6 text-center group hover:scale-[1.03] transition-all"
                style={{
                  background: 'linear-gradient(135deg, rgba(212,168,83,0.15) 0%, rgba(212,168,83,0.05) 100%)',
                  border: '1px solid rgba(212,168,83,0.4)',
                  boxShadow: '0 0 30px rgba(212,168,83,0.1)',
                }}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1.5 bg-brand-gold text-text-inverse text-xs font-bold px-3 py-1 rounded-full">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-text-inverse opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-text-inverse" />
                    </span>
                    LIVE · BETA
                  </span>
                </div>
                <div className="text-4xl mb-3 mt-2">🌆</div>
                <div className="text-text-primary font-bold text-lg">Chicago</div>
                <div className="text-brand-gold text-xs mt-1 font-semibold">400K+ Muslims</div>
              </Link>

              {/* Coming soon cities */}
              {COMING_SOON_CITIES.map((c) => (
                <div
                  key={c.name}
                  className="relative rounded-2xl p-6 text-center opacity-60 border border-surface-border bg-surface"
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-surface-elevated border border-surface-border text-text-muted text-xs font-bold px-3 py-1 rounded-full">
                      SOON
                    </span>
                  </div>
                  <div className="text-4xl mb-3 mt-2">{c.emoji}</div>
                  <div className="text-text-primary font-bold">{c.name}</div>
                  <div className="text-text-muted text-xs mt-1">{c.pop} Muslims</div>
                </div>
              ))}
            </div>

            {/* Early access CTA */}
            <div className="mt-12 text-center">
              <p className="text-text-secondary mb-4">
                Want Muzgram in your city?
              </p>
              <a
                href="mailto:hello@muzgram.com?subject=Launch in my city"
                className="inline-flex items-center gap-2 border border-brand-gold/40 text-brand-gold font-semibold px-6 py-3 rounded-pill hover:bg-brand-gold/10 transition-colors text-sm"
              >
                Request your city →
              </a>
            </div>
          </div>
        </section>

        {/* ── FOR ORGANIZERS & BUSINESSES ──────────────────────────────── */}
        <section className="py-20 bg-background-elevated">
          <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl p-8 border border-surface-border bg-surface hover:border-brand-gold/30 transition-colors">
              <div className="text-3xl mb-4">🏢</div>
              <h3 className="text-text-primary font-bold text-xl mb-2">Own a business?</h3>
              <p className="text-text-secondary mb-6 leading-relaxed">
                Get discovered by the community in your city. Manage your listing,
                collect leads, and grow — all from one place.
              </p>
              <Link
                href="/for-businesses"
                className="inline-flex items-center gap-2 bg-brand-gold text-text-inverse font-semibold px-5 py-2.5 rounded-pill hover:bg-brand-gold-light transition-colors text-sm"
              >
                List your business →
              </Link>
            </div>
            <div className="rounded-2xl p-8 border border-surface-border bg-surface hover:border-brand-gold/30 transition-colors">
              <div className="text-3xl mb-4">🎪</div>
              <h3 className="text-text-primary font-bold text-xl mb-2">Organizing an event?</h3>
              <p className="text-text-secondary mb-6 leading-relaxed">
                Stop flooding 12 WhatsApp groups. Reach the people who will actually
                show up — thousands of active community members in your city.
              </p>
              <Link
                href="/for-organizers"
                className="inline-flex items-center gap-2 border border-brand-gold/40 text-brand-gold font-semibold px-5 py-2.5 rounded-pill hover:bg-brand-gold/10 transition-colors text-sm"
              >
                List your event →
              </Link>
            </div>
          </div>
        </section>

        {/* ── FINAL DOWNLOAD CTA ───────────────────────────────────────── */}
        <section className="py-24 bg-background relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(212,168,83,0.08) 0%, transparent 70%)',
            }}
          />
          <div className="relative max-w-2xl mx-auto px-4 text-center">
            <div className="text-brand-gold text-xs font-semibold uppercase tracking-widest mb-4">
              Download free
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-text-primary mb-4 leading-tight">
              Your community is already on it.
            </h2>
            <p className="text-text-secondary text-lg mb-10">
              Live map, event notifications, community feed — only in the app.
              Free forever for users.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://apps.apple.com/app/muzgram/id0000000000?utm_source=web&utm_medium=footer-cta&utm_campaign=homepage"
                className="flex items-center justify-center gap-3 bg-brand-gold text-text-inverse font-bold px-8 py-4 rounded-pill hover:bg-brand-gold-light transition-all hover:scale-[1.02] text-base"
                rel="noopener"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                Download for iOS
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.muzgram.android&utm_source=web&utm_medium=footer-cta&utm_campaign=homepage"
                className="flex items-center justify-center gap-3 border-2 border-surface-border text-text-primary font-bold px-8 py-4 rounded-pill hover:border-brand-gold/60 hover:text-brand-gold transition-all text-base"
                rel="noopener"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true"><path d="M3.18 23.76c.34.19.72.24 1.1.14l12.7-7.34-2.87-2.87-10.93 10.07zm16.85-11.69L17.25 10.4l-3.06 3.06 3.06 3.06 2.81-1.62c.8-.46.8-1.57-.03-2.03zM2.19 1.28C2.07 1.5 2 1.76 2 2.06v19.88c0 .3.07.56.19.78l.11.1 11.14-11.14v-.26L2.3 1.18l-.11.1zm10.25 10.8L5.48 5.12l10.82 6.25-3.86 3.86v-3.15z"/></svg>
                Download for Android
              </a>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
