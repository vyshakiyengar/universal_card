import type { Metadata } from "next";
import Link from "next/link";
import { ConnectionMark } from "@/components/connection-mark";
import { redirect } from "next/navigation";
import { getAccount, getAccountsConfig } from "../../../lib/server/supabase";
import { startSocialSignIn } from "./actions";
import styles from "./sign-in.module.css";

export const metadata: Metadata = { title: "Sign in | Universal Card" };
export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  unavailable: "Sign-in is unavailable.",
  provider: "The sign-in provider could not be reached.",
  callback: "Sign-in expired or was canceled. Try again.",
};

async function readSocialProviders() {
  const config = getAccountsConfig();
  if (!config) return { available: false, google: false, apple: false };
  try {
    const response = await fetch(new URL("/auth/v1/settings", config.url), {
      headers: { apikey: config.key },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3_000),
    });
    if (response.ok) {
      const { external } = await response.json();
      return { available: true, google: external?.google === true, apple: external?.apple === true };
    }
  } catch {
    // Preserve the established Google login when settings cannot be reached.
  }
  return { available: true, google: true, apple: false };
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getAccount()) redirect("/studio");
  const { available, google, apple } = await readSocialProviders();
  const { error } = await searchParams;
  const message = error && Object.hasOwn(errors, error) ? errors[error] : null;

  return (
    <main className={styles.page}>
      <Link href="/" className="brand"><ConnectionMark /> Universal Card</Link>
      <section className={styles.panel} aria-labelledby="sign-in-heading">
        <h1 id="sign-in-heading">Sign in</h1>
        <p className={styles.instructions}>Save your cards to your account and get them on any device.</p>
        {message && <p className={styles.error} role="alert">{message}</p>}
        {!available && <p className={styles.instructions}>Sign-in is unavailable here. You can still use the device preview.</p>}
        <form action={startSocialSignIn} className={styles.providers}>
          <button disabled={!apple} name="provider" type="submit" value="apple">{apple ? "Continue with Apple" : "Continue with Apple (unavailable)"}</button>
          <button disabled={!google} name="provider" type="submit" value="google">Continue with Google</button>
        </form>
      </section>
      <nav aria-label="Site information" className={styles.legal}><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav>
    </main>
  );
}
