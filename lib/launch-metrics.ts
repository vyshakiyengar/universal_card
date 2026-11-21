export type EventTotal = { event: string; kind: string; total: number };
export function launchMetrics(events: EventTotal[], kind?: string) {
  const count = (name: string) => events.reduce((sum, row) =>
    sum + (row.event === name && (!kind || row.kind === kind) ? Number(row.total) : 0), 0);
  const guestCards = count("trial_card_created");
  const kept = count("guest_card_imported");
  const accountCards = count("card_created") - kept;
  const guestPasses = count("guest_wallet_issued");
  const accountPasses = count("account_wallet_issued");
  const passes = count("wallet_download");
  return { guestCards, accountCards, created: guestCards + accountCards, kept, guestPasses, accountPasses,
    passes, unclassified: passes - guestPasses - accountPasses, starts: count("trial_started") };
}
