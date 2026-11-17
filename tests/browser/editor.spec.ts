import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("create a Universal card, export it and reopen it", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByLabel("Card name").fill("Conference");
  await page.getByLabel("Your name").fill("Zoë Tan");
  await page.getByRole("button", { name: "Add email" }).click();
  await page.getByLabel("email 1", { exact: true }).fill("zoe@example.com");
  await page.getByRole("button", { name: "Add email" }).click();
  await page.getByLabel("email 2 label").selectOption("home");
  await page.getByLabel("email 2", { exact: true }).fill("zoe.home@example.com");
  await page.getByRole("button", { name: "Add phone" }).click();
  await page.getByLabel("phone 1", { exact: true }).fill("+44 7700 900123");
  await expect(page.getByText("Contact details are embedded in this QR.", { exact: false })).toBeVisible();
  await expect(page.getByRole("img", { name: "Scannable card QR" })).toBeVisible();
  await page.getByRole("button", { name: "Save card" }).click();
  await expect(page.getByText("Card saved.")).toBeVisible();

  const vcfStart = page.waitForEvent("download");
  await page.getByRole("button", { name: "vCard", exact: true }).click();
  const vcf = await vcfStart;
  expect(vcf.suggestedFilename()).toBe("Conference.vcf");
  const content = await readFile(await vcf.path(), "utf8");
  expect(content).toContain("\r\nFN:Zoë Tan\r\n");
  expect(content).toContain("\r\nEMAIL;TYPE=home:zoe.home@example.com\r\n");
  expect(content).not.toContain("Conference");

  const pngStart = page.waitForEvent("download");
  await page.getByRole("button", { name: "QR image" }).click();
  const png = await pngStart;
  expect((await readFile(await png.path())).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");

  await page.reload();
  await page.getByRole("button", { name: "Conference Universal" }).click();
  await expect(page.getByLabel("phone 1", { exact: true })).toHaveValue("+447700900123");
  await expect(page.getByLabel("email 2 label")).toHaveValue("home");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(errors).toEqual([]);
});

test("show direct destination shortcuts and save two named Individual cards", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Individual Share one destination" }).click();
  for (const name of ["LinkedIn", "WhatsApp", "Email", "Phone", "Instagram", "Website"]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  }
  await page.getByLabel("Card name").fill("Professional");
  await page.getByLabel("Your name").fill("Alex Morgan");
  await page.getByLabel("LinkedIn destination").fill("https://www.linkedin.com/in/alex-morgan/?tracking=1");
  await expect(page.getByRole("complementary", { name: "Live preview" }).getByText("Alex Morgan")).toBeVisible();
  await expect(page.getByText("alex-morgan", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save card" }).click();
  await expect(page.getByRole("button", { name: "Professional LinkedIn" })).toBeVisible();

  await page.getByRole("button", { name: "New card" }).click();
  await page.getByRole("button", { name: "WhatsApp", exact: true }).click();
  await page.getByLabel("Card name").fill("Chat");
  await page.getByLabel("WhatsApp destination").fill("+44 7700 900123");
  await page.getByRole("button", { name: "Save card" }).click();
  await expect(page.getByRole("button", { name: "Chat WhatsApp" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Professional LinkedIn" })).toBeVisible();
});

test("warn about dense data and block an oversized QR", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Individual Share one destination" }).click();
  await page.getByRole("button", { name: "Website", exact: true }).click();
  await page.getByLabel("Card name").fill("Long site");
  const destination = page.getByLabel("Website destination");
  await destination.fill("https://example.com/" + "a".repeat(240));
  await expect(page.getByText("Dense QR", { exact: false })).toBeVisible();
  await destination.fill("https://example.com/" + "a".repeat(420));
  await expect(page.getByRole("img", { name: "Scannable card QR" })).toHaveCount(0);
  await page.getByRole("button", { name: "Save card" }).click();
  await expect(page.getByRole("alert")).toContainText("too dense");
});
