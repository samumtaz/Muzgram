import Link from 'next/link';

export function HomepageHeader() {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="text-brand-gold font-bold text-xl tracking-tight flex-shrink-0">
          Muzgram
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm">
          <Link href="/for-businesses" className="px-3 py-1.5 text-text-secondary hover:text-text-primary transition-colors">
            For Businesses
          </Link>
          <Link href="/for-organizers" className="px-3 py-1.5 text-text-secondary hover:text-text-primary transition-colors">
            For Organizers
          </Link>
          <Link href="/chicago" className="px-3 py-1.5 text-text-secondary hover:text-text-primary transition-colors">
            Explore Chicago
          </Link>
        </nav>

        <a
          href="https://apps.apple.com/app/muzgram/id0000000000?utm_source=web&utm_medium=header&utm_campaign=nav"
          className="text-sm font-semibold bg-brand-gold text-text-inverse px-4 py-1.5 rounded-pill hover:bg-brand-gold-light transition-colors flex-shrink-0"
          rel="noopener"
        >
          Get App
        </a>
      </div>
    </header>
  );
}
