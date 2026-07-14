import { ChartPanel } from "@/components/chart-panel";
import { normalizeChartColors } from "@/components/viz/chart-color-utils";
import { NumericChartGrid } from "@/components/viz/chart-grid";
import {
  formatAxisLabel,
  scaleRenderableAxisValue,
} from "@/components/viz/chart-axis-utils";
import type { ReactNode } from "react";
import type { ChartModel, MarkerModel, SeriesModel } from "@/types/chart-model";

type ChartPadding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type ChartModelRendererProps = {
  model: ChartModel;
  xAxisKey?: string;
  yAxisKey?: string;
  seriesIds?: string[];
  markerIds?: string[];
  annotationIds?: string[];
  hiddenMarkerLabelIds?: string[];
  footer?: ReactNode;
  panelClassName?: string;
  width?: number;
  height?: number;
  padding?: ChartPadding;
  withPanel?: boolean;
};

const defaultWidth = 760;
const defaultHeight = 360;
const defaultPadding = { top: 28, right: 28, bottom: 44, left: 88 };
const defaultStroke = "#2563eb";
const dashedThinSeriesIds = new Set(["q-line", "rectifying-line", "stripping-line"]);
const guidedMarkerIds = new Set(["operating-point", "triple-point", "critical-point"]);
const mccabeGuideMarkerIds = new Set(["xD", "xB"]);
const levenspielOperationalMarkerIds = new Set(["cstr-operating-point", "pfr-operating-point"]);
const levenspielChartId = "reactor-levenspiel-chart";
const operationalVolumeGuideLabel = "volume operacional calculado";

function projectPoint(
  point: { x: number; y: number },
  model: ChartModel,
  xAxisKey: string,
  yAxisKey: string,
  width: number,
  height: number,
  padding: ChartPadding,
) {
  const x = scaleRenderableAxisValue(
    point.x,
    model.axes[xAxisKey],
    padding.left,
    width - padding.right,
  );
  const y = scaleRenderableAxisValue(
    point.y,
    model.axes[yAxisKey],
    height - padding.bottom,
    padding.top,
  );

  if (x == null || y == null) {
    return null;
  }

  return { x, y };
}

function projectMarker(
  marker: Pick<MarkerModel, "x" | "y">,
  model: ChartModel,
  xAxisKey: string,
  yAxisKey: string,
  width: number,
  height: number,
  padding: ChartPadding,
) {
  const x = scaleRenderableAxisValue(
    marker.x,
    model.axes[xAxisKey],
    padding.left,
    width - padding.right,
  );
  const y = scaleRenderableAxisValue(
    marker.y,
    model.axes[yAxisKey],
    height - padding.bottom,
    padding.top,
  );

  if (x == null || y == null) {
    return null;
  }

  return { x, y };
}

function buildLinePath(
  series: SeriesModel,
  model: ChartModel,
  xAxisKey: string,
  yAxisKey: string,
  width: number,
  height: number,
  padding: ChartPadding,
  endPoint?: { x: number; y: number },
) {
  if (series.points.length === 0) {
    return "";
  }

  const projectedPoints = series.points
    .map((point) => projectPoint(point, model, xAxisKey, yAxisKey, width, height, padding))
    .filter((point): point is { x: number; y: number } => point != null);

  if (projectedPoints.length === 0) {
    return "";
  }

  if (endPoint) {
    const startPoint = projectedPoints.reduce((lowest, point) => (point.y > lowest.y ? point : lowest), projectedPoints[0]);
    return `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`;
  }

  return projectedPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function buildAreaPath(
  series: SeriesModel,
  model: ChartModel,
  xAxisKey: string,
  yAxisKey: string,
  width: number,
  height: number,
  padding: ChartPadding,
) {
  const projectedPoints = series.points
    .map((point) => projectPoint(point, model, xAxisKey, yAxisKey, width, height, padding))
    .filter((point): point is { x: number; y: number } => point != null);

  if (projectedPoints.length === 0) {
    return "";
  }

  const linePath = projectedPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const first = series.points[0];
  const last = series.points[series.points.length - 1];
  const baseline = model.axes[yAxisKey].domain.min;
  const closingX = scaleRenderableAxisValue(
    last.x,
    model.axes[xAxisKey],
    padding.left,
    width - padding.right,
  );
  const openingX = scaleRenderableAxisValue(
    first.x,
    model.axes[xAxisKey],
    padding.left,
    width - padding.right,
  );
  const baselineY = scaleRenderableAxisValue(
    baseline,
    model.axes[yAxisKey],
    height - padding.bottom,
    padding.top,
  );

  if (closingX == null || openingX == null || baselineY == null) {
    return linePath;
  }

  return `${linePath} L ${closingX} ${baselineY} L ${openingX} ${baselineY} Z`;
}

function buildBandPath(
  series: SeriesModel,
  model: ChartModel,
  xAxisKey: string,
  yAxisKey: string,
  width: number,
  height: number,
  padding: ChartPadding,
) {
  const projectedPoints = series.points
    .map((point) => projectPoint(point, model, xAxisKey, yAxisKey, width, height, padding))
    .filter((point): point is { x: number; y: number } => point != null);
  const path = projectedPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  return path ? `${path} Z` : "";
}

function getToneColor(tone?: string | null) {
  if (tone === "warning") {
    return "#b45309";
  }
  if (tone === "danger") {
    return "#b91c1c";
  }
  return "#475569";
}

function renderMarkerGuides(
  markerX: number,
  markerY: number,
  color: string,
  height: number,
  padding: ChartPadding,
) {
  return (
    <>
      <line
        stroke={color}
        strokeDasharray="6 4"
        strokeLinecap="round"
        strokeWidth="2"
        x1={padding.left}
        x2={markerX}
        y1={markerY}
        y2={markerY}
      />
      <line
        stroke={color}
        strokeDasharray="6 4"
        strokeLinecap="round"
        strokeWidth="2"
        x1={markerX}
        x2={markerX}
        y1={markerY}
        y2={height - padding.bottom}
      />
    </>
  );
}

function renderVerticalGuide(
  x: number,
  startY: number,
  endY: number,
  color: string,
  guideId: string,
) {
  return (
    <line
      data-marker-guide-id={guideId}
      stroke={color}
      strokeDasharray="5 4"
      strokeLinecap="round"
      strokeWidth="1.4"
      x1={x}
      x2={x}
      y1={startY}
      y2={endY}
    />
  );
}

function renderOperationalVolumeGuide(
  markerY: number,
  width: number,
  padding: ChartPadding,
) {
  const labelY = markerY - 8 < padding.top + 12 ? markerY + 16 : markerY - 8;

  return (
    <>
      <line
        data-marker-guide-id="operational-volume"
        stroke="#475569"
        strokeDasharray="4 4"
        strokeLinecap="round"
        strokeWidth="1.2"
        x1={padding.left}
        x2={width - padding.right}
        y1={markerY}
        y2={markerY}
      />
      <text
        fill="#475569"
        fontSize="12"
        fontWeight="600"
        x={padding.left + 12}
        y={labelY}
      >
        {operationalVolumeGuideLabel}
      </text>
    </>
  );
}

function buildStackedBarSegments(
  series: SeriesModel[],
  model: ChartModel,
  xAxisKey: string,
  yAxisKey: string,
  width: number,
  height: number,
  padding: ChartPadding,
) {
  const xValues = Array.from(
    new Set(series.flatMap((entry) => entry.points.map((point) => point.x))),
  ).sort((left, right) => left - right);

  if (xValues.length === 0) {
    return [];
  }

  const xCenters = new Map<number, number>();
  for (const xValue of xValues) {
    const center = scaleRenderableAxisValue(
      xValue,
      model.axes[xAxisKey],
      padding.left,
      width - padding.right,
    );
    if (center != null) {
      xCenters.set(xValue, center);
    }
  }

  const minGap =
    xValues.length > 1
      ? xValues.slice(1).reduce((smallest, current, index) => {
          const previous = xCenters.get(xValues[index]);
          const next = xCenters.get(current);
          if (previous == null || next == null) {
            return smallest;
          }

          const gap = Math.abs(next - previous);
          return gap > 0 ? Math.min(smallest, gap) : smallest;
        }, Number.POSITIVE_INFINITY)
      : Number.POSITIVE_INFINITY;
  const segmentWidth = Number.isFinite(minGap)
    ? Math.max(24, minGap * 0.56)
    : Math.max(24, (width - padding.left - padding.right) * 0.18);
  const baseline = model.axes[yAxisKey].domain.min;
  const stackByX = new Map<number, number>();

  return series.flatMap((entry) =>
    entry.points
      .map((point) => {
        const centerX = xCenters.get(point.x);
        if (centerX == null) {
          return null;
        }

        const previous = stackByX.get(point.x) ?? baseline;
        const next = previous + point.y;
        stackByX.set(point.x, next);

        const top = scaleRenderableAxisValue(
          next,
          model.axes[yAxisKey],
          height - padding.bottom,
          padding.top,
        );
        const bottom = scaleRenderableAxisValue(
          previous,
          model.axes[yAxisKey],
          height - padding.bottom,
          padding.top,
        );

        if (top == null || bottom == null) {
          return null;
        }

        return {
          key: `${entry.id}-${point.x}-${point.y}`,
          color: entry.color ?? defaultStroke,
          height: Math.max(0, bottom - top),
          left: centerX - segmentWidth / 2,
          top,
          width: segmentWidth,
        };
      })
      .filter(
        (
          segment,
        ): segment is {
          key: string;
          color: string;
          height: number;
          left: number;
          top: number;
          width: number;
        } => segment != null,
      ),
  );
}

export function ChartModelRenderer({
  model,
  xAxisKey = "x",
  yAxisKey = "y",
  seriesIds,
  markerIds,
  annotationIds,
  hiddenMarkerLabelIds,
  footer,
  panelClassName,
  width = defaultWidth,
  height = defaultHeight,
  padding = defaultPadding,
  withPanel = true,
}: ChartModelRendererProps) {
  const normalizedModel = normalizeChartColors(model);
  const xAxis = normalizedModel.axes[xAxisKey];
  const yAxis = normalizedModel.axes[yAxisKey];
  const visibleSeries = seriesIds
    ? normalizedModel.series.filter((series) => seriesIds.includes(series.id))
    : normalizedModel.series;
  const visibleBarSeries = visibleSeries.filter((series) => series.kind === "bar");
  const visibleNonBarSeries = visibleSeries.filter((series) => series.kind !== "bar");
  const visibleMarkers = markerIds
    ? normalizedModel.markers.filter((marker) => markerIds.includes(marker.id))
    : normalizedModel.markers;
  const visibleAnnotations = annotationIds
    ? (normalizedModel.annotations ?? []).filter((annotation) => annotationIds.includes(annotation.id))
    : (normalizedModel.annotations ?? []);
  const inlineAnnotations = visibleAnnotations.filter(
    (annotation) => annotation.x != null && annotation.y != null,
  );
  const detachedAnnotations = visibleAnnotations.filter(
    (annotation) => annotation.x == null || annotation.y == null,
  );
  const projectedMarkerPositions = new Map<string, { x: number; y: number }>();
  if (xAxis && yAxis) {
    for (const marker of visibleMarkers) {
      const projected = projectMarker(
        marker,
        normalizedModel,
        xAxisKey,
        yAxisKey,
        width,
        height,
        padding,
      );
      if (projected) {
        projectedMarkerPositions.set(marker.id, projected);
      }
    }
  }
  const guideBaseY = yAxis
    ? scaleRenderableAxisValue(yAxis.domain.min, yAxis, height - padding.bottom, padding.top)
    : null;
  const feedMarkerPosition = projectedMarkerPositions.get("zF");
  const operationalVolumeGuidePosition =
    normalizedModel.id === levenspielChartId
      ? visibleMarkers
          .filter((marker) => levenspielOperationalMarkerIds.has(marker.id))
          .map((marker) => projectedMarkerPositions.get(marker.id))
          .find((position): position is { x: number; y: number } => position != null)
      : null;

  const chartBody = !xAxis || !yAxis ? (
    <p className="text-sm text-muted-foreground">
      Missing chart axis configuration for {xAxisKey} / {yAxisKey}.
    </p>
  ) : (
    <div
      data-testid="chart-model-renderer"
      className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <NumericChartGrid
        width={width}
        height={height}
        padding={padding}
        xAxis={xAxis}
        yAxis={yAxis}
        xLabel={formatAxisLabel(xAxis)}
        yLabel={formatAxisLabel(yAxis)}
      />

      <svg
        aria-label={model.title}
        className="absolute inset-0 block h-full w-full overflow-hidden"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <g aria-hidden="true">
          {buildStackedBarSegments(
            visibleBarSeries,
            normalizedModel,
            xAxisKey,
            yAxisKey,
            width,
            height,
            padding,
          ).map((segment) => (
            <rect
              key={segment.key}
              data-testid="chart-stacked-bar-segment"
              data-series-kind="bar"
              fill={segment.color}
              height={segment.height}
              rx="6"
              width={segment.width}
              x={segment.left}
              y={segment.top}
            />
          ))}

          {visibleNonBarSeries.map((series) => {
            const color = series.color ?? defaultStroke;

            if (series.kind === "scatter") {
              return (
                <g key={series.id} data-series-kind="scatter" data-series-id={series.id}>
                  {series.points.map((point, index) => {
                    const projected = projectPoint(
                      point,
                      normalizedModel,
                      xAxisKey,
                      yAxisKey,
                      width,
                      height,
                      padding,
                    );

                    if (!projected) {
                      return null;
                    }

                    return (
                      <circle
                        key={`${series.id}-${index}`}
                        data-series-kind="scatter-point"
                        cx={projected.x}
                        cy={projected.y}
                        fill={color}
                        r="4"
                      />
                    );
                  })}
                </g>
              );
            }

            if (series.kind === "area") {
              return (
                <g key={series.id} data-series-kind="area" data-series-id={series.id}>
                  <path
                    d={buildAreaPath(series, normalizedModel, xAxisKey, yAxisKey, width, height, padding)}
                    fill={color}
                    fillOpacity="0.2"
                    stroke={color}
                    strokeWidth="2"
                  />
                </g>
              );
            }

            if (series.kind === "band") {
              return (
                <g key={series.id} data-series-kind="band" data-series-id={series.id}>
                  <path
                    d={buildBandPath(series, normalizedModel, xAxisKey, yAxisKey, width, height, padding)}
                    fill={color}
                    fillOpacity="0.18"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                </g>
              );
            }

            const linePath =
              series.id === "q-line" && feedMarkerPosition
                ? buildLinePath(
                    series,
                    normalizedModel,
                    xAxisKey,
                    yAxisKey,
                    width,
                    height,
                    padding,
                    feedMarkerPosition,
                  )
                : buildLinePath(series, normalizedModel, xAxisKey, yAxisKey, width, height, padding);

            return (
              <g key={series.id} data-series-kind="line" data-series-id={series.id}>
                <path
                  d={linePath}
                  fill="none"
                  stroke={color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={dashedThinSeriesIds.has(series.id) ? "6 4" : undefined}
                  strokeWidth={dashedThinSeriesIds.has(series.id) ? "1.5" : "2.5"}
                />
              </g>
            );
          })}

          {operationalVolumeGuidePosition
            ? renderOperationalVolumeGuide(operationalVolumeGuidePosition.y, width, padding)
            : null}

          {visibleMarkers.map((marker) => {
            const projected = projectedMarkerPositions.get(marker.id);
            const markerX = projected?.x ?? null;
            const markerY = projected?.y ?? null;

            if (markerX == null || markerY == null) {
              return null;
            }

            return (
              <g key={marker.id} data-marker-id={marker.id}>
                {mccabeGuideMarkerIds.has(marker.id) && guideBaseY != null
                  ? renderVerticalGuide(
                      markerX,
                      guideBaseY,
                      markerY,
                      marker.color ?? "#dc2626",
                      marker.id,
                    )
                  : guidedMarkerIds.has(marker.id)
                    ? renderMarkerGuides(markerX, markerY, marker.color ?? "#dc2626", height, padding)
                    : null}
                <circle
                  cx={markerX}
                  cy={markerY}
                  fill={marker.color ?? "#dc2626"}
                  r="5"
                  stroke="#fff"
                  strokeWidth="2"
                />
                {hiddenMarkerLabelIds?.includes(marker.id) ||
                (normalizedModel.id === levenspielChartId &&
                  levenspielOperationalMarkerIds.has(marker.id)) ? null : (
                  <text
                    x={markerX + 8}
                    y={markerY - 8}
                    fill={marker.color ?? "#dc2626"}
                    fontSize="12"
                    fontWeight="600"
                  >
                    {marker.label}
                  </text>
                )}
              </g>
            );
          })}

          {inlineAnnotations.map((annotation) => {
            if (annotation.x == null || annotation.y == null) {
              return null;
            }

            const annotationX = scaleRenderableAxisValue(
              annotation.x,
              xAxis,
              padding.left,
              width - padding.right,
            );
            const annotationY = scaleRenderableAxisValue(
              annotation.y,
              yAxis,
              height - padding.bottom,
              padding.top,
            );

            if (annotationX == null || annotationY == null) {
              return null;
            }

            return (
              <text
                key={annotation.id}
                x={annotationX}
                y={annotationY}
                fill={getToneColor(annotation.tone)}
                fontSize="12"
                textAnchor="middle"
              >
                {annotation.text}
              </text>
            );
          })}
        </g>
      </svg>
    </div>
  );

  if (!withPanel) {
    return (
      <>
        {chartBody}
        {detachedAnnotations.length > 0 ? (
          <div className="mt-3 space-y-1 text-sm text-slate-600">
            {detachedAnnotations.map((annotation) => (
              <p key={annotation.id}>{annotation.text}</p>
            ))}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <ChartPanel
      className={panelClassName}
      footer={footer}
      title={model.title}
      subtitle={model.subtitle}
      notice={model.approximation_notice}
    >
      {chartBody}
      {detachedAnnotations.length > 0 ? (
        <div className="mt-3 space-y-1 text-sm text-slate-600">
          {detachedAnnotations.map((annotation) => (
            <p key={annotation.id}>{annotation.text}</p>
          ))}
        </div>
      ) : null}
    </ChartPanel>
  );
}
