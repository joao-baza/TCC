import {
  getPidPortAnchorGeometry,
  type PidNodeGeometry,
  type PidPortAnchorGeometry,
  type PidRect,
} from "../domain/geometry";
import type { PidPort } from "../domain/model";

export const PID_PORT_TARGET_SIZE = 44;
export const PID_PORT_TARGET_GAP = 4;
export const PID_PORT_MARKER_SIZE = 8;

export interface PidCanvasInteractionGeometry {
  readonly bounds: PidRect;
  readonly canonicalRect: PidRect;
}

export interface PidPortHitTargetGeometry extends PidPortAnchorGeometry {
  readonly targetSize: number;
  readonly targetRect: PidRect;
  readonly exactAnchor: boolean;
}

/**
 * Canvas interaction bounds share the canonical center but may expand so
 * every perimeter target has both same-side and corner clearance.
 */
export function getPidCanvasInteractionGeometry(
  canonical: PidNodeGeometry,
  ports: readonly PidPort[],
  targetSize = PID_PORT_TARGET_SIZE,
  gap = PID_PORT_TARGET_GAP,
): PidCanvasInteractionGeometry {
  const anchors = ports.map((port, index) => getPidPortAnchorGeometry(canonical, port, index, ports));
  const counts = new Map<PidPortAnchorGeometry["position"], number>();
  for (const anchor of anchors) counts.set(anchor.position, (counts.get(anchor.position) ?? 0) + 1);
  const left = counts.get("left") ?? 0;
  const right = counts.get("right") ?? 0;
  const top = counts.get("top") ?? 0;
  const bottom = counts.get("bottom") ?? 0;
  const opposingWidth = left > 0 && right > 0 ? targetSize + gap : 0;
  const opposingHeight = top > 0 && bottom > 0 ? targetSize + gap : 0;
  const width = Math.max(
    canonical.bounds.width,
    requiredPerimeterLength(top, targetSize, gap),
    requiredPerimeterLength(bottom, targetSize, gap),
    opposingWidth,
  );
  const height = Math.max(
    canonical.bounds.height,
    requiredPerimeterLength(left, targetSize, gap),
    requiredPerimeterLength(right, targetSize, gap),
    opposingHeight,
  );
  const bounds = {
    x: canonical.center.x - width / 2,
    y: canonical.center.y - height / 2,
    width,
    height,
  };
  return {
    bounds,
    canonicalRect: {
      x: canonical.bounds.x - bounds.x,
      y: canonical.bounds.y - bounds.y,
      width: canonical.bounds.width,
      height: canonical.bounds.height,
    },
  };
}

export function getPidPortHitTargetGeometry(
  interaction: PidCanvasInteractionGeometry,
  canonical: PidNodeGeometry,
  anchor: PidPortAnchorGeometry,
  port: PidPort,
  index: number,
  ports: readonly PidPort[],
  targetSize = PID_PORT_TARGET_SIZE,
  gap = PID_PORT_TARGET_GAP,
): PidPortHitTargetGeometry {
  const point = {
    x: canonical.bounds.x - interaction.bounds.x + anchor.x,
    y: canonical.bounds.y - interaction.bounds.y + anchor.y,
  };
  const effectiveTargetSize = adjacentTargetSize(canonical, anchor, port, index, ports, targetSize, gap);
  return {
    position: anchor.position,
    ...point,
    targetSize: effectiveTargetSize,
    exactAnchor: true,
    targetRect: {
      x: point.x - effectiveTargetSize / 2,
      y: point.y - effectiveTargetSize / 2,
      width: effectiveTargetSize,
      height: effectiveTargetSize,
    },
  };
}

function adjacentTargetSize(
  canonical: PidNodeGeometry,
  anchor: PidPortAnchorGeometry,
  port: PidPort,
  index: number,
  ports: readonly PidPort[],
  targetSize: number,
  gap: number,
): number {
  const actualIndex = ports[index]?.id === port.id ? index : ports.findIndex(({ id }) => id === port.id);
  const axis = anchor.position === "left" || anchor.position === "right" ? "y" : "x";
  const nearest = ports.reduce((distance, candidate, candidateIndex) => {
    if (candidateIndex === actualIndex) return distance;
    const candidateAnchor = getPidPortAnchorGeometry(canonical, candidate, candidateIndex, ports);
    if (candidateAnchor.position !== anchor.position) return distance;
    return Math.min(distance, Math.abs(candidateAnchor[axis] - anchor[axis]));
  }, Number.POSITIVE_INFINITY);
  if (!Number.isFinite(nearest)) return targetSize;
  return Math.min(targetSize, Math.max(PID_PORT_MARKER_SIZE, nearest - gap));
}

function requiredPerimeterLength(count: number, targetSize: number, gap: number): number {
  return count === 0 ? 0 : (count + 1) * (targetSize + gap);
}
