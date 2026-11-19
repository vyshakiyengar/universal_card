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
  await expect(page.getByText("Let people scan to save your details or open a link with a single click.", { exact: true })).toBeVisible();
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
  await expect(page.locator(".landing-platforms")).toHaveCount(0);
  const example = page.getByRole("region", { name: "3 simple steps", exact: true });
  await expect(example.getByRole("link", { name: "Go to the three steps" })).toHaveAttribute("href", "#how-it-works");
  await expect(example.locator(".scan-example-jump svg")).toHaveAttribute("stroke-width", "1.35");
  await expect(example.getByRole("heading", { level: 3 })).toHaveText([
    "Create and add your Heya card in Apple Wallet. It’s free!",
    "Someone scans the QR code on your Heya card in the Apple Wallet",
    "They open your chat or contact details",
  ]);
  await expect(example.getByText("It’s free!", { exact: true })).toHaveCSS("color", "rgb(36, 91, 89)");
  await expect(example.locator(".scan-example-flow p")).toHaveCount(0);
  await expect(example.locator(".scan-camera-wallet")).toHaveText("Apple Wallet");
  await expect(example.locator(".scan-camera-wallet img")).toHaveCSS("width", "18px");
  await expect.poll(() => example.locator(".scan-camera-wallet img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(example.getByText(/The same steps work for any contact option/)).toBeVisible();
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
    await expect(createAction).toBeInViewport({ ratio: 1 });
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
  const freeNote = page.getByText("It’s free!", { exact: true });
  await expect(freeNote).toBeVisible();
  await expect(freeNote).toHaveCSS("color", "rgb(36, 91, 89)");
  expect((await freeNote.boundingBox())!.y).toBeGreaterThanOrEqual((await explore.boundingBox())!.y + (await explore.boundingBox())!.height);
  await expect(credit).toHaveAttribute("href", "https://vyshak.me");
  await expect(credit).toHaveCSS("text-decoration-line", "underline");
  await expect(page.getByRole("heading", { name: "Create Universal Cards", exact: true })).toBeVisible();
  await expect(page.locator("#universal-title span")).toHaveCSS("color", "rgb(36, 74, 115)");
  await expect(page.getByText("(All contact details in one card)", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create Individual Cards", exact: true })).toBeVisible();
  await expect(page.locator("#individual-title span")).toHaveCSS("color", "rgb(36, 91, 89)");
  await expect(page.getByText("(Separate cards for each)", { exact: true })).toBeVisible();
  const stack = page.getByRole("img", { name: /Apple Wallet illustration with a partly open WhatsApp card/ });
  await expect(stack).toBeVisible();
  await expect(stack.locator(".stack-pass-label")).toHaveText(["HSBC", "citi", "LinkedIn", "Universal card", "WhatsApp"]);
  await expect(stack.locator(".stack-whatsapp")).toHaveCSS("animation-name", "none");
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
    await page.setViewportSize({ width: 320, height: 740 });
    await page.evaluate(() => document.fonts.ready);
    for (const heading of await page.locator(".chooser-section .section-heading").all()) {
      const title = (await heading.locator("h2").boundingBox())!;
      const caption = (await heading.locator("p").boundingBox())!;
      expect(caption.x).toBeGreaterThan(title.x + title.width);
      expect(caption.y).toBeLessThan(title.y + title.height);
    }
    const legalLinks = page.getByRole("navigation", { name: "Site information" });
    const signature = (await credit.boundingBox())!;
    const legal = (await legalLinks.boundingBox())!;
    expect(legal.x).toBeGreaterThan(signature.x + signature.width);
    expect(legal.y).toBeLessThan(signature.y + signature.height);
    await expect(credit).toHaveCSS("color", "rgb(36, 91, 89)");
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("the Studio illustration lifts WhatsApp as the page loads", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    document.addEventListener("animationstart", (event) => {
      if (event.animationName === "wallet-card-lift") document.documentElement.dataset.walletLift = "started";
    });
  });
  await page.goto("/studio");
  const card = page.locator(".stack-whatsapp");
  await expect(card).toHaveCSS("animation-delay", "0s");
  await expect(card).toHaveCSS("animation-iteration-count", "1");
  await expect(page.locator("html")).toHaveAttribute("data-wallet-lift", "started");
  await expect(card).toHaveCSS("transform", "none");
  await expect(card.locator(".stack-details strong")).toHaveText("Alan Turing");
  await expect(card.locator(".stack-qr svg")).toBeVisible();
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
  await page.getByRole("button", { name: /Create Apple Wallet card for your Email/ }).click();
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
  await page.getByRole("button", { name: "Download card" }).click();
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

test("created and reopened cards reveal the name while the QR stays still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/studio");
  await page.getByRole("button", { name: /Create Apple Wallet card for your Email/ }).click();
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
  await page.getByRole("navigation").getByRole("button", { name: "Manage cards" }).click();
  await page.getByRole("button", { name: "Open Email" }).click();
  await expect(holder).toHaveCSS("animation-duration", "0.24s");
  await expect(holder).toHaveCSS("animation-name", "holder-reveal");
  expect(await sweep()).toBe("none");
  await expect(card).toHaveCSS("animation-name", "none");
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
  await expect(page.getByText(/This QR is enlarged/)).toBeVisible();
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

test("a Universal photo stays off the QR and saved details prefill new cards", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: /^Universal card Scanning/ }).click();
  await page.getByLabel("Name on card").fill("Alan Turing");
  await page.getByRole("button", { name: "Add link" }).click();
  await page.getByLabel("Link 1", { exact: true }).fill("https://www.linkedin.com/in/example");
  await page.locator('input[type=file]').setInputFiles("public/apple-wallet-icon.jpg");
  await expect(page.getByRole("img", { name: "Card photo" })).toBeVisible();
  await page.getByRole("button", { name: save }).click();
  await expect(page.getByRole("img", { name: "Card photo" })).toBeVisible();
  const path = await page.getByRole("img", { name: "Scannable card QR" }).locator("path").getAttribute("d");
  await page.getByRole("button", { name: "Edit details" }).click();
  await page.getByRole("button", { name: "Remove photo" }).click();
  await page.getByRole("button", { name: save }).click();
  await expect(page.getByRole("img", { name: "Scannable card QR" }).locator("path")).toHaveAttribute("d", path!);
  await page.getByRole("button", { name: "Create cards", exact: true }).click();
  await page.getByRole("button", { name: /Create Apple Wallet card for your LinkedIn/ }).click();
  await expect(page.getByLabel("LinkedIn profile URL")).toHaveValue("https://www.linkedin.com/in/example");
});

test("new Universal cards open with saved individual values already in editable fields", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: /Create Apple Wallet card for your website/ }).click();
  await page.getByLabel("Website URL").fill("museum.example.org/exhibitions");
  await page.getByRole("button", { name: save }).click();
  await page.getByRole("button", { name: "Create cards", exact: true }).click();
  await page.getByRole("button", { name: /^Universal card Scanning/ }).click();
  await expect(page.getByLabel("Link 1", { exact: true })).toHaveValue("museum.example.org/exhibitions");
  await expect(page.getByRole("button", { name: /Use saved individual details/ })).toHaveCount(0);
  await page.getByLabel("Link 1", { exact: true }).fill("another.example.com");
  await page.getByRole("button", { name: save }).click();
  await expect(page.getByRole("heading", { name: "Your Universal Heya Card" })).toBeVisible();
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
  await expect(page.getByText(/Wallet installation coming soon/)).toBeVisible();
  await page.goto("/studio");
  await page.getByRole("contentinfo").getByRole("link", { name: "FAQ" }).click();
  await expect(page.getByRole("heading", { name: "Getting started" })).toBeVisible();
});
