import assert from "node:assert/strict";
import { test } from "node:test";
import { buildModel, describe, funnel, type RawEvent } from "../lib/admin-metrics";

const ev = (at: string, event: string, kind: string, visitorId: string | null, userId: string | null = null): RawEvent => ({ at, event, kind, visitorId, userId });
const all = [new Date(0), new Date("2030-01-01")] as const;

test("guests, accounts and totals always add up, and rows never grow", () => {
  const events = [
    ev("2026-11-21T10:00:00Z", "visit", "landing", "g1"),
    ev("2026-11-21T10:01:00Z", "visit", "studio", "g1"),
    ev("2026-11-21T10:02:00Z", "trial_started", "whatsapp", "g1"),
    ev("2026-11-21T10:03:00Z", "trial_card_created", "whatsapp", "g1"),
    ev("2026-11-21T10:04:00Z", "wallet_tap", "whatsapp", "g1"),
    ev("2026-11-21T10:04:02Z", "wallet_download", "whatsapp", "g1"),
    ev("2026-11-21T11:00:00Z", "visit", "landing", "g2"),
    // b1 visits as a guest, then signs in: all of it is the account's
    ev("2026-11-21T12:00:00Z", "visit", "landing", "b1"),
    ev("2026-11-21T12:01:00Z", "signed_in", "google", "b1", "u1"),
    ev("2026-11-21T12:02:00Z", "card_saved", "universal", "b1", "u1"),
  ];
  const accounts = [
    { id: "u1", email: "a@example.com", createdAt: "2026-11-21T12:01:00Z" },
    // signed up before tracking began, no events at all: still a visitor who signed in
    { id: "u2", email: "b@example.com", createdAt: "2026-11-18T09:00:00Z" },
  ];
  const model = buildModel(events, [], accounts);
  const { rows, cards, passes, newAccounts } = funnel(model, ...all);
  assert.deepEqual(rows.visited, { guests: 2, accounts: 2, total: 4 });
  assert.deepEqual(rows.started, { guests: 1, accounts: 1, total: 2 });
  assert.deepEqual(rows.created, { guests: 1, accounts: 1, total: 2 });
  assert.deepEqual(rows.tapped, { guests: 1, accounts: 0, total: 1 });
  assert.deepEqual(rows.added, { guests: 1, accounts: 0, total: 1 });
  assert.equal(cards, 2);
  assert.equal(passes, 1);
  assert.equal(newAccounts, 2);
  const order = ["visited", "started", "created", "tapped", "added"] as const;
  for (let i = 1; i < order.length; i++) assert.ok(rows[order[i]].total <= rows[order[i - 1]].total);
  for (const key of order) assert.equal(rows[key].guests + rows[key].accounts, rows[key].total);
  assert.equal(model.name("u1"), "a@example.com");
  assert.equal(model.name("g1"), "Guest 1");
  assert.equal(model.name("g2"), "Guest 2");
});

test("periods only count what happened inside them", () => {
  const events = [ev("2026-11-20T23:59:00Z", "visit", "landing", "g1"), ev("2026-11-21T00:00:00Z", "visit", "landing", "g2")];
  const model = buildModel(events, [], []);
  const { rows } = funnel(model, new Date("2026-11-21T00:00:00Z"), new Date("2026-11-22T00:00:00Z"));
  assert.equal(rows.visited.total, 1);
});

test("old account cards from the cards table count as cards created", () => {
  const model = buildModel([], [{ at: "2026-11-18T10:00:00Z", ownerId: "u1", kind: "linkedin" }], [{ id: "u1", email: null, createdAt: "2026-11-18T09:00:00Z" }]);
  const { rows, cards } = funnel(model, ...all);
  assert.equal(cards, 1);
  assert.equal(rows.created.accounts, 1);
});

test("each action reads in plain English", () => {
  assert.equal(describe(ev("x", "wallet_tap", "whatsapp", "g")), "Pressed Add to Apple Wallet: WhatsApp card");
  assert.equal(describe(ev("x", "trial_started", "all", "g")), "Loaded the card maker");
  assert.equal(describe(ev("x", "trial_started", "linkedin", "g")), "Started filling in a LinkedIn card");
});
