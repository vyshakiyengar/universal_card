import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAccountsClient, getAccount } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your account | Heya Cards", robots: { index: false, follow: false } };

export default async function Account({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!await getAccount()) redirect("/auth/sign-in");
  const client = await createAccountsClient();
  const { error } = await searchParams;
  const admin = await client?.rpc("is_universal_card_admin");
  return (
    <main className="utility-page">
      <Link href="/studio">Back to studio</Link>
      <h1>Your account</h1>
      {admin?.data === true && <Link className="button secondary" href="/admin">Admin dashboard</Link>}
      <section>
        <h2>Download your data</h2>
        <p>Download your profile and saved cards as a JSON file.</p>
        <a className="button primary" href="/api/account/export">Download data</a>
      </section>
      <section>
        <h2>Delete your account</h2>
        <p>This permanently deletes your account and saved cards. Shared QR codes, contacts and passes can still exist on other devices.</p>
        {error && <p role="alert" className="form-error">{error === "confirm" ? "Type DELETE to confirm." : "Your account could not be deleted. Try again."}</p>}
        <form action="/api/account/delete" method="post" className="deletion-form">
          <label htmlFor="delete-confirmation">Type DELETE to confirm</label>
          <input id="delete-confirmation" name="confirmation" autoComplete="off" required />
          <button className="button secondary delete-button" type="submit">Delete account and cards</button>
        </form>
      </section>
    </main>
  );
}
