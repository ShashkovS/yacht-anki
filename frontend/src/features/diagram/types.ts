/*
This file defines the typed DiagramSpec used by the frontend rendering engine.
Edit this file when the supported scene JSON format changes.
Copy a type pattern here when you add another diagram-specific frontend model.
*/

export const DIAGRAM_SPEC_VERSION = 1;
export const DIAGRAM_WORLD_WIDTH = 1000;
export const DIAGRAM_WORLD_HEIGHT = 700;

export type SailState = "trimmed" | "eased" | "luffing";
export type BoatHighlight = "none" | "selected" | "answer";
export type Tack = "port" | "starboard" | "head-to-wind";
export type ExpectedAnswer =
  | {
      type: "rotate_heading";
      boat_id: string;
      heading_deg: number;
      tolerance_deg: number;
    }
  | {
      type: "choose_option";
      options: Array<{ id: string; label: string }>;
      correct_option_id: string;
    }
  | {
      type: "select_boat";
      correct_boat_id: string;
    }
  | {
      type: "reveal_steps";
      steps: string[];
    };

export type SailSpec = {
  angle_deg?: number;
  state?: SailState;
};

export type GennakerSpec = SailSpec & {
  visible: boolean;
};

export type BoatSpec = {
  id: string;
  x: number;
  y: number;
  heading_deg: number;
  label?: string;
  highlight?: BoatHighlight;
  sails: {
    main: SailSpec;
    jib?: SailSpec;
    gennaker?: GennakerSpec;
  };
};

export type MarkSpec = {
  x: number;
  y: number;
  zone_radius: number;
};

export type OverlapPair = {
  a: string;
  b: string;
};

export type OverlaySpec = {
  keep_clear_boat_id?: string;
  windward_boat_id?: string;
  leeward_boat_id?: string;
  overlap_pairs?: OverlapPair[];
};

export type DiagramSpec = {
  version: 1;
  wind: {
    direction_deg: number;
    speed_knots?: number;
  };
  boats: BoatSpec[];
  mark?: MarkSpec;
  overlays?: OverlaySpec;
  answer_scene?: Omit<DiagramSpec, "answer_scene" | "expected_answer">;
  expected_answer?: ExpectedAnswer;
};

export class DiagramSpecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiagramSpecError";
  }
}
