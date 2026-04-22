import Image from 'next/image';
import Link from 'next/link';

export interface EventCardProps {
  slug: string;
  citySlug: string;
  title: string;
  start_at: string;
  venue_name: string | null;
  neighborhood: string | null;
  cover_photo_url: string | null;
  price_cents: number | null;
  is_featured?: boolean;
}

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function EventCard({
  slug,
  citySlug,
  title,
  start_at,
  venue_name,
  neighborhood,
  cover_photo_url,
  price_cents,
  is_featured,
}: EventCardProps) {
  const href = `/${citySlug}/events/${slug}`;
  const priceLabel =
    price_cents === 0 || price_cents === null
      ? 'Free'
      : `$${(price_cents / 100).toFixed(0)}`;

  return (
    <Link
      href={href}
      className="group flex gap-3 rounded-card bg-surface border border-surface-border p-3 hover:border-brand-gold/40 transition-colors"
    >
      <div className="relative w-20 h-20 flex-shrink-0 rounded-badge overflow-hidden bg-surface-elevated">
        {cover_photo_url ? (
          <Image
            src={cover_photo_url}
            alt={title}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🎉</div>
        )}
      </div>

      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <h3 className="text-text-primary font-semibold text-sm leading-snug line-clamp-2">
          {title}
        </h3>
        <p className="text-text-muted text-xs">{formatEventDate(start_at)}</p>
        {(venue_name || neighborhood) && (
          <p className="text-text-secondary text-xs truncate">
            {venue_name ?? neighborhood}
          </p>
        )}
        <div className="flex items-center justify-between mt-auto">
          <span className="text-brand-gold text-xs font-medium">{priceLabel}</span>
          {is_featured && (
            <span className="text-xs text-brand-gold border border-brand-gold/40 px-1.5 py-0.5 rounded-badge">
              Featured
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
