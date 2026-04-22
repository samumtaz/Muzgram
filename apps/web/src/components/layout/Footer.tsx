import Link from 'next/link';

const LINKS = [
  { label: 'About', href: '/about' },
  { label: 'For Businesses', href: '/for-businesses' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Contact', href: '/contact' },
];

export function Footer() {
  return (
    <footer className="border-t border-surface-border bg-background mt-16">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <Link href="/" className="text-brand-gold font-bold text-lg">
              Muzgram
            </Link>
            <p className="text-text-muted text-sm mt-1">
              Where your community eats, goes out, and connects.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-surface-border text-text-muted text-xs">
          © {new Date().getFullYear()} Muzgram. Chicago, IL.
        </div>
      </div>
    </footer>
  );
}
