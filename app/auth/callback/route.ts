import { after, NextResponse } from "next/server";
import { activityContext, recordActivity } from "../../../lib/server/activity";
import { createAccountsClient, getAccountsConfig } from "../../../lib/server/supabase";

const privateHeaders = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };

export async function GET(request: Request) {
  const config = getAccountsConfig();
  if (!config) return new Response("Sign-in is unavailable.", { status: 503, headers: privateHeaders });
  const code = new URL(request.url).searchParams.get("code");
  const supabase = await createAccountsClient();
  if (code && supabase) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const userId = data.user?.id ?? null;
      const provider = typeof data.user?.app_metadata?.provider === "string" ? data.user.app_metadata.provider : "all";
      after(async () => recordActivity("signed_in", provider === "apple" || provider === "google" ? provider : "all",
        { visitorId: (await activityContext()).visitorId, userId }));
      return NextResponse.redirect(new URL("/studio", config.origin), { status: 303, headers: privateHeaders });
    }
  }
  return NextResponse.redirect(new URL("/auth/sign-in?error=callback", config.origin), {
    status: 303, headers: privateHeaders,
  });
}
