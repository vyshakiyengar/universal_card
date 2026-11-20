import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getAccountsConfig } from "./supabase";

export const activityEvents = [
  "wallet_download", "cta_click", "sign_in_started", "trial_started", "trial_card_created",
  "trial_cards_saved", "share", "download_image", "wallet_tap",
] as const;
export type ActivityEvent = (typeof activityEvents)[number];

// Adds one to an aggregate daily counter. Counts carry no account or card data.
export async function recordActivity(event: ActivityEvent, kind = "all") {
  const config = getAccountsConfig();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!config || !key) return;
  try {
    const server = createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await server.rpc("increment_card_activity", {
      event_name: event, card_kind: kind, occurred_at: new Date().toISOString(),
    });
    if (error) console.error(`Activity metric ${event} could not be recorded.`);
  } catch {
    console.error(`Activity metric ${event} could not be recorded.`);
  }
}

export function recordWalletDownload(kind: string) {
  return recordActivity("wallet_download", kind);
}
