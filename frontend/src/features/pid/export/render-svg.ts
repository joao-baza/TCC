import type { CatalogSymbol } from "../catalog/catalog-symbol";
import {
  isSanitizedPidSvgAsset,
  loadSanitizedPidSvgAsset,
  sanitizePidSvgAsset,
  type PidAssetFetcher,
  type SanitizedPidSvgAsset,
} from "../catalog/sanitized-svg-asset";
import { getPidNodeGeometry, getPidPortAnchorGeometry, type PidFlowPosition } from "../domain/geometry";
import type { PidAnnotation, PidDocument, PidEdge, PidGroup, PidNode, Point } from "../domain/model";
import type { UtilityCategory } from "../domain/utility-category";
import { lineStyleAttributes } from "../canvas/line-rendering";

export type PidExportBackground = "white" | "transparent";

export interface RenderPidSvgOptions {
  readonly background?: PidExportBackground;
  readonly padding?: number;
}

export type PidSvgAssets = ReadonlyMap<string, SanitizedPidSvgAsset>;
export { sanitizePidSvgAsset };
export type { PidAssetFetcher, SanitizedPidSvgAsset };

interface Bounds { minX: number; minY: number; maxX: number; maxY: number }
interface PositionedPort { point: Point; side: PidFlowPosition }

export async function loadPidSvgAssets(
  catalog: readonly Pick<CatalogSymbol, "key" | "assetUrl">[],
  fetcher?: PidAssetFetcher,
): Promise<PidSvgAssets> {
  const assets = new Map<string, SanitizedPidSvgAsset>();
  for (const symbol of [...catalog].sort((left, right) => compare(left.key, right.key))) {
    assets.set(symbol.key, await loadSanitizedPidSvgAsset(symbol.assetUrl, fetcher));
  }
  return assets;
}

export async function renderPidSvg(
  document: PidDocument,
  assets: PidSvgAssets,
  options: RenderPidSvgOptions = {},
): Promise<string> {
  verifyAssets(assets);
  const padding = Number.isFinite(options.padding) && (options.padding ?? 0) >= 0 ? options.padding ?? 24 : 24;
  const rendered: string[] = [];
  const bounds: Bounds[] = [];
  const portPositions = buildPortPositions(document);

  for (const group of sortedValues(document.groups)) {
    rendered.push(renderGroup(group));
    bounds.push(rectBounds(group.x, group.y, group.width, group.height, 1));
    if (group.label) bounds.push(textBounds(group.label, group.x + 4, group.y - 5));
  }
  const edges = sortedValues(document.edges);
  for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex += 1) {
    const result = renderEdge(portPositions, edges[edgeIndex], edgeIndex, document.metadata.utilityCategories);
    if (!result) continue;
    rendered.push(result.markup);
    bounds.push(result.bounds);
    if (result.labelBounds) bounds.push(result.labelBounds);
  }
  for (const node of sortedValues(document.nodes)) {
    const asset = assets.get(node.symbolKey);
    if (!asset) throw new Error(`Ativo sanitizado ausente para ${node.symbolKey}.`);
    const result = renderNode(node, asset);
    rendered.push(result.markup);
    bounds.push(result.bounds);
    if (result.captionBounds) bounds.push(result.captionBounds);
  }
  for (const annotation of sortedValues(document.annotations)) {
    const result = renderAnnotation(annotation);
    rendered.push(result.markup);
    bounds.push(result.bounds);
  }

  const content = unionBounds(bounds);
  const viewBox = {
    x: content.minX - padding,
    y: content.minY - padding,
    width: Math.max(1, content.maxX - content.minX + padding * 2),
    height: Math.max(1, content.maxY - content.minY + padding * 2),
  };
  const background = (options.background ?? "transparent") === "white"
    ? `<rect x="${number(viewBox.x)}" y="${number(viewBox.y)}" width="${number(viewBox.width)}" height="${number(viewBox.height)}" fill="#ffffff"/>`
    : "";
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${number(viewBox.x)} ${number(viewBox.y)} ${number(viewBox.width)} ${number(viewBox.height)}" width="${number(viewBox.width)}" height="${number(viewBox.height)}" role="img" aria-label="${attribute(document.metadata.title || "Diagrama P&ID")}">`,
    background,
    '<g color="#334155" fill="none" stroke="#475569" stroke-width="2" font-family="Arial, sans-serif">',
    ...rendered,
    "</g>",
    "</svg>",
  ].join("");
}

function renderNode(node: PidNode, asset: SanitizedPidSvgAsset) {
  const geometry = getPidNodeGeometry(node);
  const caption = [node.tag, node.label].filter(Boolean).join(" ");
  const assetMarkup = `<svg x="${number(node.x)}" y="${number(node.y)}" width="${number(node.width)}" height="${number(node.height)}" viewBox="${attribute(asset.viewBox)}" preserveAspectRatio="xMidYMid meet" overflow="visible">${asset.markup}</svg>`;
  const rotation = geometry.rotation
    ? ` transform="rotate(${geometry.rotation} ${number(geometry.center.x)} ${number(geometry.center.y)})"`
    : "";
  const captionY = geometry.bounds.y + geometry.bounds.height + 16;
  return {
    markup: `<g data-element-id="${attribute(node.id)}"><g${rotation}>${assetMarkup}</g>${caption ? `<text x="${number(geometry.center.x)}" y="${number(captionY)}" text-anchor="middle" fill="#1e293b" stroke="none" font-size="12">${text(caption)}</text>` : ""}</g>`,
    bounds: rectBounds(geometry.bounds.x, geometry.bounds.y, geometry.bounds.width, geometry.bounds.height, 1),
    captionBounds: caption ? centeredTextBounds(caption, geometry.center.x, captionY) : undefined,
  };
}

function renderEdge(portPositions: ReadonlyMap<string, PositionedPort>, edge: PidEdge, edgeIndex: number, utilityCategories: readonly UtilityCategory[]) {
  const source = portPositions.get(edge.sourcePortId);
  const target = portPositions.get(edge.targetPortId);
  if (!source || !target) return null;
  const points = orthogonalPoints(source, edge.route, target);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${number(point.x)} ${number(point.y)}`).join(" ");
  const arrow = closedArrowPoints(points);
  const attrs = lineStyleAttributes(edge.lineStyle);
  const category = edge.utilityCategoryId
    ? utilityCategories.find(c => c.id === edge.utilityCategoryId)
    : undefined;
  const strokeColor = category?.color ?? attrs.stroke;
  const arrowMarkup = arrow.length === 3
    ? `<polygon id="pid-arrow-${edgeIndex}" data-arrow-for="${attribute(edge.id)}" points="${arrow.map((point) => `${number(point.x)},${number(point.y)}`).join(" ")}" fill="${strokeColor}" stroke="${strokeColor}" stroke-width="1" stroke-linejoin="round"/>`
    : "";
  const dashAttr = attrs.strokeDasharray ? ` stroke-dasharray="${attrs.strokeDasharray}"` : "";
  const label = [edge.tag, edge.label].filter(Boolean).join(" ");
  const midpoint = pathMidpoint(points);
  const labelY = midpoint.y - 5;
  return {
    markup: `<g data-element-id="${attribute(edge.id)}"><path d="${attribute(path)}" fill="none" stroke="${strokeColor}" stroke-width="${attrs.strokeWidth}"${dashAttr}/>${arrowMarkup}${label ? `<text x="${number(midpoint.x)}" y="${number(labelY)}" text-anchor="middle" fill="#334155" stroke="none" font-size="11">${text(label)}</text>` : ""}</g>`,
    bounds: unionBounds([pointsBounds(points, 1), pointsBounds(arrow, 1)]),
    labelBounds: label ? centeredTextBounds(label, midpoint.x, labelY, 11) : undefined,
  };
}

function renderGroup(group: PidGroup): string {
  return `<g data-element-id="${attribute(group.id)}"><rect x="${number(group.x)}" y="${number(group.y)}" width="${number(group.width)}" height="${number(group.height)}" rx="4" fill="none" stroke="#94a3b8" stroke-dasharray="8 5"/>${group.label ? `<text x="${number(group.x + 4)}" y="${number(group.y - 5)}" fill="#475569" stroke="none" font-size="12">${text(group.label)}</text>` : ""}</g>`;
}

function renderAnnotation(annotation: PidAnnotation): { markup: string; bounds: Bounds } {
  const centerX = annotation.x + annotation.width / 2;
  const centerY = annotation.y + annotation.height / 2;
  const rotation = normalizedRotation(annotation.rotation);
  const transform = rotation ? ` transform="rotate(${rotation} ${number(centerX)} ${number(centerY)})"` : "";
  const frame = annotation.kind === "text" ? "" : `<rect x="${number(annotation.x)}" y="${number(annotation.y)}" width="${number(annotation.width)}" height="${number(annotation.height)}" rx="4" fill="none" stroke="#94a3b8"/>`;
  const markup = `<g data-element-id="${attribute(annotation.id)}"${transform}>${frame}<text x="${number(annotation.x + 4)}" y="${number(annotation.y + 15)}" fill="#334155" stroke="none" font-size="12">${text(annotation.text)}</text></g>`;
  const frameBounds = rotatedRectAround(annotation.x, annotation.y, annotation.width, annotation.height, centerX, centerY, annotation.rotation, 1);
  const rawTextBounds = textBounds(annotation.text, annotation.x + 4, annotation.y + 15);
  const textWidth = rawTextBounds.maxX - rawTextBounds.minX;
  const textHeight = rawTextBounds.maxY - rawTextBounds.minY;
  const rotatedTextBounds = rotatedRectAround(rawTextBounds.minX, rawTextBounds.minY, textWidth, textHeight, centerX, centerY, annotation.rotation);
  return { markup, bounds: unionBounds([frameBounds, rotatedTextBounds]) };
}

function buildPortPositions(document: PidDocument): ReadonlyMap<string, PositionedPort> {
  const portsByNode = new Map<string, PidDocument["ports"][string][]>();
  for (const port of sortedValues(document.ports)) {
    const ports = portsByNode.get(port.nodeId);
    if (ports) ports.push(port); else portsByNode.set(port.nodeId, [port]);
  }
  const result = new Map<string, PositionedPort>();
  for (const node of sortedValues(document.nodes)) {
    const geometry = getPidNodeGeometry(node);
    const ports = portsByNode.get(node.id) ?? [];
    ports.forEach((port, index) => {
      const anchor = getPidPortAnchorGeometry(geometry, port, index, ports);
      result.set(port.id, { point: { x: geometry.bounds.x + anchor.x, y: geometry.bounds.y + anchor.y }, side: anchor.position });
    });
  }
  return result;
}

function orthogonalPoints(source: PositionedPort, route: readonly Point[], target: PositionedPort): Point[] {
  const points: Point[] = [{ ...source.point }];
  appendPoint(points, tangentPoint(source.point, source.side));
  for (const waypoint of route) appendOrthogonalPoint(points, waypoint);
  appendOrthogonalPoint(points, tangentPoint(target.point, target.side));
  appendPoint(points, target.point);
  return points;
}

function appendOrthogonalPoint(points: Point[], waypoint: Point): void {
  const previous = points.at(-1)!;
  if (previous.x !== waypoint.x && previous.y !== waypoint.y) appendPoint(points, { x: waypoint.x, y: previous.y });
  appendPoint(points, waypoint);
}

function tangentPoint(point: Point, side: PidFlowPosition): Point {
  if (side === "left") return { x: point.x - 24, y: point.y };
  if (side === "right") return { x: point.x + 24, y: point.y };
  if (side === "top") return { x: point.x, y: point.y - 24 };
  return { x: point.x, y: point.y + 24 };
}

function appendPoint(points: Point[], point: Point): void {
  const previous = points.at(-1);
  if (!previous || previous.x !== point.x || previous.y !== point.y) points.push({ ...point });
}

function pathMidpoint(points: readonly Point[]): Point {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.abs(points[index].x - points[index - 1].x) + Math.abs(points[index].y - points[index - 1].y);
  }
  const halfway = length / 2;
  let walked = 0;
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    const segmentLength = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
    if (walked + segmentLength >= halfway) {
      const ratio = segmentLength ? (halfway - walked) / segmentLength : 0;
      return { x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio };
    }
    walked += segmentLength;
  }
  return points[0] ?? { x: 0, y: 0 };
}

function closedArrowPoints(points: readonly Point[]): Point[] {
  if (points.length < 2) return [];
  const tip = points[points.length - 1];
  const previous = points[points.length - 2];
  const dx = tip.x - previous.x;
  const dy = tip.y - previous.y;
  const length = Math.hypot(dx, dy);
  if (!length) return [];
  const unitX = dx / length;
  const unitY = dy / length;
  const baseX = tip.x - unitX * 8;
  const baseY = tip.y - unitY * 8;
  const perpendicularX = -unitY * 4;
  const perpendicularY = unitX * 4;
  return [
    { ...tip },
    { x: baseX + perpendicularX, y: baseY + perpendicularY },
    { x: baseX - perpendicularX, y: baseY - perpendicularY },
  ];
}

function verifyAssets(assets: PidSvgAssets): void {
  for (const asset of assets.values()) if (!isSanitizedPidSvgAsset(asset)) throw new Error("O ativo SVG não foi sanitizado pelo catálogo confiável.");
}

function unionBounds(bounds: readonly Bounds[]): Bounds {
  if (!bounds.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return bounds.reduce((result, item) => ({
    minX: Math.min(result.minX, item.minX), minY: Math.min(result.minY, item.minY),
    maxX: Math.max(result.maxX, item.maxX), maxY: Math.max(result.maxY, item.maxY),
  }));
}

function rectBounds(x: number, y: number, width: number, height: number, stroke = 0): Bounds {
  return { minX: x - stroke, minY: y - stroke, maxX: x + width + stroke, maxY: y + height + stroke };
}

function rotatedRectAround(x: number, y: number, width: number, height: number, centerX: number, centerY: number, rotation: number, stroke = 0): Bounds {
  const normalized = normalizedRotation(rotation);
  const corners = [
    { x: x - stroke, y: y - stroke },
    { x: x + width + stroke, y: y - stroke },
    { x: x + width + stroke, y: y + height + stroke },
    { x: x - stroke, y: y + height + stroke },
  ].map((point) => rotatePoint(point, centerX, centerY, normalized));
  return pointsBounds(corners, 0);
}

function rotatePoint(point: Point, centerX: number, centerY: number, rotation: 0 | 90 | 180 | 270): Point {
  const x = point.x - centerX; const y = point.y - centerY;
  if (rotation === 90) return { x: centerX - y, y: centerY + x };
  if (rotation === 180) return { x: centerX - x, y: centerY - y };
  if (rotation === 270) return { x: centerX + y, y: centerY - x };
  return { ...point };
}

function pointsBounds(points: readonly Point[], stroke: number): Bounds {
  if (!points.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return {
    minX: minX - stroke,
    minY: minY - stroke,
    maxX: maxX + stroke,
    maxY: maxY + stroke,
  };
}

function textBounds(value: string, x: number, baselineY: number, size = 12): Bounds {
  return rectBounds(x - 1, baselineY - size - 1, deterministicTextWidth(value, size) + 2, size + 5);
}

function centeredTextBounds(value: string, centerX: number, baselineY: number, size = 12): Bounds {
  const width = deterministicTextWidth(value, size);
  return rectBounds(centerX - width / 2 - 1, baselineY - size - 1, width + 2, size + 5);
}

function deterministicTextWidth(value: string, size: number): number {
  let glyphCount = 0;
  for (let index = 0; index < value.length; index += 1) {
    glyphCount += 1;
    const first = value.charCodeAt(index);
    const second = value.charCodeAt(index + 1);
    if (first >= 0xd800 && first <= 0xdbff && second >= 0xdc00 && second <= 0xdfff) index += 1;
  }
  return Math.max(1, glyphCount * size);
}

function normalizedRotation(rotation: number): 0 | 90 | 180 | 270 {
  const normalized = ((rotation % 360) + 360) % 360;
  return normalized === 90 || normalized === 180 || normalized === 270 ? normalized : 0;
}

function sortedValues<T extends { id: string }>(record: Record<string, T>): T[] {
  return Object.values(record).sort((left, right) => compare(left.id, right.id));
}

function text(value: string): string { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function attribute(value: string): string { return text(value).replace(/"/g, "&quot;").replace(/'/g, "&apos;"); }
function number(value: number): string { const result = Object.is(value, -0) ? 0 : Math.round(value * 1_000_000) / 1_000_000; return String(result); }
function compare(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }
