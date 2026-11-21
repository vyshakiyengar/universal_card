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

const ranges = [7, 30, 90, 365] as const;
const n = (value: unknown) => Number(value ?? 0);
const fmt = (value: unknown) => n(value).toLocaleString("en-GB");
const pct = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(part / whole < 0.1 ? 1 : 0)}%` : "–");

const eventLabels: Record<string, string> = {
  visit: "Visits", cta_click: "CTA clicks", trial_started: "Studio trials started", trial_card_created: "Cards made before sign-in",
  sign_in_started: "Sign-ins started", signed_in: "Sign-ins completed", sign_in: "Sign-ins (all)", trial_cards_saved: "Trial cards moved to accounts",
  card_created: "Cards saved", wallet_tap: "Add to Apple Wallet taps", wallet_download: "Wallet passes issued",
  share: "Card images shared", download_image: "Card images downloaded",
};

function kindLabel(kind: string) {
  if (kind === "universal") return "Universal";
  if (kind === "all") return "All";
  return (destinations as Record<string, { label: string }>)[kind]?.label ?? kind.replace(/_/g, " ");
}

// Long ranges read better week by week.
function bucket(days: Day[], pick: (day: Day) => number, weekly: boolean): ChartPoint[] {
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
  const { data, error } = await supabase.rpc("read_heya_admin_dashboard", { range_days: range });
  const dash = data as Dashboard | null;

  if (error || !dash) {
    return (
      <main className="admin">
        <Link href="/studio">Back to studio</Link>
        <h1>Heya Cards admin</h1>
        <p role="alert">The dashboard could not be loaded. If this is the first deploy, apply the latest Supabase migration.</p>
      </main>
    );
  }

  const days = dash.daily ?? [];
  const weekly = range > 90;
  const total = (pick: (day: Day) => number) => days.reduce((sum, day) => sum + pick(day), 0);
  const visitors = n(dash.funnel.visitors);
  const funnelSteps: [string, number, string][] = [
    ["Unique visitors", visitors, "Opened the landing page or studio"],
    ["Clicked a CTA", n(dash.funnel.ctaClickers), "Create my Heya card, header or hero"],
    ["Started the studio", n(dash.funnel.trialStarters), "First-time trial began"],
    ["Made a card before sign-in", n(dash.funnel.trialCardMakers), "Free first card"],
    ["Started sign-in", n(dash.funnel.signInStarters), "Tapped Apple or Google"],
    ["Signed in", n(dash.funnel.signedInUsers), "Completed sign-in (unique accounts)"],
    ["Tapped Add to Apple Wallet", n(dash.funnel.walletTappers), "Unique people"],
    ["Got a Wallet pass", n(dash.funnel.walletDownloaders), "Unique people"],
  ];
  const funnelTop = Math.max(1, ...funnelSteps.map(([, value]) => value));
  const byKind = Object.entries(dash.cards.byKind ?? {}).sort((a, b) => b[1] - a[1]);
  const kindTop = Math.max(1, ...byKind.map(([, value]) => value));
  const providers = Object.entries(dash.users.providers ?? {}).sort((a, b) => b[1] - a[1]);
  const perUser = ["1", "2", "3", "4", "5+"].map((key) => [key, n(dash.cards.perUser?.[key])] as const);
  const perUserTop = Math.max(1, ...perUser.map(([, value]) => value));
  const trackedSince = typeof dash.funnel.trackedSince === "string" ? dash.funnel.trackedSince.slice(0, 10) : null;
  const events = (dash.eventTotals ?? []).filter((row) => n(row.total) > 0);

  return (
    <main className="admin">
      <RefreshMetrics />
      <header className="admin-head">
        <div>
          <Link href="/studio" className="admin-back">← Back to studio</Link>
          <h1>Heya Cards admin</h1>
          <p className="admin-sub">Last {range} days, UTC · updated {new Date(dash.generatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC · refreshes every 30 seconds</p>
        </div>
        <nav className="admin-ranges" aria-label="Date range">
          {ranges.map((value) => <Link key={value} href={`/admin?range=${value}`} aria-current={value === range ? "page" : undefined}>{value === 365 ? "1 year" : `${value} days`}</Link>)}
        </nav>
      </header>

      <section className="kpis" aria-label="Key numbers">
        <div className="kpi"><span>Total users</span><strong>{fmt(dash.users.total)}</strong><small>{fmt(dash.users.new)} new in range</small></div>
        <div className="kpi"><span>Active users</span><strong>{fmt(dash.users.active7)}</strong><small>7 days · {fmt(dash.users.active1)} today · {fmt(dash.users.active30)} in 30 days</small></div>
        <div className="kpi"><span>Unique visitors</span><strong>{fmt(visitors)}</strong><small>{pct(n(dash.funnel.signedInUsers), visitors)} went on to sign in</small></div>
        <div className="kpi"><span>Cards saved</span><strong>{fmt(dash.cards.total)}</strong><small>{fmt(dash.cards.new)} new in range · {fmt(dash.users.withCards)} users with a card</small></div>
        <div className="kpi"><span>Wallet passes issued</span><strong>{fmt(total((day) => day.walletDownloads))}</strong><small>{fmt(total((day) => day.walletTaps))} Add to Wallet taps</small></div>
        <div className="kpi"><span>Returning users</span><strong>{fmt(dash.users.returning)}</strong><small>{pct(n(dash.users.returning), n(dash.users.total))} signed in again later</small></div>
      </section>

      <section className="panel">
        <h2>Growth</h2>
        <div className="charts">
          <TrendChart title="New users" unit={weekly ? "per week" : "per day"} color="#244a73" points={bucket(days, (day) => day.signups, weekly)} total={total((day) => day.signups)} />
          <TrendChart title="Unique visitors" unit={weekly ? "per week (sum of daily)" : "per day"} color="#245b59" points={bucket(days, (day) => day.visitors, weekly)} total={visitors} totalLabel="unique in range" />
          <TrendChart title="Cards saved" unit={weekly ? "per week" : "per day"} color="#7a5c2e" points={bucket(days, (day) => day.cards, weekly)} total={total((day) => day.cards)} />
          <TrendChart title="Wallet passes issued" unit={weekly ? "per week" : "per day"} color="#111" points={bucket(days, (day) => day.walletDownloads, weekly)} total={total((day) => day.walletDownloads)} />
          <TrendChart title="Sign-ins" unit={weekly ? "per week" : "per day"} color="#5a4b8a" points={bucket(days, (day) => day.signIns, weekly)} total={total((day) => day.signIns)} />
          <TrendChart title="Active signed-in users" unit={weekly ? "per week (sum of daily)" : "per day"} color="#a5132d" points={bucket(days, (day) => day.activeUsers, weekly)} total={n(dash.users.active30)} totalLabel="active in 30 days" />
        </div>
      </section>

      <section className="panel">
        <h2>Funnel: unique people</h2>
        <p className="note">Each step counts distinct visitors or accounts in the range{trackedSince ? `. Visitor tracking started ${trackedSince}, so earlier dates show users and cards only.` : ". Visitor tracking starts with this release."}</p>
        <ol className="funnel">
          {funnelSteps.map(([label, value, hint], index) => {
            const previous = index ? funnelSteps[index - 1][1] : value;
            return (
              <li key={label}>
                <div className="funnel-label"><strong>{label}</strong><small>{hint}</small></div>
                <div className="funnel-bar"><i style={{ width: `${Math.max(0.6, (value / funnelTop) * 100)}%` }} /></div>
                <div className="funnel-num"><strong>{fmt(value)}</strong><small>{index ? `${pct(value, previous)} of previous · ${pct(value, visitors)} of visitors` : "start"}</small></div>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="split">
        <section className="panel">
          <h2>Cards by type</h2>
          <p className="note">Saved to accounts in range.</p>
          <ul className="bars">
            {byKind.length ? byKind.map(([kind, value]) => (
              <li key={kind}><span>{kindLabel(kind)}</span><div><i style={{ width: `${(value / kindTop) * 100}%` }} /></div><b>{fmt(value)}</b></li>
            )) : <li className="empty">No cards in this range yet.</li>}
          </ul>
        </section>
        <section className="panel">
          <h2>Sign-in method</h2>
          <p className="note">All accounts.</p>
          <ul className="bars">
            {providers.map(([provider, value]) => (
              <li key={provider}><span>{provider === "apple" ? "Apple" : provider === "google" ? "Google" : provider}</span><div><i style={{ width: `${(value / Math.max(1, n(dash.users.total))) * 100}%` }} /></div><b>{fmt(value)} · {pct(value, n(dash.users.total))}</b></li>
            ))}
          </ul>
          <h3>Cards per user</h3>
          <ul className="bars">
            {perUser.map(([bucketName, value]) => (
              <li key={bucketName}><span>{bucketName} {bucketName === "1" ? "card" : "cards"}</span><div><i style={{ width: `${(value / perUserTop) * 100}%` }} /></div><b>{fmt(value)}</b></li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel">
        <h2>All events</h2>
        <p className="note">Totals in range, by event and card type or position.</p>
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
        <h2>Users</h2>
        <p className="note">Newest 1,000 accounts with their activity. Private: visible only to you.</p>
        <UsersTable users={dash.recentUsers ?? []} />
      </section>
    </main>
  );
}
