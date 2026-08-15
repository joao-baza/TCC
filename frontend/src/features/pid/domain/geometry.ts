import type { PidNode, PidPort, PortDirection } from "./model";

export type PidFlowPosition = "left" | "right" | "top" | "bottom";

export interface PidRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PidNodeGeometry {
  readonly bounds: PidRect;
  readonly unrotatedBounds: PidRect;
  readonly center: Readonly<{ x: number; y: number }>;
  readonly rotation: number;
}

export interface PidPortAnchorGeometry {
  readonly position: PidFlowPosition;
  readonly x: number;
  readonly y: number;
}

/** Canonical equipment geometry: modeled dimensions only, independent of UI hit targets. */
export function getPidNodeGeometry(node: PidNode): PidNodeGeometry {
  const center = { x: node.x + node.width / 2, y: node.y + node.height / 2 };
  const unrotatedBounds = { x: node.x, y: node.y, width: node.width, height: node.height };
  const rotation = normalizeRotation(node.rotation);
  const bounds = rotatedRectBounds(unrotatedBounds, center, rotation);
  return { bounds, unrotatedBounds, center, rotation };
}

/** Canonical anchors are fractions of modeled side lengths; DOM target size never participates. */
export function getCanonicalPortAnchorLayout(
  size: Readonly<{ width: number; height: number }>,
  ports: readonly Pick<PidPort, "direction" | "anchor">[],
): readonly PidPortAnchorGeometry[] {
  return ports.map((port, index) => {
    if (port.anchor !== undefined) {
      return {
        position: sideForAnchor(port.anchor, port.direction),
        x: port.anchor.x * size.width,
        y: port.anchor.y * size.height,
      };
    }
    const side = sideForDirection(port.direction);
    const sameSideIndexes = ports
      .map((candidate, candidateIndex) => sideForDirection(candidate.direction) === side ? candidateIndex : -1)
      .filter((candidateIndex) => candidateIndex >= 0);
    const sideIndex = sameSideIndexes.indexOf(index);
    const offset = (sideIndex + 1) / (sameSideIndexes.length + 1);
    if (side === "left") return { position: side, x: 0, y: offset * size.height };
    if (side === "right") return { position: side, x: size.width, y: offset * size.height };
    return { position: side, x: offset * size.width, y: size.height };
  });
}

function sideForAnchor(anchor: Readonly<{ x: number; y: number }>, direction: PortDirection): PidFlowPosition {
  const distances: readonly [PidFlowPosition, number][] = [
    ["left", anchor.x],
    ["right", 1 - anchor.x],
    ["top", anchor.y],
    ["bottom", 1 - anchor.y],
  ];
  const minimum = Math.min(...distances.map(([, distance]) => distance));
  const closest = distances.filter(([, distance]) => Math.abs(distance - minimum) < Number.EPSILON);
  const directional = sideForDirection(direction);
  return closest.some(([side]) => side === directional) ? directional : closest[0][0];
}

export function getPidPortAnchorGeometry(
  geometry: PidNodeGeometry,
  port: PidPort,
  index: number,
  ports: readonly PidPort[],
): PidPortAnchorGeometry {
  const layout = getCanonicalPortAnchorLayout(geometry.unrotatedBounds, ports);
  const actualIndex = ports[index]?.id === port.id ? index : ports.findIndex(({ id }) => id === port.id);
  const anchor = layout[Math.max(0, actualIndex)];
  const absolute = {
    x: geometry.unrotatedBounds.x + anchor.x,
    y: geometry.unrotatedBounds.y + anchor.y,
  };
  const rotated = rotatePoint(absolute, geometry.center, geometry.rotation);
  return {
    position: rotateSide(anchor.position, geometry.rotation),
    x: rotated.x - geometry.bounds.x,
    y: rotated.y - geometry.bounds.y,
  };
}

export function canonicalPositionFromFlow(
  node: PidNode,
  geometry: PidNodeGeometry,
  flowPosition: Readonly<{ x: number; y: number }>,
): { x: number; y: number } {
  return {
    x: flowPosition.x - (geometry.bounds.x - node.x),
    y: flowPosition.y - (geometry.bounds.y - node.y),
  };
}

function sideForDirection(direction: PortDirection): PidFlowPosition {
  if (direction === "input") return "left";
  if (direction === "output") return "right";
  return "bottom";
}

function rotateSide(side: PidFlowPosition, rotation: number): PidFlowPosition {
  const vectors: Record<PidFlowPosition, { x: number; y: number }> = {
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    top: { x: 0, y: -1 },
    bottom: { x: 0, y: 1 },
  };
  const rotated = rotateVector(vectors[side], rotation);
  if (Math.abs(rotated.x) > Math.abs(rotated.y)) return rotated.x < 0 ? "left" : "right";
  return rotated.y < 0 ? "top" : "bottom";
}

function rotatePoint(
  point: Readonly<{ x: number; y: number }>,
  center: Readonly<{ x: number; y: number }>,
  rotation: number,
): { x: number; y: number } {
  const x = point.x - center.x;
  const y = point.y - center.y;
  const rotated = rotateVector({ x, y }, rotation);
  return { x: center.x + rotated.x, y: center.y + rotated.y };
}

function rotatedRectBounds(rect: PidRect, center: Readonly<{ x: number; y: number }>, rotation: number): PidRect {
  if (rotation === 0) return { ...rect };
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ].map((point) => rotatePoint(point, center, rotation));
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function rotateVector(vector: Readonly<{ x: number; y: number }>, rotation: number): { x: number; y: number } {
  const normalized = normalizeRotation(rotation);
  if (normalized === 0) return { ...vector };
  if (normalized === 90) return { x: -vector.y, y: vector.x };
  if (normalized === 180) return { x: -vector.x, y: -vector.y };
  if (normalized === 270) return { x: vector.y, y: -vector.x };
  const radians = normalized * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos,
  };
}

function normalizeRotation(rotation: number): number {
  return ((rotation % 360) + 360) % 360;
}
