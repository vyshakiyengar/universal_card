"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RefreshMetrics() {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 120_000);
    return () => window.clearInterval(timer);
  }, [router]);
  return null;
}
