import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

import type { PidEdge, Point } from "../domain/model";

export type ProcessEdgeData = Record<string, unknown> & {
  readonly processEdge: PidEdge;
  readonly route: readonly Point[];
  readonly editable: boolean;
};

export type ProcessFlowEdge = Edge<ProcessEdgeData, "process">;

function ProcessEdgeComponent(props: EdgeProps<ProcessFlowEdge>) {
  if (!props.data) return null;
  const { processEdge, route } = props.data;
  const [fallbackPath, fallbackLabelX, fallbackLabelY] = getSmoothStepPath(props);
  const path = route.length > 0
    ? orthogonalPath({ x: props.sourceX, y: props.sourceY }, route, { x: props.targetX, y: props.targetY })
    : fallbackPath;
  const midpoint = route.length > 0
    ? pathMidpoint([{ x: props.sourceX, y: props.sourceY }, ...route, { x: props.targetX, y: props.targetY }])
    : { x: fallbackLabelX, y: fallbackLabelY };
  const label = [processEdge.tag, processEdge.label].filter(Boolean).join(" ");

  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        markerEnd={props.markerEnd}
        interactionWidth={24}
        className={props.selected ? "stroke-blue-600" : "stroke-slate-600"}
        data-testid={`process-edge-${props.id}`}
      />
      {label ? (
        <EdgeLabelRenderer>
          <span
            className="pointer-events-none absolute rounded bg-white/90 px-1 text-[10px] font-medium text-slate-700"
            style={{ transform: `translate(-50%, -50%) translate(${midpoint.x}px, ${midpoint.y}px)` }}
          >
            {label}
          </span>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export function orthogonalPath(source: Point, route: readonly Point[], target: Point): string {
  return [source, ...route, target].map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function pathMidpoint(points: readonly Point[]): Point {
  const point = points[Math.floor((points.length - 1) / 2)] ?? { x: 0, y: 0 };
  const next = points[Math.ceil((points.length - 1) / 2)] ?? point;
  return { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 };
}

export const ProcessEdge = memo(ProcessEdgeComponent);
