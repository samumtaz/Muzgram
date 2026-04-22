import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'For Event Organizers — List Your Muslim Events | Muzgram',
  description:
    'List your Muslim events on Muzgram and reach thousands of local community members. Eid events, Islamic classes, sports, and more.',
  alternates: { canonical: 'https://muzgram.com/for-organizers' },
};

const FEATURES = [
  {
    icon: '📢',
    title: 'Reach Your Community',
    body: 'Your event reaches Muslims actively looking for things to do near them — not just followers of your page.',
  },
  {
    icon: '🔔',
    title: 'Push Notifications',
    body: 'Users who save your event get reminder notifications the day before and the day of. No-show rate drops dramatically.',
  },
  {
    icon: '🗓',
    title: 'Recurring Events',
    body: 'Set up weekly halaqa, monthly dinners, or any recurring event once and it stays in the feed automatically.',
  },
  {
    icon: '🎫',
    title: 'Ticket Links',
    body: 'Sell tickets via Eventbrite, your website, or anywhere else — just add the link and we drive traffic there.',
  },
  {
    icon: '📍',
    title: 'Map Discovery',
    body: 'Your event appears as a pin on the map for anyone browsing nearby — zero extra effort.',
  },
  {
    icon: '🤝',
    title: 'Community Credibility',
    body: 'Listing on Muzgram signals your event is legit. Muslims trust the platform because of its community-first curation.',
  },
];

export default function ForOrganizersPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-surface border-b border-surface-border py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              For Event Organizers
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-4 leading-tight">
              Fill Your Events with the Right Crowd
            </h1>
            <p className="text-text-secondary text-lg max-w-xl mx-auto mb-8">
              Muzgram is where young Muslims find events near them. List your event and get in front of thousands of active community members.
            </p>
            <a
              href="https://apps.apple.com/app/muzgram/id0000000000"
              className="inline-block bg-brand-gold text-text-inverse font-semibold px-8 py-3.5 rounded-pill hover:bg-brand-gold-light transition-colors"
              rel="noopener"
            >
              List Your Event Free
            </a>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-text-primary text-center mb-12">
              Why Organizers Choose Muzgram
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

        {/* Event types */}
        <section className="py-16 px-4 bg-surface border-y border-surface-border">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-text-primary mb-4">
              What Kind of Events?
            </h2>
            <p className="text-text-secondary mb-8">
              Any event where Muslims gather — big or small.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                'Eid Celebrations', 'Halal Food Events', 'Islamic Lectures', 'Halaqa Circles',
                'Muslim Networking', 'Sports Tournaments', 'Charity Fundraisers',
                'Cultural Festivals', 'Wedding Expos', 'Ramadan Iftars', 'Youth Events', 'Workshops',
              ].map((type) => (
                <span
                  key={type}
                  className="bg-background border border-surface-border text-text-secondary text-sm px-3 py-1.5 rounded-full"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-text-primary mb-3">
              List Your Next Event
            </h2>
            <p className="text-text-secondary mb-8">
              Download the Muzgram app to list your event. It takes under 5 minutes and it's free.
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
