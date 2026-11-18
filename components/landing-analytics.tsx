"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

function publicLandingPageview(event: BeforeSendEvent) {
  if (event.type !== "pageview") return null;
  const url = new URL(event.url, window.location.origin);
  if (url.origin !== window.location.origin || url.pathname !== "/") return null;
  return { ...event, url: url.origin + "/" };
}

export function LandingAnalytics() {
  return <Analytics beforeSend={publicLandingPageview} />;
}
