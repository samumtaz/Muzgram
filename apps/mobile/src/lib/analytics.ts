import PostHog from 'posthog-react-native';

let _client: PostHog | null = null;

export function getPostHog(): PostHog | null {
  return _client;
}

export function initPostHog() {
  if (_client) return _client;
  if (!process.env.EXPO_PUBLIC_POSTHOG_KEY) return null;

  _client = new PostHog(process.env.EXPO_PUBLIC_POSTHOG_KEY, {
    host: 'https://app.posthog.com',
    captureNativeAppLifecycleEvents: true,
  });

  return _client;
}

export function identify(userId: string, properties?: Record<string, any>) {
  _client?.identify(userId, properties);
}

export function track(event: string, properties?: Record<string, any>) {
  _client?.capture(event, properties);
}

export function screen(name: string, properties?: Record<string, any>) {
  _client?.screen(name, properties);
}

export function reset() {
  _client?.reset();
}

// Typed event helpers
export const Analytics = {
  feedView: (citySlug: string) => track('feed_viewed', { city_slug: citySlug }),
  listingView: (listingId: string, category: string) =>
    track('listing_viewed', { listing_id: listingId, category }),
  listingSave: (listingId: string) => track('listing_saved', { listing_id: listingId }),
  eventView: (eventId: string) => track('event_viewed', { event_id: eventId }),
  searchQuery: (query: string, resultsCount: number) =>
    track('search_performed', { query, results_count: resultsCount }),
  leadSubmitted: (listingId: string) => track('lead_submitted', { listing_id: listingId }),
  checkoutStarted: (product: string) => track('checkout_started', { product }),
  notificationOpened: (notifType: string) =>
    track('notification_opened', { notification_type: notifType }),
};
