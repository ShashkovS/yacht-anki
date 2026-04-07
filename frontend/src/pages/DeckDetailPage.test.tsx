/*
This file tests the authenticated deck detail page and card status labels.
Edit this file when deck detail loading, card list output, or deck CTA behavior changes.
Copy a test pattern here when you add another authenticated detail page.
*/

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { postJson } from "../shared/api";
import { DeckDetailPage } from "./DeckDetailPage";

vi.mock("../shared/api", () => ({
  postJson: vi.fn(),
}));

vi.mock("../shared/offlineStore", () => ({
  loadApiSnapshot: vi.fn(),
  saveApiSnapshot: vi.fn(),
}));

const mockedPostJson = vi.mocked(postJson);

afterEach(() => {
  mockedPostJson.mockReset();
});

describe("DeckDetailPage", () => {
  it("loads deck metadata and card statuses", async () => {
    mockedPostJson
      .mockResolvedValueOnce({
        deck: {
          slug: "terms",
          title: "Термины",
          description: "Основные курсы",
          builtin: true,
          card_count: 2,
        },
      })
      .mockResolvedValueOnce({
        deck: {
          slug: "terms",
          title: "Термины",
          description: "Основные курсы",
          builtin: true,
          card_count: 2,
        },
        cards: [
          {
            id: 1,
            deck_slug: "terms",
            template_type: "term_definition",
            prompt: "Что такое бейдевинд?",
            answer: "",
            explanation: "",
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
            template_type: "directional",
            prompt: "Куда уваливаться?",
            answer: "",
            explanation: "",
            diagram_spec: {},
            tags: [],
            sort_order: 2,
            created_at: "",
            updated_at: "",
            state: {
              phase: "review",
              due_at: "",
              last_reviewed_at: "",
              fsrs_state: {
                due: "",
                stability: 1,
                difficulty: 1,
                elapsed_days: 0,
                scheduled_days: 0,
                learning_steps: 0,
                reps: 0,
                lapses: 0,
                state: 0,
                last_review: null,
              },
            },
          },
        ],
        total_count: 2,
        limit: 50,
        offset: 0,
      });

    render(
      <MemoryRouter initialEntries={["/decks/terms"]}>
        <Routes>
          <Route path="/decks/:slug" element={<DeckDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Термины")).toBeInTheDocument();
    expect(screen.getByText("Что такое бейдевинд?")).toBeInTheDocument();
    expect(screen.getByText("Новая")).toBeInTheDocument();
    expect(screen.getByText("На повторении")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Учить эту колоду" })).toHaveAttribute("href", "/review?deck=terms");
  });
});
