interface ListingForSchema {
  name: string;
  description: string | null;
  slug: string;
  city_slug: string;
  primary_photo_url: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  city_name: string;
  subcategory_name: string | null;
  main_category: string;
  price_range: string | null;
}

export function buildLocalBusinessSchema(listing: ListingForSchema) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: listing.name,
    url: `https://muzgram.com/${listing.city_slug}/places/${listing.slug}`,
    sameAs: listing.website ?? undefined,
    telephone: listing.phone ?? undefined,
    image: listing.primary_photo_url ?? undefined,
    priceRange: listing.price_range ?? undefined,
    address: listing.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: listing.address,
          addressLocality: listing.city_name,
          addressCountry: 'US',
        }
      : undefined,
  };

  if (listing.latitude != null && listing.longitude != null) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: listing.latitude,
      longitude: listing.longitude,
    };
  }

  if (listing.description) {
    schema.description = listing.description.slice(0, 200);
  }

  return schema;
}
