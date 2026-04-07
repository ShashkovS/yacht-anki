/*
This file checks that repo builtin cards parse and render through the review UI.
Edit this file when builtin content files or review-card parsing rules change.
Copy this test style when you add another repo-backed frontend content catalog.
*/

import "@testing-library/jest-dom/vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseDiagramSpec } from "../diagram/parser";
import { ReviewCardView } from "./ReviewCardView";
import type { ReviewCard } from "../../shared/types";

vi.mock("../diagram", async () => {
  const actual = await vi.importActual<typeof import("../diagram")>("../diagram");
  return {
    ...actual,
    ResponsiveDiagram: () => <div data-testid="diagram-mock">diagram</div>,
  };
});

type BuiltinDeckFile = {
  cards: ReviewCard[];
};

function loadBuiltinDeck(filename: string): BuiltinDeckFile {
  const currentFile = fileURLToPath(import.meta.url);
  const repoFilePath = path.resolve(path.dirname(currentFile), "../../../../content", filename);
  return JSON.parse(fs.readFileSync(repoFilePath, "utf8")) as BuiltinDeckFile;
}

function loadBuiltinCards(): ReviewCard[] {
  return ["terms.json", "manoeuvres.json", "right-of-way.json"].flatMap((filename) => loadBuiltinDeck(filename).cards);
}

describe("builtin content", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("parses every builtin diagram spec from repo JSON files", () => {
    for (const card of loadBuiltinCards()) {
      expect(() => parseDiagramSpec(card.diagram_spec)).not.toThrow();
    }
  });

  it("renders every builtin card in unrevealed and revealed review states", () => {
    for (const card of loadBuiltinCards()) {
      const unrevealed = render(
        <ReviewCardView
          card={card}
          revealed={false}
          draftHeading={null}
          selectedBoatId={null}
          selectedOptionId={null}
          onRotateBoat={vi.fn()}
          onTapBoat={vi.fn()}
          onSelectOption={vi.fn()}
        />,
      );
      expect(screen.getByTestId("diagram-mock")).toBeInTheDocument();
      unrevealed.unmount();

      const revealed = render(
        <ReviewCardView
          card={card}
          revealed
          draftHeading={null}
          selectedBoatId={null}
          selectedOptionId={null}
          onRotateBoat={vi.fn()}
          onTapBoat={vi.fn()}
          onSelectOption={vi.fn()}
        />,
      );
      expect(screen.getAllByText(card.answer).length).toBeGreaterThan(0);
      revealed.unmount();
    }
  });
});
