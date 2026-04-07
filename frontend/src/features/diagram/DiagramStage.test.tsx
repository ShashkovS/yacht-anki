/*
This file tests the diagram stage and responsive wrapper with mocked Konva primitives.
Edit this file when stage composition, fallback behavior, or diagram callbacks change.
Copy a test pattern here when you add another canvas-backed feature wrapper.
*/

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiagramStage } from "./DiagramStage";
import { ResponsiveDiagram } from "./ResponsiveDiagram";
import type { DiagramSpec } from "./types";

vi.mock("react-konva", async () => {
  const React = await import("react");

  type MockProps = {
    children?: React.ReactNode;
    name?: string;
    text?: string;
    draggable?: boolean;
    onClick?: () => void;
    onTap?: () => void;
    onDragMove?: (event: { target: { x: () => number; y: () => number } }) => void;
  };

  function createMockComponent(tag: string) {
    return function MockKonvaComponent({ children, name, text, draggable, onClick, onTap, onDragMove }: MockProps) {
      return (
        <div
          data-konva-tag={tag}
          data-name={name}
          data-draggable={draggable ? "true" : "false"}
          onClick={() => {
            onClick?.();
            onTap?.();
            if (draggable && onDragMove) {
              onDragMove({
                target: {
                  x: () => 650,
                  y: () => 350,
                },
              });
            }
          }}
        >
          {text}
          {children}
        </div>
      );
    };
  }

  return {
    Stage: createMockComponent("Stage"),
    Layer: createMockComponent("Layer"),
    Group: createMockComponent("Group"),
    Rect: createMockComponent("Rect"),
    Line: createMockComponent("Line"),
    Circle: createMockComponent("Circle"),
    Arrow: createMockComponent("Arrow"),
    Text: createMockComponent("Text"),
  };
});

const baseSpec: DiagramSpec = {
  version: 1,
  wind: {
    direction_deg: 30,
    speed_knots: 11,
  },
  boats: [
    {
      id: "alpha",
      x: 500,
      y: 350,
      heading_deg: 40,
      label: "Лодка A",
      highlight: "answer",
      sails: {
        main: {},
        jib: {},
      },
    },
  ],
};

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get() {
      return 480;
    },
  });
});

describe("DiagramStage", () => {
  it("renders a stage with wind and one boat", () => {
    render(<DiagramStage spec={baseSpec} width={480} height={320} />);

    expect(screen.getByTestId("diagram-stage")).toBeInTheDocument();
    expect(document.querySelector('[data-name="wind-arrow"]')).not.toBeNull();
    expect(document.querySelector('[data-name="boat-alpha"]')).not.toBeNull();
  });

  it("renders two boats and a mark", () => {
    render(
      <DiagramStage
        spec={{
          ...baseSpec,
          boats: [
            baseSpec.boats[0],
            {
              id: "bravo",
              x: 780,
              y: 220,
              heading_deg: 220,
              label: "Лодка B",
              sails: {
                main: { state: "eased" },
                jib: { state: "eased" },
              },
            },
          ],
          mark: {
            x: 860,
            y: 110,
            zone_radius: 84,
          },
        }}
        width={560}
        height={360}
      />,
    );

    expect(document.querySelector('[data-name="boat-bravo"]')).not.toBeNull();
    expect(document.querySelector('[data-name="mark-buoy"]')).not.toBeNull();
  });

  it("renders keep-clear overlays when requested", () => {
    render(
      <DiagramStage
        spec={{
          ...baseSpec,
          overlays: {
            keep_clear_boat_id: "alpha",
          },
        }}
        width={480}
        height={320}
      />,
    );

    expect(document.querySelector('[data-name="overlay-keep-clear"]')).not.toBeNull();
  });

  it("calls onBoatTap when a boat is tapped", () => {
    const onBoatTap = vi.fn();
    render(<DiagramStage spec={baseSpec} width={480} height={320} onBoatTap={onBoatTap} />);

    const boat = document.querySelector('[data-name="boat-alpha"]');
    expect(boat).not.toBeNull();
    fireEvent.click(boat!);

    expect(onBoatTap).toHaveBeenCalledWith("alpha");
  });

  it("calls onBoatRotate with a normalized heading when the drag handle moves", () => {
    const onBoatRotate = vi.fn();
    render(<DiagramStage spec={baseSpec} width={480} height={320} rotatableBoatId="alpha" onBoatRotate={onBoatRotate} />);

    const handle = document.querySelector('[data-name="boat-rotation-handle-alpha"]');
    expect(handle).not.toBeNull();
    fireEvent.click(handle!);

    expect(onBoatRotate).toHaveBeenCalledWith("alpha", 90);
  });
});

describe("ResponsiveDiagram", () => {
  it("shows a controlled fallback for invalid raw diagram JSON", () => {
    render(<ResponsiveDiagram diagramSpec={{ version: 1, wind: { direction_deg: 20 }, boats: "bad" }} />);

    expect(screen.getByTestId("diagram-fallback")).toBeInTheDocument();
    expect(screen.getByText("Диаграмма недоступна")).toBeInTheDocument();
  });
});
