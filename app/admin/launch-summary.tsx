import { launchMetrics, type EventTotal } from "@/lib/launch-metrics";
import { cardKindLabels } from "@/lib/cards";

const fmt = (n: number | null) => n === null ? "—" : n.toLocaleString("en-GB");

export function LaunchSummary({ events, newAccounts, audience }: { events: EventTotal[]; newAccounts: number; audience: { guests: number; accounts: number; combined: number } | null }) {
  const totals = launchMetrics(events);
  const rows: [string, number | null, number | null, number][] = [
    ["Trials started", totals.starts, null, totals.starts],
    ["Cards created", totals.guestCards, totals.accountCards, totals.created],
    ["Wallet passes issued", totals.guestPasses, totals.accountPasses, totals.passes],
    ["Guest cards saved to an account", null, totals.kept, totals.kept],
    ["New accounts", null, newAccounts, newAccounts],
  ];
  return <section className="panel" aria-labelledby="launch-summary">
    <h2 id="launch-summary">Launch activity</h2>
    <div className="data-table"><table>
      <thead><tr><th scope="col">Metric</th><th scope="col">Guests</th><th scope="col">Signed-in users</th><th scope="col">Combined</th></tr></thead>
      <tbody><tr><th scope="row">Observed audience</th><td>{fmt(audience?.guests ?? null)}</td><td>{fmt(audience?.accounts ?? null)}</td><td>{fmt(audience?.combined ?? null)}</td></tr>{rows.map(([label, guest, signed, combined]) => <tr key={label}><th scope="row">{label}</th><td>{fmt(guest)}</td><td>{fmt(signed)}</td><td>{fmt(combined)}</td></tr>)}</tbody>
    </table></div>
    <p className="note">Audience measures guest browsers and active accounts with recorded activity. Combined counts an observed guest-to-account sign-in once in the selected period. New visitor tracking requires opt-in. Other rows count actions. A pass is counted each time Heya issues it. Historical imports and pass audiences were not tracked separately.</p>
    {totals.unclassified > 0 && <p className="note">{fmt(totals.unclassified)} earlier passes are included only in Combined.</p>}
    <details><summary>By card type</summary>
      <div className="data-table"><table>
        <thead><tr><th scope="col">Card type</th><th scope="col">Action</th><th scope="col">Guests</th><th scope="col">Signed-in users</th><th scope="col">Combined</th></tr></thead>
        <tbody>{Object.entries(cardKindLabels).flatMap(([kind, label]) => {
          const m = launchMetrics(events, kind);
          return [
            <tr key={kind + "-created"}><th scope="row">{label}</th><td>Created</td><td>{fmt(m.guestCards)}</td><td>{fmt(m.accountCards)}</td><td>{fmt(m.created)}</td></tr>,
            <tr key={kind + "-issued"}><th scope="row">{label}</th><td>Passes issued</td><td>{fmt(m.guestPasses)}</td><td>{fmt(m.accountPasses)}</td><td>{fmt(m.passes)}</td></tr>
          ];
        })}</tbody>
      </table></div>
    </details>
  </section>;
}
