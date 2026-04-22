import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy | Muzgram',
  description: 'Muzgram Privacy Policy — how we collect, use, and protect your data.',
  alternates: { canonical: 'https://muzgram.com/privacy' },
};

const EFFECTIVE_DATE = 'April 1, 2026';

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Privacy Policy</h1>
        <p className="text-text-muted text-sm mb-10">Effective date: {EFFECTIVE_DATE}</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-text-secondary leading-relaxed">
          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">1. Introduction</h2>
            <p>
              Muzgram, Inc. (&ldquo;Muzgram,&rdquo; &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) operates the Muzgram mobile application and website (collectively, the &ldquo;Service&rdquo;). This Privacy Policy explains how we collect, use, and share information about you when you use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect information you provide directly to us, including:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Phone number (used for account creation via SMS verification)</li>
              <li>Display name and profile photo (optional)</li>
              <li>Neighborhood or city (optional, used for local feed)</li>
              <li>Content you post, save, or share</li>
            </ul>
            <p className="mt-3">We also collect information automatically when you use the Service:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Location (only when you grant permission — used to show nearby content)</li>
              <li>Device information (model, OS, app version)</li>
              <li>Usage data (screens viewed, taps, session duration)</li>
              <li>IP address and approximate location derived from it</li>
            </ul>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide and improve the Service</li>
              <li>To personalize your feed based on location and interests</li>
              <li>To send notifications you've opted into (events, Jumu'ah reminders)</li>
              <li>To facilitate communication between you and businesses</li>
              <li>To detect and prevent fraud and abuse</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">4. Information Sharing</h2>
            <p>We do not sell your personal information. We share your information only:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>With service providers that help us operate the Service (hosting, analytics, push notifications)</li>
              <li>With businesses you choose to contact through the app (your message and phone number)</li>
              <li>When required by law or to protect rights and safety</li>
              <li>In connection with a merger or acquisition (you will be notified)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">5. Location Data</h2>
            <p>
              We request access to your device location to show you nearby listings and events. Location access is optional — you can use the Service without it, but local results will not be shown. We do not track your location in the background or sell location data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">6. Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active or as needed to provide the Service. You can request deletion of your account and associated data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">7. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Access the personal information we hold about you</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your information</li>
              <li>Opt out of marketing communications</li>
              <li>Data portability</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, contact us at{' '}
              <a href="mailto:privacy@muzgram.com" className="text-brand-gold hover:underline">
                privacy@muzgram.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">8. Children</h2>
            <p>
              The Service is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes via the app or email. Continued use of the Service after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">10. Contact</h2>
            <p>
              Questions? Email us at{' '}
              <a href="mailto:privacy@muzgram.com" className="text-brand-gold hover:underline">
                privacy@muzgram.com
              </a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
