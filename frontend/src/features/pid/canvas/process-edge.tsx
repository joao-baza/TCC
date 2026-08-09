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
  const routePoints = route.length > 0
    ? orthogonalPoints({ x: props.sourceX, y: props.sourceY }, route, { x: props.targetX, y: props.targetY })
    : [];
  const path = routePoints.length > 0
    ? pointsPath(routePoints)
    : fallbackPath;
  const midpoint = route.length > 0
    ? pathMidpoint(routePoints)
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
  return pointsPath(orthogonalPoints(source, route, target));
}

export function orthogonalPoints(source: Point, route: readonly Point[], target: Point): Point[] {
  const points: Point[] = [{ ...source }];
  for (const waypoint of [...route, target]) {
    const current = points.at(-1)!;
    if (current.x === waypoint.x && current.y === waypoint.y) continue;
    if (current.x !== waypoint.x && current.y !== waypoint.y) {
      points.push({ x: waypoint.x, y: current.y });
    }
    const previous = points.at(-1)!;
    if (previous.x !== waypoint.x || previous.y !== waypoint.y) points.push({ ...waypoint });
  }
  return points;
}

function pointsPath(points: readonly Point[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function pathMidpoint(points: readonly Point[]): Point {
  const point = points[Math.floor((points.length - 1) / 2)] ?? { x: 0, y: 0 };
  const next = points[Math.ceil((points.length - 1) / 2)] ?? point;
  return { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 };
}

export const ProcessEdge = memo(ProcessEdgeComponent);
