import type { ChartModel, MarkerModel, SeriesModel } from "@/types/chart-model";

const fallbackPalette = [
  "#16a34a",
  "#0891b2",
  "#db2777",
  "#f97316",
  "#7c3aed",
  "#0ea5e9",
  "#84cc16",
  "#e11d48",
  "#14b8a6",
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#9333ea",
  "#06b6d4",
  "#d946ef",
  "#64748b",
];

function normalizeColorKey(color: string) {
  return color.trim().toLowerCase();
}

function buildFallbackColor(index: number) {
  if (index < fallbackPalette.length) {
    return fallbackPalette[index];
  }

  const hue = Math.round(((index - fallbackPalette.length) * 137.508) % 360);
  return `hsl(${hue} 65% 45%)`;
}

function resolveDistinctColor(color: string | null | undefined, usedColors: Set<string>, cursor: number) {
  const trimmed = color?.trim();
  const normalized = trimmed ? normalizeColorKey(trimmed) : null;

  if (trimmed && normalized && !usedColors.has(normalized)) {
    usedColors.add(normalized);
    return { color: trimmed, cursor };
  }

  let nextCursor = cursor;
  let fallbackColor = buildFallbackColor(nextCursor);
  while (usedColors.has(normalizeColorKey(fallbackColor))) {
    nextCursor += 1;
    fallbackColor = buildFallbackColor(nextCursor);
  }

  usedColors.add(normalizeColorKey(fallbackColor));
  return { color: fallbackColor, cursor: nextCursor + 1 };
}

export function normalizeChartColors(
  model: ChartModel,
): Omit<ChartModel, "series" | "markers"> & { series: SeriesModel[]; markers: MarkerModel[] } {
  const usedColors = new Set<string>();
  let cursor = 0;

  const series = model.series.map((series) => {
    const resolved = resolveDistinctColor(series.color, usedColors, cursor);
    cursor = resolved.cursor;

    return {
      ...series,
      color: resolved.color,
    };
  });

  const markers = (model.markers ?? []).map((marker) => {
    const resolved = resolveDistinctColor(marker.color, usedColors, cursor);
    cursor = resolved.cursor;

    return {
      ...marker,
      color: resolved.color,
    };
  });

  return {
    ...model,
    series,
    markers,
  };
}
