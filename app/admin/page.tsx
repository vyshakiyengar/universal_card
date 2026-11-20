import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { destinations } from "@/components/card-fields";
import { destinationKinds } from "@/lib/cards";
import { createAccountsClient, getAccount } from "@/lib/server/supabase";
import { RefreshMetrics } from "./refresh";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Activity | Heya Cards", robots: { index: false, follow: false } };

type Activity = { day: string; event: string; kind: string; total: number };

const funnel = [
  ["cta_click", "Landing CTA clicks"],
  ["trial_started", "Studio trials started"],
  ["trial_card_created", "Cards made before sign-in"],
  ["sign_in_started", "Sign-ins started"],
  ["sign_in", "Successful sign-ins"],
  ["trial_cards_saved", "Trial cards moved into accounts"],
  ["card_created", "Cards saved to accounts"],
  ["wallet_tap", "Add to Apple Wallet taps"],
  ["wallet_download", "Wallet passes issued"],
  ["share", "Card images shared"],
  ["download_image", "Card images downloaded"],
] as const;

export default async function Admin() {
  const account = await getAccount();
  if (!account) redirect("/auth/sign-in");
  const supabase = await createAccountsClient();
  if (!supabase) notFound();
  const { data: allowed } = await supabase.rpc("is_universal_card_admin");
  if (!allowed) notFound();
  const { data, error } = await supabase.rpc("read_universal_card_activity");
  const records = (data ?? []) as Activity[];
  const dates = Array.from({ length: 30 }, (_, offset) =>
    new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10));
  const recent = records.filter((row) => row.day >= dates[dates.length - 1]);
  const sum = (event: string, kind?: string, day?: string) =>
    recent.filter((row) => row.event === event && (!kind || row.kind === kind) && (!day || row.day === day))
      .reduce((total, row) => total + Number(row.total), 0);
  return (
    <main className="utility-page">
      <Link href="/studio">Back to studio</Link>
      <h1>Heya Cards activity</h1>
      <p>Last 30 days in UTC. Refreshes every 30 seconds.</p>
      <RefreshMetrics />
      {error ? <p role="alert">Activity could not be loaded.</p> : <>
        <dl className="metric-summary">
          <div><dt>Successful sign-ins</dt><dd>{sum("sign_in").toLocaleString()}</dd></div>
          <div><dt>Cards created</dt><dd>{sum("card_created").toLocaleString()}</dd></div>
          <div><dt>Wallet downloads</dt><dd>{sum("wallet_download").toLocaleString()}</dd></div>
        </dl>
        <p>Wallet downloads count passes the site issued. Apple Wallet installations are currently unmeasured.</p>
        <h2>Launch funnel</h2>
        <div className="data-table"><table><thead><tr><th scope="col">Step</th><th scope="col">Last 30 days</th><th scope="col">Today</th></tr></thead><tbody>
          {funnel.map(([event, label]) => <tr key={event}><th scope="row">{label}</th><td>{sum(event)}</td><td>{sum(event, undefined, dates[0])}</td></tr>)}
        </tbody></table></div>
        <p>CTA clicks by position: header {sum("cta_click", "landing_header")}, hero {sum("cta_click", "landing_hero")}, bottom {sum("cta_click", "landing_footer")}.</p>
        <h2>By card type</h2>
        <div className="data-table"><table><thead><tr><th scope="col">Card type</th><th scope="col">Created</th><th scope="col">Wallet downloads</th></tr></thead><tbody>
          {(["universal", ...destinationKinds] as const).map((kind) => (
            <tr key={kind}><th scope="row">{kind === "universal" ? "Universal" : destinations[kind].label}</th>
              <td>{sum("card_created", kind)}</td><td>{sum("wallet_download", kind)}</td></tr>
          ))}
        </tbody></table></div>
        <h2>Daily activity</h2>
        <div className="data-table"><table><thead><tr><th scope="col">Date (UTC)</th><th scope="col">Sign-ins</th><th scope="col">Created</th><th scope="col">Downloads</th></tr></thead><tbody>
          {dates.map((day) => <tr key={day}><th scope="row">{day}</th>
            <td>{sum("sign_in", undefined, day)}</td><td>{sum("card_created", undefined, day)}</td>
            <td>{sum("wallet_download", undefined, day)}</td></tr>)}
        </tbody></table></div>
      </>}
    </main>
  );
}
