import Link from "next/link";
import { buildModel, daily, describe, funnel, funnelSteps } from "@/lib/admin-metrics";
import type { loadAdminData } from "@/lib/server/admin-data";
import { ActivityLog, type LogRow } from "./activity-log";
import { RefreshMetrics } from "./refresh";
import { UsersTable, type AdminUser } from "./users-table";

const fmt = (value: number) => value.toLocaleString("en-GB");
const day = 86_400_000;

function Info({ text }: { text: string }) {
  return <span className="info" tabIndex={0} aria-label={text}><span aria-hidden="true">i</span><span className="info-tip" role="tooltip">{text}</span></span>;
}

// The dashboard itself, given the raw data. Kept separate so it can be previewed with sample data.
export function AdminView({ data, users, requested, now = new Date() }:
  { data: Awaited<ReturnType<typeof loadAdminData>>; users: AdminUser[]; requested?: string; now?: Date }) {

  const model = buildModel(data.events, data.cards, data.accounts);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(now.getTime() + 60_000);
  const periods = [
    { key: "today", label: "Today", from: today, to: end },
    { key: "yesterday", label: "Yesterday", from: new Date(today.getTime() - day), to: today },
    { key: "7", label: "Last 7 days", from: new Date(today.getTime() - 6 * day), to: end },
    { key: "30", label: "Last 30 days", from: new Date(today.getTime() - 29 * day), to: end },
    { key: "all", label: "All time", from: new Date(0), to: end },
  ];
  const period = periods.find(({ key }) => key === requested) ?? periods[4];
  const all = funnel(model, new Date(0), end);
  const todays = funnel(model, today, end);
  const shown = funnel(model, period.from, period.to);
  const days = daily(model, 14, now);

  const log: LogRow[] = [
    ...model.events.map((event) => {
      const person = model.personOf(event);
      return { at: event.at, who: model.name(person.id), account: person.account, what: describe(event) };
    }),
    ...data.accounts.map((user) => ({ at: user.createdAt, who: model.name(user.id), account: true, what: "Created an account" })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <main className="admin">
      <RefreshMetrics />
      <header className="admin-head">
        <div>
          <Link href="/studio" className="admin-back">← Back to studio</Link>
          <h1>Heya Cards admin</h1>
          <p className="admin-sub">Every number here is counted from the activity log at the bottom of this page · times in UTC · refreshes every 30 seconds</p>
        </div>
        <a className="admin-help" href="#log">Activity log</a>
      </header>

      <section className="ticker" aria-label="All-time totals">
        <div>
          <span>Cards created <Info text="Every new card saved on Heya, signed in or not. One person making 3 cards counts 3." /></span>
          <strong>{fmt(all.cards)}</strong>
          <small>+{fmt(todays.cards)} today</small>
        </div>
        <div>
          <span>Cards downloaded to Apple Wallet <Info text="Every time a phone downloaded a Wallet pass from Heya, including the same card again." /></span>
          <strong>{fmt(all.passes)}</strong>
          <small>+{fmt(todays.passes)} today</small>
        </div>
      </section>

      <section className="panel">
        <div className="glance-head">
          <h2>Funnel</h2>
          <nav className="admin-ranges" aria-label="Time period">
            {periods.map(({ key, label }) => <Link key={key} href={`/admin?p=${key}`} aria-current={key === period.key ? "page" : undefined}>{label}</Link>)}
          </nav>
        </div>
        <p className="note">{period.label}. Number of people at each step. Anyone who reached a step is also counted in every step above it, so each row is never bigger than the one before.</p>
        <div className="data-table glance"><table>
          <thead><tr>
            <th scope="col">Step</th>
            <th scope="col">Not signed in <Info text="People who have never signed in. Each browser counts as one person." /></th>
            <th scope="col">Signed in <Info text="People with a Heya account, including what they did before signing in on the same browser." /></th>
            <th scope="col">Total</th>
          </tr></thead>
          <tbody>
            {funnelSteps.map(({ key, label, info }, index) => (
              <tr key={key}>
                <th scope="row">{index + 1}. {label} <Info text={info} /></th>
                <td><b>{fmt(shown.rows[key].guests)}</b></td>
                <td><b>{fmt(shown.rows[key].accounts)}</b></td>
                <td><b>{fmt(shown.rows[key].total)}</b></td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <p className="note glance-foot">Accounts: {fmt(data.accounts.length)} in total (the list below) · {fmt(shown.newAccounts)} created in this period. Cards created in this period: {fmt(shown.cards)} · downloaded to Wallet: {fmt(shown.passes)}.</p>
      </section>

      <section className="panel">
        <h2>Each day</h2>
        <p className="note">People per day, UTC.</p>
        <div className="data-table"><table>
          <thead><tr><th scope="col">Day</th><th scope="col">Visited</th><th scope="col">Created a card</th><th scope="col">Added to Wallet</th></tr></thead>
          <tbody>{days.map((row) => <tr key={row.day}><th scope="row">{row.day}</th><td>{fmt(row.visited)}</td><td>{fmt(row.created)}</td><td>{fmt(row.added)}</td></tr>)}</tbody>
        </table></div>
      </section>

      <section className="panel">
        <h2>Accounts ({fmt(data.accounts.length)})</h2>
        <p className="note">Everyone who signed up. Private: visible only to you.</p>
        <UsersTable users={users} />
      </section>

      <section className="panel" id="log">
        <h2>Activity log</h2>
        <p className="note">Every recorded action, newest first. People who haven't signed in are numbered Guest 1, Guest 2… in the order they first arrived. Tap a name to see only that person.</p>
        <ActivityLog rows={log} />
      </section>

      <section className="panel">
        <h2>How we count</h2>
        <dl className="defs">
          <div><dt>Person</dt><dd>Before signing in, a person is their browser (a random ID in a cookie). After signing in, they are their account, and what they did earlier on that browser joins it. The same person on two devices before signing in counts as two.</dd></div>
          <div><dt>Tracking started</dt><dd>Visits and button presses are recorded from 21 Nov 2026, about 1am. Accounts and their cards go back further, so earlier sign-ups count as visitors when they signed up.</dd></div>
          {funnelSteps.map(({ key, label, info }) => <div key={key}><dt>{label}</dt><dd>{info}</dd></div>)}
        </dl>
      </section>
    </main>
  );
}
