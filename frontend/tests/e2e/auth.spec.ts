/*
This file checks the main browser flows against real seeded decks, stats, and settings.
Edit this file when live browser routing, auth, seeded content, stats, or settings flows change.
Copy a test pattern here when you add another browser-level product flow.
*/

import { expect, test, type Page } from "@playwright/test";

const builtinDeckTitles = ["Термины и курсы", "Манёвры и работа с парусами", "Правила расхождения"];
const firstTermsPrompt = "Что за курс, если нос почти точно на ветер?";
const firstTermsAnswer = "Левентик";

function collectBrowserIssues(page: Page) {
  const consoleErrors: string[] = [];
  const httpErrors: Array<{ url: string; status: number }> = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      httpErrors.push({ url: response.url(), status: response.status() });
    }
  });
  return { consoleErrors, httpErrors };
}

async function login(page: Page, username: "user" | "admin") {
  await page.goto("/");
  await page.getByRole("link", { name: "Войти в приложение" }).click();
  await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();
  await page.getByLabel("Логин").fill(username);
  await page.getByLabel("Пароль").fill(username);
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL("**/dashboard");
}

test("anonymous user is redirected away from protected routes", async ({ page }) => {
  const issues = collectBrowserIssues(page);

  await page.goto("/dashboard");
  await page.waitForURL("**/login");
  await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();

  await page.goto("/review");
  await page.waitForURL("**/login");

  await page.goto("/decks");
  await page.waitForURL("**/login");

  expect(issues.consoleErrors).toEqual([]);
  expect(issues.httpErrors).toEqual([]);
});

test("user can review a real card, inspect stats, and logout", async ({ page }) => {
  const issues = collectBrowserIssues(page);
  await login(page, "user");

  await expect(page.getByRole("heading", { name: "Личный кабинет экипажа" })).toBeVisible();
  await page.getByRole("link", { name: "Начать повторение" }).click();
  await page.waitForURL("**/review");
  await expect(page.getByRole("heading", { name: firstTermsPrompt })).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();

  await page.getByRole("button", { name: "Показать ответ" }).click();
  await expect(page.getByText(firstTermsAnswer, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Не помню/ }).click();

  await page.getByRole("navigation").getByRole("link", { name: "Статистика", exact: true }).click();
  await page.waitForURL("**/stats");
  await expect(page.getByRole("heading", { name: "Статистика" })).toBeVisible();
  await expect(page.getByText("Сегодня")).toBeVisible();
  await expect(page.getByText(firstTermsPrompt)).toBeVisible();
  await expect(page.getByText("Again", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Выйти" }).click();
  await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();

  expect(issues.consoleErrors).toEqual([]);
  expect(issues.httpErrors).toEqual([]);
});

test("admin can browse seeded decks and save settings that affect the next queue", async ({ page }) => {
  const issues = collectBrowserIssues(page);
  await login(page, "admin");

  await page.getByRole("navigation").getByRole("link", { name: "Колоды", exact: true }).click();
  await page.waitForURL("**/decks");
  await expect(page.getByRole("heading", { name: "Колоды" })).toBeVisible();
  for (const deckTitle of builtinDeckTitles) {
    await expect(page.getByText(deckTitle)).toBeVisible();
  }

  await page.getByRole("link", { name: "Открыть колоду" }).first().click();
  await page.waitForURL("**/decks/terms");
  await expect(page.getByRole("heading", { name: "Термины и курсы" })).toBeVisible();
  await expect(page.getByText(firstTermsPrompt)).toBeVisible();

  await page.getByRole("navigation").getByRole("link", { name: "Настройки", exact: true }).click();
  await page.waitForURL("**/settings");
  await expect(page.getByRole("heading", { name: "Настройки" })).toBeVisible();

  await page.locator("#desired-retention").fill("0.83");
  await page.getByLabel("Лимит новых карточек в день").fill("1");
  await page.getByRole("checkbox", { name: "Без лимита повторений" }).uncheck();
  await page.getByLabel("Лимит повторений в день").fill("2");
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText("Настройки сохранены.")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Лимит новых карточек в день")).toHaveValue("1");
  await expect(page.getByLabel("Лимит повторений в день")).toHaveValue("2");

  await page.getByRole("navigation").getByRole("link", { name: "Повторение", exact: true }).click();
  await page.waitForURL("**/review");
  await expect(page.getByText("Карточка 1 из 1")).toBeVisible();

  expect(issues.consoleErrors).toEqual([]);
  expect(issues.httpErrors).toEqual([]);
});
