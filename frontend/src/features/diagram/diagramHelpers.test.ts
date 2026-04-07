/*
This file tests the pure geometry helpers behind the yacht diagram engine.
Edit this file when angle math, sail inference, or viewport scaling rules change.
Copy a test pattern here when you add another pure diagram helper.
*/

import { describe, expect, it } from "vitest";
import {
  calculateHeadingFromPoint,
  computeViewportTransform,
  getHeadingHandlePosition,
  getTack,
  inferSailState,
  normalizeDegrees,
  resolveBoatRenderState,
  shortestAngleDelta,
} from "./diagramHelpers";
import type { BoatSpec } from "./types";

function makeBoat(overrides: Partial<BoatSpec> = {}): BoatSpec {
  return {
    id: "alpha",
    x: 500,
    y: 350,
    heading_deg: 90,
    sails: {
      main: {},
      jib: {},
    },
    ...overrides,
  };
}

describe("diagramHelpers", () => {
  it("normalizes degrees into 0..359", () => {
    expect(normalizeDegrees(-10)).toBe(350);
    expect(normalizeDegrees(725)).toBe(5);
  });

  it("computes the shortest signed angle delta", () => {
    expect(shortestAngleDelta(350, 10)).toBe(20);
    expect(shortestAngleDelta(10, 350)).toBe(-20);
  });

  it("detects tack from boat heading and wind direction", () => {
    expect(getTack(270, 0)).toBe("starboard");
    expect(getTack(90, 0)).toBe("port");
    expect(getTack(8, 0)).toBe("head-to-wind");
  });

  it("infers sail states on sharp and open angles", () => {
    expect(inferSailState(undefined, 20)).toBe("luffing");
    expect(inferSailState(undefined, 135)).toBe("eased");
    expect(inferSailState(undefined, 75)).toBe("trimmed");
  });

  it("auto-calculates sail angles and hull color", () => {
    const renderState = resolveBoatRenderState(makeBoat({ heading_deg: 270 }), 0);

    expect(renderState.tack).toBe("starboard");
    expect(renderState.hullColor).toBe("#15803d");
    expect(renderState.mainAngle).toBeLessThan(0);
    expect(renderState.jibAngle).not.toBeNull();
  });

  it("keeps explicit sail angles normalized", () => {
    const renderState = resolveBoatRenderState(
      makeBoat({
        heading_deg: 110,
        sails: {
          main: { angle_deg: 120, state: "eased" },
          jib: { angle_deg: -130, state: "trimmed" },
        },
      }),
      25,
    );

    expect(renderState.mainAngle).toBe(85);
    expect(renderState.jibAngle).toBe(-85);
  });

  it("computes viewport scale and centering", () => {
    expect(computeViewportTransform(500, 350)).toEqual({
      scale: 0.5,
      offsetX: 0,
      offsetY: 0,
    });
    expect(computeViewportTransform(1000, 900)).toEqual({
      scale: 1,
      offsetX: 0,
      offsetY: 100,
    });
  });

  it("maps handle positions back to a normalized heading", () => {
    const handle = getHeadingHandlePosition(500, 350, 90);

    expect(Math.round(handle.x)).toBe(630);
    expect(Math.round(handle.y)).toBe(350);
    expect(Math.round(calculateHeadingFromPoint(500, 350, 500, 220))).toBe(0);
  });
});
