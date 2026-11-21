import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { RawAccount, RawCard, RawEvent } from "../admin-metrics";
import { getAccountsConfig } from "./supabase";

const pageSize = 1000;

// Reads the raw recorded actions, account cards and accounts with the server key. Admin page only.
export async function loadAdminData(): Promise<{ events: RawEvent[]; cards: RawCard[]; accounts: RawAccount[] }> {
  const config = getAccountsConfig();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!config || !key) throw new Error("SUPABASE_SECRET_KEY is missing");
  const db = createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { count, error: countError } = await db.from("activity_events").select("id", { count: "exact", head: true });
  if (countError) throw Object.assign(new Error(`activity count: ${countError.message}`), { code: countError.code });
  const pages = Math.ceil((count ?? 0) / pageSize);
  const events: RawEvent[] = [];
  for (let start = 0; start < pages; start += 6) {
    const batch = await Promise.all(Array.from({ length: Math.min(6, pages - start) }, (_, i) =>
      db.from("activity_events").select("at,event,kind,visitor_id,user_id").order("id").range((start + i) * pageSize, (start + i + 1) * pageSize - 1)));
    for (const { data, error } of batch) {
      if (error) throw Object.assign(new Error(`activity rows: ${error.message}`), { code: error.code });
      for (const row of data ?? []) events.push({ at: row.at, event: row.event, kind: row.kind, visitorId: row.visitor_id, userId: row.user_id });
    }
  }

  // Account cards saved before card_saved events existed are read from the cards table instead.
  const firstSaved = events.filter((event) => event.event === "card_saved").map((event) => event.at).sort()[0] ?? new Date().toISOString();
  const cards: RawCard[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await db.from("cards").select("created_at,owner_id,draft").lt("created_at", firstSaved)
      .order("created_at").range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) throw Object.assign(new Error(`cards: ${error.message}`), { code: error.code });
    for (const row of data ?? []) {
      const draft = row.draft as { type?: string; kind?: string } | null;
      cards.push({ at: row.created_at, ownerId: row.owner_id, kind: draft?.type === "universal" ? "universal" : draft?.kind ?? "other" });
    }
    if ((data?.length ?? 0) < pageSize) break;
  }

  const accounts: RawAccount[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: pageSize });
    if (error) throw Object.assign(new Error(`accounts: ${error.message}`), { code: error.code });
    for (const user of data.users) accounts.push({ id: user.id, email: user.email ?? null, createdAt: user.created_at });
    if (data.users.length < pageSize) break;
  }
  return { events, cards, accounts };
}
