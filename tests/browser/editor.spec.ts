import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const save = /^Generate your Apple Wallet card$/;

test("the public landing explains the steps and links to the studio", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Create your free contact QR cards on Apple Wallet" })).toBeVisible();
  const icon = page.locator(".device-wallet-label img");
  await expect(icon).toBeVisible();
  await expect.poll(() => icon.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(page.getByRole("img", { name: "Example WhatsApp QR" })).toBeVisible();
  await page.getByRole("button", { name: "Show Email Wallet example" }).click();
  await expect(page.getByRole("img", { name: "Example Email QR" })).toBeVisible();
  const example = page.getByRole("region", { name: "WhatsApp example", exact: true });
  await expect(example.getByRole("heading", { level: 3 })).toHaveText([
    "Create a WhatsApp card", "Show your QR", "Your WhatsApp chat opens",
  ]);
  await expect(example.getByText(/Use the same steps for LinkedIn, Instagram, email, phone or a web link/)).toBeVisible();
  const sampleForm = example.getByRole("img", { name: /WhatsApp form with a sample number/ });
  await sampleForm.scrollIntoViewIfNeeded();
  await expect.poll(() => sampleForm.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(page.getByRole("img", { name: "Scannable card QR" })).toHaveCount(0);
  const logo = page.locator(".landing-header img[src='/universal-card-mark.svg']");
  await expect(logo).toBeVisible();
  await expect.poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  const headerAction = page.getByRole("banner").getByRole("link", { name: "Create My Card", exact: true });
  const createAction = page.getByRole("main").getByRole("link", { name: "Create My Card", exact: true });
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
    await expect(headerAction).toBeInViewport({ ratio: 1 });
    await headerAction.click();
  }
  await expect(page).toHaveURL(/\/studio$/);
  await expect(credit).toHaveAttribute("href", "https://vyshak.me");
  await expect(page.getByRole("heading", { name: "Individual cards" })).toBeVisible();
  await expect(page.getByText("One QR card per app or link", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: /Apple Wallet illustration with HSBC, Citi, American Express, WhatsApp and LinkedIn/ })).toBeVisible();
  await expect(page.locator(".stack-whatsapp .destination-mark")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(page.getByText("Open your Wallet card and let someone scan it to get your details in seconds.")).toHaveCount(0);
  await expect(page.getByText("Scan to receive a vCard you can save to Contacts.")).toBeVisible();
  if (page.viewportSize()!.width <= 680) {
    await expect(page.getByRole("button", { name: /Create Apple Wallet card for your WhatsApp/ })).toHaveCSS("min-height", "56px");
    await expect(page.locator(".tile-action").first()).toHaveCSS("clip-path", "inset(50%)");
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("save a Universal card before producing a QR, export it and reopen it", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/studio");
  await page.getByRole("button", { name: /New Universal card/ }).click();
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
  await expect(page.getByRole("heading", { name: "Your card is ready." })).toBeVisible();
  await expect(page.locator(".wallet-preview > :first-child")).toHaveText("Apple Wallet");
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
  await expect(page.locator(".wallet-preview > :first-child")).toHaveText("Apple Wallet");
  await expect(page.getByRole("region", { name: "Saved card" }).getByText("Alex Morgan")).toBeVisible();
  await expect(page.getByText("alex-morgan", { exact: true })).toHaveCount(0);
  const qrPath = page.getByRole("img", { name: "Scannable card QR" }).locator("path");
  const firstQr = await qrPath.getAttribute("d");
  await page.getByRole("navigation").getByRole("button", { name: "Manage cards" }).click();
  await page.getByRole("button", { name: "Open LinkedIn" }).click();
  await expect(page.getByRole("img", { name: "Scannable card QR" })).toBeVisible();
  await expect(page.locator(".scan-label")).toHaveText("Scanning opens the linked LinkedIn page.");
  await page.getByRole("button", { name: "Edit details" }).click();
  await expect(page.getByRole("img", { name: "Scannable card QR" })).toHaveCount(0);
  await page.getByLabel("LinkedIn profile URL").fill("https://www.linkedin.com/in/alex-north");
  await page.getByRole("button", { name: save }).click();
  await expect(page.getByRole("heading", { name: "Your card is ready." })).toBeVisible();
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
