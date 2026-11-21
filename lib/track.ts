import { allowsBrowserMetrics } from "./analytics-choice";
export function track(event: string, kind?: string) {
  try {
    if (event !== "trial_card_created" && !allowsBrowserMetrics()) return;
    void fetch("/api/events", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, kind }),
    }).catch(() => {});
  } catch {
    // Analytics must never affect the page.
  }
}
