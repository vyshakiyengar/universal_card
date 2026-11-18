import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccount, isAccountsConfigured } from "../../../lib/server/supabase";
import { startSocialSignIn } from "./actions";
import { EmailForm } from "./email-form";
import styles from "./sign-in.module.css";

export const metadata: Metadata = { title: "Sign in | Universal Card" };
export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  unavailable: "Sign-in is unavailable.",
  provider: "The sign-in provider could not be reached.",
  callback: "Sign-in expired or was canceled. Try again.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getAccount()) redirect("/studio");
  const available = isAccountsConfigured();
  const { error } = await searchParams;
  const message = error && Object.hasOwn(errors, error) ? errors[error] : null;

  return (
    <main className={styles.page}>
      <Link href="/" className={styles.back}>← Universal Card</Link>
      <section className={styles.panel} aria-labelledby="sign-in-heading">
        <h1 id="sign-in-heading">Sign in</h1>
        <p className={styles.instructions}>Save your cards to your account and get them on any device.</p>
        {message && <p className={styles.error} role="alert">{message}</p>}
        {!available && <p className={styles.instructions}>Sign-in is unavailable here. You can still use the device preview.</p>}
        <form action={startSocialSignIn} className={styles.providers}>
          <button disabled={!available} name="provider" type="submit" value="apple">Continue with Apple</button>
          <button disabled={!available} name="provider" type="submit" value="google">Continue with Google</button>
        </form>
        <hr />
        <EmailForm available={available} />
      </section>
    </main>
  );
}
