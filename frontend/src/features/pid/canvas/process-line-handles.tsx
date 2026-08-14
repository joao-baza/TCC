import { useCallback, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";

import type { Point } from "../domain/model";
import { processLineHandleAnchors, type ProcessLineHandleAnchor } from "./process-piping-pattern";

interface ProcessLineHandlesProps {
  readonly id: string;
  readonly points: readonly Point[];
  readonly editable: boolean;
  readonly parallelGap: number;
  readonly strokeWidth: number;
  readonly zoom: number;
  readonly onPreviewGap: (gap: number | null) => void;
  readonly onCommitGap: (gap: number) => void;
}

interface GapInteraction {
  readonly startClientX: number;
  readonly startClientY: number;
  readonly startGap: number;
  readonly normalX: number;
  readonly normalY: number;
}

const MIN_GAP = 4;
const MAX_GAP = 96;

export function ProcessLineHandles({
  id,
  points,
  editable,
  parallelGap,
  strokeWidth,
  zoom,
  onPreviewGap,
  onCommitGap,
}: ProcessLineHandlesProps) {
  const interactionRef = useRef<GapInteraction | null>(null);
  const draftGapRef = useRef(parallelGap);
  draftGapRef.current = parallelGap;
  const anchors = processLineHandleAnchors(points, parallelGap);

  const updateGapFromPointer = useCallback((clientX: number, clientY: number) => {
    const interaction = interactionRef.current;
    if (!interaction) return;
    const scale = zoom || 1;
    const delta = ((clientX - interaction.startClientX) * interaction.normalX
      + (clientY - interaction.startClientY) * interaction.normalY) / scale;
    const nextGap = clampGap(interaction.startGap + delta * 2, strokeWidth);
    draftGapRef.current = nextGap;
    onPreviewGap(nextGap);
  }, [onPreviewGap, strokeWidth, zoom]);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    updateGapFromPointer(event.clientX, event.clientY);
  }, [updateGapFromPointer]);

  const finishInteraction = useCallback((commit: boolean) => {
    const interaction = interactionRef.current;
    if (!interaction) return;
    interactionRef.current = null;
    const nextGap = draftGapRef.current;
    onPreviewGap(null);
    if (commit && nextGap !== interaction.startGap) onCommitGap(nextGap);
  }, [onCommitGap, onPreviewGap]);

  useEffect(() => {
    if (!editable || anchors.length !== 2) return;
    window.addEventListener("pointermove", handlePointerMove);
    const handlePointerUp = () => finishInteraction(true);
    const handlePointerCancel = () => finishInteraction(false);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [anchors.length, editable, finishInteraction, handlePointerMove]);

  const beginInteraction = (event: ReactPointerEvent<SVGCircleElement>, anchor: ProcessLineHandleAnchor) => {
    event.preventDefault();
    event.stopPropagation();
    interactionRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startGap: parallelGap,
      normalX: anchor.normalX,
      normalY: anchor.normalY,
    };
    draftGapRef.current = parallelGap;
  };

  const handleKeyDown = (event: ReactKeyboardEvent<SVGCircleElement>) => {
    const delta = event.key === "ArrowUp" || event.key === "ArrowRight"
      ? 1
      : event.key === "ArrowDown" || event.key === "ArrowLeft"
        ? -1
        : event.key === "Home"
          ? MIN_GAP - parallelGap
          : event.key === "End"
            ? MAX_GAP - parallelGap
            : null;
    if (delta === null) return;
    event.preventDefault();
    event.stopPropagation();
    onCommitGap(clampGap(parallelGap + delta, strokeWidth));
  };

  if (!editable || anchors.length !== 2) return null;
  const center = {
    x: (anchors[0].x + anchors[1].x) / 2,
    y: (anchors[0].y + anchors[1].y) / 2,
  };
  return (
    <g data-process-line-handles={id} aria-label="Controles da espessura da linha de processo">
      <line
        data-process-line-gap-guide={id}
        x1={anchors[0].x}
        y1={anchors[0].y}
        x2={anchors[1].x}
        y2={anchors[1].y}
        stroke="#2563eb"
        strokeWidth={1}
        strokeDasharray="3 3"
        pointerEvents="none"
      />
      {anchors.map((anchor, index) => (
        <circle
          key={`${id}:${index}`}
          data-testid={`process-line-width-handle-${id}-${index}`}
          data-process-line-width-handle={index}
          className="nodrag nopan"
          cx={anchor.x}
          cy={anchor.y}
          r={6}
          fill="white"
          stroke="#2563eb"
          strokeWidth={2}
          pointerEvents="all"
          role="slider"
          tabIndex={0}
          aria-label={`Ajustar espessura da linha de processo, alça ${index + 1}`}
          aria-valuemin={MIN_GAP}
          aria-valuemax={MAX_GAP}
          aria-valuenow={parallelGap}
          aria-valuetext={`${parallelGap}px entre as linhas`}
          onPointerDown={(event) => beginInteraction(event, anchor)}
          onPointerMove={(event) => updateGapFromPointer(event.clientX, event.clientY)}
          onPointerUp={() => finishInteraction(true)}
          onPointerCancel={() => finishInteraction(false)}
          onKeyDown={handleKeyDown}
        >
          <title>{`Arraste para ajustar a espessura (${parallelGap}px)`}</title>
        </circle>
      ))}
      <circle cx={center.x} cy={center.y} r={2} fill="#2563eb" pointerEvents="none" />
    </g>
  );
}

function clampGap(value: number, strokeWidth: number): number {
  const minimum = Math.max(MIN_GAP, strokeWidth + 2);
  return Math.min(MAX_GAP, Math.max(minimum, Math.round(value)));
}
