/*
This file checks the main browser flows for login, empty dashboard, and logout.
Edit this file when the real auth flow, redirects, or first logged-in screen changes.
Copy a test pattern here when you add another end-to-end browser flow.
*/

import { expect, test } from "@playwright/test";

test("user can login, see the empty dashboard, and logout", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Войти в приложение" }).click();
  await expect(page.getByLabel("Логин")).toHaveValue("");
  await expect(page.getByLabel("Пароль")).toHaveValue("");
  await page.getByLabel("Логин").fill("user");
  await page.getByLabel("Пароль").fill("user");
  await page.getByRole("button", { name: "Войти" }).click();

  await expect(page.getByRole("heading", { name: "Личный кабинет экипажа" })).toBeVisible();
  await expect(page.getByText("Пока здесь пусто")).toBeVisible();

  await page.getByRole("button", { name: "Выйти" }).click();
  await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();
});

test("anonymous user is redirected from dashboard to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();
});
