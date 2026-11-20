import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { destinations } from "@/components/card-fields";
import { destinationKinds } from "@/lib/cards";
import { createAccountsClient, getAccount } from "@/lib/server/supabase";
import { RefreshMetrics } from "./refresh";

export const dynamic = "force-dynamic";

type Activity = { day: string; event: "sign_in" | "card_created" | "wallet_download"; kind: string; total: number };

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
  const sum = (event: Activity["event"], kind?: string, day?: string) =>
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
