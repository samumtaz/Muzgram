import Link from 'next/link';
import type { BreadcrumbItem } from '@/lib/schema/breadcrumb.schema';

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbNav({ items }: BreadcrumbNavProps) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-text-secondary">
        {items.map((item, index) => (
          <li key={item.url} className="flex items-center gap-1">
            {index > 0 && <span className="text-text-muted">/</span>}
            {index === items.length - 1 ? (
              <span className="text-text-primary" aria-current="page">
                {item.name}
              </span>
            ) : (
              <Link href={item.url} className="hover:text-brand-gold transition-colors">
                {item.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
