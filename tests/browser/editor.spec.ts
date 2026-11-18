import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const save = /^Save details to add to Wallet$/;

test("the public landing explains the steps and links to the studio", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your contacts. In your Wallet." })).toBeVisible();
  await expect(page.getByRole("img", { name: "Example WhatsApp QR" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Example Email QR" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Save your details" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Scannable card QR" })).toHaveCount(0);
  await page.getByRole("link", { name: "Create my card" }).first().click();
  await expect(page).toHaveURL(/\/studio$/);
  await expect(page.getByRole("heading", { name: "Individual cards" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("save a Universal card before producing a QR, export it and reopen it", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/studio");
  await page.getByRole("button", { name: /Create a universal Apple Wallet card/ }).click();
  await page.getByLabel("Display name").fill("Zoë Tan");
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
  await expect(page.getByRole("img", { name: "Scannable card QR" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to Apple Wallet" })).toBeDisabled();

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
  for (const name of ["LinkedIn", "WhatsApp", "Email", "Phone", "Instagram", "Website"]) {
    await expect(page.getByRole("button", { name: new RegExp(`Create Apple Wallet card for ${name}`) })).toBeVisible();
  }
  await page.getByRole("button", { name: /Create Apple Wallet card for LinkedIn/ }).click();
  await expect(page.getByLabel("Name in Manage cards")).toHaveCount(0);
  await page.getByText("Change display name", { exact: true }).click();
  await page.getByLabel("Display name").fill("Alex Morgan");
  await page.getByLabel("LinkedIn profile URL").fill("https://www.linkedin.com/in/alex-morgan/?tracking=1");
  await expect(page.getByRole("img", { name: "Scannable card QR" })).toHaveCount(0);
  await page.getByRole("button", { name: save }).click();
  await expect(page.getByRole("region", { name: "Saved card" }).getByText("Alex Morgan")).toBeVisible();
  await expect(page.getByText("alex-morgan", { exact: true })).toBeVisible();
  await page.getByRole("navigation").getByRole("button", { name: "Manage cards" }).click();
  await page.getByRole("button", { name: "Open LinkedIn" }).click();
  await expect(page.getByRole("img", { name: "Scannable card QR" })).toBeVisible();
  await page.getByRole("button", { name: "Edit details" }).click();
  await expect(page.getByRole("img", { name: "Scannable card QR" })).toHaveCount(0);
  await page.getByLabel("LinkedIn profile URL").fill("https://www.linkedin.com/in/alex-north");
  await page.getByRole("button", { name: save }).click();
  await expect(page.getByText("alex-north", { exact: true })).toBeVisible();
  await page.getByRole("navigation").getByRole("button", { name: "Manage cards" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete LinkedIn" }).click();
  await expect(page.getByText("Your saved cards will appear here.")).toBeVisible();
});

test("validate QR density when saving", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: /Create Apple Wallet card for Website/ }).click();
  const destination = page.getByLabel("Website URL");
  await destination.fill("https://example.com/" + "a".repeat(420));
  await page.getByRole("button", { name: save }).click();
  await expect(page.getByRole("alert").filter({ hasText: "too dense" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Scannable card QR" })).toHaveCount(0);
  await destination.fill("https://example.com/" + "a".repeat(240));
  await page.getByRole("button", { name: save }).click();
  await expect(page.getByText(/This QR is dense/)).toBeVisible();
});
