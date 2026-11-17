import { NextResponse } from "next/server";
import { createAccountsClient, getAccountsConfig } from "../../../lib/server/supabase";

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const config = getAccountsConfig();
  if (!config) return new Response("Sign-in is unavailable.", { status: 503, headers: privateHeaders });
  if (request.headers.get("origin") !== config.origin) {
    return new Response("Invalid request origin.", { status: 403, headers: privateHeaders });
  }

  const supabase = await createAccountsClient();
  const result = await supabase?.auth.signOut({ scope: "local" });
  if (result?.error) return new Response("Sign-out failed. Try again.", { status: 503, headers: privateHeaders });
  return NextResponse.redirect(new URL("/", config.origin), { status: 303, headers: privateHeaders });
}
