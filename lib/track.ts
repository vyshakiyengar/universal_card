// Sends an anonymous, aggregate-only event. Never blocks or throws.
export function track(event: string, kind?: string) {
  try {
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
