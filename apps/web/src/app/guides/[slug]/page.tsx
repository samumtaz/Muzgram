import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AppDownloadBanner } from '@/components/layout/AppDownloadBanner';
import { InstallCTA } from '@/components/conversion/InstallCTA';
import { SchemaScript } from '@/components/seo/SchemaScript';
import { BreadcrumbNav } from '@/components/seo/BreadcrumbNav';
import { buildBreadcrumbSchema } from '@/lib/schema/breadcrumb.schema';

export const revalidate = 86400;
export const dynamicParams = false;

interface Guide {
  slug: string;
  title: string;
  description: string;
  citySlug: string;
  cityName: string;
  emoji: string;
  sections: { heading: string; body: string }[];
  relatedLinks: { label: string; href: string }[];
}

const GUIDES: Guide[] = [
  {
    slug: 'halal-food-chicago',
    title: 'The Complete Guide to Halal Food in Chicago',
    description: 'Where to find the best halal restaurants, food trucks, and certified halal grocers in Chicago — by neighborhood.',
    citySlug: 'chicago',
    cityName: 'Chicago',
    emoji: '🍽',
    sections: [
      {
        heading: 'Why Chicago for Halal Food?',
        body: 'Chicago\'s Muslim community spans Devon Avenue, the South Side, and the suburbs. With over 400,000 Muslims in the metro area, the halal food scene is one of the most diverse in the Midwest — from Pakistani nihari houses on Devon to Somali restaurants on the South Side and Arab bakeries in the suburbs.',
      },
      {
        heading: 'Best Neighborhoods for Halal Food',
        body: 'Devon Avenue (West Rogers Park) is ground zero — dozens of Pakistani and Indian halal restaurants line the street. Bridgeview and Orland Park have large Arab communities with excellent Lebanese and Palestinian spots. The South Side (South Shore, Chatham) has the best East African halal food in the city.',
      },
      {
        heading: 'How to Verify Halal Certification',
        body: 'In Chicago, look for IFANCA (Islamic Food and Nutrition Council of America) certification — they\'re the most rigorous local certifier. Many restaurants are "owner-verified halal" which means the owner attests to halal sourcing but lacks a third-party certificate. Muzgram marks both clearly so you always know what you\'re getting.',
      },
      {
        heading: 'Halal Grocery Stores',
        body: 'For groceries, Whole Foods carries some halal meat, but dedicated halal butchers are far better value. Check the Muzgram listings for certified halal grocers near you.',
      },
    ],
    relatedLinks: [
      { label: 'Halal Restaurants in Chicago', href: '/chicago/eat' },
      { label: 'Events in Chicago', href: '/chicago/events' },
      { label: 'Mosques in Chicago', href: '/chicago/mosques' },
    ],
  },
  {
    slug: 'mosques-chicago',
    title: 'Mosques & Islamic Centers in Chicago: A Complete Guide',
    description: 'Find Friday Jummah prayer, Islamic schools, and community mosques across Chicago and the suburbs.',
    citySlug: 'chicago',
    cityName: 'Chicago',
    emoji: '🕌',
    sections: [
      {
        heading: 'Jummah Prayer Locations',
        body: 'Chicago has over 60 mosques across the city and suburbs. The Islamic Cultural Center of Greater Chicago in Northbrook is the largest, followed by the MCC (Muslim Community Center) on Elston Avenue in the northwest suburbs.',
      },
      {
        heading: 'Downtown and North Side',
        body: 'If you\'re in the Loop or Near North Side, the Downtown Islamic Center on South Wabash has Jummah at 12:30pm and 1:30pm on Fridays, accommodating the downtown working Muslim population.',
      },
      {
        heading: 'South Side Mosques',
        body: 'The South Side has a strong African-American Muslim community centered around Masjid Al-Faatir in Bronzeville and the Mosque Maryam (Nation of Islam headquarters) in Kenwood.',
      },
      {
        heading: 'Suburban Chicago',
        body: 'The suburbs of Lombard, Bolingbrook, Naperville, and Skokie have large South Asian Muslim communities with full-service Islamic centers offering weekend school, youth programs, and community events.',
      },
    ],
    relatedLinks: [
      { label: 'All Mosques in Chicago', href: '/chicago/mosques' },
      { label: 'Community Events', href: '/chicago/events' },
      { label: 'Muslim Services & Connect', href: '/chicago/connect' },
    ],
  },
  {
    slug: 'muslim-events-chicago',
    title: 'Muslim Events in Chicago: What\'s Happening This Month',
    description: 'Islamic conferences, Eid celebrations, community dinners, and cultural events for Muslims in Chicago.',
    citySlug: 'chicago',
    cityName: 'Chicago',
    emoji: '🗓️',
    sections: [
      {
        heading: 'Annual Events to Know',
        body: 'ISNA (Islamic Society of North America) Annual Convention is one of the largest Muslim gatherings in North America, held in Chicago most years. Eid prayer in the Chicago area draws thousands — the Bridgeview mosque holds one of the largest open-air Eid prayers in the Midwest.',
      },
      {
        heading: 'Ramadan in Chicago',
        body: 'Ramadan in Chicago is a full month of community. Most mosques offer nightly Tarawih prayer, and Devon Avenue transforms with late-night eateries open past midnight for suhoor. Many restaurants offer iftar buffets.',
      },
      {
        heading: 'Community Dinners and Fundraisers',
        body: 'Chicago\'s Muslim nonprofits (CAIR Chicago, Zakat Foundation, Inner-City Muslim Action Network) hold regular community events throughout the year. Check Muzgram events for upcoming fundraisers and community dinners.',
      },
    ],
    relatedLinks: [
      { label: 'Upcoming Events in Chicago', href: '/chicago/events' },
      { label: 'This Weekend in Chicago', href: '/chicago/this-weekend' },
      { label: 'Tonight in Chicago', href: '/chicago/tonight' },
    ],
  },
];

export async function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) return {};
  return {
    title: `${guide.title} | Muzgram`,
    description: guide.description,
    alternates: { canonical: `https://muzgram.com/guides/${slug}` },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: `https://muzgram.com/guides/${slug}`,
      siteName: 'Muzgram',
    },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) notFound();

  const schema = buildBreadcrumbSchema([
    { name: 'Home', url: 'https://muzgram.com' },
    { name: 'Guides', url: 'https://muzgram.com/guides' },
    { name: guide.title, url: `https://muzgram.com/guides/${slug}` },
  ]);

  return (
    <>
      <SchemaScript schema={[schema]} />
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <BreadcrumbNav items={[
          { name: 'Home', url: 'https://muzgram.com' },
          { name: guide.cityName, url: `https://muzgram.com/${guide.citySlug}` },
          { name: 'Guides', url: 'https://muzgram.com/guides' },
          { name: guide.title, url: `https://muzgram.com/guides/${slug}` },
        ]} />

        <div className="mt-6 mb-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">{guide.emoji}</span>
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary leading-tight">
              {guide.title}
            </h1>
          </div>
          <p className="text-text-secondary text-lg">{guide.description}</p>
        </div>

        <article className="prose prose-invert prose-lg max-w-none">
          {guide.sections.map((section) => (
            <section key={section.heading} className="mb-8">
              <h2 className="text-xl font-bold text-text-primary mb-3">{section.heading}</h2>
              <p className="text-text-secondary leading-relaxed">{section.body}</p>
            </section>
          ))}
        </article>

        <div className="mt-12 p-6 bg-surface-secondary rounded-xl border border-surface-tertiary">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Explore {guide.cityName}</h2>
          <div className="flex flex-col gap-2">
            {guide.relatedLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-brand-gold hover:underline text-sm"
              >
                {link.label} →
              </Link>
            ))}
          </div>
        </div>

        <section className="mt-12"><InstallCTA /></section>
      </main>
      <Footer />
      <AppDownloadBanner />
    </>
  );
}
