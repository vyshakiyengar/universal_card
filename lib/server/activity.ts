import "server-only";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createAccountsClient, getAccountsConfig } from "./supabase";

export const activityEvents = [
  "wallet_download", "cta_click", "sign_in_started", "trial_started", "trial_card_created",
  "trial_cards_saved", "share", "download_image", "wallet_tap", "visit", "signed_in",
] as const;
export type ActivityEvent = (typeof activityEvents)[number];

// A random first-party ID for one browser, so the admin funnel can count unique visitors.
// It carries no personal data and is never shared.
export const visitorCookie = "heya_vid";
export const visitorCookieMaxAge = 60 * 60 * 24 * 365;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const validVisitorId = (value: string | null | undefined) => (value && uuid.test(value) ? value : null);

export type ActivityContext = { visitorId?: string | null; userId?: string | null };

// Who is acting: the visitor cookie and, if signed in, the account. Call it in Route
// Handlers and Server Functions (also inside after()), or before after() in pages.
export async function activityContext(): Promise<ActivityContext> {
  const visitorId = validVisitorId((await cookies()).get(visitorCookie)?.value);
  let userId: string | null = null;
  try {
    const supabase = await createAccountsClient();
    const { data } = (await supabase?.auth.getClaims()) ?? { data: null };
    userId = validVisitorId(typeof data?.claims?.sub === "string" ? data.claims.sub : null);
  } catch {
    // Signed-out or unreachable: record the visitor only.
  }
  return { visitorId, userId };
}

// Records one event row (for unique counts) and bumps the daily counter.
export async function recordActivity(event: ActivityEvent, kind = "all", context: ActivityContext = {}) {
  const config = getAccountsConfig();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!config || !key) {
    if (process.env.VERCEL_ENV === "production") console.error("[heya] Activity is not recorded: SUPABASE_SECRET_KEY is missing.");
    return;
  }
  try {
    const server = createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await server.rpc("record_activity_event", {
      event_name: event,
      card_kind: kind,
      visitor: validVisitorId(context.visitorId),
      account: validVisitorId(context.userId),
    });
    if (error) console.error(`Activity metric ${event} could not be recorded.`);
  } catch {
    console.error(`Activity metric ${event} could not be recorded.`);
  }
}

export function recordWalletDownload(kind: string, context: ActivityContext = {}) {
  return recordActivity("wallet_download", kind, context);
}
