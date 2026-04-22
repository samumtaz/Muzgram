import Link from 'next/link';

const NAV_LINKS = [
  { label: 'Eat', href: '/chicago/eat' },
  { label: 'Go Out', href: '/chicago/go-out' },
  { label: 'Connect', href: '/chicago/connect' },
  { label: 'Mosques', href: '/chicago/mosques' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-surface-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-brand-gold font-bold text-xl tracking-tight">Muzgram</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface rounded-badge transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="https://apps.apple.com/app/muzgram/id0000000000?utm_source=web&utm_medium=header&utm_campaign=nav"
          className="text-sm font-semibold bg-brand-gold text-text-inverse px-4 py-1.5 rounded-pill hover:bg-brand-gold-light transition-colors flex-shrink-0"
          rel="noopener"
        >
          Get App
        </Link>
      </div>
    </header>
  );
}
