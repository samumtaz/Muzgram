import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'For Businesses — Grow Your Muslim Customer Base | Muzgram',
  description:
    'List your halal business on Muzgram and reach thousands of Muslim customers in your city. Manage your profile, receive leads, and boost your visibility.',
  alternates: { canonical: 'https://muzgram.com/for-businesses' },
};

const FEATURES = [
  {
    icon: '📍',
    title: 'Get Discovered',
    body: 'Your business appears in local searches, the city feed, and on the map — right when Muslims are looking for what you offer.',
  },
  {
    icon: '📬',
    title: 'Receive Leads',
    body: 'Customers can message you directly through the app. You get a full inbox to manage and respond to inquiries.',
  },
  {
    icon: '⭐',
    title: 'Daily Specials',
    body: "Post today's deals and specials that show up in the feed. Drive foot traffic with time-limited offers.",
  },
  {
    icon: '📊',
    title: 'Insights & Analytics',
    body: 'See how many people viewed your listing, tapped call, saved your page, or opened directions.',
  },
  {
    icon: '✓',
    title: 'Halal Verification',
    body: 'Get a verified halal badge displayed prominently on your listing. Build trust with your community.',
  },
  {
    icon: '🚀',
    title: 'Featured Placement',
    body: 'Boost your listing to the top of search results and the city feed with our Featured tier.',
  },
];

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: ['Basic listing', 'Up to 3 photos', 'Phone & website display', 'Appear in search'],
    cta: 'Claim Your Listing',
    href: 'muzgram://onboarding/business',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    features: [
      'Everything in Free',
      'Unlimited photos',
      'Lead inbox',
      'Daily specials',
      'Analytics dashboard',
      'Halal verification badge',
    ],
    cta: 'Start Pro — 14 Days Free',
    href: 'muzgram://onboarding/business?plan=pro',
    highlight: true,
  },
  {
    name: 'Featured',
    price: '$79',
    period: '/month',
    features: [
      'Everything in Pro',
      'Top of city feed',
      'Top of search results',
      'Featured badge',
      'Priority support',
    ],
    cta: 'Get Featured',
    href: 'muzgram://onboarding/business?plan=featured',
    highlight: false,
  },
];

export default function ForBusinessesPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-surface border-b border-surface-border py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              For Business Owners
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-4 leading-tight">
              Reach Muslims in Your City
            </h1>
            <p className="text-text-secondary text-lg max-w-xl mx-auto mb-8">
              Muzgram is where the community discovers restaurants, services, and events.
              Get your business in front of the right audience.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://apps.apple.com/app/muzgram/id0000000000"
                className="bg-brand-gold text-text-inverse font-semibold px-8 py-3.5 rounded-pill hover:bg-brand-gold-light transition-colors"
                rel="noopener"
              >
                Download & Claim Your Listing
              </a>
              <a
                href="#how-it-works"
                className="border border-surface-border text-text-secondary font-medium px-8 py-3.5 rounded-pill hover:border-brand-gold/50 transition-colors"
              >
                How It Works
              </a>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="how-it-works" className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-text-primary text-center mb-12">
              Everything You Need to Grow
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="bg-surface border border-surface-border rounded-card p-6"
                >
                  <div className="text-3xl mb-3">{f.icon}</div>
                  <h3 className="text-text-primary font-semibold mb-2">{f.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-16 px-4 bg-surface border-y border-surface-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-text-primary text-center mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-text-secondary text-center mb-12">
              Start free. Upgrade when you're ready.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-card p-6 border ${
                    plan.highlight
                      ? 'border-brand-gold bg-brand-gold/5'
                      : 'border-surface-border bg-background'
                  }`}
                >
                  {plan.highlight && (
                    <div className="text-brand-gold text-xs font-semibold uppercase tracking-wide mb-3">
                      Most Popular
                    </div>
                  )}
                  <div className="mb-4">
                    <span className="text-text-primary text-3xl font-bold">{plan.price}</span>
                    <span className="text-text-muted text-sm">{plan.period}</span>
                  </div>
                  <div className="text-text-primary font-semibold mb-4">{plan.name}</div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-text-secondary text-sm">
                        <span className="text-brand-gold mt-0.5">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={plan.href}
                    className={`block text-center py-2.5 rounded-pill font-medium text-sm transition-colors ${
                      plan.highlight
                        ? 'bg-brand-gold text-text-inverse hover:bg-brand-gold-light'
                        : 'border border-surface-border text-text-secondary hover:border-brand-gold/50'
                    }`}
                  >
                    {plan.cta}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-text-primary mb-3">
              Ready to Get Started?
            </h2>
            <p className="text-text-secondary mb-8">
              Download the Muzgram app and claim your business listing in minutes. Your community is already looking for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://apps.apple.com/app/muzgram/id0000000000"
                className="bg-brand-gold text-text-inverse font-semibold px-8 py-3.5 rounded-pill hover:bg-brand-gold-light transition-colors"
                rel="noopener"
              >
                Download for iOS
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.muzgram.android"
                className="border border-brand-gold text-brand-gold font-semibold px-8 py-3.5 rounded-pill hover:bg-brand-gold/10 transition-colors"
                rel="noopener"
              >
                Download for Android
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
