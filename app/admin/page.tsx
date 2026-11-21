import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { destinations } from "@/components/card-fields";
import { createAccountsClient, getAccount } from "@/lib/server/supabase";
import { RefreshMetrics } from "./refresh";
import { TrendChart, type ChartPoint } from "./trend-chart";
import { UsersTable, type AdminUser } from "./users-table";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin | Heya Cards", robots: { index: false, follow: false } };

type Day = {
  day: string; signups: number; cards: number; cardMakers: number; signIns: number;
  walletDownloads: number; walletTaps: number; visits: number; visitors: number; activeUsers: number;
};
type Dashboard = {
  generatedAt: string; rangeDays: number; since: string;
  users: { total: number; new: number; active1: number; active7: number; active30: number; returning: number; withCards: number; providers: Record<string, number> };
  cards: { total: number; new: number; byKind: Record<string, number>; perUser: Record<string, number> };
  daily: Day[];
  eventTotals: { event: string; kind: string; total: number }[];
  funnel: Record<string, number | string | null>;
  recentUsers: AdminUser[];
};

type Period = {
  visitors: number; studioVisitors: number; cardMakers: number; cards: number; walletTappers: number;
  walletAdders: number; walletPasses: number; newAccounts: number; signedIn: number;
};
type PeopleDay = { day: string; visitors: number; cardMakers: number; cards: number; walletAdders: number };
type People = {
  generatedAt: string; trackedSince: string | null;
  periods: { label: string; data: Period }[];
  range: Period; cardsByKind: Record<string, number>; daily: PeopleDay[];
};

// Plain-English meaning of every number on this page, shown in "How we count".
const definitions: [string, string][] = [
  ["Person", "One human, counted once. Before signing in, a person is their browser (a random ID in a cookie). After signing in, they are their account, and their earlier guest visits join that account. One person on two devices before signing in counts as two."],
  ["Visitors", "People who opened heya.cards or the card maker in that time, with JavaScript on (most bots don't run it)."],
  ["Opened the card maker", "Visitors who reached the page where you make a card (/studio)."],
  ["Made a card", "People who saved at least one card, as a guest or signed in. A guest card moved into an account at sign-in is not counted again."],
  ["Cards made", "Every new card saved, guest or account. Edits don't count."],
  ["Tapped Add to Wallet", "People who tapped the Add to Apple Wallet button."],
  ["Added to Wallet", "People whose phone downloaded a Wallet pass from us. That is the moment iPhone shows the Add screen; Apple doesn't tell us if they then tap Add or Cancel, so this is the closest true number."],
  ["Wallet passes", "Every Wallet pass downloaded, including repeats by the same person."],
  ["New accounts", "Accounts created with Apple or Google sign-in."],
  ["Conversion %", "The step's people divided by the visitors in the same time."],
];

const ranges = [7, 30, 90, 365] as const;
const n = (value: unknown) => Number(value ?? 0);
const fmt = (value: unknown) => n(value).toLocaleString("en-GB");
const pct = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(part / whole < 0.1 ? 1 : 0)}%` : "–");

const eventLabels: Record<string, string> = {
  visit: "Visits", cta_click: "CTA clicks", trial_started: "Studio trials started", trial_card_created: "Cards made before sign-in",
  sign_in_started: "Sign-ins started", signed_in: "Sign-ins completed", sign_in: "Sign-ins (all)", trial_cards_saved: "Trial cards moved to accounts",
  card_created: "Cards added to accounts (incl. moved guest cards)", card_saved: "Cards made while signed in", wallet_tap: "Add to Apple Wallet taps", wallet_download: "Wallet passes downloaded",
  share: "Card images shared", download_image: "Card images downloaded",
};

function kindLabel(kind: string) {
  if (kind === "universal") return "Universal";
  if (kind === "all") return "All";
  return (destinations as Record<string, { label: string }>)[kind]?.label ?? kind.replace(/_/g, " ");
}

// Long ranges read better week by week.
function bucket<T extends { day: string }>(days: T[], pick: (day: T) => number, weekly: boolean): ChartPoint[] {
  if (!weekly) return days.map((day) => ({ label: day.day, value: pick(day) }));
  const points: ChartPoint[] = [];
  for (let i = 0; i < days.length; i += 7) {
    const slice = days.slice(i, i + 7);
    points.push({ label: `${slice[0].day} → ${slice[slice.length - 1].day}`, value: slice.reduce((sum, day) => sum + pick(day), 0) });
  }
  return points;
}

export default async function Admin({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const account = await getAccount();
  if (!account) redirect("/auth/sign-in");
  const supabase = await createAccountsClient();
  if (!supabase) notFound();
  const { data: allowed } = await supabase.rpc("is_universal_card_admin");
  if (!allowed) notFound();

  const requested = Number((await searchParams).range);
  const range = (ranges as readonly number[]).includes(requested) ? requested : 365;
  const [{ data, error }, { data: peopleData, error: peopleError }] = await Promise.all([
    supabase.rpc("read_heya_admin_dashboard", { range_days: range }),
    supabase.rpc("read_heya_admin_people", { range_days: range }),
  ]);
  const dash = data as Dashboard | null;
  const people = peopleData as People | null;

  if (error || !dash || peopleError || !people) {
    return (
      <main className="admin">
        <Link href="/studio">Back to studio</Link>
        <h1>Heya Cards admin</h1>
        <p role="alert">The dashboard could not be loaded. If this is the first deploy, apply the latest Supabase migration.</p>
      </main>
    );
  }

  const days = people.daily ?? [];
  const weekly = range > 90;
  const sum = (pick: (day: PeopleDay) => number) => days.reduce((total, day) => total + pick(day), 0);
  const r = people.range;
  const visitors = n(r.visitors);
  const funnelSteps: [string, number, string][] = [
    ["Visited", visitors, "Opened heya.cards or the card maker"],
    ["Opened the card maker", n(r.studioVisitors), "Reached /studio"],
    ["Made a card", n(r.cardMakers), "Saved at least one card, guest or signed in"],
    ["Tapped Add to Wallet", n(r.walletTappers), "Tapped the Add to Apple Wallet button"],
    ["Added to Wallet", n(r.walletAdders), "Their phone downloaded the Wallet pass"],
  ];
  const funnelTop = Math.max(1, ...funnelSteps.map(([, value]) => value));
  const byKind = Object.entries(people.cardsByKind ?? {}).sort((a, b) => b[1] - a[1]);
  const kindTop = Math.max(1, ...byKind.map(([, value]) => value));
  const providers = Object.entries(dash.users.providers ?? {}).sort((a, b) => b[1] - a[1]);
  const perUser = ["1", "2", "3", "4", "5+"].map((key) => [key, n(dash.cards.perUser?.[key])] as const);
  const perUserTop = Math.max(1, ...perUser.map(([, value]) => value));
  const trackedSince = people.trackedSince ? new Date(people.trackedSince).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : null;
  const events = (dash.eventTotals ?? []).filter((row) => n(row.total) > 0);
  const rate = (part: number, whole: number) => <small className="rate">{pct(part, whole)}</small>;

  return (
    <main className="admin">
      <RefreshMetrics />
      <header className="admin-head">
        <div>
          <Link href="/studio" className="admin-back">← Back to studio</Link>
          <h1>Heya Cards admin</h1>
          <p className="admin-sub">Times in UTC · updated {new Date(people.generatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} · refreshes every 30 seconds{trackedSince ? ` · people tracked since ${trackedSince}` : ""}</p>
        </div>
        <a className="admin-help" href="#how-we-count">How we count</a>
      </header>

      <section className="panel">
        <h2>At a glance</h2>
        <p className="note">Unique people, guests and signed-in users together. % is of visitors in the same row.</p>
        <div className="data-table glance"><table>
          <thead><tr>
            <th scope="col"></th><th scope="col">Visitors</th><th scope="col">Made a card</th><th scope="col">Added to Wallet</th>
            <th scope="col">New accounts</th><th scope="col">Cards made</th><th scope="col">Wallet passes</th>
          </tr></thead>
          <tbody>
            {people.periods.map(({ label, data: p }) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td><b>{fmt(p.visitors)}</b></td>
                <td><b>{fmt(p.cardMakers)}</b>{rate(n(p.cardMakers), n(p.visitors))}</td>
                <td><b>{fmt(p.walletAdders)}</b>{rate(n(p.walletAdders), n(p.visitors))}</td>
                <td><b>{fmt(p.newAccounts)}</b>{rate(n(p.newAccounts), n(p.visitors))}</td>
                <td>{fmt(p.cards)}</td>
                <td>{fmt(p.walletPasses)}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>

      <div className="range-bar">
        <h2>Detail</h2>
        <nav className="admin-ranges" aria-label="Date range">
          {ranges.map((value) => <Link key={value} href={`/admin?range=${value}`} aria-current={value === range ? "page" : undefined}>{value === 365 ? "1 year" : `${value} days`}</Link>)}
        </nav>
      </div>

      <section className="panel">
        <h2>Funnel, last {range} days</h2>
        <p className="note">Unique people at each step. Each step is counted on its own, so someone can make a card without passing a step above it (for example, a returning visitor whose visit was before this range).</p>
        <ol className="funnel">
          {funnelSteps.map(([label, value, hint], index) => {
            const previous = index ? funnelSteps[index - 1][1] : value;
            return (
              <li key={label}>
                <div className="funnel-label"><strong>{label}</strong><small>{hint}</small></div>
                <div className="funnel-bar"><i style={{ width: `${Math.max(0.6, (value / funnelTop) * 100)}%` }} /></div>
                <div className="funnel-num"><strong>{fmt(value)}</strong><small>{index ? `${pct(value, visitors)} of visitors · ${pct(value, previous)} of step above` : "100%"}</small></div>
              </li>
            );
          })}
        </ol>
        <p className="note funnel-foot">Also in this range: {fmt(r.newAccounts)} new accounts, {fmt(r.signedIn)} people signed in, {fmt(r.cards)} cards made, {fmt(r.walletPasses)} Wallet passes downloaded.</p>
      </section>

      <section className="panel">
        <h2>Every day</h2>
        <p className="note">{weekly ? "Each bar is a week: the sum of each day's unique people (someone active on two days counts twice)." : "Unique people each day."}</p>
        <div className="charts">
          <TrendChart title="Visitors" unit={weekly ? "per week" : "per day"} color="#245b59" points={bucket(days, (day) => day.visitors, weekly)} total={visitors} totalLabel="unique in range" />
          <TrendChart title="Made a card" unit={weekly ? "per week" : "per day"} color="#244a73" points={bucket(days, (day) => day.cardMakers, weekly)} total={n(r.cardMakers)} totalLabel="unique in range" />
          <TrendChart title="Added to Wallet" unit={weekly ? "per week" : "per day"} color="#111" points={bucket(days, (day) => day.walletAdders, weekly)} total={n(r.walletAdders)} totalLabel="unique in range" />
          <TrendChart title="Cards made" unit={weekly ? "per week" : "per day"} color="#7a5c2e" points={bucket(days, (day) => day.cards, weekly)} total={sum((day) => day.cards)} totalLabel="in range" />
        </div>
      </section>

      <section className="kpis" aria-label="Accounts">
        <div className="kpi"><span>Accounts, all time</span><strong>{fmt(dash.users.total)}</strong><small>Signed up with Apple or Google</small></div>
        <div className="kpi"><span>Accounts active, 7 days</span><strong>{fmt(dash.users.active7)}</strong><small>Signed in during the last 7 days · {fmt(dash.users.active1)} in the last 24 hours</small></div>
        <div className="kpi"><span>Returning accounts</span><strong>{fmt(dash.users.returning)}</strong><small>Signed in again at least an hour after signing up</small></div>
        <div className="kpi"><span>Accounts with a card</span><strong>{fmt(dash.users.withCards)}</strong><small>{fmt(dash.cards.total)} cards kept in accounts now</small></div>
      </section>

      <div className="split">
        <section className="panel">
          <h2>Cards made by type</h2>
          <p className="note">Last {range} days, guest and account cards.</p>
          <ul className="bars">
            {byKind.length ? byKind.map(([kind, value]) => (
              <li key={kind}><span>{kindLabel(kind)}</span><div><i style={{ width: `${(value / kindTop) * 100}%` }} /></div><b>{fmt(value)}</b></li>
            )) : <li className="empty">No cards in this range yet.</li>}
          </ul>
        </section>
        <section className="panel">
          <h2>Sign-in method</h2>
          <p className="note">All accounts, all time.</p>
          <ul className="bars">
            {providers.map(([provider, value]) => (
              <li key={provider}><span>{provider === "apple" ? "Apple" : provider === "google" ? "Google" : provider}</span><div><i style={{ width: `${(value / Math.max(1, n(dash.users.total))) * 100}%` }} /></div><b>{fmt(value)} · {pct(value, n(dash.users.total))}</b></li>
            ))}
          </ul>
          <h3>Cards per account</h3>
          <p className="note">Cards each account keeps now.</p>
          <ul className="bars">
            {perUser.map(([bucketName, value]) => (
              <li key={bucketName}><span>{bucketName} {bucketName === "1" ? "card" : "cards"}</span><div><i style={{ width: `${(value / perUserTop) * 100}%` }} /></div><b>{fmt(value)}</b></li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel">
        <h2>Raw event counts</h2>
        <p className="note">Every recorded action in the last {range} days, by card type or button position. These count actions, not people: one person tapping twice counts 2.</p>
        <div className="data-table"><table>
          <thead><tr><th scope="col">Event</th><th scope="col">Type / position</th><th scope="col">Total</th></tr></thead>
          <tbody>
            {events.length ? events.map((row) => (
              <tr key={`${row.event}-${row.kind}`}><th scope="row">{eventLabels[row.event] ?? row.event}</th><td>{kindLabel(row.kind)}</td><td>{fmt(row.total)}</td></tr>
            )) : <tr><td colSpan={3}>No events recorded in this range yet.</td></tr>}
          </tbody>
        </table></div>
      </section>

      <section className="panel">
        <h2>Accounts</h2>
        <p className="note">Newest 1,000 accounts. Guests don't appear here until they sign in. Private: visible only to you.</p>
        <UsersTable users={dash.recentUsers ?? []} />
      </section>

      <section className="panel" id="how-we-count">
        <h2>How we count</h2>
        <dl className="defs">
          {definitions.map(([term, meaning]) => <div key={term}><dt>{term}</dt><dd>{meaning}</dd></div>)}
        </dl>
        <p className="note">Days run midnight to midnight UTC. Numbers come from Heya's own records (Supabase): page visits and button taps sent by the site, cards saved, Wallet passes downloaded and accounts created. Before {trackedSince ?? "visitor tracking started"}, only accounts and account cards were recorded.</p>
      </section>
    </main>
  );
}
