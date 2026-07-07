export type NumericDomain = {
  min: number;
  max: number;
};

export type NumericBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SafeLabelAnchor = {
  x: number;
  y: number;
};

export type SafeLabelPlacement = {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
};

const EPSILON = 1e-9;
const LABEL_GAP = 10;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeNumber(value: number) {
  const rounded = Number(value.toFixed(12));
  return Object.is(rounded, -0) ? 0 : rounded;
}

function isClose(left: number, right: number) {
  return Math.abs(left - right) <= EPSILON;
}

function boxesOverlap(left: NumericBox, right: NumericBox) {
  return !(
    left.x + left.width <= right.x ||
    right.x + right.width <= left.x ||
    left.y + left.height <= right.y ||
    right.y + right.height <= left.y
  );
}

function intersectionArea(left: NumericBox, right: NumericBox) {
  const width = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x));
  const height = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y));
  return width * height;
}

function dedupeTicks(values: number[]) {
  return values.reduce<number[]>((ticks, value) => {
    if (!ticks.some((tick) => isClose(tick, value))) {
      ticks.push(normalizeNumber(value));
    }

    return ticks;
  }, []);
}

function buildPlacementBox(x: number, y: number, width: number, height: number): NumericBox {
  return { x, y, width, height };
}

function placeCandidate(
  x: number,
  y: number,
  anchor: "start" | "middle" | "end",
  size: { width: number; height: number },
  plot: { left: number; top: number; right: number; bottom: number },
) {
  const maxY = Math.max(plot.top, plot.bottom - size.height);

  return {
    x,
    y: clamp(y, plot.top, maxY),
    anchor,
  } satisfies SafeLabelPlacement;
}

export function expandNumericDomain(values: number[], paddingRatio = 0.08): NumericDomain {
  const finiteValues = values.filter((value) => Number.isFinite(value));

  if (finiteValues.length === 0) {
    return { min: 0, max: 1 };
  }

  const min = Math.min(...finiteValues);
  const max = Math.max(...finiteValues);

  if (min === max) {
    const cushion = Math.max(Math.abs(min) * paddingRatio, 1);
    return {
      min: normalizeNumber(min - cushion),
      max: normalizeNumber(max + cushion),
    };
  }

  const span = max - min;
  const cushion = span * paddingRatio;

  return {
    min: normalizeNumber(min - cushion),
    max: normalizeNumber(max + cushion),
  };
}

export function buildAxisTicks(min: number, max: number, targetCount = 5) {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);

  if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
    return [];
  }

  if (isClose(lower, upper)) {
    return [normalizeNumber(lower)];
  }

  const count = Math.max(2, Math.round(targetCount));
  const step = (upper - lower) / (count - 1);

  return Array.from({ length: count }, (_, index) =>
    normalizeNumber(index === count - 1 ? upper : lower + step * index),
  );
}

export function formatAxisTick(value: number) {
  const formatted = Number(value).toFixed(6).replace(/\.?0+$/, "");
  return formatted === "-0" ? "0" : formatted;
}

export function placeSafeLabel({
  anchor,
  size,
  plot,
  avoid,
}: {
  anchor: SafeLabelAnchor;
  size: { width: number; height: number };
  plot: { left: number; top: number; right: number; bottom: number };
  avoid: NumericBox[];
}) {
  const midpoint = (plot.left + plot.right) / 2;
  const preferredCandidate =
    anchor.x >= midpoint
      ? placeCandidate(plot.right + LABEL_GAP, anchor.y - size.height / 2, "start", size, plot)
      : placeCandidate(plot.left - LABEL_GAP, anchor.y - size.height / 2, "end", size, plot);
  const fallbackCandidate =
    anchor.x >= midpoint
      ? placeCandidate(plot.left - LABEL_GAP, anchor.y - size.height / 2, "end", size, plot)
      : placeCandidate(plot.right + LABEL_GAP, anchor.y - size.height / 2, "start", size, plot);
  const verticalCandidates = [
    {
      x: clamp(anchor.x - size.width / 2, plot.left, Math.max(plot.left, plot.right - size.width)),
      y: plot.top - size.height - LABEL_GAP,
      anchor: "middle" as const,
    },
    {
      x: clamp(anchor.x - size.width / 2, plot.left, Math.max(plot.left, plot.right - size.width)),
      y: plot.bottom + LABEL_GAP,
      anchor: "middle" as const,
    },
  ];

  const preferredBox = buildPlacementBox(preferredCandidate.x, preferredCandidate.y, size.width, size.height);
  if (avoid.every((occupied) => !boxesOverlap(preferredBox, occupied))) {
    return preferredCandidate;
  }

  const fallbackBox = buildPlacementBox(fallbackCandidate.x, fallbackCandidate.y, size.width, size.height);
  if (avoid.every((occupied) => !boxesOverlap(fallbackBox, occupied))) {
    return fallbackCandidate;
  }

  for (const candidate of verticalCandidates) {
    const candidateBox = buildPlacementBox(candidate.x, candidate.y, size.width, size.height);
    if (avoid.every((occupied) => !boxesOverlap(candidateBox, occupied))) {
      return candidate;
    }
  }

  return preferredCandidate;
}
