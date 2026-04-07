/*
This file contains pure geometry helpers for the yacht diagram rendering engine.
Edit this file when angle math, sail defaults, or viewport scaling rules change.
Copy this helper style when you add another deterministic geometry module.
*/

import {
  DIAGRAM_WORLD_HEIGHT,
  DIAGRAM_WORLD_WIDTH,
  type BoatSpec,
  type SailSpec,
  type SailState,
  type Tack,
} from "./types";

export type ViewportTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

export type BoatRenderState = {
  tack: Tack;
  hullColor: string;
  mainAngle: number;
  mainState: SailState;
  jibAngle: number | null;
  jibState: SailState | null;
  gennakerAngle: number | null;
  gennakerState: SailState | null;
};

const HEAD_TO_WIND_THRESHOLD_DEG = 15;

export function normalizeDegrees(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function shortestAngleDelta(fromDeg: number, toDeg: number): number {
  const normalizedFrom = normalizeDegrees(fromDeg);
  const normalizedTo = normalizeDegrees(toDeg);
  let delta = normalizedTo - normalizedFrom;
  if (delta > 180) {
    delta -= 360;
  }
  if (delta <= -180) {
    delta += 360;
  }
  return delta;
}

export function getTack(headingDeg: number, windDirectionDeg: number): Tack {
  const delta = shortestAngleDelta(headingDeg, windDirectionDeg);
  if (Math.abs(delta) <= HEAD_TO_WIND_THRESHOLD_DEG) {
    return "head-to-wind";
  }
  return delta > 0 ? "starboard" : "port";
}

export function getHullColor(tack: Tack): string {
  switch (tack) {
    case "starboard":
      return "#15803d";
    case "port":
      return "#b91c1c";
    case "head-to-wind":
      return "#475569";
  }
}

export function calculateHeadingFromPoint(centerX: number, centerY: number, pointX: number, pointY: number): number {
  const dx = pointX - centerX;
  const dy = pointY - centerY;
  return normalizeDegrees((Math.atan2(dx, -dy) * 180) / Math.PI);
}

export function getHeadingHandlePosition(centerX: number, centerY: number, headingDeg: number, radius = 130): { x: number; y: number } {
  const radians = (normalizeDegrees(headingDeg) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.sin(radians),
    y: centerY - radius * Math.cos(radians),
  };
}

export function computeViewportTransform(width: number, height: number): ViewportTransform {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const scale = Math.min(safeWidth / DIAGRAM_WORLD_WIDTH, safeHeight / DIAGRAM_WORLD_HEIGHT);
  return {
    scale,
    offsetX: (safeWidth - DIAGRAM_WORLD_WIDTH * scale) / 2,
    offsetY: (safeHeight - DIAGRAM_WORLD_HEIGHT * scale) / 2,
  };
}

export function getWindAngleToBoat(headingDeg: number, windDirectionDeg: number): number {
  return Math.abs(shortestAngleDelta(headingDeg, windDirectionDeg));
}

function getSailMagnitude(angleToWind: number, maxMagnitude: number): number {
  if (angleToWind <= 35) {
    return 10;
  }
  if (angleToWind <= 60) {
    return maxMagnitude * 0.25;
  }
  if (angleToWind <= 95) {
    return maxMagnitude * 0.5;
  }
  if (angleToWind <= 140) {
    return maxMagnitude * 0.75;
  }
  return maxMagnitude;
}

function normalizeRelativeSailAngle(angleDeg: number): number {
  const normalized = ((angleDeg + 180) % 360 + 360) % 360 - 180;
  return Math.max(-85, Math.min(85, normalized));
}

function inferSailAngle(sail: SailSpec | undefined, tack: Tack, angleToWind: number, maxMagnitude: number): number | null {
  if (!sail) {
    return null;
  }
  if (typeof sail.angle_deg === "number") {
    return normalizeRelativeSailAngle(sail.angle_deg);
  }
  if (tack === "head-to-wind") {
    return 0;
  }
  const side = tack === "starboard" ? -1 : 1;
  return normalizeRelativeSailAngle(getSailMagnitude(angleToWind, maxMagnitude) * side);
}

export function inferSailState(explicitState: SailState | undefined, angleToWind: number): SailState {
  if (explicitState) {
    return explicitState;
  }
  if (angleToWind <= 35) {
    return "luffing";
  }
  if (angleToWind >= 120) {
    return "eased";
  }
  return "trimmed";
}

export function resolveBoatRenderState(boat: BoatSpec, windDirectionDeg: number): BoatRenderState {
  const normalizedHeading = normalizeDegrees(boat.heading_deg);
  const tack = getTack(normalizedHeading, windDirectionDeg);
  const angleToWind = getWindAngleToBoat(normalizedHeading, windDirectionDeg);
  const mainAngle = inferSailAngle(boat.sails.main, tack, angleToWind, 78) ?? 0;
  const jibAngle = inferSailAngle(boat.sails.jib, tack, angleToWind, 58);
  const gennakerAngle = boat.sails.gennaker?.visible ? inferSailAngle(boat.sails.gennaker, tack, angleToWind, 72) : null;

  return {
    tack,
    hullColor: getHullColor(tack),
    mainAngle,
    mainState: inferSailState(boat.sails.main.state, angleToWind),
    jibAngle,
    jibState: boat.sails.jib ? inferSailState(boat.sails.jib.state, angleToWind) : null,
    gennakerAngle,
    gennakerState: boat.sails.gennaker?.visible ? inferSailState(boat.sails.gennaker.state, angleToWind) : null,
  };
}
