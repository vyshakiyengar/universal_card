import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAccountsConfig } from "./lib/server/supabase";

export async function proxy(request: NextRequest) {
  const accounts = getAccountsConfig();
  let response = NextResponse.next({ request });
  if (!accounts) return response;

  const supabase = createServerClient(accounts.url, accounts.key, {
    cookieOptions: { httpOnly: true, secure: accounts.origin.startsWith("https:") },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(changes, headers) {
        for (const { name, value } of changes) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of changes) response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(headers ?? {})) response.headers.set(name, value);
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}

export const config = { matcher: ["/", "/auth/sign-in"] };
