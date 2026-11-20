import { after } from "next/server";
import { activityEvents, recordActivity, type ActivityEvent } from "@/lib/server/activity";
import { isSameOriginForm } from "@/lib/server/account-request";
import { getAccountsConfig } from "@/lib/server/supabase";
import { destinationKinds } from "@/lib/cards";

// Only events the browser can see. Server-side events are recorded where they happen.
const browserEvents = new Set<ActivityEvent>(["cta_click", "trial_card_created", "trial_cards_saved", "share", "download_image", "wallet_tap"]);
const kinds = new Set<string>(["all", "universal", "landing_header", "landing_hero", "landing_footer", "trial_more", "trial_save", ...destinationKinds]);
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const config = getAccountsConfig();
  if (!config || !isSameOriginForm(request.headers, config.origin)) return new Response(null, { status: 403, headers });
  const body = await request.text().catch(() => "");
  if (body.length > 200) return new Response(null, { status: 413, headers });
  let input: { event?: unknown; kind?: unknown };
  try { input = JSON.parse(body); } catch { return new Response(null, { status: 400, headers }); }
  const event = activityEvents.find((name) => name === input.event);
  const kind = typeof input.kind === "string" && kinds.has(input.kind) ? input.kind : "all";
  if (!event || !browserEvents.has(event)) return new Response(null, { status: 400, headers });
  after(() => recordActivity(event, kind));
  return new Response(null, { status: 204, headers });
}
