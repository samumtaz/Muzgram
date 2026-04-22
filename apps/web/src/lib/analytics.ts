// Server-safe analytics helpers (client calls go via the PostHogProvider)
// Import this in Server Components to get the PostHog write key for SSR identification

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '';
export const POSTHOG_HOST = 'https://app.posthog.com';

// Typed event names for consistency across web
export const WebEvents = {
  PAGE_VIEW: 'page_viewed',
  LISTING_VIEW: 'listing_viewed',
  INSTALL_CTA_CLICK: 'install_cta_clicked',
  BANNER_DISMISSED: 'app_banner_dismissed',
  STORE_LINK_CLICK: 'store_link_clicked',
} as const;
