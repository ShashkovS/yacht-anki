/*
This file parses raw JSON diagram payloads into the strict DiagramSpec shape.
Edit this file when backend diagram payload rules or parser defaults change.
Copy this parser style when you add another strict frontend JSON parser.
*/

import {
  type BoatHighlight,
  type BoatSpec,
  type DiagramSpec,
  DIAGRAM_SPEC_VERSION,
  type ExpectedAnswer,
  type GennakerSpec,
  type MarkSpec,
  type OverlaySpec,
  type OverlapPair,
  type SailSpec,
  type SailState,
  DiagramSpecError,
} from "./types";

function readObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DiagramSpecError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function readNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new DiagramSpecError(`${label} must be a finite number.`);
  }
  return value;
}

function readOptionalNumber(value: unknown, label: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  return readNumber(value, label);
}

function readString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new DiagramSpecError(`${label} must be a non-empty string.`);
  }
  return value;
}

function readOptionalString(value: unknown, label: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return readString(value, label);
}

function readOptionalEnum<T extends string>(value: unknown, label: string, allowed: readonly T[]): T | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new DiagramSpecError(`${label} must be one of: ${allowed.join(", ")}.`);
  }
  return value as T;
}

function readStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new DiagramSpecError(`${label} must be an array.`);
  }
  return value.map((item, index) => readString(item, `${label}[${index}]`));
}

function readSailSpec(value: unknown, label: string): SailSpec {
  const object = readObject(value, label);
  return {
    angle_deg: readOptionalNumber(object.angle_deg, `${label}.angle_deg`),
    state: readOptionalEnum<SailState>(object.state, `${label}.state`, ["trimmed", "eased", "luffing"]),
  };
}

function readOptionalGennaker(value: unknown, label: string): GennakerSpec | undefined {
  if (value === undefined) {
    return undefined;
  }
  const object = readObject(value, label);
  if (typeof object.visible !== "boolean") {
    throw new DiagramSpecError(`${label}.visible must be a boolean.`);
  }
  return {
    visible: object.visible,
    angle_deg: readOptionalNumber(object.angle_deg, `${label}.angle_deg`),
    state: readOptionalEnum<SailState>(object.state, `${label}.state`, ["trimmed", "eased", "luffing"]),
  };
}

function readBoatSpec(value: unknown, label: string): BoatSpec {
  const object = readObject(value, label);
  const sailsObject = readObject(object.sails, `${label}.sails`);
  return {
    id: readString(object.id, `${label}.id`),
    x: readNumber(object.x, `${label}.x`),
    y: readNumber(object.y, `${label}.y`),
    heading_deg: readNumber(object.heading_deg, `${label}.heading_deg`),
    label: readOptionalString(object.label, `${label}.label`),
    highlight: readOptionalEnum<BoatHighlight>(object.highlight, `${label}.highlight`, ["none", "selected", "answer"]),
    sails: {
      main: readSailSpec(sailsObject.main, `${label}.sails.main`),
      jib: sailsObject.jib === undefined ? undefined : readSailSpec(sailsObject.jib, `${label}.sails.jib`),
      gennaker: readOptionalGennaker(sailsObject.gennaker, `${label}.sails.gennaker`),
    },
  };
}

function readOptionalMark(value: unknown, label: string): MarkSpec | undefined {
  if (value === undefined) {
    return undefined;
  }
  const object = readObject(value, label);
  return {
    x: readNumber(object.x, `${label}.x`),
    y: readNumber(object.y, `${label}.y`),
    zone_radius: readNumber(object.zone_radius, `${label}.zone_radius`),
  };
}

function readOverlapPair(value: unknown, label: string): OverlapPair {
  const object = readObject(value, label);
  return {
    a: readString(object.a, `${label}.a`),
    b: readString(object.b, `${label}.b`),
  };
}

function readOptionalOverlays(value: unknown, label: string): OverlaySpec | undefined {
  if (value === undefined) {
    return undefined;
  }
  const object = readObject(value, label);
  const overlapPairs = object.overlap_pairs;
  let parsedPairs: OverlapPair[] | undefined;
  if (overlapPairs !== undefined) {
    if (!Array.isArray(overlapPairs)) {
      throw new DiagramSpecError(`${label}.overlap_pairs must be an array.`);
    }
    parsedPairs = overlapPairs.map((pair, index) => readOverlapPair(pair, `${label}.overlap_pairs[${index}]`));
  }

  return {
    keep_clear_boat_id: readOptionalString(object.keep_clear_boat_id, `${label}.keep_clear_boat_id`),
    windward_boat_id: readOptionalString(object.windward_boat_id, `${label}.windward_boat_id`),
    leeward_boat_id: readOptionalString(object.leeward_boat_id, `${label}.leeward_boat_id`),
    overlap_pairs: parsedPairs,
  };
}

function readExpectedAnswer(value: unknown, label: string): ExpectedAnswer {
  const object = readObject(value, label);
  const type = readString(object.type, `${label}.type`);

  if (type === "rotate_heading") {
    return {
      type,
      boat_id: readString(object.boat_id, `${label}.boat_id`),
      heading_deg: readNumber(object.heading_deg, `${label}.heading_deg`),
      tolerance_deg: readNumber(object.tolerance_deg, `${label}.tolerance_deg`),
    };
  }

  if (type === "choose_option") {
    const options = object.options;
    if (!Array.isArray(options) || options.length === 0) {
      throw new DiagramSpecError(`${label}.options must be a non-empty array.`);
    }
    return {
      type,
      options: options.map((option, index) => {
        const optionObject = readObject(option, `${label}.options[${index}]`);
        return {
          id: readString(optionObject.id, `${label}.options[${index}].id`),
          label: readString(optionObject.label, `${label}.options[${index}].label`),
        };
      }),
      correct_option_id: readString(object.correct_option_id, `${label}.correct_option_id`),
    };
  }

  if (type === "select_boat") {
    return {
      type,
      correct_boat_id: readString(object.correct_boat_id, `${label}.correct_boat_id`),
    };
  }

  if (type === "reveal_steps") {
    return {
      type,
      steps: readStringArray(object.steps, `${label}.steps`),
    };
  }

  throw new DiagramSpecError(`${label}.type is not supported.`);
}

function readDiagramScene(object: Record<string, unknown>, label: string): Omit<DiagramSpec, "answer_scene" | "expected_answer"> {
  const version = object.version ?? DIAGRAM_SPEC_VERSION;
  if (version !== DIAGRAM_SPEC_VERSION) {
    throw new DiagramSpecError(`${label}.version must be ${DIAGRAM_SPEC_VERSION}.`);
  }

  const boats = object.boats;
  if (!Array.isArray(boats) || boats.length === 0) {
    throw new DiagramSpecError(`${label}.boats must be a non-empty array.`);
  }

  const wind = readObject(object.wind, `${label}.wind`);

  return {
    version: DIAGRAM_SPEC_VERSION,
    wind: {
      direction_deg: readNumber(wind.direction_deg, `${label}.wind.direction_deg`),
      speed_knots: readOptionalNumber(wind.speed_knots, `${label}.wind.speed_knots`),
    },
    boats: boats.map((boat, index) => readBoatSpec(boat, `${label}.boats[${index}]`)),
    mark: readOptionalMark(object.mark, `${label}.mark`),
    overlays: readOptionalOverlays(object.overlays, `${label}.overlays`),
  };
}

export function parseDiagramSpec(diagramSpec: unknown): DiagramSpec {
  const object = readObject(diagramSpec, "diagram_spec");
  const scene = readDiagramScene(object, "diagram_spec");

  return {
    ...scene,
    answer_scene: object.answer_scene === undefined ? undefined : readDiagramScene(readObject(object.answer_scene, "diagram_spec.answer_scene"), "diagram_spec.answer_scene"),
    expected_answer: object.expected_answer === undefined ? undefined : readExpectedAnswer(object.expected_answer, "diagram_spec.expected_answer"),
  };
}
