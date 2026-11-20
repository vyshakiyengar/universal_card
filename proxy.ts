import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { trialCookies, trialStartHeader } from "./lib/trial";
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
  const { data } = await supabase.auth.getClaims();
  if (request.nextUrl.pathname === "/studio" && !data?.claims?.sub) return startOrContinueTrial(request, response);
  return response;
}

// First-time visitors may make one card without an account. The visit lasts while
// they keep coming back within the visit window. Once the card is made, or on a
// later visit, the studio needs sign-in.
function startOrContinueTrial(request: NextRequest, current: NextResponse) {
  const secure = request.nextUrl.protocol === "https:";
  const started = request.cookies.has(trialCookies.started);
  const visiting = request.cookies.has(trialCookies.visit);
  if (request.cookies.has(trialCookies.used) || (started && !visiting)) return current;

  request.cookies.set(trialCookies.visit, "1");
  const headers = new Headers(request.headers);
  headers.set("cookie", request.cookies.toString());
  if (!started) headers.set(trialStartHeader, "1");
  else headers.delete(trialStartHeader);
  const response = NextResponse.next({ request: { headers } });
  for (const cookie of current.cookies.getAll()) response.cookies.set(cookie);
  const options = { httpOnly: true, sameSite: "lax" as const, secure, path: "/" };
  response.cookies.set(trialCookies.visit, "1", { ...options, maxAge: trialCookies.visitSeconds });
  if (!started) response.cookies.set(trialCookies.started, "1", { ...options, maxAge: 60 * 60 * 24 * 365 });
  return response;
}

export const config = { matcher: ["/studio", "/auth/sign-in", "/account", "/admin"] };
