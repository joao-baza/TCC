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
  readonly rotation: 0 | 90 | 180 | 270;
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
  const bounds = rotation === 90 || rotation === 270
    ? {
        x: center.x - node.height / 2,
        y: center.y - node.width / 2,
        width: node.height,
        height: node.width,
      }
    : { ...unrotatedBounds };
  return { bounds, unrotatedBounds, center, rotation };
}

/** Canonical anchors are fractions of modeled side lengths; DOM target size never participates. */
export function getCanonicalPortAnchorLayout(
  size: Readonly<{ width: number; height: number }>,
  ports: readonly Pick<PidPort, "direction">[],
): readonly PidPortAnchorGeometry[] {
  return ports.map((port, index) => {
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

function rotateSide(side: PidFlowPosition, rotation: 0 | 90 | 180 | 270): PidFlowPosition {
  const sides: readonly PidFlowPosition[] = ["top", "right", "bottom", "left"];
  const index = sides.indexOf(side);
  return sides[(index + rotation / 90) % sides.length];
}

function rotatePoint(
  point: Readonly<{ x: number; y: number }>,
  center: Readonly<{ x: number; y: number }>,
  rotation: 0 | 90 | 180 | 270,
): { x: number; y: number } {
  const x = point.x - center.x;
  const y = point.y - center.y;
  if (rotation === 90) return { x: center.x - y, y: center.y + x };
  if (rotation === 180) return { x: center.x - x, y: center.y - y };
  if (rotation === 270) return { x: center.x + y, y: center.y - x };
  return { ...point };
}

function normalizeRotation(rotation: number): 0 | 90 | 180 | 270 {
  const normalized = ((rotation % 360) + 360) % 360;
  if (normalized === 90 || normalized === 180 || normalized === 270) return normalized;
  return 0;
}
