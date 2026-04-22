import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Download Muzgram — Find Halal Spots & Muslim Events',
  description:
    'Download Muzgram for iOS and Android. Find halal restaurants, Muslim events, and community services near you.',
  alternates: { canonical: 'https://muzgram.com/download' },
};

export default function DownloadPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-6">🌙</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
            Download Muzgram
          </h1>
          <p className="text-text-secondary text-lg mb-10">
            Find halal restaurants, Muslim events, and community businesses near you.
          </p>

          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <a
              href="https://apps.apple.com/app/muzgram/id0000000000"
              className="flex items-center justify-center gap-3 bg-brand-gold text-text-inverse font-semibold py-4 px-6 rounded-2xl hover:bg-brand-gold-light transition-colors"
              rel="noopener"
            >
              <span className="text-xl"></span>
              <div className="text-left">
                <div className="text-xs opacity-80">Download on the</div>
                <div className="text-base font-bold">App Store</div>
              </div>
            </a>

            <a
              href="https://play.google.com/store/apps/details?id=com.muzgram.android"
              className="flex items-center justify-center gap-3 bg-surface border border-surface-border text-text-primary font-semibold py-4 px-6 rounded-2xl hover:border-brand-gold/50 transition-colors"
              rel="noopener"
            >
              <span className="text-xl">▶</span>
              <div className="text-left">
                <div className="text-xs text-text-muted">Get it on</div>
                <div className="text-base font-bold">Google Play</div>
              </div>
            </a>
          </div>

          <p className="text-text-muted text-sm mt-8">
            Free to download. No account required to browse.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
