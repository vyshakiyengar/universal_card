import { NextResponse } from "next/server";
import { isSameOriginForm } from "@/lib/server/account-request";
import { createAccountsClient, getAccountsConfig } from "@/lib/server/supabase";

const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const config = getAccountsConfig();
  if (!config || !isSameOriginForm(request.headers, config.origin)) {
    return new Response("Invalid request origin.", { status: 403, headers });
  }
  const supabase = await createAccountsClient();
  const result = await supabase?.auth.getUser();
  if (!supabase || !result?.data.user || result.error) {
    return NextResponse.redirect(new URL("/auth/sign-in", config.origin), { status: 303, headers });
  }
  const data = await request.formData().catch(() => null);
  if (data?.get("confirmation") !== "DELETE") {
    return NextResponse.redirect(new URL("/account?error=confirm", config.origin), { status: 303, headers });
  }
  const { error } = await supabase.rpc("delete_universal_card_account");
  if (error) {
    return NextResponse.redirect(new URL("/account?error=delete", config.origin), { status: 303, headers });
  }
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  return NextResponse.redirect(new URL("/", config.origin), { status: 303, headers });
}
