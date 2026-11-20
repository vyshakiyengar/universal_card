"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { recordActivity } from "../../../lib/server/activity";
import { createAccountsClient, getAccountsConfig } from "../../../lib/server/supabase";

export async function startSocialSignIn(formData: FormData) {
  const provider = formData.get("provider");
  if (provider !== "apple" && provider !== "google") redirect("/auth/sign-in");
  const config = getAccountsConfig();
  const supabase = await createAccountsClient();
  if (!config || !supabase) redirect("/auth/sign-in?error=unavailable");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: new URL("/auth/callback", config.origin).href },
  });
  if (error || !data.url) redirect("/auth/sign-in?error=provider");
  after(() => recordActivity("sign_in_started", provider));
  redirect(data.url);
}
