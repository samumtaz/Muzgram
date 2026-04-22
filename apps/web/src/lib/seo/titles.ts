const CATEGORY_LABELS: Record<string, string> = {
  eat: 'Halal Restaurants & Food',
  go_out: 'Muslim Events & Nightlife',
  connect: 'Muslim Services & Community',
  mosques: 'Mosques',
};

export function businessTitle(
  name: string,
  subcategoryName: string | null,
  neighborhood: string | null,
  cityName: string,
): string {
  const location = neighborhood ?? cityName;
  const mid = subcategoryName ? `Halal ${subcategoryName} in` : 'in';
  return `${name} — ${mid} ${location} | Muzgram`;
}

export function cityTitle(cityName: string): string {
  return `Halal Spots, Events & Services in ${cityName} | Muzgram`;
}

export function cityDescription(cityName: string, listingCount: number, eventCount: number): string {
  return `Discover ${listingCount}+ halal restaurants, Muslim events, and community services in ${cityName}. ${eventCount > 0 ? `${eventCount} upcoming events.` : ''} Download Muzgram.`;
}

export function categoryTitle(category: string, cityName: string): string {
  return `${CATEGORY_LABELS[category] ?? category} in ${cityName} | Muzgram`;
}

export function subcategoryTitle(subcategoryName: string, cityName: string): string {
  return `Best ${subcategoryName} in ${cityName} — Halal & Muslim-Friendly | Muzgram`;
}

export function businessDescription(name: string, description: string | null, cityName: string): string {
  const excerpt = description ? description.slice(0, 100) : '';
  return `${name} in ${cityName}${excerpt ? ` — ${excerpt}...` : ''}. See hours, photos, and get directions on Muzgram.`;
}
