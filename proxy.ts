import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAccountsConfig } from "./lib/server/supabase";

export async function proxy(request: NextRequest) {
  const accounts = getAccountsConfig();
  let response = NextResponse.next({ request });
  if (!accounts) return response;

  // A login started on an alias cannot read its sign-in cookie on the callback host.
  const canonical = new URL(accounts.origin);
  if (
    process.env.VERCEL_ENV === "production" &&
    (request.method === "GET" || request.method === "HEAD") &&
    request.nextUrl.pathname !== "/" &&
    request.nextUrl.host !== canonical.host
  ) {
    canonical.pathname = request.nextUrl.pathname;
    canonical.search = request.nextUrl.search;
    return NextResponse.redirect(canonical, { headers: { "Cache-Control": "private, no-store" } });
  }

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

export const config = { matcher: ["/", "/studio", "/auth/sign-in", "/account", "/admin"] };
