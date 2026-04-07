/*
This file renders rule-oriented overlays like keep-clear hints and overlap lines.
Edit this file when overlay types or highlight rules change.
Copy this file when you add another optional scene overlay component.
*/

import { Circle, Line, Text } from "react-konva";
import type { BoatSpec, OverlaySpec } from "./types";

type OverlayLayerProps = {
  boats: BoatSpec[];
  overlays?: OverlaySpec;
};

function findBoat(boats: BoatSpec[], boatId: string | undefined): BoatSpec | undefined {
  return boatId ? boats.find((boat) => boat.id === boatId) : undefined;
}

export function OverlayLayer({ boats, overlays }: OverlayLayerProps) {
  if (!overlays) {
    return null;
  }

  const keepClearBoat = findBoat(boats, overlays.keep_clear_boat_id);
  const windwardBoat = findBoat(boats, overlays.windward_boat_id);
  const leewardBoat = findBoat(boats, overlays.leeward_boat_id);

  return (
    <>
      {keepClearBoat ? (
        <>
          <Circle name="overlay-keep-clear" x={keepClearBoat.x} y={keepClearBoat.y} radius={118} stroke="#f97316" strokeWidth={6} dash={[18, 10]} opacity={0.7} />
          <Text name="overlay-keep-clear-label" x={keepClearBoat.x - 62} y={keepClearBoat.y - 146} text="Сторониться" fontSize={22} fontStyle="700" fill="#c2410c" />
        </>
      ) : null}
      {windwardBoat ? (
        <Text name="overlay-windward-label" x={windwardBoat.x - 58} y={windwardBoat.y - 126} text="Наветренная" fontSize={18} fill="#0f766e" />
      ) : null}
      {leewardBoat ? (
        <Text name="overlay-leeward-label" x={leewardBoat.x - 62} y={leewardBoat.y + 124} text="Подветренная" fontSize={18} fill="#0369a1" />
      ) : null}
      {overlays.overlap_pairs?.map((pair) => {
        const boatA = findBoat(boats, pair.a);
        const boatB = findBoat(boats, pair.b);
        if (!boatA || !boatB) {
          return null;
        }
        return <Line key={`${pair.a}-${pair.b}`} name={`overlay-overlap-${pair.a}-${pair.b}`} points={[boatA.x, boatA.y, boatB.x, boatB.y]} stroke="#7c3aed" strokeWidth={4} dash={[12, 6]} opacity={0.65} />;
      })}
    </>
  );
}
