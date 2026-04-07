/*
This file tests the authenticated statistics page and its main data states.
Edit this file when stats loading, stats rendering, or stats copy changes.
Copy a test pattern here when you add another analytics-heavy page.
*/

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { postJson } from "../shared/api";
import { StatsPage } from "./StatsPage";

vi.mock("../shared/api", () => ({
  postJson: vi.fn(),
}));

const mockedPostJson = vi.mocked(postJson);

afterEach(() => {
  mockedPostJson.mockReset();
});

describe("StatsPage", () => {
  it("shows loaded statistics, activity, and hardest cards", async () => {
    mockedPostJson.mockResolvedValue({
      today: { review_count: 4, average_rating: 2.75 },
      activity_30d: Array.from({ length: 30 }, (_, index) => ({
        day: `2026-04-${String(index + 1).padStart(2, "0")}`,
        review_count: index === 29 ? 4 : 0,
      })),
      rating_distribution_30d: [
        { rating: 1, count: 2 },
        { rating: 2, count: 1 },
        { rating: 3, count: 5 },
        { rating: 4, count: 3 },
      ],
      deck_progress: [
        {
          deck_slug: "terms",
          title: "Термины",
          total_cards: 30,
          new_cards: 4,
          learning_cards: 6,
          review_cards: 20,
        },
      ],
      hardest_cards: [
        {
          card_id: 5,
          deck_slug: "terms",
          deck_title: "Термины",
          prompt: "Что такое левентик?",
          again_count: 3,
          review_count: 6,
        },
      ],
      overall_progress: {
        review_cards: 20,
        total_cards: 65,
        percent_review: 30.8,
      },
      streak_days: 7,
      studied_cards_count: 18,
    });

    render(
      <MemoryRouter>
        <StatsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Статистика" })).toBeInTheDocument();
    expect(screen.getByText("Что такое левентик?")).toBeInTheDocument();
    expect(screen.getByText("Again")).toBeInTheDocument();
    expect(screen.getAllByText("Термины").length).toBeGreaterThan(0);
    expect(screen.getByText(/Средний рейтинг:\s*2.75/)).toBeInTheDocument();
  });

  it("shows the zero-state hardest cards message", async () => {
    mockedPostJson.mockResolvedValue({
      today: { review_count: 0, average_rating: null },
      activity_30d: Array.from({ length: 30 }, (_, index) => ({
        day: `2026-04-${String(index + 1).padStart(2, "0")}`,
        review_count: 0,
      })),
      rating_distribution_30d: [
        { rating: 1, count: 0 },
        { rating: 2, count: 0 },
        { rating: 3, count: 0 },
        { rating: 4, count: 0 },
      ],
      deck_progress: [],
      hardest_cards: [],
      overall_progress: {
        review_cards: 0,
        total_cards: 65,
        percent_review: 0,
      },
      streak_days: 0,
      studied_cards_count: 0,
    });

    render(
      <MemoryRouter>
        <StatsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Пока нет карточек с Again/)).toBeInTheDocument();
  });
});
