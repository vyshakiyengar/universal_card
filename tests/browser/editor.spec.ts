import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const save = /^Generate your Apple Wallet card$/;

test("the public landing explains the steps and links to the studio", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("img", { name: "Example WhatsApp QR" })).toBeVisible();
  await page.getByRole("button", { name: "Pause card examples" }).click();
  await expect(page.getByRole("button", { name: "Play card examples" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create your free contact cards for Apple Wallet" })).toBeVisible();
  await expect(page.getByText("Create for free. Let people scan to save your details or open a link with a single click.")).toBeVisible();
  const title = "Free Business Cards for Apple Wallet · Heya cards";
  await expect(page).toHaveTitle(title);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", title);
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute("content", title);
  const icon = page.locator(".device-wallet-label img");
  await expect(icon).toBeVisible();
  await expect(icon).toHaveCSS("width", "19px");
  await expect.poll(() => icon.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  const tray = page.getByRole("button", { name: "Play card examples" });
  await expect(tray.locator(".destination-mark")).toHaveCount(9);
  await expect(tray).toHaveCSS("background-color", "rgb(239, 239, 237)");
  await expect(tray.locator('[data-active="true"] .destination-mark')).toHaveCSS("color", "rgb(55, 59, 56)");
  const platforms = page.getByRole("img", { name: /Available card types include WhatsApp.*LinkedIn.*Universal card/ });
  await expect(platforms).toBeVisible();
  await expect.poll(() => platforms.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  const example = page.getByRole("region", { name: "3 simple steps", exact: true });
  await expect(example.getByRole("link", { name: "Go to the three steps" })).toHaveAttribute("href", "#how-it-works");
  await expect(example.locator(".scan-example-jump svg")).toHaveAttribute("stroke-width", "1.35");
  await expect(example.getByRole("heading", { level: 3 })).toHaveText([
    "Create and add your card", "Someone scans your Heya card in Apple Wallet", "They open your chat or contact details",
  ]);
  await expect(example.getByText("Choose WhatsApp, another contact option, or a Universal card for all your details. Fill it in and add it to Apple Wallet.")).toBeVisible();
  await expect(example.locator(".scan-camera-wallet")).toHaveText("Apple Wallet");
  await expect(example.locator(".scan-camera-wallet img")).toHaveCSS("width", "18px");
  await expect.poll(() => example.locator(".scan-camera-wallet img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(example.getByText(/The same steps work for any contact option/)).toBeVisible();
  await expect(example.getByText(/Open the card to show its QR code/)).toBeVisible();
  await expect(example.getByText(/A WhatsApp card opens your chat/)).toBeVisible();
  const sampleForm = example.getByRole("img", { name: /WhatsApp form with a sample number/ });
  await sampleForm.scrollIntoViewIfNeeded();
  await expect.poll(() => sampleForm.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(page.getByRole("img", { name: "Scannable card QR" })).toHaveCount(0);
  const logo = page.getByRole("banner").getByRole("link", { name: "Heya Cards" });
  await expect(logo).toBeVisible();
  await expect(logo.locator(".heya-wordmark")).toHaveText("heyacards");
  const headerAction = page.getByRole("banner").getByRole("link", { name: "Create my Heya card", exact: true });
  const createAction = page.getByRole("main").getByRole("link", { name: "Create my Heya card", exact: true });
  const credit = page.getByRole("contentinfo").getByRole("link", { name: "Vyshak K Iyengar", exact: true });
  await expect(headerAction).toHaveAttribute("href", "/studio");
  await expect(createAction).toHaveAttribute("href", "/studio");
  await expect(credit).toHaveAttribute("href", "https://vyshak.me");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);

  if (page.viewportSize()!.width <= 680) {
    await expect(platforms).toHaveCSS("width", "180px");
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
    await expect(headerAction).toBeInViewport({ ratio: 1 });
    await expect(createAction).toBeInViewport({ ratio: 1 });
    await expect(credit).toBeInViewport({ ratio: 1 });
    const buttonPosition = (await createAction.boundingBox())!;
    const creditPosition = (await credit.boundingBox())!;
    expect(creditPosition.y).toBeGreaterThan(buttonPosition.y + buttonPosition.height);
    const examplePosition = (await example.boundingBox())!;
    expect(buttonPosition.y).toBeGreaterThan(examplePosition.y + examplePosition.height);
    await createAction.click();
  } else {
    await expect(platforms).toHaveCSS("width", "216px");
    const buttonPosition = (await createAction.boundingBox())!;
    const platformsPosition = (await platforms.boundingBox())!;
    expect(platformsPosition.x).toBeGreaterThan(buttonPosition.x + buttonPosition.width);
    await expect(headerAction).toBeInViewport({ ratio: 1 });
    await headerAction.click();
  }
  await expect(page).toHaveURL(/\/studio$/);
  const intro = page.getByRole("heading", { name: "One Apple Wallet card for all your contact details, or one for each." });
  await expect(intro).toBeVisible();
  await expect(intro.locator("em")).toHaveText("Apple Wallet");
  await expect(intro.locator(".hero-alternative")).toHaveText("one for each");
  await expect(intro.locator(".hero-alternative")).toHaveCSS("color", "rgb(36, 91, 89)");
  const explore = page.getByRole("link", { name: "Explore Heya cards" });
  await expect(explore).toHaveAttribute("href", "#universal-cards");
  await expect(explore).toHaveCSS("border-top-style", "none");
  await expect(credit).toHaveAttribute("href", "https://vyshak.me");
  await expect(page.getByRole("heading", { name: "Create Universal Cards", exact: true })).toBeVisible();
  await expect(page.locator("#universal-title span")).toHaveCSS("color", "rgb(36, 74, 115)");
  await expect(page.getByText("All contact details you choose to share in one QR", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create Individual Cards", exact: true })).toBeVisible();
  await expect(page.locator("#individual-title span")).toHaveCSS("color", "rgb(36, 91, 89)");
  await expect(page.getByText("One card for an app, link, or contact detail", { exact: true })).toBeVisible();
  const stack = page.getByRole("img", { name: /Apple Wallet illustration with HSBC, Citi, American Express, WhatsApp and LinkedIn/ });
  await expect(stack).toBeVisible();
  await expect(page.locator(".stack-whatsapp .destination-mark")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(page.getByText("Open your Wallet card and let someone scan it to get your details in seconds.")).toHaveCount(0);
  await expect(page.getByText("Scanning this QR shares all your contact details in one vCard.")).toBeVisible();
  if (page.viewportSize()!.width <= 680) {
    const headline = (await intro.boundingBox())!;
    const illustration = (await stack.boundingBox())!;
    const link = (await explore.boundingBox())!;
    expect(headline.x + headline.width).toBeLessThan(illustration.x);
    expect(headline.y).toBeLessThan(illustration.y + illustration.height);
    expect(illustration.y).toBeLessThan(headline.y + headline.height);
    expect(link.y).toBeGreaterThanOrEqual(Math.max(headline.y + headline.height, illustration.y + illustration.height));
    await explore.click();
    await expect(page).toHaveURL(/#universal-cards$/);
    await expect(page.getByRole("heading", { name: "Create Universal Cards", exact: true })).toBeInViewport();
    await expect(page.getByRole("button", { name: /Create Apple Wallet card for your WhatsApp/ })).toHaveCSS("min-height", "56px");
    await expect(page.locator(".tile-action").first()).toHaveCSS("clip-path", "inset(50%)");
    const mobileArrows = page.locator(".universal-choice .universal-arrow, .destination-card .tile-arrow");
    await expect(mobileArrows).toHaveCount(9);
    for (const arrow of await mobileArrows.all()) {
      await expect(arrow).toBeVisible();
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("landing rotates every two seconds with reduced motion and can pause", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/");
  const pause = page.getByRole("button", { name: "Pause card examples" });
  await expect(pause).toBeVisible();
  await expect(page.getByRole("img", { name: "Example WhatsApp QR" })).toBeVisible();
  await expect(page.locator(".device-pass")).toHaveCSS("animation-name", "none");
  for (const label of ["Universal card", "Email", "LinkedIn", "Instagram", "Phone", "Website", "Custom link", "Snapchat", "WhatsApp"]) {
    await page.clock.runFor(2_000);
    await expect(page.getByRole("img", { name: `Example ${label} QR` })).toBeVisible();
  }
  await pause.click();
  await page.clock.runFor(4_000);
  await expect(page.getByRole("img", { name: "Example WhatsApp QR" })).toBeVisible();
});

test("save a Universal card before producing a QR, export it and reopen it", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/studio");
  await page.getByRole("button", { name: /^Universal card Scanning/ }).click();
  await expect(page.getByText("On compatible phones, scanning opens a vCard you can save to Contacts.")).toBeVisible();
  await page.getByLabel(/Name on card/).fill("Zoë Tan");
  await expect(page.getByLabel("Job title")).toBeVisible();
  await expect(page.getByLabel("Company")).toBeVisible();
  await page.getByRole("button", { name: "Add email" }).click();
  await page.getByLabel("email 1", { exact: true }).fill("zoe@example.com");
  await page.getByRole("button", { name: "Add email" }).click();
  await page.getByLabel("email 2 label").selectOption("home");
  await page.getByLabel("email 2", { exact: true }).fill("zoe.home@example.com");
  await page.getByRole("button", { name: "Add phone" }).click();
  await page.getByLabel("phone 1", { exact: true }).fill("+44 7700 900123");
  await expect(page.getByText(/Anyone who scans or photographs your QR/)).toBeVisible();
  await expect(page.getByRole("img", { name: "Scannable card QR" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add to Apple Wallet" })).toHaveCount(0);
  await page.getByRole("button", { name: save }).click();
  await expect(page.getByRole("heading", { name: "Your Universal Heya Card" })).toBeVisible();
  await expect(page.locator(".pass-brand-row > :first-child")).toHaveText("Universal card");
  await expect(page.locator(".pass-brand-row > :last-child")).toHaveText("Apple Wallet");
  await expect(page.locator(".scan-label")).toHaveText("On compatible phones, scanning opens a vCard you can save to Contacts.");
  await expect(page.getByRole("img", { name: "Scannable card QR" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to Apple Wallet" })).toBeDisabled();
  await expect(page.getByText("Wallet installation coming soon.")).toBeVisible();

  const vcfStart = page.waitForEvent("download");
  await page.getByRole("button", { name: "vCard", exact: true }).click();
  const vcf = await vcfStart;
  expect(vcf.suggestedFilename()).toBe("Universal-contact.vcf");
  const content = await readFile(await vcf.path(), "utf8");
  expect(content).toContain("\r\nFN:Zoë Tan\r\n");
  expect(content).toContain("\r\nEMAIL;TYPE=home:zoe.home@example.com\r\n");

  const pngStart = page.waitForEvent("download");
  await page.getByRole("button", { name: "QR image" }).click();
  const png = await pngStart;
  expect((await readFile(await png.path())).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");

  await page.reload();
  await page.getByRole("navigation").getByRole("button", { name: "Manage cards" }).click();
  await page.getByRole("button", { name: "Edit Universal contact" }).click();
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
    await page.getByRole("button", { name: new RegExp(`Create Apple Wallet card for your ${name}`) }).click();
    await expect(page.getByText(description, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "All card types" }).click();
  }
  await page.getByRole("button", { name: /Create Apple Wallet card for your LinkedIn/ }).click();
  await expect(page.getByLabel("Name in Manage cards")).toHaveCount(0);
  await expect(page.getByLabel(/Name on card/)).toBeVisible();
  await page.getByLabel(/Name on card/).fill("Alex Morgan");
  await page.getByLabel("LinkedIn profile URL").fill("https://www.linkedin.com/in/alex-morgan/?tracking=1");
  await expect(page.getByRole("img", { name: "Scannable card QR" })).toHaveCount(0);
  await page.getByRole("button", { name: save }).click();
  const resultHeading = page.getByRole("heading", { name: "Your LinkedIn Heya Card" });
  await expect(resultHeading).toHaveCSS("font-size", "18px");
  await expect(page.locator(".pass-brand-row > :first-child")).toHaveText("LinkedIn");
  await expect(page.locator(".pass-platform .mark-linkedin")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(page.locator(".pass-brand-row > :last-child .apple-wallet-mark")).toHaveCSS("width", "14px");
  await expect(page.getByRole("region", { name: "Saved card" }).getByText("Alex Morgan")).toBeVisible();
  await expect(page.getByText("alex-morgan", { exact: true })).toHaveCount(0);
  const qrPath = page.getByRole("img", { name: "Scannable card QR" }).locator("path");
  const firstQr = await qrPath.getAttribute("d");
  await page.getByRole("navigation").getByRole("button", { name: "Manage cards" }).click();
  await page.getByRole("button", { name: "Open LinkedIn" }).click();
  await expect(resultHeading).toBeVisible();
  await expect(page.getByRole("img", { name: "Scannable card QR" })).toBeVisible();
  await expect(page.locator(".scan-label")).toHaveText("Scanning opens the linked LinkedIn page.");
  await page.getByRole("button", { name: "Edit details" }).click();
  await expect(page.getByRole("img", { name: "Scannable card QR" })).toHaveCount(0);
  await page.getByLabel("LinkedIn profile URL").fill("https://www.linkedin.com/in/alex-north");
  await page.getByRole("button", { name: save }).click();
  await expect(resultHeading).toBeVisible();
  await expect(page.getByText("alex-north", { exact: true })).toHaveCount(0);
  expect(await qrPath.getAttribute("d")).not.toBe(firstQr);
  await page.getByRole("navigation").getByRole("button", { name: "Manage cards" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete LinkedIn" }).click();
  await expect(page.getByText("Your saved cards will appear here.")).toBeVisible();
});

test("validate QR density when saving", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: /Create Apple Wallet card for your custom link/ }).click();
  const destination = page.getByLabel("Link URL");
  await destination.fill("https://example.com/" + "a".repeat(420));
  await page.getByRole("button", { name: save }).click();
  await expect(page.getByRole("alert").filter({ hasText: "too dense" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Scannable card QR" })).toHaveCount(0);
  await destination.fill("https://example.com/" + "a".repeat(240));
  await page.getByRole("button", { name: save }).click();
  await expect(page.getByText(/This QR is dense/)).toBeVisible();
});

test("a separate Website card opens the saved web destination", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: /Create Apple Wallet card for your website/i }).click();
  await page.getByLabel("Website URL").fill("https://example.org/company");
  await page.getByRole("button", { name: save }).click();
  await expect(page.getByRole("img", { name: "Scannable card QR" })).toBeVisible();
  await page.getByRole("navigation", { name: "Card studio" }).getByRole("button", { name: "Manage cards" }).click();
  await page.getByRole("button", { name: "Edit Website" }).click();
  await expect(page.getByLabel("Website URL")).toHaveValue("https://example.org/company");
});

test("a Snapchat card saves the username and renders a shareable QR", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: /Create Apple Wallet card for your Snapchat/ }).click();
  await page.getByLabel("Snapchat username or profile link").fill("@alex.morgan");
  await page.getByRole("button", { name: save }).click();
  await expect(page.getByRole("img", { name: "Scannable card QR" })).toBeVisible();
  await expect(page.locator(".scan-label")).toHaveText("Scanning opens the linked Snapchat profile.");
  await page.getByRole("navigation", { name: "Card studio" }).getByRole("button", { name: "Manage cards" }).click();
  await page.getByRole("button", { name: "Edit Snapchat" }).click();
  await expect(page.getByLabel("Snapchat username or profile link")).toHaveValue("@alex.morgan");
});
