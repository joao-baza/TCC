import type { PidNode, PidPort, PortDirection } from "./model";

export const PID_PORT_TARGET_SIZE = 44;
export const PID_PORT_TARGET_GAP = 4;

export type PidFlowPosition = "left" | "right" | "top" | "bottom";

export interface PidRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PidNodeFlowGeometry {
  readonly bounds: PidRect;
  readonly unrotatedBounds: PidRect;
  readonly center: Readonly<{ x: number; y: number }>;
  readonly rotation: 0 | 90 | 180 | 270;
}

export interface PidPortFlowGeometry {
  readonly position: PidFlowPosition;
  readonly x: number;
  readonly y: number;
  readonly targetSize: number;
  readonly targetRect: PidRect;
}

export function minimumNodeSizeForPorts(ports: readonly Pick<PidPort, "direction">[]): {
  width: number;
  height: number;
} {
  const left = ports.filter(({ direction }) => sideForDirection(direction) === "left").length;
  const right = ports.filter(({ direction }) => sideForDirection(direction) === "right").length;
  const bottom = ports.filter(({ direction }) => sideForDirection(direction) === "bottom").length;
  return {
    width: requiredSideLength(bottom),
    height: Math.max(requiredSideLength(left), requiredSideLength(right)),
  };
}

export function getPidNodeFlowGeometry(node: PidNode, ports: readonly PidPort[]): PidNodeFlowGeometry {
  const minimum = minimumNodeSizeForPorts(ports);
  const width = Math.max(node.width, minimum.width);
  const height = Math.max(node.height, minimum.height);
  const center = { x: node.x + node.width / 2, y: node.y + node.height / 2 };
  const unrotatedBounds = {
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
  };
  const rotation = normalizeRotation(node.rotation);
  const bounds = rotation === 90 || rotation === 270
    ? { x: center.x - height / 2, y: center.y - width / 2, width: height, height: width }
    : { ...unrotatedBounds };
  return { bounds, unrotatedBounds, center, rotation };
}

export function getPidPortFlowGeometry(
  geometry: PidNodeFlowGeometry,
  port: PidPort,
  index: number,
  ports: readonly PidPort[],
): PidPortFlowGeometry {
  const side = sideForDirection(port.direction);
  const sameSide = ports.filter((candidate) => sideForDirection(candidate.direction) === side);
  const actualPort = ports[index];
  const sideIndex = Math.max(0, sameSide.findIndex((candidate) => candidate.id === actualPort?.id));
  const base = pointForSide(geometry.unrotatedBounds, side, sideIndex, sameSide.length);
  const rotated = rotatePoint(base, geometry.center, geometry.rotation);
  const local = { x: rotated.x - geometry.bounds.x, y: rotated.y - geometry.bounds.y };
  const position = rotateSide(side, geometry.rotation);
  return {
    position,
    x: local.x,
    y: local.y,
    targetSize: PID_PORT_TARGET_SIZE,
    targetRect: {
      x: local.x - PID_PORT_TARGET_SIZE / 2,
      y: local.y - PID_PORT_TARGET_SIZE / 2,
      width: PID_PORT_TARGET_SIZE,
      height: PID_PORT_TARGET_SIZE,
    },
  };
}

export function canonicalPositionFromFlow(
  node: PidNode,
  geometry: PidNodeFlowGeometry,
  flowPosition: Readonly<{ x: number; y: number }>,
): { x: number; y: number } {
  return {
    x: flowPosition.x - (geometry.bounds.x - node.x),
    y: flowPosition.y - (geometry.bounds.y - node.y),
  };
}

function requiredSideLength(count: number): number {
  if (count === 0) return PID_PORT_TARGET_SIZE;
  return count * PID_PORT_TARGET_SIZE + (count - 1) * PID_PORT_TARGET_GAP;
}

function pointForSide(
  bounds: PidRect,
  side: PidFlowPosition,
  index: number,
  count: number,
): { x: number; y: number } {
  const length = side === "left" || side === "right" ? bounds.height : bounds.width;
  const occupied = requiredSideLength(count);
  const offset = (length - occupied) / 2 + PID_PORT_TARGET_SIZE / 2
    + index * (PID_PORT_TARGET_SIZE + PID_PORT_TARGET_GAP);
  if (side === "left") return { x: bounds.x, y: bounds.y + offset };
  if (side === "right") return { x: bounds.x + bounds.width, y: bounds.y + offset };
  if (side === "top") return { x: bounds.x + offset, y: bounds.y };
  return { x: bounds.x + offset, y: bounds.y + bounds.height };
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
