import Link from 'next/link';
import type { Metadata } from 'next';
import { query } from '@/lib/db';
import { HomepageHeader } from '@/components/layout/HomepageHeader';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Muzgram — Your Community\'s Spots, Events & Services',
  description:
    'Find halal restaurants, events, and community services near you. Where your community eats, goes out, and connects. Now live in Chicago.',
  alternates: { canonical: 'https://muzgram.com' },
};

interface ListingRow {
  id: string; slug: string; name: string;
  primary_photo_url: string | null; neighborhood: string | null;
  subcategory_name: string | null; main_category: string;
}
interface EventRow {
  id: string; slug: string; title: string; start_at: string;
  cover_photo_url: string | null; price_cents: number | null;
  is_free: boolean; venue_name: string | null;
}

const COMING_SOON = [
  { name: 'New York', emoji: '🗽', pop: '600K+' },
  { name: 'Houston',  emoji: '🤠', pop: '200K+' },
  { name: 'Detroit',  emoji: '⚙️',  pop: '150K+' },
  { name: 'Dallas',   emoji: '⭐', pop: '120K+' },
  { name: 'Los Angeles', emoji: '🌴', pop: '250K+' },
  { name: 'Minneapolis', emoji: '❄️', pop: '100K+' },
];

const TICKER_ITEMS = [
  '🌆 Chicago Now Live',
  '🍽 Halal Spots',
  '🎉 Events Every Week',
  '🤝 Community First',
  '📍 Near You',
  '✨ Free to Download',
  '🕌 Mosques',
  '☕ Late Night Runs',
];

const FEATURES = [
  {
    emoji: '🍽',
    tag: 'EAT',
    title: 'Every spot worth knowing',
    body: 'Halal restaurants, dessert lounges, coffee shops — community-verified, GPS-sorted, always current. Stop asking in the group chat.',
  },
  {
    emoji: '🎉',
    tag: 'GO OUT',
    title: 'What\'s happening this weekend',
    body: 'Eid parties, cultural nights, professional mixers, community events. One place instead of 12 WhatsApp groups.',
  },
  {
    emoji: '🤝',
    tag: 'CONNECT',
    title: 'Your people in a new city',
    body: 'Just moved here? Muzgram is the friend who\'s already lived here 3 years and knows where everyone goes.',
  },
];

export default async function HomePage() {
  const [listings, events] = await Promise.all([
    query<ListingRow>(`
      SELECT l.id, l.slug, l.name, l.main_category,
             l.primary_photo_url, l.neighborhood,
             sc.name AS subcategory_name
      FROM listings l
      JOIN cities c ON l.city_id = c.id
      LEFT JOIN listing_subcategories sc ON l.subcategory_id = sc.id
      WHERE c.slug = 'chicago' AND l.is_active = true
      ORDER BY l.is_featured DESC, l.save_count DESC
      LIMIT 10
    `).catch(() => [] as ListingRow[]),
    query<EventRow>(`
      SELECT e.id, e.slug, e.title, e.start_at, e.cover_photo_url,
             e.price_cents, e.is_free, l.name AS venue_name
      FROM events e
      JOIN cities c ON e.city_id = c.id
      LEFT JOIN listings l ON e.listing_id = l.id
      WHERE c.slug = 'chicago' AND e.is_active = true AND e.start_at > NOW()
      ORDER BY e.is_featured DESC, e.start_at ASC
      LIMIT 6
    `).catch(() => [] as EventRow[]),
  ]);

  const dateFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const tickerText = [...TICKER_ITEMS, ...TICKER_ITEMS].join('  ·  ');
  const hasContent = listings.length > 0 || events.length > 0;

  return (
    <>
      <HomepageHeader />
      <main className="overflow-x-hidden">

        {/* ─────────────────────────────────────────────────────────────────
            HERO
        ───────────────────────────────────────────────────────────────── */}
        <section className="relative md:h-[100svh] bg-background overflow-hidden flex flex-col">

          {/* Aurora blobs */}
          <div className="pointer-events-none absolute inset-0">
            <div
              className="absolute animate-aurora"
              style={{
                width: 700, height: 700, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(212,168,83,0.18) 0%, transparent 65%)',
                top: '-10%', right: '-5%',
                animationDuration: '10s',
              }}
            />
            <div
              className="absolute animate-aurora"
              style={{
                width: 500, height: 500, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(212,168,83,0.10) 0%, transparent 65%)',
                bottom: '-15%', left: '10%',
                animationDuration: '14s',
                animationDelay: '-5s',
              }}
            />
          </div>

          {/* Grid texture */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: 'linear-gradient(#D4A853 1px, transparent 1px), linear-gradient(90deg, #D4A853 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />

          {/* Content — flex-1 so it fills all space above the ticker */}
          <div className="relative flex-1 min-h-0 max-w-7xl mx-auto px-4 sm:px-6 w-full grid md:grid-cols-2 gap-8 items-start md:items-center pt-6 pb-2 md:py-8 overflow-hidden">

            {/* LEFT — copy */}
            <div className="text-center md:text-left">

              {/* Live badge */}
              <div className="inline-flex items-center gap-2.5 rounded-pill px-4 py-2 mb-4 md:mb-8 text-sm font-semibold"
                style={{
                  background: 'rgba(212,168,83,0.08)',
                  border: '1px solid rgba(212,168,83,0.35)',
                  backdropFilter: 'blur(8px)',
                }}>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-70" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-gold" />
                </span>
                <span className="text-brand-gold tracking-wide">Chicago — Now Live in Beta</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-bold leading-[1.05] mb-4 text-text-primary">
                Your city.{' '}
                <span
                  className="block"
                  style={{
                    background: 'linear-gradient(135deg, #D4A853 0%, #E8C87E 50%, #D4A853 100%)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: 'shimmer 3s linear infinite',
                  }}
                >
                  Your scene.
                </span>
                Your community.
              </h1>

              <p className="text-text-secondary text-base sm:text-lg leading-relaxed mb-5 md:mb-6 max-w-lg mx-auto md:mx-0">
                The spots your crew actually goes to. The events worth leaving the house for.
                Built for your community, finally.
              </p>

              {/* Mobile phone preview — between subtext and CTAs */}
              <div className="md:hidden flex justify-center mb-5">
                <div className="relative" style={{ width: 220 }}>
                  {/* Glow */}
                  <div className="absolute inset-0 rounded-[42px] pointer-events-none" style={{ boxShadow: '0 0 60px rgba(212,168,83,0.18)', filter: 'blur(12px)' }} />
                  {/* Phone frame */}
                  <div className="relative overflow-hidden rounded-[42px]" style={{ border: '3px solid #3a3a3a', background: '#0d0d0d', boxShadow: '0 0 0 1px #1a1a1a, 0 32px 80px rgba(0,0,0,0.9)' }}>
                    {/* Dynamic Island */}
                    <div className="bg-black pt-2.5 pb-0 flex justify-center">
                      <div className="flex items-center justify-center gap-2 px-3" style={{ height: 28, minWidth: 100, background: '#000', borderRadius: 16, border: '1px solid #1a1a1a' }}>
                        <div className="rounded-full" style={{ width: 10, height: 10, background: '#0a0a0a', border: '1px solid #222' }} />
                        <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#1a1a1a' }} />
                      </div>
                    </div>
                    {/* Screen */}
                    <div className="bg-[#0D0D0D] px-3 pt-2 pb-4 space-y-2.5">
                      {/* Status */}
                      <div className="flex items-center justify-between px-1 text-[9px] font-semibold" style={{ color: '#888' }}>
                        <span>9:41</span>
                        <div className="flex items-center gap-1">
                          <div className="flex items-end gap-0.5 h-2.5">
                            {[2, 4, 6, 8].map((h, i) => <div key={i} style={{ width: 2.5, height: h, background: i < 3 ? '#888' : '#444', borderRadius: 1 }} />)}
                          </div>
                          <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current text-[#888]"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 0 0-6 0zm-4-4 2 2a7.074 7.074 0 0 1 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
                          <div style={{ width: 18, height: 9, borderRadius: 2, border: '1px solid #666', padding: 1 }}><div style={{ width: '80%', height: '100%', background: '#888', borderRadius: 1 }} /></div>
                        </div>
                      </div>
                      {/* App header */}
                      <div className="flex items-center justify-between">
                        <span className="text-brand-gold font-bold text-base tracking-tight">Muzgram</span>
                        <div className="flex gap-1">
                          <div className="w-7 h-7 rounded-full bg-surface-elevated flex items-center justify-center text-xs">🔔</div>
                          <div className="w-7 h-7 rounded-full bg-surface-elevated flex items-center justify-center text-xs">👤</div>
                        </div>
                      </div>
                      {/* Location */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                        <span className="text-brand-gold text-xs">📍</span>
                        <span className="text-text-secondary text-[10px] font-medium">Chicago, IL</span>
                        <span className="ml-auto text-text-muted text-[9px]">▼</span>
                      </div>
                      {/* Featured card */}
                      <div className="rounded-xl overflow-hidden">
                        <div className="h-16 flex flex-col items-center justify-center gap-0.5" style={{ background: 'linear-gradient(135deg, rgba(212,168,83,0.22) 0%, rgba(160,50,20,0.28) 100%)' }}>
                          <div className="text-2xl">🎉</div>
                          <div className="text-brand-gold text-[7px] font-bold uppercase tracking-widest">Featured Event</div>
                        </div>
                        <div className="p-2" style={{ background: '#1a1a1a' }}>
                          <div className="text-brand-gold text-[8px] font-bold uppercase tracking-wide">Fri, May 2 · 7:00 PM</div>
                          <div className="text-text-primary text-[10px] font-semibold mt-0.5">Eid Celebration Night</div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-text-muted text-[8px]">Navy Pier · Chicago</span>
                            <span className="text-emerald-400 text-[8px] font-bold bg-emerald-900/40 px-1.5 py-0.5 rounded-full">Free</span>
                          </div>
                        </div>
                      </div>
                      {/* Spots row */}
                      <div className="flex gap-1.5">
                        {[{ emoji: '🥗', name: 'The Halal Guys', color: 'rgba(34,197,94,0.12)' }, { emoji: '🍖', name: 'Shawarma Palace', color: 'rgba(249,115,22,0.12)' }, { emoji: '☕', name: 'Gold Brew', color: 'rgba(212,168,83,0.12)' }].map((s, i) => (
                          <div key={i} className="flex-1 rounded-xl overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
                            <div className="h-8 flex items-center justify-center text-sm" style={{ background: s.color }}>{s.emoji}</div>
                            <div className="p-1"><div className="text-text-primary text-[7px] font-semibold truncate">{s.name}</div></div>
                          </div>
                        ))}
                      </div>
                      {/* Tab bar */}
                      <div className="flex justify-around items-center pt-2" style={{ borderTop: '1px solid #1e1e1e' }}>
                        {[{ icon: '⌂', label: 'Home', active: true }, { icon: '🗺', label: 'Map' }, { icon: '＋', special: true }, { icon: '🔔', label: 'Alerts' }, { icon: '👤', label: 'Me' }].map((tab, i) => (
                          <div key={i} className="flex flex-col items-center gap-0.5">
                            {tab.special ? (
                              <div className="w-8 h-8 rounded-full bg-brand-gold flex items-center justify-center text-text-inverse font-bold text-sm" style={{ boxShadow: '0 0 12px rgba(212,168,83,0.5)' }}>＋</div>
                            ) : (
                              <>
                                <span className={`text-sm ${tab.active ? 'opacity-100' : 'opacity-25'}`}>{tab.icon}</span>
                                <span className={`text-[6px] ${tab.active ? 'text-brand-gold' : 'text-text-muted'}`}>{tab.label}</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-center pt-0.5"><div className="w-16 h-0.5 rounded-full" style={{ background: '#333' }} /></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start mb-4 md:mb-6">
                <a
                  href="https://apps.apple.com/app/muzgram/id0000000000?utm_source=web&utm_medium=hero"
                  className="group relative flex items-center justify-center gap-3 font-bold px-7 py-4 rounded-pill text-text-inverse overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #D4A853, #E8C87E 50%, #D4A853)', backgroundSize: '200% auto' }}
                  rel="noopener"
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(255,255,255,0.1)' }} />
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current flex-shrink-0"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  <span>Download for iOS</span>
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=com.muzgram.android&utm_source=web&utm_medium=hero"
                  className="group flex items-center justify-center gap-3 font-bold px-7 py-4 rounded-pill text-text-primary border-2 border-surface-border hover:border-brand-gold/50 hover:text-brand-gold transition-all duration-300"
                  rel="noopener"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current flex-shrink-0"><path d="M3.18 23.76c.34.19.72.24 1.1.14l12.7-7.34-2.87-2.87-10.93 10.07zm16.85-11.69L17.25 10.4l-3.06 3.06 3.06 3.06 2.81-1.62c.8-.46.8-1.57-.03-2.03zM2.19 1.28C2.07 1.5 2 1.76 2 2.06v19.88c0 .3.07.56.19.78l.11.1 11.14-11.14v-.26L2.3 1.18l-.11.1zm10.25 10.8L5.48 5.12l10.82 6.25-3.86 3.86v-3.15z"/></svg>
                  <span>Download for Android</span>
                </a>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-5 justify-center md:justify-start text-xs text-text-muted">
                <span className="flex items-center gap-1.5">
                  <span style={{ color: '#D4A853' }}>★★★★★</span> Beta launch
                </span>
                <span className="w-px h-4 bg-surface-border" />
                <span>400,000+ Muslims in Chicago</span>
                <span className="w-px h-4 bg-surface-border" />
                <span>Free forever</span>
              </div>
            </div>

            {/* Desktop phone — full version (hidden on mobile) */}
            <div className="hidden md:flex justify-center relative">

              {/* Deep glow behind phone */}
              <div
                className="absolute animate-glow-pulse pointer-events-none"
                style={{
                  width: 320, height: 600,
                  borderRadius: '50%',
                  background: 'radial-gradient(ellipse, rgba(212,168,83,0.22) 0%, transparent 65%)',
                  top: '50%', left: '50%',
                  transform: 'translate(-50%,-50%)',
                  filter: 'blur(48px)',
                }}
              />

              {/* Phone wrapper — float animation */}
              <div className="animate-float relative" style={{ transformOrigin: 'center bottom' }}>

                {/* ── iPhone 17 Pro Max ── */}
                <div className="relative" style={{ width: 270 }}>

                  {/* Hardware buttons — LEFT side */}
                  {/* Action Button */}
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: 8, height: 36,
                      background: 'linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 50%, #3a3a3a 100%)',
                      left: -7, top: 108,
                      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.08), -1px 0 3px rgba(0,0,0,0.6)',
                    }}
                  />
                  {/* Volume Up */}
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: 7, height: 58,
                      background: 'linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 50%, #3a3a3a 100%)',
                      left: -6, top: 162,
                      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.08), -1px 0 3px rgba(0,0,0,0.6)',
                    }}
                  />
                  {/* Volume Down */}
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: 7, height: 58,
                      background: 'linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 50%, #3a3a3a 100%)',
                      left: -6, top: 230,
                      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.08), -1px 0 3px rgba(0,0,0,0.6)',
                    }}
                  />

                  {/* Hardware buttons — RIGHT side (Power) */}
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: 7, height: 80,
                      background: 'linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 50%, #3a3a3a 100%)',
                      right: -6, top: 175,
                      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.08), 1px 0 3px rgba(0,0,0,0.6)',
                    }}
                  />

                  {/* Titanium frame */}
                  <div
                    className="absolute inset-0 rounded-[52px] pointer-events-none"
                    style={{
                      background: 'transparent',
                      border: '3px solid transparent',
                      backgroundClip: 'padding-box',
                      boxShadow: `
                        0 0 0 3px #3d3d3d,
                        0 0 0 4px #1a1a1a,
                        inset 0 1px 0 rgba(255,255,255,0.12),
                        0 60px 120px rgba(0,0,0,0.95),
                        0 0 80px rgba(212,168,83,0.10)
                      `,
                      zIndex: 10,
                    }}
                  />

                  {/* Phone body */}
                  <div
                    className="relative overflow-hidden"
                    style={{
                      borderRadius: 50,
                      background: 'linear-gradient(160deg, #1c1c1e 0%, #111 60%, #0d0d0d 100%)',
                      border: '3px solid #3a3a3a',
                    }}
                  >
                    {/* Screen top padding + Dynamic Island */}
                    <div className="bg-[#000] pt-3 pb-0 flex justify-center">
                      {/* Dynamic Island — pill shape with camera/sensor */}
                      <div
                        className="flex items-center justify-center gap-2.5 px-4"
                        style={{
                          height: 34,
                          minWidth: 126,
                          background: '#000',
                          borderRadius: 20,
                          border: '1px solid #1a1a1a',
                        }}
                      >
                        {/* Front camera dot */}
                        <div
                          className="rounded-full"
                          style={{ width: 12, height: 12, background: '#0a0a0a', border: '1px solid #222', boxShadow: 'inset 0 0 4px rgba(0,120,255,0.15)' }}
                        />
                        {/* Face ID sensor area */}
                        <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#1a1a1a' }} />
                      </div>
                    </div>

                    {/* Screen content */}
                    <div
                      className="bg-[#0D0D0D] px-4 pb-8 pt-2 space-y-3"
                      style={{ minHeight: 460 }}
                    >
                      {/* Status bar */}
                      <div className="flex items-center justify-between px-1 text-[10px] font-semibold" style={{ color: '#888' }}>
                        <span>9:41</span>
                        <div className="flex items-center gap-1.5">
                          {/* Signal bars */}
                          <div className="flex items-end gap-0.5 h-3">
                            {[3, 5, 7, 9].map((h, i) => (
                              <div key={i} style={{ width: 3, height: h, background: i < 3 ? '#888' : '#444', borderRadius: 1 }} />
                            ))}
                          </div>
                          {/* WiFi */}
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 0 0-6 0zm-4-4 2 2a7.074 7.074 0 0 1 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
                          {/* Battery */}
                          <div className="flex items-center gap-0.5">
                            <div style={{ width: 22, height: 11, borderRadius: 3, border: '1px solid #666', padding: 1.5 }}>
                              <div style={{ width: '80%', height: '100%', background: '#888', borderRadius: 1 }} />
                            </div>
                            <div style={{ width: 2, height: 5, background: '#666', borderRadius: 1 }} />
                          </div>
                        </div>
                      </div>

                      {/* App header */}
                      <div className="flex items-center justify-between">
                        <span className="text-brand-gold font-bold text-xl tracking-tight">Muzgram</span>
                        <div className="flex gap-1.5">
                          <div className="w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center text-sm">🔔</div>
                          <div className="w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center text-sm">👤</div>
                        </div>
                      </div>

                      {/* Location pill */}
                      <div
                        className="flex items-center gap-2 px-3 py-2 rounded-xl"
                        style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
                      >
                        <span className="text-brand-gold text-sm">📍</span>
                        <span className="text-text-secondary text-xs font-medium">Chicago, IL</span>
                        <span className="ml-auto text-text-muted text-[10px]">▼</span>
                      </div>

                      {/* Featured event card */}
                      <div className="relative rounded-2xl overflow-hidden">
                        <div
                          className="h-[100px] flex flex-col items-center justify-center gap-1"
                          style={{ background: 'linear-gradient(135deg, rgba(212,168,83,0.22) 0%, rgba(160,50,20,0.28) 100%)' }}
                        >
                          <div className="text-4xl">🎉</div>
                          <div className="text-brand-gold text-[9px] font-bold uppercase tracking-widest">Featured Event</div>
                        </div>
                        <div className="p-3" style={{ background: '#1a1a1a' }}>
                          <div className="text-brand-gold text-[9px] font-bold uppercase tracking-wide">Fri, May 2 · 7:00 PM</div>
                          <div className="text-text-primary text-xs font-semibold mt-0.5 leading-tight">Eid Celebration Night</div>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-text-muted text-[9px]">Navy Pier · Chicago</span>
                            <span className="text-emerald-400 text-[9px] font-bold bg-emerald-900/40 px-2 py-0.5 rounded-full">Free</span>
                          </div>
                        </div>
                      </div>

                      {/* Nearby spots */}
                      <div className="flex items-center justify-between px-0.5">
                        <span className="text-text-primary text-xs font-bold">Nearby Spots</span>
                        <span className="text-brand-gold text-[9px]">See all →</span>
                      </div>
                      <div className="flex gap-2">
                        {[
                          { emoji: '🥗', name: 'The Halal Guys', hood: 'Devon Ave', color: 'rgba(34,197,94,0.12)' },
                          { emoji: '🍖', name: 'Shawarma Palace', hood: 'Rogers Park', color: 'rgba(249,115,22,0.12)' },
                          { emoji: '☕', name: 'Gold Brew', hood: 'Wicker Park', color: 'rgba(212,168,83,0.12)' },
                        ].map((s, i) => (
                          <div key={i} className="flex-1 rounded-xl overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
                            <div className="h-10 flex items-center justify-center text-lg" style={{ background: s.color }}>{s.emoji}</div>
                            <div className="p-1.5">
                              <div className="text-text-primary text-[8px] font-semibold leading-tight truncate">{s.name}</div>
                              <div className="text-text-muted text-[7px] mt-0.5">{s.hood}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Tab bar */}
                      <div className="flex justify-around items-end pt-4 mt-1" style={{ borderTop: '1px solid #1e1e1e' }}>
                        {[
                          { icon: '⌂', label: 'Home', active: true },
                          { icon: '🗺', label: 'Map', active: false },
                          { icon: '＋', label: '', active: false, special: true },
                          { icon: '🔔', label: 'Alerts', active: false },
                          { icon: '👤', label: 'Me', active: false },
                        ].map((tab, i) => (
                          <div key={i} className="flex flex-col items-center gap-0.5">
                            {tab.special ? (
                              <div className="w-10 h-10 rounded-full bg-brand-gold flex items-center justify-center text-text-inverse font-bold text-lg shadow-lg" style={{ boxShadow: '0 0 16px rgba(212,168,83,0.5)' }}>
                                {tab.icon}
                              </div>
                            ) : (
                              <>
                                <span className={`text-base ${tab.active ? 'opacity-100' : 'opacity-30'}`}>{tab.icon}</span>
                                <span className={`text-[7px] ${tab.active ? 'text-brand-gold' : 'text-text-muted'}`}>{tab.label}</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Home indicator bar */}
                      <div className="flex justify-center pt-1">
                        <div className="w-28 h-1 rounded-full" style={{ background: '#333' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating toast — right */}
                <div
                  className="absolute -right-8 top-28 animate-toast-in-right rounded-2xl px-3.5 py-3 text-xs min-w-[152px]"
                  style={{
                    background: 'rgba(25,25,25,0.96)',
                    border: '1px solid rgba(212,168,83,0.35)',
                    backdropFilter: 'blur(16px)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.8), 0 0 20px rgba(212,168,83,0.08)',
                    animationDelay: '0.9s',
                    opacity: 0,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🎉</span>
                    <div>
                      <div className="text-text-primary font-bold text-[11px] leading-tight">New event nearby</div>
                      <div className="text-text-muted text-[10px] mt-0.5">Tonight · 0.4 mi away</div>
                    </div>
                  </div>
                </div>

                {/* Floating toast — left */}
                <div
                  className="absolute -left-10 bottom-36 animate-toast-in-left rounded-2xl px-3.5 py-3 text-xs min-w-[140px]"
                  style={{
                    background: 'rgba(25,25,25,0.96)',
                    border: '1px solid rgba(212,168,83,0.25)',
                    backdropFilter: 'blur(16px)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
                    animationDelay: '1.5s',
                    opacity: 0,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">⭐</span>
                    <div>
                      <div className="text-brand-gold font-bold text-[11px] leading-tight">#1 in Chicago</div>
                      <div className="text-text-muted text-[10px] mt-0.5">432 community saves</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Ticker — desktop only (stays pinned to bottom of hero) */}
          <div
            className="hidden md:block relative overflow-hidden border-t border-surface-border flex-shrink-0 z-10"
            style={{
              background: 'rgba(10,10,10,0.90)',
              backdropFilter: 'blur(8px)',
              paddingTop: '10px',
              paddingBottom: '10px',
            }}
          >
            <div className="flex animate-marquee whitespace-nowrap select-none">
              <span className="text-text-muted text-xs font-medium tracking-widest uppercase">
                {tickerText}&nbsp;&nbsp;·&nbsp;&nbsp;{tickerText}
              </span>
            </div>
          </div>
        </section>

        {/* Ticker — mobile only, right after hero, always fully visible */}
        <div
          className="md:hidden relative overflow-hidden border-y border-surface-border z-10"
          style={{
            background: 'rgba(10,10,10,0.95)',
            paddingTop: '11px',
            paddingBottom: '11px',
          }}
        >
          <div className="flex animate-marquee whitespace-nowrap select-none">
            <span className="text-text-muted text-xs font-medium tracking-widest uppercase">
              {tickerText}&nbsp;&nbsp;·&nbsp;&nbsp;{tickerText}
            </span>
          </div>
        </div>




        {/* ─────────────────────────────────────────────────────────────────
            STATS
        ───────────────────────────────────────────────────────────────── */}
        <section className="py-8 md:py-14 bg-background">
          <div className="max-w-5xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 text-center">
              {[
                { num: '400K+', label: 'Muslims in Chicago', icon: '👥' },
                { num: 'Free',  label: 'Forever for users',  icon: '💛' },
                { num: '1',     label: 'City. More coming.', icon: '🌆' },
                { num: '∞',     label: 'Community vibes',    icon: '✨' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl p-4 md:p-6 border border-surface-border hover:border-brand-gold/30 transition-all duration-300 group"
                  style={{ background: 'rgba(26,26,26,0.5)', backdropFilter: 'blur(8px)' }}
                >
                  <div className="text-3xl mb-2">{s.icon}</div>
                  <div
                    className="text-4xl font-bold mb-1"
                    style={{
                      background: 'linear-gradient(135deg, #D4A853, #E8C87E)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {s.num}
                  </div>
                  <div className="text-text-secondary text-sm">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* ─────────────────────────────────────────────────────────────────
            LIVE FEED — real app content
        ───────────────────────────────────────────────────────────────── */}
        {hasContent && (
          <section className="py-8 md:py-14 bg-background-elevated">
            <div className="max-w-7xl mx-auto px-4">
              <div className="text-center mb-5 md:mb-10">
                <div className="inline-flex items-center gap-2 rounded-pill px-4 py-1.5 mb-4 text-xs font-bold uppercase tracking-widest"
                  style={{ background: 'rgba(212,168,83,0.08)', border: '1px solid rgba(212,168,83,0.25)', color: '#D4A853' }}>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-gold" />
                  </span>
                  Live from the app
                </div>
                <h2 className="text-4xl font-bold text-text-primary mb-3">
                  What&apos;s on Muzgram right now
                </h2>
                <p className="text-text-secondary text-lg">Real listings. Real events. Your community, already there.</p>
              </div>

              {events.length > 0 && (
                <div className="mb-12">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-text-primary font-bold text-lg flex items-center gap-2">
                      <span>🎉</span> Upcoming Events
                    </h3>
                    <Link href="/chicago/go-out" className="text-brand-gold text-sm hover:underline">View all →</Link>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {events.slice(0, 3).map((e) => (
                      <Link
                        key={e.id}
                        href={`/chicago/events/${e.slug}`}
                        className="group relative rounded-2xl overflow-hidden border border-surface-border hover:border-brand-gold/40 transition-all duration-300 hover:-translate-y-1"
                        style={{ background: '#1a1a1a' }}
                      >
                        {e.cover_photo_url ? (
                          <img src={e.cover_photo_url} alt={e.title}
                            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-700" />
                        ) : (
                          <div className="w-full h-48 flex items-center justify-center text-6xl"
                            style={{ background: 'linear-gradient(135deg, rgba(212,168,83,0.15), rgba(180,80,30,0.15))' }}>
                            🎉
                          </div>
                        )}
                        <div
                          className="absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full"
                          style={{ background: e.is_free ? 'rgba(16,185,129,0.85)' : 'rgba(0,0,0,0.7)', color: e.is_free ? '#fff' : '#ccc', backdropFilter: 'blur(4px)' }}
                        >
                          {e.is_free ? 'Free' : e.price_cents ? `$${(e.price_cents / 100).toFixed(0)}` : 'Paid'}
                        </div>
                        <div className="p-5">
                          <div className="text-brand-gold text-[11px] font-bold uppercase tracking-wide mb-1.5">
                            {dateFmt.format(new Date(e.start_at))}
                          </div>
                          <h4 className="text-text-primary font-bold text-base leading-snug line-clamp-2 mb-2">{e.title}</h4>
                          <p className="text-text-muted text-sm truncate">{e.venue_name ?? 'Chicago'}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {listings.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-text-primary font-bold text-lg flex items-center gap-2">
                      <span>📍</span> Top Spots
                    </h3>
                    <Link href="/chicago/eat" className="text-brand-gold text-sm hover:underline">View all →</Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {listings.slice(0, 10).map((l) => (
                      <Link
                        key={l.id}
                        href={`/chicago/${l.main_category}/${l.slug}`}
                        className="group rounded-2xl overflow-hidden border border-surface-border hover:border-brand-gold/40 transition-all duration-300 hover:-translate-y-1"
                        style={{ background: '#1a1a1a' }}
                      >
                        {l.primary_photo_url ? (
                          <img src={l.primary_photo_url} alt={l.name}
                            className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-700" />
                        ) : (
                          <div className="w-full h-32 flex items-center justify-center text-3xl"
                            style={{ background: 'linear-gradient(135deg, #1a1a1a, #222)' }}>🍽</div>
                        )}
                        <div className="p-3">
                          <div className="text-text-primary font-semibold text-sm line-clamp-1">{l.name}</div>
                          <div className="text-text-muted text-xs mt-0.5">{l.neighborhood ?? 'Chicago'}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center mt-10">
                <Link href="/chicago"
                  className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-pill text-sm transition-all duration-300 hover:scale-105"
                  style={{ border: '1px solid rgba(212,168,83,0.4)', color: '#D4A853' }}>
                  Explore everything in Chicago →
                </Link>
              </div>
            </div>
          </section>
        )}


        {/* ─────────────────────────────────────────────────────────────────
            WHY MUZGRAM
        ───────────────────────────────────────────────────────────────── */}
        <section className="py-8 md:py-16 bg-background relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(circle, #D4A853 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          <div className="relative max-w-7xl mx-auto px-4">
            <div className="text-center mb-6 md:mb-12">
              <div className="text-brand-gold text-xs font-bold uppercase tracking-[0.2em] mb-3">Built different</div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary">
                The app your community<br />
                <span style={{
                  background: 'linear-gradient(135deg, #D4A853, #E8C87E)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>actually needed</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {FEATURES.map((f, i) => (
                <div
                  key={f.tag}
                  className="group relative rounded-3xl p-8 border transition-all duration-500 hover:-translate-y-2 cursor-default"
                  style={{
                    background: 'rgba(26,26,26,0.7)',
                    border: '1px solid rgba(42,42,42,1)',
                    backdropFilter: 'blur(16px)',
                    animationDelay: `${i * 0.15}s`,
                  }}
                >
                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse at top left, rgba(212,168,83,0.07) 0%, transparent 60%)' }}
                  />
                  <div
                    className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ border: '1px solid rgba(212,168,83,0.2)', borderRadius: 24 }}
                  />

                  <div
                    className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-300"
                    style={{ background: 'rgba(212,168,83,0.1)', border: '1px solid rgba(212,168,83,0.2)' }}
                  >
                    {f.emoji}
                  </div>

                  <div className="relative text-brand-gold text-[10px] font-bold uppercase tracking-[0.2em] mb-2">{f.tag}</div>
                  <h3 className="relative text-text-primary font-bold text-xl mb-3">{f.title}</h3>
                  <p className="relative text-text-secondary leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* ─────────────────────────────────────────────────────────────────
            COMING SOON CITIES
        ───────────────────────────────────────────────────────────────── */}
        <section className="py-8 md:py-16 bg-background-elevated relative overflow-hidden">
          {/* Background aurora */}
          <div
            className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 animate-aurora"
            style={{
              width: 800, height: 400, borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(212,168,83,0.06) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />

          <div className="relative max-w-7xl mx-auto px-4">
            <div className="text-center mb-6 md:mb-12">
              <div className="text-brand-gold text-xs font-bold uppercase tracking-[0.2em] mb-3">We&apos;re just getting started</div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary mb-3">
                Chicago is first.<br />
                <span style={{
                  background: 'linear-gradient(135deg, #D4A853, #E8C87E)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>Your city is next.</span>
              </h2>
              <p className="text-text-secondary text-lg max-w-xl mx-auto">
                We&apos;re building the platform for every Muslim community in North America.
                One city at a time.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">

              {/* Chicago — LIVE with animated border */}
              <Link href="/chicago" className="relative group col-span-2 sm:col-span-1">
                {/* Animated rotating border */}
                <div
                  className="absolute -inset-[1px] rounded-[25px] overflow-hidden animate-spin-slow pointer-events-none"
                  style={{ background: 'conic-gradient(from 0deg, transparent 0deg, #D4A853 60deg, #E8C87E 120deg, transparent 180deg, transparent 360deg)' }}
                />
                <div
                  className="relative rounded-3xl p-8 text-center group-hover:scale-[1.02] transition-transform duration-300 h-full"
                  style={{ background: 'linear-gradient(135deg, rgba(212,168,83,0.12), rgba(212,168,83,0.04))', border: 'none' }}
                >
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 bg-brand-gold text-text-inverse text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-text-inverse opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-text-inverse" />
                      </span>
                      NOW LIVE · BETA
                    </span>
                  </div>
                  <div className="text-5xl mb-4 mt-2">🌆</div>
                  <div className="text-text-primary font-bold text-xl mb-1">Chicago</div>
                  <div className="text-brand-gold text-sm font-semibold">400K+ Muslims</div>
                  <div className="mt-4 text-brand-gold text-xs underline underline-offset-2">Explore now →</div>
                </div>
              </Link>

              {/* Coming soon */}
              {COMING_SOON.map((c) => (
                <div
                  key={c.name}
                  className="relative rounded-3xl p-6 text-center border border-surface-border group hover:border-surface-elevated transition-colors duration-300"
                  style={{ background: 'rgba(26,26,26,0.5)' }}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className="text-xs font-bold px-3 py-1 rounded-full"
                      style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#606060' }}
                    >
                      SOON
                    </span>
                  </div>
                  <div className="text-4xl mb-3 mt-2 opacity-50 group-hover:opacity-70 transition-opacity">{c.emoji}</div>
                  <div className="text-text-secondary font-semibold">{c.name}</div>
                  <div className="text-text-muted text-xs mt-1">{c.pop} Muslims</div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <p className="text-text-muted mb-4 text-sm">Don&apos;t see your city?</p>
              <a
                href="mailto:hello@muzgram.com?subject=Launch Muzgram in my city"
                className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-pill text-sm transition-all hover:scale-105 duration-300"
                style={{ border: '1px solid rgba(212,168,83,0.35)', color: '#D4A853' }}
              >
                Request your city →
              </a>
            </div>
          </div>
        </section>


        {/* ─────────────────────────────────────────────────────────────────
            FOR BUSINESSES + ORGANIZERS
        ───────────────────────────────────────────────────────────────── */}
        <section className="py-8 md:py-14 bg-background">
          <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-4 md:gap-5">
            {[
              {
                emoji: '🏢',
                title: 'Own a business?',
                body: 'Get discovered by the community in your city. Manage your listing, respond to leads, and grow — all in one place.',
                cta: 'List your business',
                href: '/for-businesses',
                solid: true,
              },
              {
                emoji: '🎪',
                title: 'Organizing an event?',
                body: 'Stop flooding 12 WhatsApp groups. Reach the people who will actually show up — thousands of active community members.',
                cta: 'List your event',
                href: '/for-organizers',
                solid: false,
              },
            ].map((card) => (
              <div
                key={card.title}
                className="group relative rounded-3xl p-10 border border-surface-border hover:border-brand-gold/25 transition-all duration-300 overflow-hidden"
                style={{ background: '#1a1a1a' }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse at bottom right, rgba(212,168,83,0.05) 0%, transparent 60%)' }} />
                <div className="text-4xl mb-5">{card.emoji}</div>
                <h3 className="text-text-primary font-bold text-2xl mb-3">{card.title}</h3>
                <p className="text-text-secondary mb-8 leading-relaxed">{card.body}</p>
                <Link
                  href={card.href}
                  className={`inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-pill text-sm transition-all hover:scale-105 duration-200 ${card.solid ? 'bg-brand-gold text-text-inverse hover:bg-brand-gold-light' : 'border border-brand-gold/40 text-brand-gold hover:bg-brand-gold/10'}`}
                >
                  {card.cta} →
                </Link>
              </div>
            ))}
          </div>
        </section>


        {/* ─────────────────────────────────────────────────────────────────
            FINAL CTA
        ───────────────────────────────────────────────────────────────── */}
        <section className="relative py-10 md:py-20 overflow-hidden bg-background">
          {/* Gold radial glow */}
          <div
            className="pointer-events-none absolute inset-0 animate-glow-pulse"
            style={{
              background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(212,168,83,0.12) 0%, transparent 70%)',
            }}
          />
          {/* Grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: 'linear-gradient(#D4A853 1px, transparent 1px), linear-gradient(90deg, #D4A853 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          <div className="relative max-w-2xl mx-auto px-4 text-center">
            <div className="text-5xl mb-6">✨</div>
            <h2 className="text-5xl sm:text-6xl font-bold text-text-primary mb-5 leading-tight">
              Your community<br />
              <span style={{
                background: 'linear-gradient(135deg, #D4A853, #E8C87E, #D4A853)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'shimmer 3s linear infinite',
              }}>
                is already on it.
              </span>
            </h2>
            <p className="text-text-secondary text-xl mb-12 leading-relaxed">
              Live map. Event notifications. Community feed.<br />
              Free forever. Chicago is just the beginning.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://apps.apple.com/app/muzgram/id0000000000?utm_source=web&utm_medium=footer-cta"
                className="flex items-center justify-center gap-3 font-bold px-9 py-5 rounded-pill text-text-inverse text-lg transition-all hover:scale-105 duration-200"
                style={{ background: 'linear-gradient(135deg, #D4A853, #E8C87E 50%, #D4A853)', backgroundSize: '200% auto' }}
                rel="noopener"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current flex-shrink-0"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                Download for iOS
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.muzgram.android&utm_source=web&utm_medium=footer-cta"
                className="flex items-center justify-center gap-3 font-bold px-9 py-5 rounded-pill text-text-primary border-2 border-surface-border hover:border-brand-gold/60 hover:text-brand-gold transition-all duration-300 text-lg"
                rel="noopener"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current flex-shrink-0"><path d="M3.18 23.76c.34.19.72.24 1.1.14l12.7-7.34-2.87-2.87-10.93 10.07zm16.85-11.69L17.25 10.4l-3.06 3.06 3.06 3.06 2.81-1.62c.8-.46.8-1.57-.03-2.03zM2.19 1.28C2.07 1.5 2 1.76 2 2.06v19.88c0 .3.07.56.19.78l.11.1 11.14-11.14v-.26L2.3 1.18l-.11.1zm10.25 10.8L5.48 5.12l10.82 6.25-3.86 3.86v-3.15z"/></svg>
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
