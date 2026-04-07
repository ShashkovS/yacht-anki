/*
This file checks the main browser flows for auth, dashboard, review, decks, and guarded routes.
Edit this file when live browser routing, protected pages, or review/deck flows change.
Copy a test pattern here when you add another browser-level product flow.
*/

import { expect, test, type Page, type Route } from "@playwright/test";

const sharedDiagram = {
  version: 1,
  wind: { direction_deg: 35 },
  boats: [
    {
      id: "alpha",
      x: 320,
      y: 260,
      heading_deg: 70,
      sails: {
        main: {},
        jib: {},
      },
    },
    {
      id: "bravo",
      x: 680,
      y: 360,
      heading_deg: 220,
      sails: {
        main: {},
      },
    },
  ],
  mark: {
    x: 500,
    y: 150,
    zone_radius: 80,
  },
};

function ok<T>(data: T) {
  return {
    ok: true,
    data,
  };
}

async function fulfillJson(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(ok(data)),
  });
}

async function mockDomainApis(page: Page) {
  await page.route("**/review/summary", async (route) => {
    await fulfillJson(route, {
      due_count: 2,
      new_count: 1,
      studied_cards_count: 18,
      streak_days: 5,
      deck_progress: [
        {
          deck_slug: "terms",
          title: "Термины и курсы",
          total_cards: 12,
          new_cards: 2,
          learning_cards: 3,
          review_cards: 7,
        },
      ],
    });
  });

  await page.route("**/decks/list", async (route) => {
    await fulfillJson(route, {
      decks: [
        {
          slug: "terms",
          title: "Термины и курсы",
          description: "Основные положения яхты относительно ветра и базовые команды.",
          builtin: true,
          card_count: 12,
          progress: {
            total_cards: 12,
            new_cards: 2,
            learning_cards: 3,
            review_cards: 7,
          },
        },
      ],
    });
  });

  await page.route("**/decks/get", async (route) => {
    const request = route.request().postDataJSON() as { slug?: string };
    await fulfillJson(route, {
      deck: {
        slug: request.slug ?? "terms",
        title: "Термины и курсы",
        description: "Основные положения яхты относительно ветра и базовые команды.",
        builtin: true,
        card_count: 2,
      },
    });
  });

  await page.route("**/cards/list", async (route) => {
    await fulfillJson(route, {
      deck: {
        slug: "terms",
        title: "Термины и курсы",
        description: "Основные положения яхты относительно ветра и базовые команды.",
        builtin: true,
        card_count: 2,
      },
      cards: [
        {
          id: 101,
          deck_slug: "terms",
          template_type: "term_definition",
          prompt: "Что такое бейдевинд?",
          answer: "Это курс остро к ветру, когда яхта идёт под углом к линии ветра.",
          explanation: "На таком курсе паруса выбирают, но не до упора.",
          diagram_spec: sharedDiagram,
          tags: ["courses"],
          sort_order: 1,
          created_at: "2026-04-01T10:00:00Z",
          updated_at: "2026-04-01T10:00:00Z",
          state: null,
        },
        {
          id: 102,
          deck_slug: "terms",
          template_type: "directional",
          prompt: "Куда уваливаться?",
          answer: "Нужно отвернуть от ветра.",
          explanation: "Курс становится полнее, нос уходит от направления ветра.",
          diagram_spec: {
            ...sharedDiagram,
            answer_scene: {
              ...sharedDiagram,
              boats: [
                {
                  id: "alpha",
                  x: 320,
                  y: 260,
                  heading_deg: 140,
                  sails: {
                    main: {},
                    jib: {},
                  },
                },
                sharedDiagram.boats[1],
              ],
            },
            expected_answer: {
              type: "rotate_heading",
              boat_id: "alpha",
              heading_deg: 140,
              tolerance_deg: 15,
            },
          },
          tags: ["steering"],
          sort_order: 2,
          created_at: "2026-04-01T10:00:00Z",
          updated_at: "2026-04-01T10:00:00Z",
          state: {
            phase: "review",
            due_at: "2026-04-07T08:00:00Z",
            last_reviewed_at: "2026-04-06T08:00:00Z",
            fsrs_state: {
              due: "2026-04-07T08:00:00Z",
              stability: 4.2,
              difficulty: 5.4,
              elapsed_days: 1,
              scheduled_days: 2,
              learning_steps: 0,
              reps: 3,
              lapses: 0,
              state: 2,
              last_review: "2026-04-06T08:00:00Z",
            },
          },
        },
      ],
      total_count: 2,
      limit: 50,
      offset: 0,
    });
  });

  await page.route("**/review/queue", async (route) => {
    const request = route.request().postDataJSON() as { deck_slug?: string };
    const deckSlug = request.deck_slug ?? null;
    const cards = [
      {
        id: 201,
        deck_slug: deckSlug ?? "terms",
        template_type: "term_definition",
        prompt: deckSlug ? "Что такое галфвинд?" : "Что такое бейдевинд?",
        answer: deckSlug ? "Это курс примерно под прямым углом к ветру." : "Это курс остро к ветру.",
        explanation: deckSlug ? "Паруса вытравлены сильнее, чем на бейдевинде." : "Паруса выбраны, потому что курс острый.",
        diagram_spec: sharedDiagram,
        tags: ["courses"],
        sort_order: 1,
        created_at: "2026-04-01T10:00:00Z",
        updated_at: "2026-04-01T10:00:00Z",
        state: null,
      },
      {
        id: 202,
        deck_slug: deckSlug ?? "terms",
        template_type: "right_of_way",
        prompt: "Кто должен сторониться?",
        answer: "Сторонится красная лодка на левом галсе.",
        explanation: "Лодка на левом галсе уступает лодке на правом галсе.",
        diagram_spec: {
          ...sharedDiagram,
          expected_answer: {
            type: "select_boat",
            correct_boat_id: "bravo",
          },
        },
        tags: ["rules"],
        sort_order: 2,
        created_at: "2026-04-01T10:00:00Z",
        updated_at: "2026-04-01T10:00:00Z",
        state: null,
      },
    ];

    await fulfillJson(route, {
      cards,
      summary: {
        due_count: 1,
        new_count: 1,
        deck_slug: deckSlug,
      },
    });
  });

  await page.route("**/review/submit", async (route) => {
    const request = route.request().postDataJSON() as { card_id: number; phase: string; due_at: string };
    await fulfillJson(route, {
      card_state: {
        card_id: request.card_id,
        phase: request.phase,
        due_at: request.due_at,
        last_reviewed_at: "2026-04-07T12:00:00Z",
      },
    });
  });
}

async function login(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: "Войти в приложение" }).click();
  await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();
  await page.getByLabel("Логин").fill("user");
  await page.getByLabel("Пароль").fill("user");
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL("**/dashboard");
}

test("user can login, open dashboard summary, review cards, and logout", async ({ page }) => {
  await mockDomainApis(page);
  await login(page);

  await expect(page.getByRole("heading", { name: "Личный кабинет экипажа" })).toBeVisible();
  await expect(page.getByText("Термины и курсы")).toBeVisible();
  await expect(page.getByText("К повторению")).toBeVisible();

  await page.getByRole("link", { name: "Начать повторение" }).click();
  await page.waitForURL("**/review");
  await expect(page.getByRole("heading", { name: "Повторение" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Что такое бейдевинд?" })).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();

  await page.getByRole("button", { name: "Показать ответ" }).click();
  await expect(page.getByText("Это курс остро к ветру.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Хорошо/ })).toBeVisible();

  await page.getByRole("button", { name: /Хорошо/ }).click();
  await expect(page.getByRole("heading", { name: "Кто должен сторониться?" })).toBeVisible();

  await page.getByRole("button", { name: "Выйти" }).click();
  await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();
});

test("user can open decks, inspect one deck, and start deck-scoped review", async ({ page }) => {
  let queueDeckSlug: string | null = null;
  await mockDomainApis(page);
  await page.unroute("**/review/queue");
  await page.route("**/review/queue", async (route) => {
    const request = route.request().postDataJSON() as { deck_slug?: string };
    queueDeckSlug = request.deck_slug ?? null;
    await fulfillJson(route, {
      cards: [
        {
          id: 301,
          deck_slug: request.deck_slug ?? "terms",
          template_type: "term_definition",
          prompt: "Колода terms",
          answer: "Ответ",
          explanation: "Пояснение",
          diagram_spec: sharedDiagram,
          tags: [],
          sort_order: 1,
          created_at: "2026-04-01T10:00:00Z",
          updated_at: "2026-04-01T10:00:00Z",
          state: null,
        },
      ],
      summary: {
        due_count: 0,
        new_count: 1,
        deck_slug: request.deck_slug ?? null,
      },
    });
  });

  await login(page);

  await page.getByRole("navigation").getByRole("link", { name: "Колоды", exact: true }).click();
  await page.waitForURL("**/decks");
  await expect(page.getByRole("heading", { name: "Колоды" })).toBeVisible();
  await expect(page.getByText("Термины и курсы")).toBeVisible();

  await page.getByRole("link", { name: "Открыть колоду" }).click();
  await page.waitForURL("**/decks/terms");
  await expect(page.getByRole("heading", { name: "Термины и курсы" })).toBeVisible();
  await expect(page.getByText("Что такое бейдевинд?")).toBeVisible();
  await expect(page.getByText("Новая")).toBeVisible();
  await expect(page.getByText("На повторении")).toBeVisible();

  await page.getByRole("link", { name: "Учить эту колоду" }).click();
  await page.waitForURL("**/review?deck=terms");
  await expect(page.getByRole("heading", { name: "Повторение колоды: terms" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Колода terms" })).toBeVisible();
  expect(queueDeckSlug).toBe("terms");
});

test("anonymous user is redirected from protected routes to login", async ({ page }) => {
  await mockDomainApis(page);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();

  await page.goto("/review");
  await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();

  await page.goto("/decks");
  await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();
});

test("logged-in user can open phase07 placeholders", async ({ page }) => {
  await mockDomainApis(page);
  await login(page);

  await page.getByRole("navigation").getByRole("link", { name: "Статистика", exact: true }).click();
  await page.waitForURL("**/stats");
  await expect(page.getByRole("heading", { name: "Статистика" })).toBeVisible();
  await expect(page.getByText(/Этот экран появится в фазе 07/)).toBeVisible();

  await page.getByRole("navigation").getByRole("link", { name: "Настройки", exact: true }).click();
  await page.waitForURL("**/settings");
  await expect(page.getByRole("heading", { name: "Настройки" })).toBeVisible();
  await expect(page.getByText(/Этот экран появится в фазе 07/)).toBeVisible();
});
