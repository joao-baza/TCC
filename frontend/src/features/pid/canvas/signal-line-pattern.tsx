import type { ReactElement } from "react";

import { LINE_STYLES, LINE_STYLE_INFO, type LineStyle } from "../domain/line-style";
import type { Point } from "../domain/model";

type GlyphKind =
  | "diagonal-pair"
  | "hydraulic-l"
  | "open-circle"
  | "software-circle"
  | "binary-cross"
  | "single-diagonal"
  | "x-mark"
  | "wave"
  | "concentric-circle";

interface GlyphPlacement {
  readonly key: string;
  readonly x: number;
  readonly y: number;
  readonly angle: number;
}

interface PatternPrimitive {
  readonly kind: "base-path" | "glyph";
  readonly path?: string;
  readonly dashArray?: string;
  readonly glyph?: GlyphKind;
  readonly placement?: GlyphPlacement;
}

export interface SignalLinePatternBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface SignalLineLegendItem {
  readonly style: LineStyle;
  readonly label: string;
  readonly description: string;
}

export interface SignalLinePatternInput {
  readonly id: string;
  readonly points: readonly Point[];
  readonly lineStyle: LineStyle;
  readonly selected: boolean;
  readonly stroke: string;
  readonly strokeWidth?: number;
  readonly markerEnd?: string;
}

const GLYPH_SPACING = 48;
const GLYPH_INSET = 24;
const MIN_GLYPH_SEGMENT = 32;

const styleGlyph: Partial<Record<LineStyle, GlyphKind>> = {
  "pneumatic-signal": "diagonal-pair",
  "hydraulic-signal": "hydraulic-l",
  "guided-electromagnetic-sonic": "open-circle",
  "software-link": "software-circle",
  "binary-pneumatic-signal": "binary-cross",
  "undefined-signal": "single-diagonal",
  "capillary-tube": "x-mark",
  "unguided-electromagnetic-sonic": "wave",
  "mechanical-link": "concentric-circle",
  "binary-electric-signal": "binary-cross",
};

const dashedStyles = new Set<LineStyle>(["electric-signal", "binary-electric-signal"]);

export const signalLineLegendItems: readonly SignalLineLegendItem[] = LINE_STYLES.map((style) => ({
  style,
  label: LINE_STYLE_INFO[style].label,
  description: LINE_STYLE_INFO[style].description,
}));

export function renderSignalLinePattern(input: SignalLinePatternInput): ReactElement {
  const paint = input.selected ? "#2563eb" : input.stroke;
  const strokeWidth = input.strokeWidth ?? 1.5;
  const primitives = buildPatternPrimitives(input);
  const hasBasePath = primitives.some((primitive) => primitive.kind === "base-path");
  return (
    <g data-signal-line-pattern={input.id} data-line-style={input.lineStyle} data-signal-line-style={input.lineStyle}>
      {input.markerEnd && !hasBasePath ? (
        <path
          data-marker-carrier={input.id}
          d={pointsPath(input.points)}
          fill="none"
          stroke={paint}
          strokeOpacity={0}
          strokeWidth={strokeWidth}
          markerEnd={input.markerEnd}
          pointerEvents="none"
        />
      ) : null}
      {primitives.map((primitive) => {
        if (primitive.kind === "base-path") {
          return (
            <path
              key="base"
              className="react-flow__edge-path"
              d={primitive.path}
              fill="none"
              stroke={paint}
              strokeWidth={strokeWidth}
              strokeDasharray={primitive.dashArray}
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd={input.markerEnd}
            />
          );
        }
        return renderGlyphElement(primitive.glyph, primitive.placement, paint, strokeWidth);
      })}
    </g>
  );
}

export function renderStaticSignalLinePattern(input: SignalLinePatternInput): string {
  const paint = input.selected ? "#2563eb" : input.stroke;
  const strokeWidth = input.strokeWidth ?? 1.5;
  const children = buildPatternPrimitives(input).map((primitive) => {
    if (primitive.kind === "base-path") {
      const dashAttr = primitive.dashArray ? ` stroke-dasharray="${attribute(primitive.dashArray)}"` : "";
      return `<path d="${attribute(primitive.path ?? "")}" fill="none" stroke="${attribute(paint)}" stroke-width="${number(strokeWidth)}"${dashAttr} stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    return renderGlyphMarkup(primitive.glyph, primitive.placement, paint, strokeWidth);
  }).join("");
  return `<g data-signal-line-pattern="${attribute(input.id)}" data-line-style="${attribute(input.lineStyle)}" data-signal-line-style="${attribute(input.lineStyle)}">${children}</g>`;
}

export function signalLinePatternBounds(input: SignalLinePatternInput): SignalLinePatternBounds | null {
  const strokeRadius = (input.strokeWidth ?? 1.5) / 2;
  const bounds: SignalLinePatternBounds[] = [];
  for (const primitive of buildPatternPrimitives(input)) {
    if (primitive.kind === "base-path") bounds.push(pointsBounds(input.points, strokeRadius));
    else {
      const glyphBounds = primitive.glyph && primitive.placement
        ? boundsForGlyph(primitive.glyph, primitive.placement, strokeRadius)
        : null;
      if (glyphBounds) bounds.push(glyphBounds);
    }
  }
  return unionBounds(bounds);
}

function buildPatternPrimitives(input: SignalLinePatternInput): readonly PatternPrimitive[] {
  const primitives: PatternPrimitive[] = [];
  const glyph = styleGlyph[input.lineStyle];
  if (glyph) {
    for (const placement of glyphPlacements(input.points)) {
      primitives.push({ kind: "glyph", glyph, placement });
    }
  }

  const path = pointsPath(input.points);
  if (path) {
    primitives.push({ kind: "base-path", path, dashArray: dashedStyles.has(input.lineStyle) ? "14 7" : undefined });
  }
  return primitives;
}

function glyphPlacements(points: readonly Point[]): readonly GlyphPlacement[] {
  const placements: GlyphPlacement[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (dx !== 0 && dy !== 0) continue;
    const distance = Math.abs(dx || dy);
    if (distance < MIN_GLYPH_SEGMENT) continue;

    const ux = dx === 0 ? 0 : Math.sign(dx);
    const uy = dy === 0 ? 0 : Math.sign(dy);
    const angle = dx === 0 ? (uy >= 0 ? 90 : -90) : (ux >= 0 ? 0 : 180);
    for (let offset = GLYPH_INSET; offset <= distance - GLYPH_INSET; offset += GLYPH_SPACING) {
      placements.push({
        key: `${index}-${offset}`,
        x: from.x + ux * offset,
        y: from.y + uy * offset,
        angle,
      });
    }
  }
  return placements;
}

function renderGlyphElement(glyph: GlyphKind | undefined, placement: GlyphPlacement | undefined, stroke: string, strokeWidth: number): ReactElement | null {
  if (!glyph || !placement) return null;
  const transform = `translate(${number(placement.x)} ${number(placement.y)}) rotate(${number(placement.angle)})`;
  const common = { stroke, strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (glyph) {
    case "diagonal-pair":
      return <g key={placement.key} data-glyph={glyph} transform={transform}><path d="M -9 8 L -1 -8 M 3 8 L 11 -8" {...common} fill="none" /></g>;
    case "hydraulic-l":
      return <g key={placement.key} data-glyph={glyph} transform={transform}><path d="M -9 7 L -9 -7 L 7 -7" {...common} fill="none" /></g>;
    case "open-circle":
      return <g key={placement.key} data-glyph={glyph} transform={transform}><circle cx="0" cy="0" r="6" {...common} fill="none" /></g>;
    case "software-circle":
      return <g key={placement.key} data-glyph={glyph} transform={transform}><circle cx="0" cy="0" r="6" {...common} fill="none" strokeDasharray="2.5 2.5" /></g>;
    case "binary-cross":
    case "x-mark":
      return <g key={placement.key} data-glyph={glyph} transform={transform}><path d="M -7 -7 L 7 7 M 7 -7 L -7 7" {...common} fill="none" /></g>;
    case "single-diagonal":
      return <g key={placement.key} data-glyph={glyph} transform={transform}><path d="M -7 8 L 7 -8" {...common} fill="none" /></g>;
    case "wave":
      return <g key={placement.key} data-glyph={glyph} transform={transform}><path d="M -14 0 C -10 -8 -6 -8 -2 0 S 6 8 10 0 S 14 -8 18 0" {...common} fill="none" /></g>;
    case "concentric-circle":
      return <g key={placement.key} data-glyph={glyph} transform={transform}><circle cx="0" cy="0" r="7" {...common} fill="none" /><circle cx="0" cy="0" r="3" {...common} fill="none" /></g>;
  }
}

function renderGlyphMarkup(glyph: GlyphKind | undefined, placement: GlyphPlacement | undefined, stroke: string, strokeWidth: number): string {
  if (!glyph || !placement) return "";
  const common = `stroke="${attribute(stroke)}" stroke-width="${number(strokeWidth)}" stroke-linecap="round" stroke-linejoin="round"`;
  const transform = `translate(${number(placement.x)} ${number(placement.y)}) rotate(${number(placement.angle)})`;
  let content = "";
  switch (glyph) {
    case "diagonal-pair":
      content = `<path d="M -9 8 L -1 -8 M 3 8 L 11 -8" ${common} fill="none"/>`;
      break;
    case "hydraulic-l":
      content = `<path d="M -9 7 L -9 -7 L 7 -7" ${common} fill="none"/>`;
      break;
    case "open-circle":
      content = `<circle cx="0" cy="0" r="6" ${common} fill="none"/>`;
      break;
    case "software-circle":
      content = `<circle cx="0" cy="0" r="6" ${common} fill="none" stroke-dasharray="2.5 2.5"/>`;
      break;
    case "binary-cross":
    case "x-mark":
      content = `<path d="M -7 -7 L 7 7 M 7 -7 L -7 7" ${common} fill="none"/>`;
      break;
    case "single-diagonal":
      content = `<path d="M -7 8 L 7 -8" ${common} fill="none"/>`;
      break;
    case "wave":
      content = `<path d="M -14 0 C -10 -8 -6 -8 -2 0 S 6 8 10 0 S 14 -8 18 0" ${common} fill="none"/>`;
      break;
    case "concentric-circle":
      content = `<circle cx="0" cy="0" r="7" ${common} fill="none"/><circle cx="0" cy="0" r="3" ${common} fill="none"/>`;
      break;
  }
  return `<g data-glyph="${attribute(glyph)}" transform="${attribute(transform)}">${content}</g>`;
}

function boundsForGlyph(glyph: GlyphKind, placement: GlyphPlacement, strokeRadius: number): SignalLinePatternBounds {
  const extents: Record<GlyphKind, { halfWidth: number; halfHeight: number }> = {
    "diagonal-pair": { halfWidth: 11, halfHeight: 8 },
    "hydraulic-l": { halfWidth: 9, halfHeight: 7 },
    "open-circle": { halfWidth: 6, halfHeight: 6 },
    "software-circle": { halfWidth: 6, halfHeight: 6 },
    "binary-cross": { halfWidth: 7, halfHeight: 7 },
    "single-diagonal": { halfWidth: 7, halfHeight: 8 },
    "x-mark": { halfWidth: 7, halfHeight: 7 },
    "wave": { halfWidth: 18, halfHeight: 8 },
    "concentric-circle": { halfWidth: 7, halfHeight: 7 },
  };
  const normalizedAngle = Math.abs(placement.angle) % 180;
  const rotated = normalizedAngle === 90;
  const halfX = (rotated ? extents[glyph].halfHeight : extents[glyph].halfWidth) + strokeRadius;
  const halfY = (rotated ? extents[glyph].halfWidth : extents[glyph].halfHeight) + strokeRadius;
  return {
    minX: placement.x - halfX,
    minY: placement.y - halfY,
    maxX: placement.x + halfX,
    maxY: placement.y + halfY,
  };
}

function pointsBounds(points: readonly Point[], stroke: number): SignalLinePatternBounds {
  if (!points.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;
  for (const point of points.slice(1)) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return { minX: minX - stroke, minY: minY - stroke, maxX: maxX + stroke, maxY: maxY + stroke };
}

function unionBounds(bounds: readonly SignalLinePatternBounds[]): SignalLinePatternBounds | null {
  if (!bounds.length) return null;
  return bounds.reduce((result, item) => ({
    minX: Math.min(result.minX, item.minX),
    minY: Math.min(result.minY, item.minY),
    maxX: Math.max(result.maxX, item.maxX),
    maxY: Math.max(result.maxY, item.maxY),
  }));
}

function pointsPath(points: readonly Point[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${number(point.x)} ${number(point.y)}`).join(" ");
}

function text(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function attribute(value: string): string {
  return text(value).replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function number(value: number): string {
  const result = Object.is(value, -0) ? 0 : Math.round(value * 1_000_000) / 1_000_000;
  return String(result);
}
