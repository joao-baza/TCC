import {
  buildAxisTicks,
  expandNumericDomain,
  formatAxisLabel,
  formatAxisTick,
  formatChartAxisTick,
  scaleAxisValue,
  type NumericDomain,
} from "@/components/viz/chart-axis-utils";
import type { AxisModel } from "@/types/chart-model";
import { useId } from "react";

type ChartPadding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type NumericChartGridProps = {
  width: number;
  height: number;
  padding: ChartPadding;
  xLabel?: string;
  yLabel?: string;
  xTickCount?: number;
  yTickCount?: number;
  xDomain?: [number, number];
  yDomain?: [number, number];
  xAxis?: AxisModel;
  yAxis?: AxisModel;
  title?: string;
};

const defaultTickCount = 5;

function normalizeDomain([left, right]: [number, number]) {
  const min = Math.min(left, right);
  const max = Math.max(left, right);

  return min === max ? expandNumericDomain([min]) : { min, max };
}

function buildAxisFromDomain(
  label: string | undefined,
  domain: NumericDomain,
  tickCount: number,
): AxisModel {
  const ticks = buildAxisTicks(domain.min, domain.max, tickCount);

  return {
    scale: "linear",
    label: label ?? "",
    domain,
    ticks,
    major_ticks: ticks,
  };
}

function resolveAxis({
  axis,
  domain,
  label,
  tickCount,
}: {
  axis?: AxisModel;
  domain?: [number, number];
  label?: string;
  tickCount: number;
}) {
  if (axis) {
    return axis;
  }

  const resolvedDomain = domain ? normalizeDomain(domain) : expandNumericDomain([0, 1]);
  return buildAxisFromDomain(label, resolvedDomain, tickCount);
}

export function NumericChartGrid({
  width,
  height,
  padding,
  xLabel,
  yLabel,
  xTickCount = defaultTickCount,
  yTickCount = defaultTickCount,
  xDomain,
  yDomain,
  xAxis,
  yAxis,
  title = "Numeric chart grid",
}: NumericChartGridProps) {
  const titleId = useId();
  const descId = useId();
  const resolvedXAxis = resolveAxis({ axis: xAxis, domain: xDomain, label: xLabel, tickCount: xTickCount });
  const resolvedYAxis = resolveAxis({ axis: yAxis, domain: yDomain, label: yLabel, tickCount: yTickCount });
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xTickText = resolvedXAxis.ticks.map((tick) => formatChartAxisTick(resolvedXAxis, tick)).join(", ");
  const yTickText = resolvedYAxis.ticks.map((tick) => formatChartAxisTick(resolvedYAxis, tick)).join(", ");
  const xAxisLabel = xLabel ?? formatAxisLabel(resolvedXAxis);
  const yAxisLabel = yLabel ?? formatAxisLabel(resolvedYAxis);
  const xMajorTicks = new Set(resolvedXAxis.major_ticks ?? []);
  const yMajorTicks = new Set(resolvedYAxis.major_ticks ?? []);

  return (
    <svg
      aria-labelledby={titleId}
      aria-describedby={descId}
      role="img"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className="block h-auto w-full overflow-hidden"
    >
      <title id={titleId}>{title}</title>
      <desc id={descId}>
        {xAxisLabel ? `X axis ${xAxisLabel}. ` : ""}
        {yAxisLabel ? `Y axis ${yAxisLabel}. ` : ""}
        {resolvedXAxis.ticks.length > 0 ? `X ticks ${xTickText}. ` : ""}
        {resolvedYAxis.ticks.length > 0 ? `Y ticks ${yTickText}.` : ""}
      </desc>
      <rect x="0" y="0" width={width} height={height} fill="transparent" />

      <g aria-hidden="true">
        {resolvedXAxis.ticks.map((tick) => {
          const x = scaleAxisValue(tick, resolvedXAxis, padding.left, width - padding.right);
          const isMajor = xMajorTicks.has(tick);

          return (
            <line
              key={`x-grid-${tick}`}
              x1={x}
              x2={x}
              y1={padding.top}
              y2={height - padding.bottom}
              stroke="#e2e8f0"
              strokeWidth={isMajor ? "1.1" : "1"}
              strokeDasharray={isMajor ? undefined : "2 4"}
            />
          );
        })}

        {resolvedYAxis.ticks.map((tick) => {
          const y = scaleAxisValue(tick, resolvedYAxis, height - padding.bottom, padding.top);
          const isMajor = yMajorTicks.has(tick);

          return (
            <line
              key={`y-grid-${tick}`}
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth={isMajor ? "1.1" : "1"}
              strokeDasharray={isMajor ? undefined : "2 4"}
            />
          );
        })}
      </g>

      {resolvedXAxis.ticks.map((tick) => {
        const x = scaleAxisValue(tick, resolvedXAxis, padding.left, width - padding.right);

        return (
          <text
            key={`x-label-${tick}`}
            data-axis-tick="x"
            x={x}
            y={height - padding.bottom + 8}
            fill="#64748b"
            fontSize="12"
            textAnchor="middle"
            dominantBaseline="hanging"
          >
            {formatChartAxisTick(resolvedXAxis, tick)}
          </text>
        );
      })}

      {resolvedYAxis.ticks.map((tick) => {
        const y = scaleAxisValue(tick, resolvedYAxis, height - padding.bottom, padding.top);

        return (
          <text
            key={`y-label-${tick}`}
            data-axis-tick="y"
            x={padding.left - 8}
            y={y}
            fill="#64748b"
            fontSize="12"
            textAnchor="end"
            dominantBaseline="middle"
          >
            {formatChartAxisTick(resolvedYAxis, tick)}
          </text>
        );
      })}

      <line
        x1={padding.left}
        x2={width - padding.right}
        y1={height - padding.bottom}
        y2={height - padding.bottom}
        stroke="#cbd5e1"
        strokeWidth="1.5"
      />
      <line
        x1={padding.left}
        x2={padding.left}
        y1={padding.top}
        y2={height - padding.bottom}
        stroke="#cbd5e1"
        strokeWidth="1.5"
      />

      {xAxisLabel ? (
        <text
          data-chart-label="x"
          x={padding.left + plotWidth / 2}
          y={height - 8}
          fill="#475569"
          fontSize="13"
          textAnchor="middle"
          dominantBaseline="auto"
        >
          {xAxisLabel}
        </text>
      ) : null}

      {yAxisLabel ? (
        <text
          data-chart-label="y"
          transform={`translate(${8}, ${padding.top + plotHeight / 2}) rotate(-90)`}
          fill="#475569"
          fontSize="13"
          textAnchor="middle"
          dominantBaseline="auto"
        >
          {yAxisLabel}
        </text>
      ) : null}
    </svg>
  );
}
