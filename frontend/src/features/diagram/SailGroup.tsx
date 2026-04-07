/*
This file renders sails for one boat based on precomputed render angles and states.
Edit this file when sail geometry or sail-state styling changes.
Copy this file when you add another boat-attached diagram primitive.
*/

import { Line } from "react-konva";
import type { SailState } from "./types";

type SailGroupProps = {
  mainAngle: number;
  mainState: SailState;
  jibAngle: number | null;
  jibState: SailState | null;
  gennakerAngle: number | null;
  gennakerState: SailState | null;
};

function getSailStroke(state: SailState): { stroke: string; dash?: number[]; opacity: number } {
  if (state === "luffing") {
    return { stroke: "#f59e0b", dash: [8, 6], opacity: 0.9 };
  }
  if (state === "eased") {
    return { stroke: "#38bdf8", opacity: 0.85 };
  }
  return { stroke: "#0f172a", opacity: 0.95 };
}

function buildMainPoints(angleDeg: number): number[] {
  const radians = (angleDeg * Math.PI) / 180;
  const clewX = Math.sin(radians) * 58;
  const clewY = 18 + Math.cos(radians) * 86;
  return [0, -12, clewX, clewY, 0, 74];
}

function buildJibPoints(angleDeg: number): number[] {
  const radians = (angleDeg * Math.PI) / 180;
  const clewX = Math.sin(radians) * 54;
  const clewY = -16 + Math.cos(radians) * 30;
  return [0, -56, clewX, clewY, 0, -10];
}

function buildGennakerPoints(angleDeg: number): number[] {
  const radians = (angleDeg * Math.PI) / 180;
  const shoulderX = Math.sin(radians) * 82;
  const shoulderY = -58 + Math.cos(radians) * 44;
  const clewX = Math.sin(radians) * 62;
  const clewY = -12 + Math.cos(radians) * 84;
  return [0, -78, shoulderX, shoulderY, clewX, clewY, 0, -4];
}

export function SailGroup({ mainAngle, mainState, jibAngle, jibState, gennakerAngle, gennakerState }: SailGroupProps) {
  const mainStyle = getSailStroke(mainState);
  const jibStyle = jibState ? getSailStroke(jibState) : null;
  const gennakerStyle = gennakerState ? getSailStroke(gennakerState) : null;

  return (
    <>
      <Line
        name="sail-main"
        points={buildMainPoints(mainAngle)}
        closed
        stroke={mainStyle.stroke}
        strokeWidth={3}
        fill="rgba(255,255,255,0.86)"
        dash={mainStyle.dash}
        opacity={mainStyle.opacity}
      />
      {jibAngle !== null && jibStyle ? (
        <Line
          name="sail-jib"
          points={buildJibPoints(jibAngle)}
          closed
          stroke={jibStyle.stroke}
          strokeWidth={3}
          fill="rgba(255,255,255,0.78)"
          dash={jibStyle.dash}
          opacity={jibStyle.opacity}
        />
      ) : null}
      {gennakerAngle !== null && gennakerStyle ? (
        <Line
          name="sail-gennaker"
          points={buildGennakerPoints(gennakerAngle)}
          closed
          tension={0.35}
          stroke={gennakerStyle.stroke}
          strokeWidth={3}
          fill="rgba(250,204,21,0.28)"
          dash={gennakerStyle.dash}
          opacity={gennakerStyle.opacity}
        />
      ) : null}
    </>
  );
}
