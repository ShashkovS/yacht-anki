/*
This file tests the authenticated dashboard summary and empty-state behavior.
Edit this file when dashboard loading, summary cards, or dashboard CTAs change.
Copy a test pattern here when you add another data-loading logged-in page.
*/

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../app/auth";
import { postJson } from "../shared/api";
import { DashboardPage } from "./DashboardPage";

vi.mock("../shared/api", () => ({
  postJson: vi.fn(),
}));

vi.mock("../app/offline", () => ({
  useOfflineStatus: () => ({
    isOnline: true,
    pendingReviewCount: 0,
    syncing: false,
    refreshPendingReviewCount: vi.fn(),
  }),
}));

vi.mock("../shared/offlineStore", () => ({
  loadApiSnapshot: vi.fn(),
  saveApiSnapshot: vi.fn(),
}));

vi.mock("../shared/offlineSync", () => ({
  syncPendingReviewEvents: vi.fn().mockResolvedValue(0),
}));

const mockedPostJson = vi.mocked(postJson);

afterEach(() => {
  mockedPostJson.mockReset();
});

describe("DashboardPage", () => {
  it("shows the loaded dashboard summary and deck progress", async () => {
    mockedPostJson.mockResolvedValue({
      due_count: 4,
      new_count: 2,
      studied_cards_count: 18,
      streak_days: 6,
      deck_progress: [
        {
          deck_slug: "terms",
          title: "Термины",
          total_cards: 10,
          new_cards: 2,
          learning_cards: 3,
          review_cards: 5,
        },
      ],
    });

    render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            user: {
              id: 1,
              username: "user",
              is_admin: false,
              created_at: "2026-03-06T10:00:00+00:00",
              updated_at: "2026-03-06T10:00:00+00:00",
            },
            loading: false,
            login: vi.fn(),
            logout: vi.fn(),
            reloadUser: vi.fn(),
          }}
        >
          <DashboardPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    expect(await screen.findByText("К повторению")).toBeInTheDocument();
    expect(screen.getByText("Термины")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Начать повторение" })).toBeInTheDocument();
  });

  it("shows the done-for-today empty state when there are no cards", async () => {
    mockedPostJson.mockResolvedValue({
      due_count: 0,
      new_count: 0,
      studied_cards_count: 0,
      streak_days: 0,
      deck_progress: [],
    });

    render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            user: {
              id: 1,
              username: "user",
              is_admin: false,
              created_at: "2026-03-06T10:00:00+00:00",
              updated_at: "2026-03-06T10:00:00+00:00",
            },
            loading: false,
            login: vi.fn(),
            logout: vi.fn(),
            reloadUser: vi.fn(),
          }}
        >
          <DashboardPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    expect(await screen.findByText("На сегодня всё")).toBeInTheDocument();
  });
});
