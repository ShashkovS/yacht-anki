/*
This file renders the race mark and its optional three-length zone.
Edit this file when mark styling or zone visualization changes.
Copy this file when you add another simple scene marker component.
*/

import { Circle, Text } from "react-konva";
import type { MarkSpec } from "./types";

type MarkBuoyProps = {
  mark: MarkSpec;
};

export function MarkBuoy({ mark }: MarkBuoyProps) {
  return (
    <>
      <Circle name="mark-zone" x={mark.x} y={mark.y} radius={mark.zone_radius} fill="rgba(56,189,248,0.08)" stroke="#38bdf8" strokeWidth={3} dash={[12, 8]} />
      <Circle name="mark-buoy" x={mark.x} y={mark.y} radius={16} fill="#f59e0b" stroke="#9a3412" strokeWidth={3} />
      <Text name="mark-label" x={mark.x - 18} y={mark.y + 22} text="Знак" fontSize={18} fill="#7c2d12" />
    </>
  );
}
