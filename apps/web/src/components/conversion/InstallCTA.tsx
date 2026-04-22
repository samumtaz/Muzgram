const IOS_URL =
  'https://apps.apple.com/app/muzgram/id0000000000?utm_source=web&utm_medium=cta&utm_campaign=seo_page';
const ANDROID_URL =
  'https://play.google.com/store/apps/details?id=com.muzgram.android&utm_source=web&utm_medium=cta&utm_campaign=seo_page';

interface InstallCTAProps {
  headline?: string;
  subtext?: string;
}

export function InstallCTA({
  headline = 'Get the full experience on Muzgram',
  subtext = 'Live map, real-time updates, and 500+ halal spots in Chicago.',
}: InstallCTAProps) {
  return (
    <div className="rounded-card bg-surface-elevated border border-surface-border p-6 text-center">
      <div className="text-brand-gold text-2xl mb-2">★</div>
      <h3 className="text-text-primary font-semibold text-lg mb-1">{headline}</h3>
      <p className="text-text-secondary text-sm mb-4">{subtext}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href={IOS_URL}
          className="flex items-center justify-center gap-2 bg-brand-gold text-text-inverse font-semibold px-5 py-3 rounded-pill text-sm hover:bg-brand-gold-light transition-colors"
          rel="noopener"
        >
          <span>🍎</span> App Store
        </a>
        <a
          href={ANDROID_URL}
          className="flex items-center justify-center gap-2 border border-surface-border text-text-primary font-semibold px-5 py-3 rounded-pill text-sm hover:border-brand-gold transition-colors"
          rel="noopener"
        >
          <span>▶</span> Google Play
        </a>
      </div>
    </div>
  );
}
