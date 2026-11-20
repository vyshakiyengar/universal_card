import QRCode from "qrcode";
import { addIndividualDetails, savedDetail } from "../lib/saved-details";
import assert from "node:assert/strict";
import { test } from "node:test";
import jsQR from "jsqr";
import { CardValidationError, makeCardPayload, type UniversalCard } from "../lib/cards";
import { buildCardQr, qrLimits, qrQuietZone } from "../lib/qr";

const contact: UniversalCard = {
  type: "universal", title: "Private work alias", name: "Zoë, Tan",
  jobTitle: "Engineer", company: "Studio; North",
  emails: [{ label: "work", value: "zoe@example.com" }, { label: "home", value: "zt@example.com" }],
  phones: [{ label: "mobile", value: "+44 20 7946 0958" }, { label: "work", value: "+1 202 555 0112" }],
  links: [{ kind: "linkedin", value: "https://www.linkedin.com/in/zoe-tan/?trk=example" }],
};

function decode(payload: string) {
  const { size, modules } = buildCardQr(payload);
  const scale = 5;
  const width = (size + qrQuietZone * 2) * scale;
  const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) {
      const row = Math.floor(y / scale) - qrQuietZone;
      const col = Math.floor(x / scale) - qrQuietZone;
      if (row < 0 || row >= size || col < 0 || col >= size || !modules[row * size + col]) continue;
      const start = (y * width + x) * 4;
      pixels.fill(0, start, start + 3);
    }
  }
  return jsQR(pixels, width, width, { inversionAttempts: "dontInvert" })?.data;
}

test("Universal vCard round-trips with Unicode and repeated labeled fields", () => {
  const { card, payload } = makeCardPayload(contact);
  assert.equal(payload, [
    "BEGIN:VCARD", "VERSION:4.0", "FN:Zoë\\, Tan", "TITLE:Engineer", "ORG:Studio\\; North",
    "EMAIL;TYPE=work:zoe@example.com", "EMAIL;TYPE=home:zt@example.com",
    "TEL;TYPE=cell:+442079460958", "TEL;TYPE=work:+12025550112",
    "URL:https://www.linkedin.com/in/zoe-tan", "END:VCARD", "",
  ].join("\r\n"));
  assert.equal(decode(payload), payload);
  assert.equal(makeCardPayload(card).payload, payload);
  assert.ok(!payload.includes(contact.title));
});

test("Universal vCard folds by UTF-8 octets and escapes newlines", () => {
  const name = "李".repeat(52);
  const { payload } = makeCardPayload({ ...contact, name, jobTitle: "Lead\nTEL:+12345678", emails: [], links: [] });
  assert.ok(payload.split("\r\n").every((line) => Buffer.byteLength(line) <= 75));
  assert.ok(payload.replace(/\r\n /g, "").includes(`FN:${name}\r\nTITLE:Lead\\nTEL:+12345678\r\n`));
  assert.equal(decode(payload), payload);
  const fallback = makeCardPayload({ type: "universal", title: "Private", company: "Studio North" });
  assert.match(fallback.payload, /\r\nFN:Contact\r\n/);
  assert.throws(() => makeCardPayload({ type: "universal", title: "Private" }), CardValidationError);
});

test("Individual cards encode exactly one direct destination", () => {
  const examples = [
    ["linkedin", "https://www.linkedin.com/in/alex-morgan/?trk=mail", "https://www.linkedin.com/in/alex-morgan"],
    ["instagram", "@alex.morgan", "https://www.instagram.com/alex.morgan/"],
    ["snapchat", "@Alex.Morgan", "https://www.snapchat.com/add/alex.morgan"],
    ["snapchat", "https://snapchat.com/add/alex-morgan/?share=sample", "https://www.snapchat.com/add/alex-morgan"],
    ["whatsapp", "+44 (20) 7946-0958", "https://wa.me/442079460958"],
    ["email", "Alex+cards@Example.com", "mailto:Alex+cards@example.com"],
    ["phone", "+44 20 7946 0958", "tel:+442079460958"],
    ["website", "https://example.org/company?ref=wallet", "https://example.org/company?ref=wallet"],
    ["url", "https://example.org/portfolio?from=wallet#work", "https://example.org/portfolio?from=wallet#work"],
  ];
  for (const [kind, value, expected] of examples) {
    const { card, payload } = makeCardPayload({ type: "individual", title: "Private label", name: "Alex Morgan", kind, value });
    assert.equal(card.name, "Alex Morgan");
    assert.equal(payload, expected);
    assert.equal(decode(payload), expected);
  }
});

test("invalid targets cannot inject fields, spoof provider hosts or use unsafe schemes", () => {
  const examples = [
    ["linkedin", "https://www.linkedin.com.evil.example/in/fake"],
    ["instagram", "https://instagram.com@evil.example/fake"],
    ["whatsapp", "https://evil.example/12025550112"],
    ["snapchat", "https://snapchat.com.evil.example/add/alex"],
    ["snapchat", "https://snapchat.com/t/alex"],
    ["snapchat", "@alice."],
    ["email", "person@example.org\r\nEMAIL:extra@example.org"],
    ["phone", "123;phone-context=evil.example"],
    ["url", "javascript:alert(1)"],
  ];
  for (const [kind, value] of examples) {
    assert.throws(() => makeCardPayload({ type: "individual", title: "Card", kind, value }), CardValidationError);
  }
});

test("a Universal card can include Snapchat alongside other contact details", () => {
  const { payload } = makeCardPayload({
    type: "universal", title: "Personal", name: "Alex Morgan",
    emails: [{ label: "home", value: "alex@example.com" }],
    links: [{ kind: "snapchat", value: "@alex-morgan" }],
  });
  assert.match(payload, /\r\nEMAIL;TYPE=home:alex@example.com\r\n/);
  assert.match(payload, /\r\nURL:https:\/\/www\.snapchat\.com\/add\/alex-morgan\r\n/);
  assert.equal(decode(payload), payload);
});

test("QR density uses byte count, warns at the soft limit and blocks at the hard limit", () => {
  const normal = "a".repeat(qrLimits.warningBytes);
  assert.deepEqual([buildCardQr(normal).density, buildCardQr(normal).version], ["normal", qrLimits.warningVersion]);
  assert.equal(buildCardQr(normal + "é").density, "dense");
  const maximum = "a".repeat(qrLimits.maximumBytes);
  assert.equal(buildCardQr(maximum).version, qrLimits.maximumVersion);
  assert.equal(decode(maximum), maximum);
  assert.throws(() => buildCardQr(maximum + "a"), /too dense/);
});

test("bare domains keep the intended path and optimized vCards preserve every field", () => {
  const { payload } = makeCardPayload({ type: "individual", title: "Site", kind: "url", value: "vyshak.me/about?q=1#bio" });
  assert.equal(payload, "https://vyshak.me/about?q=1#bio");
  const { payload: vcard } = makeCardPayload(contact);
  assert.equal(decode(vcard), vcard);
});

test("a long contact encodes fewer modules without changing its decoded details", () => {
  const { payload } = makeCardPayload({ ...contact, company: "Turing Laboratory ".repeat(5).trim() });
  const code = buildCardQr(payload);
  const original = QRCode.create([{ data: new TextEncoder().encode(payload), mode: "byte" }], { errorCorrectionLevel: "M" });
  assert.ok(code.size < original.modules.size);
  assert.equal(decode(payload), payload);
});

test("saved values work in both directions without replacing details already entered", () => {
  const personal = makeCardPayload({ type: "individual", title: "Site", kind: "website", value: "vyshak.me" }).card;
  assert.equal(savedDetail([contact], "linkedin")?.value, contact.links[0].value);
  const combined = addIndividualDetails(contact, [personal]);
  assert.deepEqual(combined.links.at(-1), { kind: "website", value: "vyshak.me" });
  assert.deepEqual(combined.emails, contact.emails);
  assert.ok(makeCardPayload(combined).payload.includes("URL:https://vyshak.me/"));
});

test("Website, Custom link and Universal website fields accept bare domains", () => {
  for (const value of ["company.org", "www.museum.co.uk/visit", "bücher.de/katalog?q=1#top"]) {
    const target = new URL(`https://${value}`).href;
    for (const kind of ["url", "website"]) {
      assert.equal(makeCardPayload({ type: "individual", title: "Web", kind, value }).payload, target);
      assert.ok(makeCardPayload({ type: "universal", title: "Web", links: [{ kind, value }] }).payload.includes("URL:" + target));
    }
  }
});
