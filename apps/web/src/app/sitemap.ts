import type { MetadataRoute } from 'next';
import { query } from '@/lib/db';

interface ListingSlug {
  city_slug: string;
  slug: string;
  updated_at: string;
}

interface EventSlug {
  city_slug: string;
  slug: string;
  updated_at: string;
}

interface CitySlug {
  slug: string;
  updated_at: string;
}

const BASE = 'https://muzgram.com';

export const revalidate = 1800; // 30min

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [listings, events, cities] = await Promise.all([
    query<ListingSlug>(`
      SELECT l.slug, c.slug AS city_slug, l.updated_at
      FROM listings l
      JOIN cities c ON l.city_id = c.id
      WHERE l.is_active = true
        AND l.slug IS NOT NULL
        AND c.launch_status = 'active'
      ORDER BY l.save_count DESC
      LIMIT 50000
    `),
    query<EventSlug>(`
      SELECT e.slug, c.slug AS city_slug, e.updated_at
      FROM events e
      JOIN cities c ON e.city_id = c.id
      WHERE e.is_active = true
        AND e.slug IS NOT NULL
        AND c.launch_status = 'active'
        AND e.start_at > NOW() - INTERVAL '7 days'
    `),
    query<CitySlug>(`
      SELECT slug, updated_at FROM cities
      WHERE launch_status = 'active'
    `),
  ]);

  const staticUrls: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/for-businesses`, changeFrequency: 'monthly', priority: 0.5 },
  ];

  const cityUrls: MetadataRoute.Sitemap = cities.flatMap((c) => [
    {
      url: `${BASE}/${c.slug}`,
      lastModified: new Date(c.updated_at),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${BASE}/${c.slug}/eat`,
      lastModified: new Date(c.updated_at),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${BASE}/${c.slug}/go-out`,
      lastModified: new Date(c.updated_at),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${BASE}/${c.slug}/connect`,
      lastModified: new Date(c.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
  ]);

  const listingUrls: MetadataRoute.Sitemap = listings.map((l) => ({
    url: `${BASE}/${l.city_slug}/places/${l.slug}`,
    lastModified: new Date(l.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const eventUrls: MetadataRoute.Sitemap = events.map((e) => ({
    url: `${BASE}/${e.city_slug}/events/${e.slug}`,
    lastModified: new Date(e.updated_at),
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }));

  return [...staticUrls, ...cityUrls, ...listingUrls, ...eventUrls];
}
