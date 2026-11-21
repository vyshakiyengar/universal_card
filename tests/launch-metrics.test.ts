import assert from "node:assert/strict";
import { test } from "node:test";
import { launchMetrics } from "../lib/launch-metrics";

test("guest imports count once and older Wallet passes retain an unknown audience", () => {
  const events = [
    { event: "trial_card_created", kind: "email", total: 3 },
    { event: "card_created", kind: "email", total: 5 },
    { event: "guest_card_imported", kind: "email", total: 2 },
    { event: "wallet_download", kind: "phone", total: 9 },
    { event: "guest_wallet_issued", kind: "phone", total: 4 },
    { event: "account_wallet_issued", kind: "phone", total: 2 },
  ];
  const report = launchMetrics(events);
  assert.equal(report.created, 6);
  assert.equal(report.accountCards, 3);
  assert.equal(report.kept, 2);
  assert.equal(report.unclassified, 3);
  assert.equal(launchMetrics(events, "phone").created, 0);
  assert.equal(launchMetrics(events, "email").passes, 0);
});
