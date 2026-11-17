"use server";

import { redirect } from "next/navigation";
import { createAccountsClient, getAccountsConfig } from "../../../lib/server/supabase";

export type EmailState = {
  email: string;
  step: "request" | "verify";
  error?: string;
};

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
  redirect(data.url);
}

export async function signInWithEmail(_previous: EmailState, formData: FormData): Promise<EmailState> {
  const input = formData.get("email");
  const email = typeof input === "string" ? input.trim() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    return { email: email.slice(0, 254), step: "request", error: "Enter a valid email address." };
  }

  const supabase = await createAccountsClient();
  if (!supabase) return { email, step: "request", error: "Sign-in is unavailable." };
  const code = formData.get("code");

  if (code !== null) {
    const token = typeof code === "string" ? code.trim() : "";
    if (!/^\d{6,10}$/.test(token)) {
      return { email, step: "verify", error: "Enter the numeric code from your email." };
    }

    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) return { email, step: "verify", error: "The code is invalid or has expired." };
    redirect("/");
  }

  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) return { email, step: "request", error: "The code could not be sent. Try again in a minute." };
  return { email, step: "verify" };
}
