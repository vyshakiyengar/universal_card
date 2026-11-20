import { NextResponse } from "next/server";
import { isSameOriginForm } from "@/lib/server/account-request";
import { createAccountsClient, getAccountsConfig } from "@/lib/server/supabase";

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const config = getAccountsConfig();
  if (!config) return new Response("Sign-in is unavailable.", { status: 503, headers: privateHeaders });
  if (!isSameOriginForm(request.headers, config.origin)) {
    return new Response("Invalid request origin.", { status: 403, headers: privateHeaders });
  }

  let target = "/";
  try {
    const supabase = await createAccountsClient();
    const result = await supabase?.auth.signOut({ scope: "local" });
    if (result?.error) target = "/studio?error=sign-out";
  } catch {
    target = "/studio?error=sign-out";
  }
  return NextResponse.redirect(new URL(target, config.origin), { status: 303, headers: privateHeaders });
}
