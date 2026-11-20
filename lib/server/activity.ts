import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getAccountsConfig } from "./supabase";

export async function recordWalletDownload(kind: string) {
  const config = getAccountsConfig();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!config || !key) return;
  try {
    const server = createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await server.rpc("increment_card_activity", {
      event_name: "wallet_download", card_kind: kind, occurred_at: new Date().toISOString(),
    });
    if (error) console.error("Wallet download metric could not be recorded.");
  } catch {
    console.error("Wallet download metric could not be recorded.");
  }
}
