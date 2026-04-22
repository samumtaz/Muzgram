'use client';

import { useEffect, useState } from 'react';

const IOS_URL =
  'https://apps.apple.com/app/muzgram/id0000000000?utm_source=web&utm_medium=banner&utm_campaign=seo_page';
const ANDROID_URL =
  'https://play.google.com/store/apps/details?id=com.muzgram.android&utm_source=web&utm_medium=banner&utm_campaign=seo_page';
const DISMISS_KEY = 'muzgram_banner_dismissed_at';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function AppDownloadBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_TTL_MS) return;
    } catch {
      // localStorage unavailable — show banner
    }
    setVisible(true);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-surface-border px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-sm font-medium leading-tight">
            Open in Muzgram App
          </p>
          <p className="text-text-secondary text-xs truncate">
            See live map + real-time updates
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={IOS_URL}
            className="text-xs font-semibold bg-brand-gold text-text-inverse px-3 py-1.5 rounded-pill hover:bg-brand-gold-light transition-colors"
            rel="noopener"
          >
            App Store
          </a>
          <a
            href={ANDROID_URL}
            className="text-xs font-semibold border border-surface-border text-text-primary px-3 py-1.5 rounded-pill hover:border-brand-gold transition-colors"
            rel="noopener"
          >
            Play
          </a>
          <button
            onClick={dismiss}
            aria-label="Dismiss banner"
            className="text-text-muted hover:text-text-secondary text-lg leading-none p-1"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
