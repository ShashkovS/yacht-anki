/*
This file tests review template presentation and interaction hints across card types.
Edit this file when template-specific review UI or reveal behavior changes.
Copy a test pattern here when you add another review card template.
*/

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReviewCardView } from "./ReviewCardView";
import type { ReviewCard } from "../../shared/types";

vi.mock("../diagram", () => ({
  ResponsiveDiagram: ({
    rotatableBoatId,
    onBoatRotate,
    onBoatTap,
  }: {
    rotatableBoatId?: string;
    onBoatRotate?: (boatId: string, headingDeg: number) => void;
    onBoatTap?: (boatId: string) => void;
  }) => (
    <div>
      <div data-testid="diagram-mock">{rotatableBoatId ?? "static"}</div>
      <button onClick={() => onBoatRotate?.(rotatableBoatId ?? "alpha", 123)} type="button">
        rotate
      </button>
      <button onClick={() => onBoatTap?.("alpha")} type="button">
        tap-boat
      </button>
    </div>
  ),
  parseDiagramSpec: (value: unknown) => value,
}));

function makeCard(overrides: Partial<ReviewCard>): ReviewCard {
  return {
    id: 1,
    deck_slug: "terms",
    template_type: "term_definition",
    prompt: "Prompt",
    answer: "Answer",
    explanation: "Explanation",
    diagram_spec: {
      version: 1,
      wind: { direction_deg: 30 },
      boats: [{ id: "alpha", x: 100, y: 100, heading_deg: 45, sails: { main: {} } }],
    },
    tags: [],
    sort_order: 1,
    created_at: "",
    updated_at: "",
    state: null,
    ...overrides,
  };
}

describe("ReviewCardView", () => {
  it("renders a rotatable boat for directional cards", () => {
    const onRotateBoat = vi.fn();

    render(
      <ReviewCardView
        card={makeCard({
          template_type: "directional",
          diagram_spec: {
            version: 1,
            wind: { direction_deg: 30 },
            boats: [{ id: "alpha", x: 100, y: 100, heading_deg: 45, sails: { main: {} } }],
            expected_answer: { type: "rotate_heading", boat_id: "alpha", heading_deg: 150, tolerance_deg: 20 },
          },
        })}
        revealed={false}
        draftHeading={null}
        selectedBoatId={null}
        selectedOptionId={null}
        onRotateBoat={onRotateBoat}
        onTapBoat={vi.fn()}
        onSelectOption={vi.fn()}
      />,
    );

    expect(screen.getByTestId("diagram-mock")).toHaveTextContent("alpha");
    fireEvent.click(screen.getByRole("button", { name: "rotate" }));
    expect(onRotateBoat).toHaveBeenCalledWith("alpha", 123);
  });

  it("renders options for trim cards and reveals the correct option", () => {
    render(
      <ReviewCardView
        card={makeCard({
          template_type: "trim",
          diagram_spec: {
            version: 1,
            wind: { direction_deg: 30 },
            boats: [{ id: "alpha", x: 100, y: 100, heading_deg: 45, sails: { main: {} } }],
            expected_answer: {
              type: "choose_option",
              options: [
                { id: "ease", label: "Потравить" },
                { id: "trim", label: "Выбрать" },
              ],
              correct_option_id: "ease",
            },
          },
        })}
        revealed
        draftHeading={null}
        selectedBoatId={null}
        selectedOptionId="trim"
        onRotateBoat={vi.fn()}
        onTapBoat={vi.fn()}
        onSelectOption={vi.fn()}
      />,
    );

    expect(screen.getByText("Правильный вариант:")).toBeInTheDocument();
    expect(screen.getByText(/Потравить/)).toBeInTheDocument();
    expect(screen.getByText(/Ваш выбор:/)).toBeInTheDocument();
  });

  it("renders ordered steps for manoeuvre cards", () => {
    render(
      <ReviewCardView
        card={makeCard({
          template_type: "manoeuvre",
          diagram_spec: {
            version: 1,
            wind: { direction_deg: 30 },
            boats: [{ id: "alpha", x: 100, y: 100, heading_deg: 45, sails: { main: {} } }],
            expected_answer: {
              type: "reveal_steps",
              steps: ["Проверить вокруг", "Плавно увалиться"],
            },
          },
        })}
        revealed
        draftHeading={null}
        selectedBoatId={null}
        selectedOptionId={null}
        onRotateBoat={vi.fn()}
        onTapBoat={vi.fn()}
        onSelectOption={vi.fn()}
      />,
    );

    expect(screen.getByText(/Проверить вокруг/)).toBeInTheDocument();
    expect(screen.getByText(/Плавно увалиться/)).toBeInTheDocument();
  });

  it("renders selectable boats for right-of-way cards and reveals the correct boat", () => {
    const onTapBoat = vi.fn();

    const { rerender } = render(
      <ReviewCardView
        card={makeCard({
          template_type: "right_of_way",
          diagram_spec: {
            version: 1,
            wind: { direction_deg: 30 },
            boats: [
              { id: "alpha", x: 100, y: 100, heading_deg: 45, sails: { main: {} } },
              { id: "bravo", x: 200, y: 100, heading_deg: 180, sails: { main: {} } },
            ],
            expected_answer: {
              type: "select_boat",
              correct_boat_id: "bravo",
            },
          },
        })}
        revealed={false}
        draftHeading={null}
        selectedBoatId={null}
        selectedOptionId={null}
        onRotateBoat={vi.fn()}
        onTapBoat={onTapBoat}
        onSelectOption={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "tap-boat" }));
    expect(onTapBoat).toHaveBeenCalledWith("alpha");

    rerender(
      <ReviewCardView
        card={makeCard({
          template_type: "right_of_way",
          diagram_spec: {
            version: 1,
            wind: { direction_deg: 30 },
            boats: [
              { id: "alpha", x: 100, y: 100, heading_deg: 45, sails: { main: {} } },
              { id: "bravo", x: 200, y: 100, heading_deg: 180, sails: { main: {} } },
            ],
            expected_answer: {
              type: "select_boat",
              correct_boat_id: "bravo",
            },
          },
        })}
        revealed
        draftHeading={null}
        selectedBoatId="alpha"
        selectedOptionId={null}
        onRotateBoat={vi.fn()}
        onTapBoat={vi.fn()}
        onSelectOption={vi.fn()}
      />,
    );

    expect(screen.getByText(/Правильная лодка:/)).toBeInTheDocument();
    expect(screen.getByText(/Ваш выбор:/)).toBeInTheDocument();
  });
});
