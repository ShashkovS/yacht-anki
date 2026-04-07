/*
This file renders one boat, its sails, labels, and optional rotation handle.
Edit this file when boat geometry, boat interactions, or highlight styling changes.
Copy this file when you add another interactive diagram entity.
*/

import { Circle, Group, Line, Text } from "react-konva";
import {
  calculateHeadingFromPoint,
  getHeadingHandlePosition,
  normalizeDegrees,
  resolveBoatRenderState,
} from "./diagramHelpers";
import { SailGroup } from "./SailGroup";
import type { BoatSpec } from "./types";

type BoatShapeProps = {
  boat: BoatSpec;
  windDirectionDeg: number;
  rotatable: boolean;
  onBoatRotate?: (boatId: string, headingDeg: number) => void;
  onBoatTap?: (boatId: string) => void;
};

const HULL_POINTS = [0, -86, 30, -38, 26, 56, 0, 92, -26, 56, -30, -38];

function getHighlightStroke(highlight: BoatSpec["highlight"]): string | null {
  if (highlight === "selected") {
    return "#0ea5e9";
  }
  if (highlight === "answer") {
    return "#f59e0b";
  }
  return null;
}

export function BoatShape({ boat, windDirectionDeg, rotatable, onBoatRotate, onBoatTap }: BoatShapeProps) {
  const render = resolveBoatRenderState(boat, windDirectionDeg);
  const handlePosition = getHeadingHandlePosition(boat.x, boat.y, normalizeDegrees(boat.heading_deg));
  const highlightStroke = getHighlightStroke(boat.highlight);

  return (
    <>
      <Group
        name={`boat-${boat.id}`}
        x={boat.x}
        y={boat.y}
        rotation={normalizeDegrees(boat.heading_deg)}
        onClick={() => onBoatTap?.(boat.id)}
        onTap={() => onBoatTap?.(boat.id)}
      >
        {highlightStroke ? <Line name={`boat-highlight-${boat.id}`} points={HULL_POINTS} closed stroke={highlightStroke} strokeWidth={10} opacity={0.28} /> : null}
        <Line name={`boat-hull-${boat.id}`} points={HULL_POINTS} closed fill={render.hullColor} stroke="#0f172a" strokeWidth={4} />
        <Line name={`boat-centerline-${boat.id}`} points={[0, -78, 0, 86]} stroke="rgba(255,255,255,0.35)" strokeWidth={2} />
        <Line name={`boat-mast-${boat.id}`} points={[0, -14, 0, 20]} stroke="#111827" strokeWidth={5} />
        <SailGroup
          mainAngle={render.mainAngle}
          mainState={render.mainState}
          jibAngle={render.jibAngle}
          jibState={render.jibState}
          gennakerAngle={render.gennakerAngle}
          gennakerState={render.gennakerState}
        />
      </Group>

      {boat.label ? <Text name={`boat-label-${boat.id}`} x={boat.x - 38} y={boat.y + 106} text={boat.label} fontSize={20} fontStyle="600" fill="#0f172a" /> : null}

      {rotatable ? (
        <>
          <Line
            name={`boat-rotation-line-${boat.id}`}
            points={[boat.x, boat.y, handlePosition.x, handlePosition.y]}
            stroke="#0ea5e9"
            strokeWidth={4}
            dash={[10, 8]}
            opacity={0.8}
          />
          <Circle
            name={`boat-rotation-handle-${boat.id}`}
            x={handlePosition.x}
            y={handlePosition.y}
            radius={24}
            fill="#ffffff"
            stroke="#0ea5e9"
            strokeWidth={5}
            draggable
            dragBoundFunc={(position) => {
              const dx = position.x - boat.x;
              const dy = position.y - boat.y;
              const length = Math.hypot(dx, dy) || 1;
              const ratio = 130 / length;
              return {
                x: boat.x + dx * ratio,
                y: boat.y + dy * ratio,
              };
            }}
            onDragMove={(event) => {
              onBoatRotate?.(boat.id, calculateHeadingFromPoint(boat.x, boat.y, event.target.x(), event.target.y()));
            }}
          />
        </>
      ) : null}
    </>
  );
}
