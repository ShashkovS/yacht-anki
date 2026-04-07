/*
This file renders the full Konva stage for one typed yacht diagram scene.
Edit this file when scene composition, stage sizing, or diagram interactions change.
Copy this file when you add another typed canvas scene component.
*/

import { Layer, Line, Rect, Stage } from "react-konva";
import { BoatShape } from "./BoatShape";
import { computeViewportTransform } from "./diagramHelpers";
import { MarkBuoy } from "./MarkBuoy";
import { OverlayLayer } from "./OverlayLayer";
import { WindArrow } from "./WindArrow";
import { DIAGRAM_WORLD_HEIGHT, DIAGRAM_WORLD_WIDTH, type DiagramSpec } from "./types";

type DiagramStageProps = {
  spec: DiagramSpec;
  width: number;
  height: number;
  rotatableBoatId?: string;
  onBoatRotate?: (boatId: string, headingDeg: number) => void;
  onBoatTap?: (boatId: string) => void;
};

export function DiagramStage({ spec, width, height, rotatableBoatId, onBoatRotate, onBoatTap }: DiagramStageProps) {
  const viewport = computeViewportTransform(width, height);

  return (
    <div className="h-full w-full overflow-hidden rounded-[1.5rem] border border-sky-950/10 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.18),transparent_32%),linear-gradient(180deg,#f8fafc_0%,#e0f2fe_100%)]" data-testid="diagram-stage">
      <Stage width={Math.max(1, width)} height={Math.max(1, height)}>
        <Layer>
          <Rect x={0} y={0} width={Math.max(1, width)} height={Math.max(1, height)} fill="transparent" />
          <Line
            name="diagram-frame"
            points={[
              viewport.offsetX,
              viewport.offsetY,
              viewport.offsetX + DIAGRAM_WORLD_WIDTH * viewport.scale,
              viewport.offsetY,
              viewport.offsetX + DIAGRAM_WORLD_WIDTH * viewport.scale,
              viewport.offsetY + DIAGRAM_WORLD_HEIGHT * viewport.scale,
              viewport.offsetX,
              viewport.offsetY + DIAGRAM_WORLD_HEIGHT * viewport.scale,
              viewport.offsetX,
              viewport.offsetY,
            ]}
            stroke="rgba(15,23,42,0.08)"
            strokeWidth={2}
          />
        </Layer>
        <Layer scaleX={viewport.scale} scaleY={viewport.scale} x={viewport.offsetX} y={viewport.offsetY}>
          <Rect name="diagram-water" x={0} y={0} width={DIAGRAM_WORLD_WIDTH} height={DIAGRAM_WORLD_HEIGHT} fill="#f8fafc" />
          <Line name="diagram-midline" points={[0, DIAGRAM_WORLD_HEIGHT / 2, DIAGRAM_WORLD_WIDTH, DIAGRAM_WORLD_HEIGHT / 2]} stroke="rgba(14,116,144,0.09)" strokeWidth={2} dash={[10, 10]} />
          <WindArrow directionDeg={spec.wind.direction_deg} speedKnots={spec.wind.speed_knots} />
          {spec.mark ? <MarkBuoy mark={spec.mark} /> : null}
          <OverlayLayer boats={spec.boats} overlays={spec.overlays} />
          {spec.boats.map((boat) => (
            <BoatShape
              key={boat.id}
              boat={boat}
              windDirectionDeg={spec.wind.direction_deg}
              rotatable={rotatableBoatId === boat.id}
              onBoatRotate={onBoatRotate}
              onBoatTap={onBoatTap}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
