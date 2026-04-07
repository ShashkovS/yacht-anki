/*
This file tests parsing of extended diagram specs with answer scenes and expected answers.
Edit this file when diagram parser contracts or answer-spec support change.
Copy a test pattern here when you add another strict JSON parser.
*/

import { describe, expect, it } from "vitest";
import { parseDiagramSpec } from "./parser";

describe("parseDiagramSpec", () => {
  it("parses answer_scene and expected_answer for review templates", () => {
    const parsed = parseDiagramSpec({
      version: 1,
      wind: { direction_deg: 30 },
      boats: [{ id: "alpha", x: 100, y: 100, heading_deg: 45, sails: { main: {} } }],
      answer_scene: {
        version: 1,
        wind: { direction_deg: 30 },
        boats: [{ id: "alpha", x: 100, y: 100, heading_deg: 180, sails: { main: {} } }],
      },
      expected_answer: {
        type: "rotate_heading",
        boat_id: "alpha",
        heading_deg: 180,
        tolerance_deg: 15,
      },
    });

    expect(parsed.answer_scene?.boats[0]?.heading_deg).toBe(180);
    expect(parsed.expected_answer).toEqual({
      type: "rotate_heading",
      boat_id: "alpha",
      heading_deg: 180,
      tolerance_deg: 15,
    });
  });

  it("rejects invalid expected answer payloads", () => {
    expect(() =>
      parseDiagramSpec({
        version: 1,
        wind: { direction_deg: 30 },
        boats: [{ id: "alpha", x: 100, y: 100, heading_deg: 45, sails: { main: {} } }],
        expected_answer: {
          type: "choose_option",
          options: [],
          correct_option_id: "trim",
        },
      }),
    ).toThrowError(/non-empty array/i);
  });
});
