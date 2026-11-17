import { NextResponse } from "next/server";
import { createAccountsClient, getAccountsConfig } from "../../../lib/server/supabase";

const privateHeaders = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };

export async function GET(request: Request) {
  const config = getAccountsConfig();
  if (!config) return new Response("Sign-in is unavailable.", { status: 503, headers: privateHeaders });
  const code = new URL(request.url).searchParams.get("code");
  const supabase = await createAccountsClient();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/", config.origin), { status: 303, headers: privateHeaders });
    }
  }
  return NextResponse.redirect(new URL("/auth/sign-in?error=callback", config.origin), {
    status: 303, headers: privateHeaders,
  });
}
