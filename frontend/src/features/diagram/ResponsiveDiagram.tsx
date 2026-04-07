/*
This file measures a container, parses raw diagram JSON, and renders DiagramStage safely.
Edit this file when responsive sizing or invalid-diagram fallback behavior changes.
Copy this file when you add another parsed-and-measured visualization wrapper.
*/

import { useEffect, useMemo, useRef, useState } from "react";
import { DiagramStage } from "./DiagramStage";
import { parseDiagramSpec } from "./parser";

type ResponsiveDiagramProps = {
  diagramSpec: Record<string, unknown>;
  minHeight?: number;
  className?: string;
  rotatableBoatId?: string;
  onBoatRotate?: (boatId: string, headingDeg: number) => void;
  onBoatTap?: (boatId: string) => void;
};

type Size = {
  width: number;
  height: number;
};

function getMeasuredSize(element: HTMLElement | null, minHeight: number): Size {
  const width = element?.clientWidth ?? 0;
  return {
    width,
    height: Math.max(minHeight, width > 0 ? Math.round(width * 0.7) : minHeight),
  };
}

export function ResponsiveDiagram({
  diagramSpec,
  minHeight = 260,
  className,
  rotatableBoatId,
  onBoatRotate,
  onBoatTap,
}: ResponsiveDiagramProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: minHeight });
  const parsedSpec = useMemo(() => {
    try {
      return { spec: parseDiagramSpec(diagramSpec), error: null };
    } catch (error) {
      return { spec: null, error: error instanceof Error ? error.message : "Diagram is invalid." };
    }
  }, [diagramSpec]);

  useEffect(() => {
    const element = containerRef.current;
    setSize(getMeasuredSize(element, minHeight));

    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      setSize(getMeasuredSize(element, minHeight));
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [minHeight]);

  if (parsedSpec.error) {
    return (
      <div className={className}>
        <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-5 text-sm text-rose-900" data-testid="diagram-fallback">
          <p className="font-semibold">Диаграмма недоступна</p>
          <p className="mt-2 leading-6">{parsedSpec.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} ref={containerRef}>
      <div style={{ minHeight }}>
        {size.width > 0 && parsedSpec.spec ? (
          <DiagramStage
            spec={parsedSpec.spec}
            width={size.width}
            height={size.height}
            rotatableBoatId={rotatableBoatId}
            onBoatRotate={onBoatRotate}
            onBoatTap={onBoatTap}
          />
        ) : null}
      </div>
    </div>
  );
}
