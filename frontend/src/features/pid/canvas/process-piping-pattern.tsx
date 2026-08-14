import type { ReactElement } from "react";

import type { PidProperties, Point } from "../domain/model";

export const PROCESS_LINE_DEFAULT_STROKE_WIDTH = 2;
export const PROCESS_LINE_DEFAULT_PARALLEL_GAP = 8;
export const PROCESS_LINE_STROKE_WIDTH_PROPERTY = "processLineStrokeWidth";
export const PROCESS_LINE_PARALLEL_GAP_PROPERTY = "processLineParallelGap";

const PROCESS_LINE_COLOR = "#1F2937";
const PROCESS_LINE_SELECTION_EXTRA = 8;

export interface ProcessPipingPatternInput {
  readonly id: string;
  readonly points: readonly Point[];
  readonly selected: boolean;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly parallelGap?: number;
}

export interface ProcessPipingBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface ProcessLineStyle {
  readonly strokeWidth: number;
  readonly parallelGap: number;
}

export interface ProcessLineHandleAnchor {
  readonly x: number;
  readonly y: number;
  readonly normalX: number;
  readonly normalY: number;
}

export function normalizeProcessLineStyle(style: Partial<ProcessLineStyle> = {}): ProcessLineStyle {
  return {
    strokeWidth: positiveNumber(style.strokeWidth, PROCESS_LINE_DEFAULT_STROKE_WIDTH),
    parallelGap: positiveNumber(style.parallelGap, PROCESS_LINE_DEFAULT_PARALLEL_GAP),
  };
}

export function processLineStyleFromProperties(properties: PidProperties): ProcessLineStyle {
  return normalizeProcessLineStyle({
    strokeWidth: numericProperty(properties[PROCESS_LINE_STROKE_WIDTH_PROPERTY]),
    parallelGap: numericProperty(properties[PROCESS_LINE_PARALLEL_GAP_PROPERTY]),
  });
}

export function processLineProperties(properties: PidProperties, style: Partial<ProcessLineStyle>): PidProperties {
  const normalized = normalizeProcessLineStyle(style);
  return {
    ...properties,
    [PROCESS_LINE_STROKE_WIDTH_PROPERTY]: normalized.strokeWidth,
    [PROCESS_LINE_PARALLEL_GAP_PROPERTY]: normalized.parallelGap,
  };
}

export function renderProcessPipingPattern(input: ProcessPipingPatternInput): ReactElement {
  const options = processLineOptions(input);
  const centerPath = pointsPath(input.points);
  const parallelPaths = processLinePaths(input.points, options.parallelGap);
  return (
    <g data-process-line={input.id}>
      {input.selected && centerPath ? (
        <path
          data-process-line-selection={input.id}
          d={centerPath}
          fill="none"
          stroke="#2563eb"
          strokeWidth={options.parallelGap + options.strokeWidth + PROCESS_LINE_SELECTION_EXTRA}
          strokeLinecap="butt"
          strokeLinejoin="round"
          opacity={0.28}
          pointerEvents="none"
        />
      ) : null}
      {parallelPaths.map((path, index) => (
        <path
          key={`${input.id}:${index}`}
          className="react-flow__edge-path"
          data-process-line-parallel={index}
          d={path}
          fill="none"
          stroke={options.stroke}
          strokeWidth={options.strokeWidth}
          strokeLinecap="butt"
          strokeLinejoin="round"
          pointerEvents="none"
        />
      ))}
      {centerPath ? <path data-process-line-route={input.id} d={centerPath} fill="none" stroke="none" pointerEvents="none" /> : null}
    </g>
  );
}

export function renderStaticProcessPipingPattern(input: ProcessPipingPatternInput): string {
  const options = processLineOptions(input);
  const centerPath = pointsPath(input.points);
  const parallelMarkup = processLinePaths(input.points, options.parallelGap).map((path, index) => (
    `<path data-process-line-parallel="${index}" d="${attribute(path)}" fill="none" stroke="${attribute(options.stroke)}" stroke-width="${number(options.strokeWidth)}" stroke-linecap="butt" stroke-linejoin="round"/>`
  )).join("");
  const highlight = input.selected && centerPath
    ? `<path data-process-line-selection="${attribute(input.id)}" d="${attribute(centerPath)}" fill="none" stroke="#2563eb" stroke-width="${number(options.parallelGap + options.strokeWidth + PROCESS_LINE_SELECTION_EXTRA)}" stroke-linecap="butt" stroke-linejoin="round" opacity="0.28"/>`
    : "";
  const route = centerPath
    ? `<path data-process-line-route="${attribute(input.id)}" d="${attribute(centerPath)}" fill="none" stroke="none"/>`
    : "";
  return `<g data-process-line="${attribute(input.id)}">${highlight}${parallelMarkup}${route}</g>`;
}

export function processPipingPatternBounds(
  points: readonly Point[],
  selected = false,
  strokeWidth = PROCESS_LINE_DEFAULT_STROKE_WIDTH,
  parallelGap = PROCESS_LINE_DEFAULT_PARALLEL_GAP,
): ProcessPipingBounds | null {
  if (points.length < 2) return null;
  const lineRadius = positiveNumber(parallelGap, PROCESS_LINE_DEFAULT_PARALLEL_GAP) / 2
    + positiveNumber(strokeWidth, PROCESS_LINE_DEFAULT_STROKE_WIDTH) / 2;
  const radius = selected ? lineRadius + PROCESS_LINE_SELECTION_EXTRA / 2 : lineRadius;
  return points.reduce<ProcessPipingBounds>((bounds, point) => ({
    minX: Math.min(bounds.minX, point.x - radius),
    minY: Math.min(bounds.minY, point.y - radius),
    maxX: Math.max(bounds.maxX, point.x + radius),
    maxY: Math.max(bounds.maxY, point.y + radius),
  }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
}

export function processLineHandleAnchors(
  points: readonly Point[],
  parallelGap = PROCESS_LINE_DEFAULT_PARALLEL_GAP,
): readonly ProcessLineHandleAnchor[] {
  const segment = processSegments(points).reduce<ProcessSegment | null>(
    (longest, current) => !longest || current.length > longest.length ? current : longest,
    null,
  );
  if (!segment) return [];
  const normalX = -segment.dy / segment.length;
  const normalY = segment.dx / segment.length;
  const midpoint = {
    x: (segment.from.x + segment.to.x) / 2,
    y: (segment.from.y + segment.to.y) / 2,
  };
  const offset = positiveNumber(parallelGap, PROCESS_LINE_DEFAULT_PARALLEL_GAP) / 2;
  return [
    { x: midpoint.x + normalX * offset, y: midpoint.y + normalY * offset, normalX, normalY },
    { x: midpoint.x - normalX * offset, y: midpoint.y - normalY * offset, normalX: -normalX, normalY: -normalY },
  ];
}

interface ProcessLineOptions {
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly parallelGap: number;
}

interface ProcessSegment {
  readonly from: Point;
  readonly to: Point;
  readonly dx: number;
  readonly dy: number;
  readonly length: number;
}

function processLineOptions(input: ProcessPipingPatternInput): ProcessLineOptions {
  const style = normalizeProcessLineStyle(input);
  return {
    stroke: input.stroke ?? PROCESS_LINE_COLOR,
    strokeWidth: style.strokeWidth,
    parallelGap: style.parallelGap,
  };
}

function processLinePaths(points: readonly Point[], parallelGap: number): readonly string[] {
  const segments = processSegments(points);
  if (segments.length === 0) return [];
  const offset = parallelGap / 2;
  return [offsetProcessPath(segments, -offset), offsetProcessPath(segments, offset)];
}

function processSegments(points: readonly Point[]): readonly ProcessSegment[] {
  const segments: ProcessSegment[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) continue;
    segments.push({ from, to, dx, dy, length });
  }
  return segments;
}

function offsetProcessPath(segments: readonly ProcessSegment[], offset: number): string {
  const first = segments[0];
  const path: Point[] = [offsetPoint(first.from, first, offset)];
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const next = segments[index + 1];
    if (!next) {
      appendPoint(path, offsetPoint(segment.to, segment, offset));
      continue;
    }
    appendPoint(path, intersectOffsetLines(segment, next, offset) ?? offsetPoint(segment.to, segment, offset));
  }
  return pointsPath(path);
}

function offsetPoint(point: Point, segment: ProcessSegment, offset: number): Point {
  const normal = { x: -segment.dy / segment.length, y: segment.dx / segment.length };
  return { x: point.x + normal.x * offset, y: point.y + normal.y * offset };
}

function intersectOffsetLines(first: ProcessSegment, second: ProcessSegment, offset: number): Point | null {
  const firstStart = offsetPoint(first.from, first, offset);
  const secondStart = offsetPoint(second.from, second, offset);
  const determinant = first.dx * second.dy - first.dy * second.dx;
  if (Math.abs(determinant) < 1e-9) return null;
  const deltaX = secondStart.x - firstStart.x;
  const deltaY = secondStart.y - firstStart.y;
  const distance = (deltaX * second.dy - deltaY * second.dx) / determinant;
  return {
    x: firstStart.x + first.dx * distance,
    y: firstStart.y + first.dy * distance,
  };
}

function pointsPath(points: readonly Point[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${number(point.x)} ${number(point.y)}`).join(" ");
}

function appendPoint(points: Point[], point: Point): void {
  const previous = points.at(-1);
  if (!previous || previous.x !== point.x || previous.y !== point.y) points.push(point);
}

function positiveNumber(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;
}

function numericProperty(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function number(value: number): string {
  return String(Object.is(value, -0) ? 0 : Math.round(value * 1_000_000) / 1_000_000);
}

function attribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
