import { expect, test } from "@playwright/test";

test("account and Wallet endpoints fail closed without credentials", async ({ page, request }) => {
  await page.goto("/auth/sign-in");
  await expect(page.getByRole("button", { name: "Continue with Apple" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
  const list = await request.get("/api/cards");
  expect(list.status()).toBe(503);
  expect(list.headers()["cache-control"]).toContain("no-store");
  const cardId = "00000000-0000-4000-8000-000000000001";
  const pass = await request.get(`/api/cards/${cardId}/wallet`);
  expect(pass.status()).toBe(503);
  expect(pass.headers()["cache-control"]).toContain("no-store");
  const save = await request.post("/api/cards", { data: { type: "individual", title: "Test" } });
  expect(save.status()).toBe(503);
});
