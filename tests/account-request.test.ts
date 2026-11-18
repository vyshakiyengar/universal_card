import assert from "node:assert/strict";
import { test } from "node:test";
import { isSameOriginForm } from "../lib/server/account-request";

const origin = "https://universal-card.example";

test("native same-origin sign-out works when the browser suppresses Origin", () => {
  assert.ok(isSameOriginForm(new Headers({ origin }), origin));
  assert.ok(isSameOriginForm(new Headers({ origin: "null", "sec-fetch-site": "same-origin" }), origin));
  assert.ok(isSameOriginForm(new Headers({ "sec-fetch-site": "same-origin" }), origin));
});

test("untrusted sign-out requests remain blocked", () => {
  for (const site of ["cross-site", "same-site", "none"]) {
    assert.equal(isSameOriginForm(new Headers({ origin: "null", "sec-fetch-site": site }), origin), false);
  }
  assert.equal(isSameOriginForm(new Headers(), origin), false);
  assert.equal(isSameOriginForm(new Headers({ origin: "https://another.example", "sec-fetch-site": "same-origin" }), origin), false);
});
