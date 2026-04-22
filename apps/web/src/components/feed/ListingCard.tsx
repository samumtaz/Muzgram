import Image from 'next/image';
import Link from 'next/link';

const CATEGORY_ICONS: Record<string, string> = {
  eat: '🍽',
  go_out: '🎉',
  connect: '🤝',
  mosques: '🕌',
};

export interface ListingCardProps {
  slug: string;
  citySlug: string;
  name: string;
  main_category: string;
  subcategory_name: string | null;
  neighborhood: string | null;
  address: string | null;
  primary_photo_url: string | null;
  is_featured: boolean;
  save_count: number;
  priority?: boolean;
}

export function ListingCard({
  slug,
  citySlug,
  name,
  main_category,
  subcategory_name,
  neighborhood,
  address,
  primary_photo_url,
  is_featured,
  save_count,
  priority = false,
}: ListingCardProps) {
  const href = `/${citySlug}/places/${slug}`;
  const location = neighborhood ?? address ?? '';
  const label = subcategory_name ?? main_category;

  return (
    <Link
      href={href}
      className="group flex flex-col rounded-card bg-surface border border-surface-border overflow-hidden hover:border-brand-gold/40 transition-colors"
    >
      <div className="relative aspect-[4/3] bg-surface-elevated overflow-hidden">
        {primary_photo_url ? (
          <Image
            src={primary_photo_url}
            alt={name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {CATEGORY_ICONS[main_category] ?? '📍'}
          </div>
        )}
        {is_featured && (
          <span className="absolute top-2 left-2 bg-brand-gold text-text-inverse text-xs font-semibold px-2 py-0.5 rounded-badge">
            Featured
          </span>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1">
        <h3 className="text-text-primary font-semibold text-sm leading-snug line-clamp-1">
          {name}
        </h3>
        <div className="flex items-center justify-between gap-2">
          <span className="text-text-muted text-xs capitalize">{label}</span>
          {location && (
            <span className="text-text-muted text-xs truncate">{location}</span>
          )}
        </div>
        {save_count > 0 && (
          <span className="text-text-muted text-xs">{save_count} saves</span>
        )}
      </div>
    </Link>
  );
}
