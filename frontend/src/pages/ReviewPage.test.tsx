/*
This file tests the authenticated review page flow around loading, reveal, and rating submit.
Edit this file when review session loading, reveal flow, or submit behavior changes.
Copy a test pattern here when you add another multi-step authenticated page.
*/

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../app/auth";
import { ReviewPage } from "./ReviewPage";
import { loadReviewSession, submitCurrentReview } from "../shared/reviewSession";

vi.mock("../shared/reviewSession", () => ({
  loadReviewSession: vi.fn(),
  submitCurrentReview: vi.fn(),
}));

vi.mock("../features/review/ReviewCardView", () => ({
  ReviewCardView: () => <div data-testid="review-card-view">review-body</div>,
}));

vi.mock("../app/offline", () => ({
  useOfflineStatus: () => ({
    isOnline: true,
    pendingReviewCount: 0,
    syncing: false,
    refreshPendingReviewCount: vi.fn(),
  }),
}));

const mockedLoadReviewSession = vi.mocked(loadReviewSession);
const mockedSubmitCurrentReview = vi.mocked(submitCurrentReview);

afterEach(() => {
  mockedLoadReviewSession.mockReset();
  mockedSubmitCurrentReview.mockReset();
});

function makeSession() {
  return {
    deckSlug: null,
    settings: {
      desired_retention: 0.9,
      new_cards_per_day: 10,
      reviews_per_day: null,
    },
    items: [
      {
        id: 1,
        deck_slug: "terms",
        template_type: "term_definition" as const,
        prompt: "Q1",
        answer: "A1",
        explanation: "E1",
        diagram_spec: {},
        tags: [],
        sort_order: 1,
        created_at: "",
        updated_at: "",
        state: null,
      },
      {
        id: 2,
        deck_slug: "terms",
        template_type: "term_definition" as const,
        prompt: "Q2",
        answer: "A2",
        explanation: "E2",
        diagram_spec: {},
        tags: [],
        sort_order: 2,
        created_at: "",
        updated_at: "",
        state: null,
      },
    ],
    summary: {
      due_count: 1,
      new_count: 1,
      deck_slug: null,
    },
    currentIndex: 0,
    currentStartedAt: "2026-04-07T12:00:00.000Z",
    previews: {
      1: { rating: 1 as const, dueAt: "2026-04-07T12:10:00.000Z", phase: "learning" as const, lastReviewedAt: null, fsrsState: {} as never },
      2: { rating: 2 as const, dueAt: "2026-04-07T13:00:00.000Z", phase: "learning" as const, lastReviewedAt: null, fsrsState: {} as never },
      3: { rating: 3 as const, dueAt: "2026-04-08T12:00:00.000Z", phase: "review" as const, lastReviewedAt: null, fsrsState: {} as never },
      4: { rating: 4 as const, dueAt: "2026-04-10T12:00:00.000Z", phase: "review" as const, lastReviewedAt: null, fsrsState: {} as never },
    },
    stats: {
      submittedCount: 0,
      totalElapsedMs: 0,
    },
    loadedFromCache: false,
  };
}

describe("ReviewPage", () => {
  it("loads the queue and reveals rating buttons", async () => {
    mockedLoadReviewSession.mockResolvedValue(makeSession());

    render(
      <MemoryRouter initialEntries={["/review"]}>
        <AuthContext.Provider value={{ user: { id: 1, username: "user", is_admin: false, created_at: "", updated_at: "" }, loading: false, login: vi.fn(), logout: vi.fn(), reloadUser: vi.fn() }}>
          <Routes>
            <Route path="/review" element={<ReviewPage />} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Q1" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Показать ответ" }));
    expect(screen.getByRole("button", { name: /Хорошо/ })).toBeInTheDocument();
  });

  it("submits a rating and advances to the next card", async () => {
    const session = makeSession();
    mockedLoadReviewSession.mockResolvedValue(session);
    mockedSubmitCurrentReview.mockResolvedValue({
      ...session,
      currentIndex: 1,
      stats: {
        submittedCount: 1,
        totalElapsedMs: 120000,
      },
    });

    render(
      <MemoryRouter initialEntries={["/review"]}>
        <AuthContext.Provider value={{ user: { id: 1, username: "user", is_admin: false, created_at: "", updated_at: "" }, loading: false, login: vi.fn(), logout: vi.fn(), reloadUser: vi.fn() }}>
          <Routes>
            <Route path="/review" element={<ReviewPage />} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Q1" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Показать ответ" }));
    await userEvent.click(screen.getByRole("button", { name: /Хорошо/ }));

    expect(mockedSubmitCurrentReview).toHaveBeenCalledWith(session, 3, "user");
    expect(await screen.findByText("Q2")).toBeInTheDocument();
  });

  it("uses the deck query parameter when loading the session", async () => {
    mockedLoadReviewSession.mockResolvedValue({ ...makeSession(), items: [], currentIndex: 0 });

    render(
      <MemoryRouter initialEntries={["/review?deck=terms"]}>
        <AuthContext.Provider value={{ user: { id: 1, username: "user", is_admin: false, created_at: "", updated_at: "" }, loading: false, login: vi.fn(), logout: vi.fn(), reloadUser: vi.fn() }}>
          <Routes>
            <Route path="/review" element={<ReviewPage />} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Всё на сегодня!")).toBeInTheDocument();
    expect(mockedLoadReviewSession).toHaveBeenCalledWith({ userKey: "user", deckSlug: "terms" });
  });
});
