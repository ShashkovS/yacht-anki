import { expect, test } from "@playwright/test";

test("user can login, manage notes, and logout", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Open login page" }).click();
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.getByPlaceholder("Write a short note").fill("Playwright note");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByRole("article").getByText("Playwright note")).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
});

test("normal user cannot access admin page", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("admin can access admin page", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admin page" })).toBeVisible();
  await expect(
    page
      .locator("span")
      .filter({ hasText: /^admin$/ })
      .first(),
  ).toBeVisible();
});
