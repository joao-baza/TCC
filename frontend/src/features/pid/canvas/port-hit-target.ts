import {
  getPidPortAnchorGeometry,
  type PidNodeGeometry,
  type PidPortAnchorGeometry,
  type PidRect,
} from "../domain/geometry";
import type { PidPort } from "../domain/model";

export const PID_PORT_TARGET_SIZE = 44;
export const PID_PORT_TARGET_GAP = 4;

export interface PidPortHitTargetGeometry extends PidPortAnchorGeometry {
  readonly targetSize: number;
  readonly targetRect: PidRect;
}

/** Canvas-only target layout. Targets may extend beyond a small canonical node. */
export function getPidPortHitTargetGeometry(
  geometry: PidNodeGeometry,
  anchor: PidPortAnchorGeometry,
  port: PidPort,
  index: number,
  ports: readonly PidPort[],
  targetSize = PID_PORT_TARGET_SIZE,
  gap = PID_PORT_TARGET_GAP,
): PidPortHitTargetGeometry {
  const anchors = ports.map((candidate, candidateIndex) => getPidPortAnchorGeometry(
    geometry,
    candidate,
    candidateIndex,
    ports,
  ));
  const sideAxis = anchor.position === "left" || anchor.position === "right" ? "y" : "x";
  const sameSideIndexes = anchors
    .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
    .filter(({ candidate }) => candidate.position === anchor.position)
    .sort((left, right) => left.candidate[sideAxis] - right.candidate[sideAxis])
    .map(({ candidateIndex }) => candidateIndex);
  const actualIndex = ports[index]?.id === port.id ? index : ports.findIndex(({ id }) => id === port.id);
  const sideIndex = Math.max(0, sameSideIndexes.indexOf(actualIndex));
  const occupied = sameSideIndexes.length * targetSize + Math.max(0, sameSideIndexes.length - 1) * gap;
  const sideLength = anchor.position === "left" || anchor.position === "right"
    ? geometry.bounds.height
    : geometry.bounds.width;
  const offset = (sideLength - occupied) / 2 + targetSize / 2 + sideIndex * (targetSize + gap);
  const point = anchor.position === "left"
    ? { x: 0, y: offset }
    : anchor.position === "right"
      ? { x: geometry.bounds.width, y: offset }
      : anchor.position === "top"
        ? { x: offset, y: 0 }
        : { x: offset, y: geometry.bounds.height };
  return {
    position: anchor.position,
    ...point,
    targetSize,
    targetRect: {
      x: point.x - targetSize / 2,
      y: point.y - targetSize / 2,
      width: targetSize,
      height: targetSize,
    },
  };
}
