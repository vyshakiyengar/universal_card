import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function getAccountsConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const appOrigin = process.env.APP_ORIGIN?.trim();
  if (!url || !key || !appOrigin) return null;

  try {
    const origin = new URL(appOrigin);
    const local = origin.hostname === "localhost" || origin.hostname === "127.0.0.1";
    if (
      (origin.protocol !== "https:" && !(local && origin.protocol === "http:")) ||
      origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash
    ) return null;

    const supabase = new URL(url);
    if (supabase.protocol !== "https:" && supabase.protocol !== "http:") return null;
    return { url: supabase.origin, key, origin: origin.origin };
  } catch {
    return null;
  }
}

export function isAccountsConfigured() {
  return getAccountsConfig() !== null;
}

export async function createAccountsClient() {
  const config = getAccountsConfig();
  if (!config) return null;
  const cookieStore = await cookies();

  return createServerClient(config.url, config.key, {
    cookieOptions: { httpOnly: true, secure: config.origin.startsWith("https:") },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(changes) {
        try {
          for (const { name, value, options } of changes) cookieStore.set(name, value, options);
        } catch {
          // Server Components are read-only. The proxy refreshes their session cookies.
        }
      },
    },
  });
}

export async function getAccount(): Promise<{ id: string; email: string | null; firstName: string; fullName: string } | null> {
  const supabase = await createAccountsClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const metadata = data.user.user_metadata;
  const clean = (value: string) => value.replace(/[\p{Cc}\p{Cs}]/gu, "").trim().replace(/\s+/gu, " ");
  const pick = (...values: unknown[]) => values
    .find((value): value is string => typeof value === "string" && Boolean(value.trim()));
  const name = pick(metadata.given_name, metadata.full_name, metadata.name);
  const firstName = name ? clean(name).split(" ")[0] : "";
  const full = pick(metadata.full_name, metadata.name);
  const joined = [metadata.given_name, metadata.family_name].filter((part) => typeof part === "string").join(" ");
  const fullName = clean(full ?? joined);
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    firstName: Array.from(firstName).slice(0, 50).join(""),
    fullName: Array.from(fullName).slice(0, 120).join(""),
  };
}
