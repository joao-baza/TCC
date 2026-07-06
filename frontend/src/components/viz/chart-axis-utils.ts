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
  anchor?: "start" | "middle" | "end";
};

export type SafeLabelPlacement = {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
};

const EPSILON = 1e-9;
const LABEL_GAP = 8;

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

function niceStep(step: number) {
  if (!(step > 0) || !Number.isFinite(step)) {
    return 1;
  }

  const power = 10 ** Math.floor(Math.log10(step));
  const error = step / power;
  const candidates = [1, 2, 2.5, 5, 10];

  let best = candidates[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const distance = Math.abs(candidate - error);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return best * power;
}

function buildPlacementBox(x: number, y: number, width: number, height: number): NumericBox {
  return { x, y, width, height };
}

function overlapScore(candidate: NumericBox, avoid: NumericBox[]) {
  return avoid.reduce((score, box) => score + intersectionArea(candidate, box), 0);
}

function placeCandidate(
  x: number,
  y: number,
  anchor: "start" | "middle" | "end",
  size: { width: number; height: number },
  plot: NumericBox,
) {
  const maxX = plot.x + plot.width - size.width;
  const maxY = plot.y + plot.height - size.height;

  return {
    x: clamp(x, plot.x, maxX),
    y: clamp(y, plot.y, maxY),
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

  const desiredIntervals = Math.max(1, Math.round(targetCount) - 1);
  const step = niceStep((upper - lower) / desiredIntervals);
  const ticks = [normalizeNumber(lower)];

  for (let value = Math.ceil((lower + EPSILON) / step) * step; value < upper - EPSILON; value += step) {
    ticks.push(normalizeNumber(value));
  }

  ticks.push(normalizeNumber(upper));

  return dedupeTicks(ticks).sort((left, right) => left - right);
}

export function formatAxisTick(value: number) {
  const formatted = Number(value).toFixed(6).replace(/\.?0+$/, "");
  return formatted === "-0" ? "0" : formatted;
}

export function placeSafeLabel({
  anchor,
  size,
  plot,
  avoid = [],
}: {
  anchor: SafeLabelAnchor;
  size: { width: number; height: number };
  plot: NumericBox;
  avoid?: NumericBox[];
}) {
  const candidates = [
    placeCandidate(anchor.x + LABEL_GAP, anchor.y - size.height / 2, "start", size, plot),
    placeCandidate(anchor.x - size.width - LABEL_GAP, anchor.y - size.height / 2, "end", size, plot),
    placeCandidate(anchor.x - size.width / 2, anchor.y - size.height - LABEL_GAP, "middle", size, plot),
    placeCandidate(anchor.x - size.width / 2, anchor.y + LABEL_GAP, "middle", size, plot),
    placeCandidate(anchor.x + LABEL_GAP, anchor.y - size.height - LABEL_GAP, "start", size, plot),
    placeCandidate(anchor.x - size.width - LABEL_GAP, anchor.y - size.height - LABEL_GAP, "end", size, plot),
    placeCandidate(anchor.x + LABEL_GAP, anchor.y + LABEL_GAP, "start", size, plot),
    placeCandidate(anchor.x - size.width - LABEL_GAP, anchor.y + LABEL_GAP, "end", size, plot),
  ];

  const scoredCandidates = candidates.map((candidate) => ({
    candidate,
    box: buildPlacementBox(candidate.x, candidate.y, size.width, size.height),
    score: overlapScore(buildPlacementBox(candidate.x, candidate.y, size.width, size.height), avoid),
  }));

  const preferredAnchor = anchor.anchor ?? "start";
  const preferredCandidates = scoredCandidates.filter(({ candidate }) => candidate.anchor === preferredAnchor);
  const orderedCandidates = [...preferredCandidates, ...scoredCandidates.filter(({ candidate }) => candidate.anchor !== preferredAnchor)];

  const freeCandidate = orderedCandidates.find(({ box }) => avoid.every((occupied) => !boxesOverlap(box, occupied)));

  if (freeCandidate) {
    return freeCandidate.candidate;
  }

  return orderedCandidates
    .slice()
    .sort((left, right) => left.score - right.score)[0].candidate;
}
