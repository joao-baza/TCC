import {
  buildAxisTicks,
  expandNumericDomain,
  formatAxisTick,
  type NumericDomain,
} from "@/components/viz/chart-axis-utils";

type ChartPadding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type NumericChartGridProps = {
  xDomain: [number, number];
  yDomain: [number, number];
  width: number;
  height: number;
  padding: ChartPadding;
  xLabel?: string;
  yLabel?: string;
  xTickCount?: number;
  yTickCount?: number;
};

const defaultTickCount = 5;

function scale(value: number, domain: NumericDomain, start: number, end: number) {
  if (domain.min === domain.max) {
    return (start + end) / 2;
  }

  return start + ((value - domain.min) / (domain.max - domain.min)) * (end - start);
}

function normalizeDomain([left, right]: [number, number]) {
  const min = Math.min(left, right);
  const max = Math.max(left, right);

  return min === max ? expandNumericDomain([min]) : { min, max };
}

export function NumericChartGrid({
  xDomain,
  yDomain,
  width,
  height,
  padding,
  xLabel,
  yLabel,
  xTickCount = defaultTickCount,
  yTickCount = defaultTickCount,
}: NumericChartGridProps) {
  const normalizedXDomain = normalizeDomain(xDomain);
  const normalizedYDomain = normalizeDomain(yDomain);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xTicks = buildAxisTicks(normalizedXDomain.min, normalizedXDomain.max, xTickCount);
  const yTicks = buildAxisTicks(normalizedYDomain.min, normalizedYDomain.max, yTickCount);

  return (
    <svg
      aria-label="Numeric chart grid"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className="block h-auto w-full overflow-hidden"
    >
      <rect x="0" y="0" width={width} height={height} fill="transparent" />

      <g aria-hidden="true">
        {xTicks.map((tick) => {
          const x = scale(tick, normalizedXDomain, padding.left, width - padding.right);

          return (
            <g key={`x-grid-${tick}`}>
              <line
                x1={x}
                x2={x}
                y1={padding.top}
                y2={height - padding.bottom}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text
                data-axis-tick="x"
                x={x}
                y={height - padding.bottom + 8}
                fill="#64748b"
                fontSize="12"
                textAnchor="middle"
                dominantBaseline="hanging"
              >
                {formatAxisTick(tick)}
              </text>
            </g>
          );
        })}

        {yTicks.map((tick) => {
          const y = scale(tick, normalizedYDomain, height - padding.bottom, padding.top);

          return (
            <g key={`y-grid-${tick}`}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text
                data-axis-tick="y"
                x={padding.left - 8}
                y={y}
                fill="#64748b"
                fontSize="12"
                textAnchor="end"
                dominantBaseline="middle"
              >
                {formatAxisTick(tick)}
              </text>
            </g>
          );
        })}
      </g>

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

      {xLabel ? (
        <text
          data-chart-label="x"
          x={padding.left + plotWidth / 2}
          y={height - 8}
          fill="#475569"
          fontSize="13"
          textAnchor="middle"
          dominantBaseline="auto"
        >
          {xLabel}
        </text>
      ) : null}

      {yLabel ? (
        <text
          data-chart-label="y"
          transform={`translate(${16}, ${padding.top + plotHeight / 2}) rotate(-90)`}
          fill="#475569"
          fontSize="13"
          textAnchor="middle"
          dominantBaseline="auto"
        >
          {yLabel}
        </text>
      ) : null}
    </svg>
  );
}
