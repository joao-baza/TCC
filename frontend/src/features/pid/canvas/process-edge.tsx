import { memo } from "react";
import {
  EdgeLabelRenderer,
  Position,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

import type { PidEdge, Point } from "../domain/model";
import type { UtilityCategory } from "../domain/utility-category";
import { lineStyleAttributes } from "./line-rendering";
import { renderSignalLinePattern } from "./signal-line-pattern";

export type ProcessEdgeData = Record<string, unknown> & {
  readonly processEdge: PidEdge;
  readonly route: readonly Point[];
  readonly editable: boolean;
  readonly utilityCategories?: UtilityCategory[];
};

export type ProcessFlowEdge = Edge<ProcessEdgeData, "process">;

function ProcessEdgeComponent(props: EdgeProps<ProcessFlowEdge>) {
  if (!props.data) return null;
  const { processEdge, route, utilityCategories } = props.data;
  const routePoints = orthogonalPoints(
    { x: props.sourceX, y: props.sourceY },
    route,
    { x: props.targetX, y: props.targetY },
    props.sourcePosition,
    props.targetPosition,
  );
  const midpoint = pathMidpoint(routePoints);
  const label = [processEdge.tag, processEdge.label].filter(Boolean).join(" ");
  const attrs = lineStyleAttributes(processEdge.lineStyle);
  const categoryColor = processEdge.connectionClass === "utility" && processEdge.utilityCategoryId
    ? utilityCategories?.find(c => c.id === processEdge.utilityCategoryId)?.color
    : undefined;

  return (
    <>
      <g
        data-testid={`process-edge-${props.id}`}
        data-signal-line-style={processEdge.lineStyle}
        className="pointer-events-visibleStroke"
      >
        <path
          className="react-flow__edge-interaction"
          d={pointsPath(routePoints)}
          fill="none"
          strokeOpacity={0}
          strokeWidth={24}
        />
        {renderSignalLinePattern({
          id: props.id,
          points: routePoints,
          lineStyle: processEdge.lineStyle,
          selected: Boolean(props.selected),
          stroke: categoryColor ?? attrs.stroke,
          strokeWidth: attrs.strokeWidth,
          markerEnd: props.markerEnd,
        })}
      </g>
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

export function orthogonalPath(
  source: Point,
  route: readonly Point[],
  target: Point,
  sourcePosition: Position = Position.Right,
  targetPosition: Position = Position.Left,
): string {
  return pointsPath(orthogonalPoints(source, route, target, sourcePosition, targetPosition));
}

export function orthogonalPoints(
  source: Point,
  route: readonly Point[],
  target: Point,
  sourcePosition: Position = Position.Right,
  targetPosition: Position = Position.Left,
): Point[] {
  if (source.x === target.x && source.y === target.y
    && route.every((point) => point.x === source.x && point.y === source.y)) return [{ ...source }];
  const points: Point[] = [{ ...source }];
  const sourceTangent = tangentPoint(source, sourcePosition);
  const targetTangent = tangentPoint(target, targetPosition);
  appendPoint(points, sourceTangent);
  for (const waypoint of [...route, targetTangent]) {
    const current = points.at(-1)!;
    if (current.x === waypoint.x && current.y === waypoint.y) continue;
    if (current.x !== waypoint.x && current.y !== waypoint.y) {
      appendPoint(points, { x: waypoint.x, y: current.y });
    }
    appendPoint(points, waypoint);
  }
  appendPoint(points, target);
  return points;
}

function tangentPoint(point: Point, position: Position): Point {
  if (position === Position.Left) return { x: point.x - 24, y: point.y };
  if (position === Position.Right) return { x: point.x + 24, y: point.y };
  if (position === Position.Top) return { x: point.x, y: point.y - 24 };
  return { x: point.x, y: point.y + 24 };
}

function appendPoint(points: Point[], point: Point) {
  const previous = points.at(-1);
  if (!previous || previous.x !== point.x || previous.y !== point.y) points.push({ ...point });
}

export function pointsPath(points: readonly Point[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function pathMidpoint(points: readonly Point[]): Point {
  const segments = points.slice(1).map((point, index) => ({
    from: points[index],
    to: point,
    length: Math.abs(point.x - points[index].x) + Math.abs(point.y - points[index].y),
  }));
  const halfway = segments.reduce((total, segment) => total + segment.length, 0) / 2;
  let walked = 0;
  for (const segment of segments) {
    if (walked + segment.length >= halfway) {
      const ratio = segment.length === 0 ? 0 : (halfway - walked) / segment.length;
      return {
        x: segment.from.x + (segment.to.x - segment.from.x) * ratio,
        y: segment.from.y + (segment.to.y - segment.from.y) * ratio,
      };
    }
    walked += segment.length;
  }
  return points[0] ?? { x: 0, y: 0 };
}

export const ProcessEdge = memo(ProcessEdgeComponent);
