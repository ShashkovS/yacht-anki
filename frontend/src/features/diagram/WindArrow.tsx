/*
This file renders the true-wind indicator for a yacht diagram scene.
Edit this file when wind styling, labels, or placement rules change.
Copy this file when you add another scene-wide diagram primitive.
*/

import { Arrow, Text } from "react-konva";
import { normalizeDegrees } from "./diagramHelpers";

type WindArrowProps = {
  directionDeg: number;
  speedKnots?: number;
};

export function WindArrow({ directionDeg, speedKnots }: WindArrowProps) {
  const radians = (normalizeDegrees(directionDeg) * Math.PI) / 180;
  const centerX = 120;
  const centerY = 90;
  const length = 86;
  const endX = centerX + Math.sin(radians) * length;
  const endY = centerY - Math.cos(radians) * length;
  const label = speedKnots ? `Ветер ${speedKnots} уз` : "Ветер";

  return (
    <>
      <Arrow name="wind-arrow" points={[centerX, centerY, endX, endY]} pointerLength={14} pointerWidth={14} fill="#0369a1" stroke="#0369a1" strokeWidth={5} />
      <Text name="wind-label" x={26} y={26} text={label} fontSize={22} fontStyle="600" fill="#0f172a" />
    </>
  );
}
