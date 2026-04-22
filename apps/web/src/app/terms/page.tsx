import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service | Muzgram',
  description: 'Muzgram Terms of Service — rules and guidelines for using the Muzgram platform.',
  alternates: { canonical: 'https://muzgram.com/terms' },
};

const EFFECTIVE_DATE = 'April 1, 2026';

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Terms of Service</h1>
        <p className="text-text-muted text-sm mb-10">Effective date: {EFFECTIVE_DATE}</p>

        <div className="space-y-8 text-text-secondary leading-relaxed text-sm">
          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">1. Acceptance of Terms</h2>
            <p>
              By downloading, installing, or using the Muzgram app or website (the &ldquo;Service&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">2. Eligibility</h2>
            <p>
              You must be at least 13 years old to use the Service. By using the Service, you represent that you are at least 13 years old and have the legal capacity to enter into these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">3. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately of any unauthorized use at{' '}
              <a href="mailto:support@muzgram.com" className="text-brand-gold hover:underline">
                support@muzgram.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">4. Content Standards</h2>
            <p className="mb-2">You agree not to post, upload, or share content that:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Is false, misleading, or fraudulent</li>
              <li>Is defamatory, harassing, or abusive</li>
              <li>Contains spam, commercial solicitations, or pyramid schemes</li>
              <li>Violates any applicable law or regulation</li>
              <li>Infringes on any third party's intellectual property rights</li>
              <li>Contains viruses or malicious code</li>
            </ul>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">5. Business Listings</h2>
            <p>
              Business owners are responsible for ensuring the accuracy of their listing information, including halal certification status. Muzgram does not independently verify all claims made in listings. Providing false halal certification information may result in permanent removal and legal action.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">6. Intellectual Property</h2>
            <p>
              The Service and its content (excluding user-submitted content) are owned by Muzgram and protected by copyright, trademark, and other laws. You may not reproduce, distribute, or create derivative works without our express written permission.
            </p>
            <p className="mt-2">
              By submitting content to the Service, you grant Muzgram a worldwide, non-exclusive, royalty-free license to use, display, and distribute that content in connection with operating the Service.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">7. Payments & Subscriptions</h2>
            <p>
              Business subscription fees are charged in advance on a monthly or annual basis. All fees are non-refundable except as required by applicable law. We reserve the right to change pricing with 30 days' notice.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">8. Termination</h2>
            <p>
              We may suspend or terminate your account at any time for violation of these Terms or for any other reason at our sole discretion. You may delete your account at any time through the app settings.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">9. Disclaimers</h2>
            <p>
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTIES OF ANY KIND. MUZGRAM DOES NOT WARRANT THE ACCURACY OF LISTINGS, EVENTS, OR USER-GENERATED CONTENT. USE OF THE SERVICE IS AT YOUR OWN RISK.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">10. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, MUZGRAM SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">11. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of Illinois, without regard to conflict of law principles. Any disputes shall be resolved in the courts of Cook County, Illinois.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">12. Contact</h2>
            <p>
              Questions about these Terms? Contact us at{' '}
              <a href="mailto:legal@muzgram.com" className="text-brand-gold hover:underline">
                legal@muzgram.com
              </a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
