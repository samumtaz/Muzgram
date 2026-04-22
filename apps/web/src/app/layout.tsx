import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { PostHogProvider } from '@/components/analytics/PostHogProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://muzgram.com'),
  title: {
    default: 'Muzgram — Halal Spots, Events & Services for Muslims',
    template: '%s | Muzgram',
  },
  description:
    'Discover halal restaurants, Muslim events, and community services near you. The social ecosystem for young Muslims in Chicago.',
  keywords: ['halal', 'Muslim', 'Chicago', 'restaurant', 'events', 'community'],
  openGraph: {
    type: 'website',
    siteName: 'Muzgram',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@muzgramapp',
  },
  other: {
    'apple-itunes-app': 'app-id=0000000000',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-background text-text-primary font-sans antialiased">
        <PostHogProvider>
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
