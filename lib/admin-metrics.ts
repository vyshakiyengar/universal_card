// Every number on the admin dashboard comes from this file, from one list of recorded actions.
// It has no database code so it can be tested on its own.

export type RawEvent = { at: string; event: string; kind: string; visitorId: string | null; userId: string | null };
export type RawCard = { at: string; ownerId: string; kind: string };
export type RawAccount = { id: string; email: string | null; createdAt: string };

export const funnelSteps = [
  { key: "visited", label: "Visited heya.cards", info: "Opened any page of heya.cards, or created an account." },
  { key: "started", label: "Started filling in details", info: "Typed into a new card's form. Recorded only from 21 Nov 2026, so earlier people skip this row." },
  { key: "created", label: "Pressed Create card", info: "Saved a new card." },
  { key: "tapped", label: "Pressed Add to Apple Wallet", info: "Tapped the Add to Apple Wallet button." },
  { key: "added", label: "Card downloaded to Wallet", info: "Their phone downloaded the Wallet pass, which opens Apple's Add screen. Apple doesn't tell us if they then tap Add or Cancel." },
] as const;
export type StepKey = (typeof funnelSteps)[number]["key"];
export type Split = { guests: number; accounts: number; total: number };

export type Model = {
  events: RawEvent[];
  cards: RawCard[]; // account cards saved before card_saved events were recorded
  accounts: RawAccount[];
  // A person is their account once signed in; before that, their browser. A browser seen
  // signed in to an account is that account's, before and after.
  personOf: (event: RawEvent) => { id: string; account: boolean };
  name: (personId: string) => string;
};

export function buildModel(events: RawEvent[], cards: RawCard[], accounts: RawAccount[]): Model {
  const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));
  const browserAccount = new Map<string, string>();
  for (const event of sorted) {
    if (event.visitorId && event.userId && !browserAccount.has(event.visitorId)) browserAccount.set(event.visitorId, event.userId);
  }
  const emails = new Map(accounts.map((account) => [account.id, account.email]));
  const guestNumbers = new Map<string, number>();
  const personOf = (event: RawEvent) => {
    const account = event.userId ?? (event.visitorId ? browserAccount.get(event.visitorId) : undefined);
    if (account) return { id: account, account: true };
    return { id: event.visitorId ?? "unknown", account: false };
  };
  for (const event of sorted) {
    const person = personOf(event);
    if (!person.account && !guestNumbers.has(person.id)) guestNumbers.set(person.id, guestNumbers.size + 1);
  }
  const name = (personId: string) => {
    if (emails.has(personId)) return emails.get(personId) ?? "Account (no email)";
    const number = guestNumbers.get(personId);
    return number ? `Guest ${number}` : "Unknown";
  };
  return { events: sorted, cards, accounts, personOf, name };
}

const inside = (at: string, from: Date, to: Date) => { const t = Date.parse(at); return t >= from.getTime() && t < to.getTime(); };
const cardEvents = new Set(["trial_card_created", "card_saved"]);
const empty = (): Split => ({ guests: 0, accounts: 0, total: 0 });

// The funnel for one period. Each person counts once per row. Someone who reached a later step
// is counted in every row above it too (you can't download a card without creating it), so
// each row is never bigger than the row above, and Not signed in + Signed in = Total.
export function funnel(model: Model, from: Date, to: Date) {
  const furthest = new Map<string, { step: number; account: boolean }>();
  const reach = (id: string, account: boolean, step: number) => {
    const current = furthest.get(id);
    if (!current || step > current.step) furthest.set(id, { step, account: account || (current?.account ?? false) });
  };
  let cards = 0, passes = 0;
  for (const event of model.events) {
    if (!inside(event.at, from, to)) continue;
    const person = model.personOf(event);
    let step = 0;
    if (event.event === "trial_started" && event.kind !== "all") step = 1;
    if (cardEvents.has(event.event)) { step = 2; cards++; }
    if (event.event === "wallet_tap") step = 3;
    if (event.event === "wallet_download") { step = 4; passes++; }
    reach(person.id, person.account, step);
  }
  for (const card of model.cards) {
    if (!inside(card.at, from, to)) continue;
    cards++;
    reach(card.ownerId, true, 2);
  }
  let newAccounts = 0;
  for (const account of model.accounts) {
    if (!inside(account.createdAt, from, to)) continue;
    newAccounts++;
    reach(account.id, true, 0);
  }
  const rows = Object.fromEntries(funnelSteps.map(({ key }) => [key, empty()])) as Record<StepKey, Split>;
  for (const { step, account } of furthest.values()) {
    funnelSteps.forEach(({ key }, index) => {
      if (index > step) return;
      rows[key][account ? "accounts" : "guests"]++;
      rows[key].total++;
    });
  }
  return { rows, cards, passes, newAccounts };
}

const kindNames: Record<string, string> = {
  universal: "Universal", whatsapp: "WhatsApp", linkedin: "LinkedIn", instagram: "Instagram", email: "Email",
  phone: "Phone", website: "Website", url: "Link", snapchat: "Snapchat",
};
const where: Record<string, string> = {
  landing_header: "top of the home page", landing_hero: "home page", landing_footer: "bottom of the home page",
  trial_more: "studio", trial_save: "studio",
};

// One plain-English line per recorded action.
export function describe(event: RawEvent) {
  const card = kindNames[event.kind] ? `${kindNames[event.kind]} card` : "card";
  switch (event.event) {
    case "visit": return event.kind === "studio" ? "Opened the card maker" : "Opened the home page";
    case "cta_click": return event.kind === "trial_save" ? "Pressed Sign in to save" : `Pressed Create my card (${where[event.kind] ?? event.kind})`;
    case "trial_started": return event.kind === "all" ? "Loaded the card maker" : `Started filling in a ${card}`;
    case "trial_card_created": return `Pressed Create card: ${card}`;
    case "card_saved": return `Pressed Create card: ${card} (signed in)`;
    case "wallet_tap": return `Pressed Add to Apple Wallet: ${card}`;
    case "wallet_download": return `${card} downloaded to Wallet`;
    case "sign_in_started": return `Started signing in with ${event.kind === "apple" ? "Apple" : "Google"}`;
    case "signed_in": return `Signed in with ${event.kind === "apple" ? "Apple" : "Google"}`;
    case "trial_cards_saved": return "Guest cards moved into their account";
    case "share": return `Shared the ${card} image`;
    case "download_image": return `Saved the ${card} image`;
    default: return event.event;
  }
}

// Days in UTC, newest first: unique people who visited, created a card, and downloaded to Wallet.
export function daily(model: Model, days: number, now = new Date()) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: days }, (_, index) => {
    const from = new Date(today - index * 86_400_000);
    const to = new Date(from.getTime() + 86_400_000);
    const { rows } = funnel(model, from, to);
    return { day: from.toISOString().slice(0, 10), visited: rows.visited.total, created: rows.created.total, added: rows.added.total };
  });
}
