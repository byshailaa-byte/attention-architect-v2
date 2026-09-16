// Client-side GA4 helper shared across pages.
// Queues events fired before GTM loads; the queue is flushed synchronously
// inside the ga4-init inline script in app/analytics.tsx the moment gtag
// becomes available. Other pages (report, assessment) call their own local
// fireGtag copies — they don't need queueing because GTM has already loaded
// by the time users reach those pages.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    __gtagQueue?: Array<{ event: string; params: Record<string, unknown> }>;
  }
}

export function fireGtag(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") {
    window.gtag("event", event, params ?? {});
  } else {
    window.__gtagQueue = window.__gtagQueue ?? [];
    window.__gtagQueue.push({ event, params: params ?? {} });
  }
}
