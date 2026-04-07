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

export function parseDiagramSpec(diagramSpec: Record<string, unknown>): DiagramSpec {
  const object = readObject(diagramSpec, "diagram_spec");
  const version = object.version ?? DIAGRAM_SPEC_VERSION;
  if (version !== DIAGRAM_SPEC_VERSION) {
    throw new DiagramSpecError(`diagram_spec.version must be ${DIAGRAM_SPEC_VERSION}.`);
  }

  const boats = object.boats;
  if (!Array.isArray(boats) || boats.length === 0) {
    throw new DiagramSpecError("diagram_spec.boats must be a non-empty array.");
  }

  const wind = readObject(object.wind, "diagram_spec.wind");

  return {
    version: DIAGRAM_SPEC_VERSION,
    wind: {
      direction_deg: readNumber(wind.direction_deg, "diagram_spec.wind.direction_deg"),
      speed_knots: readOptionalNumber(wind.speed_knots, "diagram_spec.wind.speed_knots"),
    },
    boats: boats.map((boat, index) => readBoatSpec(boat, `diagram_spec.boats[${index}]`)),
    mark: readOptionalMark(object.mark, "diagram_spec.mark"),
    overlays: readOptionalOverlays(object.overlays, "diagram_spec.overlays"),
  };
}
