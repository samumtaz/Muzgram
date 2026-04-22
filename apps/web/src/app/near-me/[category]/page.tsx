import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

const CATEGORY_MAP: Record<string, { city_route: string; label: string }> = {
  'halal-restaurants': { city_route: 'eat', label: 'Halal Restaurants' },
  'halal-food':        { city_route: 'eat', label: 'Halal Food' },
  'mosques':           { city_route: 'mosques', label: 'Mosques' },
  'islamic-centers':   { city_route: 'mosques', label: 'Islamic Centers' },
  'events':            { city_route: 'events', label: 'Events' },
  'muslim-events':     { city_route: 'events', label: 'Muslim Events' },
  'places':            { city_route: 'go-out', label: 'Places' },
  'services':          { city_route: 'connect', label: 'Services' },
};

const DEFAULT_CITY = 'chicago';

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const info = CATEGORY_MAP[category];
  const label = info?.label ?? category.replace(/-/g, ' ');
  return {
    title: `${label} Near Me | Muzgram`,
    description: `Find ${label.toLowerCase()} near you — Muslim-verified listings on Muzgram.`,
    robots: { index: false },
  };
}

export default async function NearMePage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const info = CATEGORY_MAP[category];
  const cityRoute = info?.city_route ?? 'eat';

  const headersList = await headers();
  const cfIpCity = headersList.get('cf-ipcity');
  const cfRegionCode = headersList.get('cf-regioncode');

  let citySlug = DEFAULT_CITY;

  if (cfIpCity) {
    const normalized = cfIpCity.toLowerCase().replace(/\s+/g, '-');
    const cities = await query<{ slug: string }>(
      `SELECT slug FROM cities WHERE slug = $1 AND launch_status = 'active' LIMIT 1`,
      [normalized]
    );
    if (cities[0]) citySlug = cities[0].slug;
  }

  redirect(`/${citySlug}/${cityRoute}`);
}
