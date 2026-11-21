import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const save = /^(Create my card|Save changes)$/;

test("the landing page opens the studio and explains how cards work", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Create your free contact cards for Apple Wallet" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
  await page.getByRole("banner").getByRole("link", { name: "Create my card" }).click();
  await expect(page.getByRole("heading", { name: "Let’s make your card" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create Universal Cards" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create Individual Cards" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("Studio loads the demo only when played", async ({ page }) => {
  const videos: string[] = [];
  page.on("request", request => { if (request.url().includes(".mp4")) videos.push(request.url()); });
  await page.goto("/studio");
  const clip = page.locator(".studio-clip");
  await expect(clip.getByRole("button")).toBeVisible();
  expect(videos).toEqual([]);
  await clip.getByRole("button").click();
  await expect(clip.locator("video")).toBeVisible();
  await expect.poll(() => videos.length).toBeGreaterThan(0);
});

test("landing rotates every 1.5 seconds with reduced motion and can pause", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/");
  const pause = page.getByRole("button", { name: "Pause card examples" });
  await expect(pause).toBeVisible();
  await expect(page.getByRole("img", { name: "Example WhatsApp QR" })).toBeVisible();
  await expect(page.locator(".device-pass")).toHaveCSS("animation-name", "none");
  const sampleHeight = await page.locator(".device-pass").evaluate(card => card.clientHeight);
  for (const label of ["Universal card", "Email", "LinkedIn", "Instagram", "Phone", "Website", "Custom link", "Snapchat", "WhatsApp"]) {
    await page.clock.runFor(1_500);
    await expect(page.getByRole("img", { name: `Example ${label} QR` })).toBeVisible();
    expect(await page.locator(".device-pass").evaluate(card => card.clientHeight)).toBe(sampleHeight);
  }
  await pause.click();
  await page.clock.runFor(3_000);
  await expect(page.getByRole("img", { name: "Example WhatsApp QR" })).toBeVisible();
});

test("shares and downloads the full card image with browser fallbacks", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperties(navigator, {
      canShare: { configurable: true, value: () => true },
      share: {
        configurable: true,
        value: async ({ files, url }: ShareData) => {
          const file = files?.[0];
          const header = file ? [...new Uint8Array(await file.slice(0, 8).arrayBuffer())] : undefined;
          document.documentElement.dataset.shared = JSON.stringify({ url, name: file?.name, type: file?.type, header });
        },
      },
      clipboard: {
        configurable: true,
        value: { writeText: async (value: string) => { document.documentElement.dataset.copied = value; } },
      },
    });
  });
  await page.goto("/");
  const footerShare = page.getByRole("button", { name: "Share Heya with friends" });
  const documentRoot = page.locator("html");
  await expect(footerShare).toHaveCount(0);
  const faq = page.getByRole("region", { name: "Frequently asked questions" });
  await faq.getByText("How does someone scan my card?").click();
  await expect(faq.getByText(/point it at the whole square/)).toBeVisible();
  await page.goto("/studio");
  await expect(footerShare).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Share card" })).toHaveCount(0);
  await page.getByRole("button", { name: /^Email\b/i }).click();
  await page.getByLabel("Email address").fill("alex@example.com");
  await page.getByRole("button", { name: save }).click();
  const qr = page.getByRole("img", { name: "Scannable card QR" });
  const share = page.getByRole("button", { name: "Share card" });
  await expect(qr).toBeVisible();
  await share.click();
  await expect(documentRoot).toHaveAttribute("data-shared", JSON.stringify({
    name: "Email.png", type: "image/png", header: [137, 80, 78, 71, 13, 10, 26, 10],
  }));
  const imagePosition = (await qr.boundingBox())!;
  expect((await share.boundingBox())!.y).toBeGreaterThan(imagePosition.y + imagePosition.height);

  await page.evaluate(() => Object.defineProperty(navigator, "canShare", { configurable: true, value: () => false }));
  const download = page.waitForEvent("download");
  await share.click();
  const sharedDownload = await download;
  expect(sharedDownload.suggestedFilename()).toBe("Email.png");
  const png = await readFile(await sharedDownload.path());
  expect(png.readUInt32BE(16)).toBe(1260);
  expect(png.readUInt32BE(20)).toBeGreaterThan(png.readUInt32BE(16));
  await expect(page.getByText("Card image downloaded.")).toBeVisible();
});

test("save a Universal card before producing a QR, export it and reopen it", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/studio");
  await page.getByRole("button", { name: /^Universal card Scanning/ }).click();
  await expect(page.getByRole("paragraph").filter({ hasText: "When someone scans it, their phone offers to save you as a contact." })).toBeVisible();
  await page.getByLabel("Full name").fill("Zoë Tan");
  await expect(page.getByLabel("Job title")).toBeVisible();
  await expect(page.getByLabel("Company")).toBeVisible();
  await page.getByLabel("email 1", { exact: true }).fill("zoe@example.com");
  await page.getByRole("button", { name: "Add email" }).click();
  await page.getByLabel("email 2 label").selectOption("home");
  await page.getByLabel("email 2", { exact: true }).fill("zoe.home@example.com");
  await page.getByLabel("phone 1", { exact: true }).fill("+44 7700 900123");
  await expect(page.getByText(/Anyone who scans or photographs your QR/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Saved card" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add to Apple Wallet" })).toHaveCount(0);
  await page.getByRole("button", { name: save }).click();
  await expect(page.getByRole("heading", { name: "Your card is ready" })).toBeVisible();
  await expect(page.locator(".pass-brand-row > :first-child")).toHaveText("Universal card");
  await expect(page.locator(".pass-brand-row > :last-child")).toHaveText("heya.cards");
  await expect(page.locator(".scan-label")).toHaveText("When someone scans it, their phone offers to save you as a contact.");
  await expect(page.getByRole("img", { name: "Scannable card QR" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to Apple Wallet" })).toHaveCount(0);
  await expect(page.getByText(/Apple Wallet is coming soon/)).toBeVisible();

  const vcfStart = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download contact file (.vcf)", exact: true }).click();
  const vcf = await vcfStart;
  expect(vcf.suggestedFilename()).toBe("Universal-card.vcf");
  const content = await readFile(await vcf.path(), "utf8");
  expect(content).toContain("\r\nFN:Zoë Tan\r\n");
  expect(content).toContain("\r\nEMAIL;TYPE=home:zoe.home@example.com\r\n");

  const pngStart = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download card" }).click();
  const png = await pngStart;
  expect((await readFile(await png.path())).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");

  await page.reload();
  await page.getByRole("navigation").getByRole("button", { name: "Your cards" }).click();
  await page.getByRole("button", { name: "Edit Universal card" }).click();
  await expect(page.getByLabel("phone 1", { exact: true })).toHaveValue("+447700900123");
  await expect(page.getByLabel("email 2 label")).toHaveValue("home");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(errors).toEqual([]);
});

test("create, open, update and delete an Individual card in Manage cards", async ({ page }) => {
  await page.goto("/studio");
  for (const [name, description] of [
    ["LinkedIn", "Scanning opens the linked LinkedIn page."],
    ["WhatsApp", "Scanning opens a chat with the linked number if it is active on WhatsApp."],
    ["Email", "Scanning opens a new email with the address in the To field."],
    ["Phone", "Scanning opens the phone dialer with the number filled in."],
    ["Instagram", "Scanning opens the linked Instagram profile."],
    ["Snapchat", "Scanning opens the linked Snapchat profile."],
    ["custom link", "Scanning opens the exact link you entered."],
    ["website", "Scanning opens the website in a browser."],
  ]) {
    await page.getByRole("button", { name: new RegExp(`^${name}\\b`, "i") }).click();
    await expect(page.locator(".focused-heading").getByText(description, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "All card types" }).click();
  }
  await page.getByRole("button", { name: /^LinkedIn\b/i }).click();
  await expect(page.getByLabel("Name in Manage cards")).toHaveCount(0);
  await expect(page.getByLabel(/Name on card/)).toBeVisible();
  await page.getByLabel(/Name on card/).fill("Alex Morgan");
  await page.getByLabel("LinkedIn profile URL").fill("https://www.linkedin.com/in/alex-morgan/?tracking=1");
  await expect(page.getByRole("region", { name: "Saved card" })).toHaveCount(0);
  await page.getByRole("button", { name: save }).click();
  const resultHeading = page.getByRole("heading", { name: /^(Your card is ready|Your card is updated|LinkedIn)$/ });
  await expect(resultHeading).toBeVisible();
  await expect(page.locator(".pass-brand-row > :first-child")).toHaveText("LinkedIn");
  await expect(page.locator(".pass-platform .mark-linkedin")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(page.getByRole("region", { name: "Saved card" }).getByText("Alex Morgan")).toBeVisible();
  await expect(page.getByText("alex-morgan", { exact: true })).toHaveCount(0);
  const qrPath = page.getByRole("img", { name: "Scannable card QR" }).locator("path");
  const firstQr = await qrPath.getAttribute("d");
  await page.getByRole("navigation").getByRole("button", { name: "Your cards" }).click();
  await page.getByRole("button", { name: "Open LinkedIn" }).click();
  await expect(resultHeading).toBeVisible();
  await expect(page.getByRole("img", { name: "Scannable card QR" })).toBeVisible();
  await expect(page.locator(".scan-label")).toHaveText("Scanning opens the linked LinkedIn page.");
  await page.getByRole("button", { name: "Edit details" }).click();
  await expect(page.getByRole("region", { name: "Saved card" })).toHaveCount(0);
  await page.getByLabel("LinkedIn profile URL").fill("https://www.linkedin.com/in/alex-north");
  await page.getByRole("button", { name: save }).click();
  await expect(resultHeading).toBeVisible();
  await expect(page.getByText("alex-north", { exact: true })).toHaveCount(0);
  expect(await qrPath.getAttribute("d")).not.toBe(firstQr);
  await page.getByRole("navigation").getByRole("button", { name: "Your cards" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete LinkedIn" }).click();
  await expect(page.getByText("Your saved cards will appear here.")).toBeVisible();
});

test("created and reopened cards reveal the name while the QR stays still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/studio");
  await page.getByRole("button", { name: /^Email\b/i }).click();
  await page.getByLabel("Email address").fill("alex@example.com");
  await page.getByRole("button", { name: save }).click();
  const card = page.locator(".wallet-preview");
  const holder = card.locator(".pass-holder");
  await expect(holder).toHaveCSS("animation-name", "holder-reveal");
  await expect(holder).toHaveCSS("animation-duration", "0.56s");
  await expect(card).toHaveCSS("animation-name", "none");
  const sweep = () => card.locator(".pass-face").evaluate((face) => getComputedStyle(face, "::after").animationName);
  expect(await sweep()).toBe("pass-light");
  await expect(card.getByText("Scan to email")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(card).toHaveCSS("animation-name", "none");
  expect(await sweep()).toBe("none");
  await expect(holder).toHaveCSS("animation-name", "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Edit details" }).click();
  await page.getByLabel("Name on card").fill("Alex Morgan");
  await page.getByRole("button", { name: save }).click();
  await expect(card).toHaveCSS("animation-name", "none");
  await page.getByRole("navigation").getByRole("button", { name: "Your cards" }).click();
  await page.getByRole("button", { name: "Open Email" }).click();
  await expect(holder).toHaveCSS("animation-duration", "0.24s");
  await expect(holder).toHaveCSS("animation-name", "holder-reveal");
  expect(await sweep()).toBe("pass-light");
  await expect(card).toHaveCSS("animation-name", "none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await sweep()).toBe("none");
});

test("validate QR density when saving", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: /^custom link\b/i }).click();
  const destination = page.getByLabel("Link URL");
  await destination.fill("https://example.com/" + "a".repeat(420));
  await page.getByRole("button", { name: save }).click();
  await expect(page.getByRole("alert").filter({ hasText: "too dense" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Saved card" })).toHaveCount(0);
  await destination.fill("https://example.com/" + "a".repeat(240));
  await page.getByRole("button", { name: save }).click();
  await expect(page.getByText(/This QR holds a lot of detail/)).toBeVisible();
  await page.setViewportSize({ width: 320, height: 750 });
  const qr = page.getByRole("img", { name: "Scannable card QR" });
  const pixelsPerModule = await qr.evaluate((element) => {
    const svg = element as SVGSVGElement;
    return svg.clientWidth / svg.viewBox.baseVal.width;
  });
  expect(Number.isInteger(pixelsPerModule)).toBe(true);
  expect(pixelsPerModule).toBeGreaterThanOrEqual(2);
});

test("a separate Website card opens the saved web destination", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: /^website\b/i }).click();
  await page.getByLabel("Website URL").fill("https://example.org/company");
  await page.getByRole("button", { name: save }).click();
  await expect(page.getByRole("img", { name: "Scannable card QR" })).toBeVisible();
  await page.getByRole("navigation", { name: "Card studio" }).getByRole("button", { name: "Your cards" }).click();
  await page.getByRole("button", { name: "Edit Website" }).click();
  await expect(page.getByLabel("Website URL")).toHaveValue("https://example.org/company");
});

test("a Snapchat card saves the username and renders a shareable QR", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: /^Snapchat\b/i }).click();
  await page.getByLabel("Snapchat username or profile link").fill("@alex.morgan");
  await page.getByRole("button", { name: save }).click();
  await expect(page.getByRole("img", { name: "Scannable card QR" })).toBeVisible();
  await expect(page.locator(".scan-label")).toHaveText("Scanning opens the linked Snapchat profile.");
  await page.getByRole("navigation", { name: "Card studio" }).getByRole("button", { name: "Your cards" }).click();
  await page.getByRole("button", { name: "Edit Snapchat" }).click();
  await expect(page.getByLabel("Snapchat username or profile link")).toHaveValue("@alex.morgan");
});

test("saved Universal details prefill new cards", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: /^Universal card Scanning/ }).click();
  await page.getByLabel("Full name").fill("Alan Turing");
  await page.getByRole("button", { name: "Add link" }).click();
  await page.getByLabel("Link 1", { exact: true }).fill("https://www.linkedin.com/in/example");
  await expect(page.locator("input[type=file]")).toHaveCount(0);
  await page.getByRole("button", { name: save }).click();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: /^LinkedIn\b/i }).click();
  await expect(page.getByLabel("LinkedIn profile URL")).toHaveValue("https://www.linkedin.com/in/example");
});

test("new Universal cards open with saved individual values already in editable fields", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: /^website\b/i }).click();
  await page.getByLabel("Website URL").fill("museum.example.org/exhibitions");
  await page.getByRole("button", { name: save }).click();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: /^Universal card Scanning/ }).click();
  await expect(page.getByLabel("Link 1", { exact: true })).toHaveValue("museum.example.org/exhibitions");
  await expect(page.getByRole("button", { name: /Use saved individual details/ })).toHaveCount(0);
  await page.getByLabel("Link 1", { exact: true }).fill("another.example.com");
  await page.getByRole("button", { name: save }).click();
  await expect(page.getByRole("heading", { name: "Your card is ready" })).toBeVisible();
});


test("the public FAQ is reachable from the landing page and Studio", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Read the full FAQ/ }).click();
  await expect(page).toHaveURL(/\/faq$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Frequently asked questions");
  await page.getByText("What opens when someone scans an Individual card?", { exact: true }).click();
  await expect(page.locator(".faq-destinations dt")).toHaveCount(8);
  await expect(page.getByText(/A chat with your number/)).toBeVisible();
  await page.getByText("How do I add my Heya card to Apple Wallet?", { exact: true }).click();
  await expect(page.getByText(/Apple Wallet is coming soon/)).toBeVisible();
  await page.goto("/studio");
  await page.getByRole("contentinfo").getByRole("link", { name: "FAQ" }).click();
  await expect(page.getByRole("heading", { name: "Getting started" })).toBeVisible();
});
