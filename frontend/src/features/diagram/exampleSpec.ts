/*
This file stores a small sample diagram used for previews and smoke checks.
Edit this file when the shared diagram demo should show another sailing situation.
Copy this sample when you need a deterministic scene fixture for frontend work.
*/

export const exampleDiagramSpec: Record<string, unknown> = {
  version: 1,
  wind: {
    direction_deg: 20,
    speed_knots: 12,
  },
  boats: [
    {
      id: "alpha",
      x: 340,
      y: 390,
      heading_deg: 68,
      label: "Лодка A",
      highlight: "answer",
      sails: {
        main: {},
        jib: {},
      },
    },
    {
      id: "bravo",
      x: 660,
      y: 300,
      heading_deg: 240,
      label: "Лодка B",
      sails: {
        main: { state: "eased" },
        jib: { state: "eased" },
        gennaker: { visible: true, state: "eased" },
      },
    },
  ],
  mark: {
    x: 820,
    y: 150,
    zone_radius: 92,
  },
  overlays: {
    keep_clear_boat_id: "alpha",
    overlap_pairs: [{ a: "alpha", b: "bravo" }],
  },
};
