/*
This file checks the main browser flows against real seeded decks, stats, and settings.
Edit this file when live browser routing, auth, seeded content, stats, or settings flows change.
Copy a test pattern here when you add another browser-level product flow.
*/

import { expect, test, type Page } from "@playwright/test";

const builtinDeckTitles = ["Термины и курсы", "Манёвры и работа с парусами", "Правила расхождения"];
const firstTermsPrompt = "Что за курс, если нос почти точно на ветер?";
const firstTermsAnswer = "Левентик";
const firstRightOfWayConceptPrompt = "Что остаётся обязанностью даже у яхты с правом дороги?";

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

async function logout(page: Page) {
  await page.getByRole("button", { name: "Выйти" }).click();
  await page.waitForURL("**/login");
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
  await expect(page.getByRole("heading", { name: "Самые сложные карточки" })).toBeVisible();
  await expect(page.getByText("Again", { exact: true })).toBeVisible();

  await logout(page);

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

test("user can open a concept card in deck-scoped review", async ({ page }) => {
  const issues = collectBrowserIssues(page);
  await login(page, "user");

  await page.goto("/review?deck=right-of-way");
  await page.waitForURL("**/review?deck=right-of-way");
  await expect(page.getByRole("heading", { name: firstRightOfWayConceptPrompt })).toBeVisible();
  await expect(page.getByText("Выберите правильный вариант, затем откройте ответ.")).toBeVisible();
  await page.getByRole("button", { name: "Избегать контакта, если это разумно возможно" }).click();

  await page.getByRole("button", { name: "Показать ответ" }).click();
  await expect(page.getByText("Правильный вариант:")).toBeVisible();
  await expect(page.getByText("Ваш выбор: Избегать контакта, если это разумно возможно")).toBeVisible();

  expect(issues.consoleErrors).toEqual([]);
  expect(issues.httpErrors).toEqual([]);
});

test("user can continue review offline and sync answers after reconnect", async ({ page, context }) => {
  await login(page, "user");

  await page.getByRole("navigation").getByRole("link", { name: "Повторение", exact: true }).click();
  await page.waitForURL("**/review");
  await expect(page.getByText(/Карточка \d+ из \d+/)).toBeVisible();
  await page.getByRole("button", { name: "Показать ответ" }).click();

  await context.setOffline(true);
  await expect(page.getByText("Оффлайн режим", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: /Не помню/ }).click();
  await expect(page.getByText("Ждут sync:", { exact: false })).toBeVisible();

  await context.setOffline(false);
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(page.getByText("Ждут sync:", { exact: false })).toHaveCount(0);

  await page.getByRole("navigation").getByRole("link", { name: "Статистика", exact: true }).click();
  await page.waitForURL("**/stats");
  await expect(page.getByRole("heading", { name: "Активность за 30 дней" })).toBeVisible();
});

test("admin can create a new user who does not see admin navigation", async ({ page }) => {
  const issues = collectBrowserIssues(page);
  const username = `crew-smoke-${Date.now()}`;
  const password = "crew-pass";

  await login(page, "admin");
  await page.getByRole("navigation").getByRole("link", { name: "Пользователи", exact: true }).click();
  await page.waitForURL("**/admin/users");
  await expect(page.getByRole("heading", { name: "Новый пользователь" })).toBeVisible();

  await page.getByLabel("Логин").fill(username);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Создать пользователя" }).click();
  await expect(page.getByText(`Пользователь ${username} создан.`)).toBeVisible();

  await logout(page);

  await page.getByLabel("Логин").fill(username);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("link", { name: "Пользователи" })).toHaveCount(0);

  await page.goto("/admin/users");
  await page.waitForURL("**/dashboard");

  expect(issues.consoleErrors).toEqual([]);
  expect(issues.httpErrors).toEqual([]);
});

test.describe("mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("review stays usable on a phone-sized screen", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await login(page, "user");

    await page.getByRole("navigation").getByRole("link", { name: "Повторение", exact: true }).click();
    await page.waitForURL("**/review");
    await expect(page.getByRole("button", { name: "Показать ответ" })).toBeVisible();
    await page.getByRole("button", { name: "Показать ответ" }).click();
    await expect(page.getByRole("button", { name: /Не помню/ })).toBeVisible();

    expect(issues.consoleErrors).toEqual([]);
    expect(issues.httpErrors).toEqual([]);
  });
});
