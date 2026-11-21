"use client";

import { useEffect } from "react";
import { allowsBrowserMetrics } from "@/lib/analytics-choice";
import { track } from "@/lib/track";

// Counts one visit per page per browser session, for the admin funnel.
export function VisitBeacon({ page }: { page: "landing" | "studio" }) {
  useEffect(() => {
    try {
      if (!allowsBrowserMetrics()) return;
      const key = `heya_visit_${page}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Private mode without storage: still count it.
    }
    track("visit", page);
  }, [page]);
  return null;
}
