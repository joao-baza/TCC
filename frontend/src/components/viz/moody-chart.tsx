import { formatTableNumberText } from "@/lib/table-number";
import { formatNumber } from "@/lib/units";

type MoodyChartProps = {
  reynolds: number;
  frictionFactor: number;
  roughness: number;
};

type PlotPoint = {
  x: number;
  y: number;
};

type CurveValue = {
  reynolds: number;
  frictionFactor: number;
};

type CurveSeries = {
  label: string;
  roughness: number;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  points: PlotPoint[];
  labelPoint?: PlotPoint;
};

const width = 900;
const height = 516;
const padding = { top: 24, right: 94, bottom: 58, left: 72 };
const chartMinReynolds = 1_000;
const chartMaxReynolds = 100_000_000;
const laminarCutoff = 2_000;
const transitionUpper = 4_000;
const turbulentStart = 4_000;
const sampleCount = 150;

const roughnessSeries = [
  0,
  0.000005,
  0.00001,
  0.00002,
  0.00005,
  0.0001,
  0.0002,
  0.0005,
  0.001,
  0.002,
  0.005,
  0.01,
  0.02,
  0.05,
];

function isClose(left: number, right: number) {
  return Math.abs(left - right) <= 1e-10;
}

function scaleLog(value: number, min: number, max: number, start: number, end: number) {
  const safeValue = Math.max(value, min);
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  const logValue = Math.log10(safeValue);

  if (logMin === logMax) {
    return (start + end) / 2;
  }

  return start + ((logValue - logMin) / (logMax - logMin)) * (end - start);
}

function buildPath(points: PlotPoint[]) {
  if (points.length === 0) {
    return "";
  }

  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function buildLogSpacePoints(min: number, max: number, count: number) {
  const points: number[] = [];
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);

  for (let index = 0; index < count; index += 1) {
    const ratio = index / Math.max(count - 1, 1);
    points.push(10 ** (logMin + (logMax - logMin) * ratio));
  }

  return points;
}

function buildMajorTicks(min: number, max: number) {
  const ticks: number[] = [];
  const minExp = Math.ceil(Math.log10(min));
  const maxExp = Math.floor(Math.log10(max));

  for (let exp = minExp; exp <= maxExp; exp += 1) {
    ticks.push(10 ** exp);
  }

  return ticks;
}

function buildLogTicks(min: number, max: number) {
  const ticks: Array<{ value: number; major: boolean }> = [];
  const minExp = Math.floor(Math.log10(min));
  const maxExp = Math.ceil(Math.log10(max));

  for (let exp = minExp; exp <= maxExp; exp += 1) {
    for (const multiplier of [1, 2, 5]) {
      const value = multiplier * 10 ** exp;
      if (value < min || value > max) {
        continue;
      }

      ticks.push({ value, major: multiplier === 1 });
    }
  }

  return ticks;
}

function floorLogTick(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0.001;
  }

  const exponent = Math.floor(Math.log10(value));
  const decade = 10 ** exponent;
  const mantissa = value / decade;

  if (mantissa >= 5) {
    return 5 * decade;
  }

  if (mantissa >= 2) {
    return 2 * decade;
  }

  return decade;
}

function ceilLogTick(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0.01;
  }

  const exponent = Math.floor(Math.log10(value));
  const decade = 10 ** exponent;
  const mantissa = value / decade;

  if (mantissa <= 1) {
    return decade;
  }

  if (mantissa <= 2) {
    return 2 * decade;
  }

  if (mantissa <= 5) {
    return 5 * decade;
  }

  return 10 * decade;
}

function formatReynoldsTick(value: number) {
  if (value < 10_000) {
    return `10^${Math.round(Math.log10(value))}`;
  }

  const exponent = Math.round(Math.log10(value));
  const mantissa = value / 10 ** exponent;

  if (isClose(mantissa, 1)) {
    return `10^${exponent}`;
  }

  return `${formatNumber(mantissa, 1)} × 10^${exponent}`;
}

function formatRoughnessLabel(value: number) {
  return `e/D = ${formatTableNumberText(value)}`;
}

function formatRoughnessTag(value: number) {
  return formatTableNumberText(value);
}

function laminarFrictionFactor(reynolds: number) {
  return 64 / Math.max(reynolds, 1);
}

function swameeJainFrictionFactor(relativeRoughness: number, reynolds: number) {
  const safeReynolds = Math.max(reynolds, 1);
  const argument = relativeRoughness / 3.7 + 5.74 / safeReynolds ** 0.9;

  return 0.25 / Math.log10(argument) ** 2;
}

function colebrookWhiteFrictionFactor(relativeRoughness: number, reynolds: number) {
  if (reynolds <= laminarCutoff) {
    return laminarFrictionFactor(reynolds);
  }

  let frictionFactor = swameeJainFrictionFactor(relativeRoughness, reynolds);

  for (let iteration = 0; iteration < 30; iteration += 1) {
    const invSqrtF = 1 / Math.sqrt(frictionFactor);
    const rhs =
      -2 *
      Math.log10(relativeRoughness / 3.7 + 2.51 / (reynolds * Math.sqrt(frictionFactor)));
    const next = 1 / rhs ** 2;

    if (!Number.isFinite(next) || Math.abs(next - frictionFactor) < 1e-9) {
      break;
    }

    frictionFactor = next;

    if (!Number.isFinite(invSqrtF)) {
      break;
    }
  }

  return frictionFactor;
}

function buildCurveValues(roughness: number, startReynolds: number, endReynolds: number) {
  return buildLogSpacePoints(startReynolds, endReynolds, sampleCount).map((reynolds) => ({
    reynolds,
    frictionFactor: colebrookWhiteFrictionFactor(roughness, reynolds),
  }));
}

function mapCurveValues(
  values: CurveValue[],
  xDomain: [number, number],
  yDomain: [number, number],
): PlotPoint[] {
  return values.map((value) => ({
    x: scaleLog(value.reynolds, xDomain[0], xDomain[1], padding.left, width - padding.right),
    y: scaleLog(
      value.frictionFactor,
      yDomain[0],
      yDomain[1],
      height - padding.bottom,
      padding.top,
    ),
  }));
}

function isValidOperationalPoint({
  reynolds,
  frictionFactor,
  roughness,
}: MoodyChartProps) {
  return (
    Number.isFinite(reynolds) &&
    Number.isFinite(frictionFactor) &&
    Number.isFinite(roughness) &&
    reynolds > 0 &&
    frictionFactor > 0 &&
    roughness >= 0 &&
    roughness <= 1
  );
}

export function MoodyChart({
  reynolds,
  frictionFactor,
  roughness,
}: MoodyChartProps) {
  if (!isValidOperationalPoint({ reynolds, frictionFactor, roughness })) {
    return (
      <section className="mx-auto mt-3 w-full max-w-[760px] rounded-xl border border-slate-200 p-3">
        <h3 className="text-sm font-medium text-slate-800">Ponto operacional indisponível</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Revise os parâmetros para exibir o gráfico.
        </p>
      </section>
    );
  }

  const xDomain: [number, number] = [chartMinReynolds, Math.max(chartMaxReynolds, reynolds * 1.25)];
  const referenceRoughness = roughnessSeries.filter((value) => !isClose(value, roughness));
  const selectedCurveRoughness = [...referenceRoughness, roughness].sort((left, right) => left - right);

  const laminarValues = buildLogSpacePoints(chartMinReynolds, laminarCutoff, sampleCount).map((value) => ({
    reynolds: value,
    frictionFactor: laminarFrictionFactor(value),
  }));

  const transitionBand = {
    left: scaleLog(transitionUpper / 2, xDomain[0], xDomain[1], padding.left, width - padding.right),
    right: scaleLog(transitionUpper, xDomain[0], xDomain[1], padding.left, width - padding.right),
  };

  const turbulentCurveValues = selectedCurveRoughness.map((curveRoughness) => {
    const values = buildCurveValues(curveRoughness, turbulentStart, xDomain[1]);
    const isSelected = isClose(curveRoughness, roughness);
    const isSmoothPipe = isClose(curveRoughness, 0);

    return {
      label: formatRoughnessLabel(curveRoughness),
      roughness: curveRoughness,
      stroke: isSelected ? "#dc2626" : isSmoothPipe ? "#475569" : "#94a3b8",
      strokeWidth: isSelected ? 3 : isSmoothPipe ? 2.8 : 1.6,
      opacity: isSelected ? 1 : isSmoothPipe ? 1 : 0.85,
      values,
    };
  });

  const allCurveValues = [
    ...laminarValues.map((point) => point.frictionFactor),
    ...turbulentCurveValues.flatMap((curve) => curve.values.map((point) => point.frictionFactor)),
    frictionFactor,
  ];

  const smoothPipeEndFriction = colebrookWhiteFrictionFactor(0, xDomain[1]);
  const yDomainMinCandidate = Math.min(smoothPipeEndFriction, frictionFactor, ...allCurveValues);
  const yDomainMaxCandidate = Math.max(...allCurveValues);
  let yDomainMin = floorLogTick(yDomainMinCandidate);
  let yDomainMax = ceilLogTick(yDomainMaxCandidate);

  if (yDomainMin >= yDomainMax) {
    yDomainMin = yDomainMax / 10;
  }

  const yDomain: [number, number] = [Math.max(0.001, yDomainMin), yDomainMax];
  const laminarPoints = mapCurveValues(laminarValues, xDomain, yDomain);
  const turbulentCurves: CurveSeries[] = turbulentCurveValues.map((curve) => {
    const points = mapCurveValues(curve.values, xDomain, yDomain);

    return {
      label: curve.label,
      roughness: curve.roughness,
      stroke: curve.stroke,
      strokeWidth: curve.strokeWidth,
      opacity: curve.opacity,
      points,
      labelPoint: points[points.length - 1],
    };
  });
  const operationalPoint = {
    x: scaleLog(reynolds, xDomain[0], xDomain[1], padding.left, width - padding.right),
    y: scaleLog(frictionFactor, yDomain[0], yDomain[1], height - padding.bottom, padding.top),
  };
  const laminarLabelPoint = laminarPoints[Math.max(0, Math.floor(laminarPoints.length * 0.85))];

  const xTicks = buildLogTicks(xDomain[0], xDomain[1]);
  const xMajorTickValues = buildMajorTicks(xDomain[0], xDomain[1]);
  const yTicks = buildLogTicks(yDomain[0], yDomain[1]);

  const plotLeft = padding.left;
  const plotRight = width - padding.right;
  const plotTop = padding.top;
  const plotBottom = height - padding.bottom;
  const selectedCurveLabel = turbulentCurves.find((curve) => isClose(curve.roughness, roughness));
  const labelGap = 12;
  const labelMinY = plotTop + 10;
  const labelMaxY = plotBottom - 6;
  const orderedLabelCurves = [...turbulentCurves].sort((left, right) => {
    const leftY = left.labelPoint?.y ?? 0;
    const rightY = right.labelPoint?.y ?? 0;
    return leftY - rightY;
  });
  const labelPositions = new Map<string, number>();
  let previousLabelY = labelMinY - labelGap;

  for (const curve of orderedLabelCurves) {
    const anchorY = curve.labelPoint?.y ?? labelMinY;
    const nextY = Math.max(anchorY, previousLabelY + labelGap);
    labelPositions.set(curve.label, Math.min(nextY, labelMaxY));
    previousLabelY = Math.min(nextY, labelMaxY);
  }

  const firstLabelY = orderedLabelCurves.length > 0 ? labelPositions.get(orderedLabelCurves[0].label) ?? labelMinY : labelMinY;
  if (firstLabelY < labelMinY) {
    const shift = labelMinY - firstLabelY;
    for (const [label, value] of labelPositions.entries()) {
      labelPositions.set(label, Math.min(value + shift, labelMaxY));
    }
  }

  return (
    <section className="mx-auto mt-3 w-full max-w-[760px] rounded-xl border border-slate-200 p-3">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-slate-800">Ponto operacional - Diagrama de Moody</h3>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>Re = {formatTableNumberText(reynolds)}</span>
            <span>f = {formatTableNumberText(frictionFactor)}</span>
            <span>e/D = {formatTableNumberText(roughness)}</span>
          </div>
          <p className="mt-2 max-w-2xl text-xs text-slate-600">
            Diagrama logarítmico de Moody: curvas de Colebrook-White por rugosidade relativa,
            faixa de transição entre Re ≈ 2000 e 4000 e ponto operacional destacado.
          </p>
        </div>
      </div>

      <div
        className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        <svg
          aria-label="Ponto operacional - Diagrama de Moody"
          className="block h-auto w-full overflow-hidden"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <title>Ponto operacional - Diagrama de Moody</title>
          <desc>
            Eixo X em escala logarítmica para o número de Reynolds, eixo Y em escala
            logarítmica para o fator de atrito de Darcy, família de curvas por rugosidade
            relativa e ponto operacional sobreposto.
          </desc>

          <rect x="0" y="0" width={width} height={height} fill="transparent" />

          <rect
            x={transitionBand.left}
            y={plotTop}
            width={Math.max(0, transitionBand.right - transitionBand.left)}
            height={plotBottom - plotTop}
            fill="rgba(148, 163, 184, 0.14)"
          />
          <rect
            x={transitionBand.left}
            y={plotTop}
            width={Math.max(0, transitionBand.right - transitionBand.left)}
            height={plotBottom - plotTop}
            fill="none"
            stroke="#94a3b8"
            strokeDasharray="4 4"
            strokeWidth="1"
            opacity="0.75"
          />

          <g aria-hidden="true">
            {xTicks.map((tick) => {
              const x = scaleLog(tick.value, xDomain[0], xDomain[1], plotLeft, plotRight);
              const isMajor = tick.major;

              return (
                <line
                  key={`x-grid-${tick.value}`}
                  x1={x}
                  x2={x}
                  y1={plotTop}
                  y2={plotBottom}
                  stroke={isMajor ? "#cbd5e1" : "#e2e8f0"}
                  strokeDasharray={isMajor ? "none" : "2 4"}
                  strokeWidth={isMajor ? "1.2" : "0.8"}
                />
              );
            })}

            {yTicks.map((tick) => {
              const y = scaleLog(tick.value, yDomain[0], yDomain[1], plotBottom, plotTop);

              return (
                <line
                  key={`y-grid-${tick.value}`}
                  x1={plotLeft}
                  x2={plotRight}
                  y1={y}
                  y2={y}
                  stroke={tick.major ? "#cbd5e1" : "#e2e8f0"}
                  strokeDasharray={tick.major ? "none" : "2 4"}
                  strokeWidth={tick.major ? "1.2" : "0.8"}
                />
              );
            })}
          </g>

          <line
            x1={plotLeft}
            x2={plotRight}
            y1={plotBottom}
            y2={plotBottom}
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />
          <line
            x1={plotLeft}
            x2={plotLeft}
            y1={plotTop}
            y2={plotBottom}
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />

          {turbulentCurves
            .filter((curve) => curve.roughness !== 0)
            .map((curve) => (
              <path
                key={curve.label}
                d={buildPath(curve.points)}
                fill="none"
                opacity={curve.opacity}
                stroke={curve.stroke}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={curve.strokeWidth}
              />
            ))}

          <path
            d={buildPath(turbulentCurves.find((curve) => isClose(curve.roughness, 0))?.points ?? [])}
            fill="none"
            stroke="#475569"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.8"
          />

          <path
            d={buildPath(laminarPoints)}
            fill="none"
            stroke="#0f766e"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3.4"
          />

          <line
            x1={scaleLog(laminarCutoff, xDomain[0], xDomain[1], plotLeft, plotRight)}
            x2={scaleLog(laminarCutoff, xDomain[0], xDomain[1], plotLeft, plotRight)}
            y1={plotTop}
            y2={plotBottom}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <line
            x1={scaleLog(transitionUpper, xDomain[0], xDomain[1], plotLeft, plotRight)}
            x2={scaleLog(transitionUpper, xDomain[0], xDomain[1], plotLeft, plotRight)}
            y1={plotTop}
            y2={plotBottom}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <text
            x={scaleLog(3000, xDomain[0], xDomain[1], plotLeft, plotRight)}
            y={plotTop + 28}
            fill="#475569"
            fontSize="11.5"
            fontWeight="600"
            textAnchor="middle"
          >
            transição
          </text>

          {laminarLabelPoint ? (
            <>
              <line
                x1={laminarLabelPoint.x}
                x2={laminarLabelPoint.x + 18}
                y1={laminarLabelPoint.y}
                y2={laminarLabelPoint.y - 14}
                stroke="#0f766e"
                strokeDasharray="2 3"
                strokeWidth="1"
              />
              <text
                x={laminarLabelPoint.x + 22}
                y={laminarLabelPoint.y - 16}
                fill="#0f766e"
                fontSize="11.5"
                fontWeight="700"
              >
                laminar
              </text>
            </>
          ) : null}

          {turbulentCurves.map((curve) => {
            const anchor = curve.labelPoint;
            if (!anchor) {
              return null;
            }

            const labelX = Math.min(plotRight + 8, width - 4);
            const labelY = labelPositions.get(curve.label) ?? Math.max(plotTop + 10, Math.min(plotBottom - 4, anchor.y));

            return (
              <g key={`label-${curve.label}`}>
                <line
                  x1={anchor.x}
                  x2={plotRight}
                  y1={anchor.y}
                  y2={anchor.y}
                  stroke={curve.stroke}
                  strokeDasharray="2 3"
                  strokeWidth="0.8"
                  opacity={curve.opacity}
                />
                <text
                  x={labelX}
                  y={labelY}
                  fill={curve.stroke}
                  fontSize="10.5"
                  fontWeight={isClose(curve.roughness, roughness) ? 700 : 500}
                  textAnchor="start"
                  dominantBaseline="middle"
                >
                  {formatRoughnessTag(curve.roughness)}
                </text>
              </g>
            );
          })}

          <circle cx={operationalPoint.x} cy={operationalPoint.y} fill="#111827" r="5" />
          <circle cx={operationalPoint.x} cy={operationalPoint.y} fill="#dc2626" r="3.2" />
          <line
            x1={operationalPoint.x}
            x2={operationalPoint.x}
            y1={operationalPoint.y}
            y2={plotBottom}
            stroke="#dc2626"
            strokeDasharray="4 4"
            strokeWidth="1.2"
          />
          <line
            x1={plotLeft}
            x2={operationalPoint.x}
            y1={operationalPoint.y}
            y2={operationalPoint.y}
            stroke="#dc2626"
            strokeDasharray="4 4"
            strokeWidth="1.2"
          />

          <text
            x={Math.min(operationalPoint.x + 10, plotRight - 6)}
            y={Math.max(plotTop + 10, operationalPoint.y - 10)}
            fill="#dc2626"
            fontSize="11"
            fontWeight="600"
          >
            operação
          </text>

          {xMajorTickValues
            .map((tick) => (
              <text
                key={`x-major-${tick}`}
                data-axis-tick="x"
                x={scaleLog(tick, xDomain[0], xDomain[1], plotLeft, plotRight)}
                y={plotBottom + 18}
                fill="#64748b"
                fontSize="12"
                textAnchor="middle"
              >
                {formatReynoldsTick(tick)}
              </text>
            ))}

          {yTicks.map((tick) => (
            <text
              key={`y-label-${tick.value}`}
              data-axis-tick="y"
              x={plotLeft - 8}
              y={scaleLog(tick.value, yDomain[0], yDomain[1], plotBottom, plotTop)}
              fill="#64748b"
              fontSize="12"
              textAnchor="end"
              dominantBaseline="middle"
            >
              {formatTableNumberText(tick.value)}
            </text>
          ))}

          <text
            data-chart-label="x"
            x={plotLeft + (plotRight - plotLeft) / 2}
            y={height - 8}
            fill="#475569"
            fontSize="13"
            textAnchor="middle"
          >
            Número de Reynolds
          </text>
          <text
            data-chart-label="y"
            transform={`translate(${16}, ${plotTop + (plotBottom - plotTop) / 2}) rotate(-90)`}
            fill="#475569"
            fontSize="13"
            textAnchor="middle"
          >
            Fator de atrito de Darcy (log)
          </text>
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
          Curva laminar
        </span>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
          Família de rugosidades
        </span>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
          Faixa de transição
        </span>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
          Ponto operacional
        </span>
      </div>

      <div className="mt-2 text-xs text-slate-500">
        Aproximação baseada na equação de Colebrook-White, com escala logarítmica em Re e f, como
        no diagrama clássico.
      </div>

    </section>
  );
}
