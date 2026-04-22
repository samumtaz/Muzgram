import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Partial Pre-Rendering — static shell + dynamic slots
  experimental: {
    ppr: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.muzgram.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    return [
      {
        // Cache business + event detail pages at Cloudflare edge
        source: '/:city/places/:slug',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=86400, stale-while-revalidate=3600',
          },
          {
            key: 'Vary',
            value: 'Accept-Encoding',
          },
        ],
      },
      {
        // Short cache for tonight/this-weekend pages
        source: '/:city/tonight',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=300',
          },
        ],
      },
      {
        // Universal Links / App Links associations
        source: '/.well-known/:path*',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // Legacy paths
      {
        source: '/chicago',
        destination: '/chicago/eat',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
