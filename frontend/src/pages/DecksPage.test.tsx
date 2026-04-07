/*
This file tests the authenticated deck list page and its progress cards.
Edit this file when deck list loading, deck cards, or deck links change.
Copy a test pattern here when you add another authenticated list page.
*/

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { postJson } from "../shared/api";
import { DecksPage } from "./DecksPage";

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

describe("DecksPage", () => {
  it("renders deck cards with progress and links", async () => {
    mockedPostJson.mockResolvedValue({
      decks: [
        {
          slug: "terms",
          title: "Термины",
          description: "Основные курсы и команды",
          builtin: true,
          card_count: 12,
          progress: {
            total_cards: 12,
            new_cards: 2,
            learning_cards: 4,
            review_cards: 6,
          },
        },
      ],
    });

    render(
      <MemoryRouter>
        <DecksPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Термины")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Открыть колоду" })).toHaveAttribute("href", "/decks/terms");
    expect(screen.getByRole("link", { name: "Учить эту колоду" })).toHaveAttribute("href", "/review?deck=terms");
  });
});
