import { NumericChartGrid } from "@/components/viz/chart-grid";
import { expandNumericDomain } from "@/components/viz/chart-axis-utils";

type PropertySurfaceHeatmapProps = {
  fluid: string;
  propertyLabel: string;
  propertyUnits: string;
  temperatures: number[];
  pressures: number[];
  values: Array<Array<number | null>>;
  valueMin: number;
  valueMax: number;
  title?: string;
};

const width = 820;
const height = 460;
const padding = { top: 28, right: 28, bottom: 70, left: 88 };

function scale(value: number, min: number, max: number, start: number, end: number) {
  if (min === max) {
    return (start + end) / 2;
  }

  return start + ((value - min) / (max - min)) * (end - start);
}

function toFixedLabel(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}

function formatTemperature(value: number) {
  return `${toFixedLabel(value)} K`;
}

function formatPressure(value: number) {
  if (value >= 1_000_000) {
    return `${toFixedLabel(value / 1_000_000)} MPa`;
  }

  if (value >= 1000) {
    return `${toFixedLabel(value / 1000)} kPa`;
  }

  return `${toFixedLabel(value)} Pa`;
}

function interpolate(from: number, to: number, ratio: number) {
  return from + (to - from) * ratio;
}

function heatColor(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return "#e2e8f0";
  }

  if (min === max) {
    return "hsl(180 55% 44%)";
  }

  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const hue = interpolate(232, 34, ratio);
  const saturation = interpolate(58, 82, ratio);
  const lightness = interpolate(94, 42, ratio);
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

export function PropertySurfaceHeatmap({
  fluid,
  propertyLabel,
  propertyUnits,
  temperatures,
  pressures,
  values,
  valueMin,
  valueMax,
  title = "Superfície de propriedades",
}: PropertySurfaceHeatmapProps) {
  const gridWidth = width - padding.left - padding.right;
  const gridHeight = height - padding.top - padding.bottom;
  const cellWidth = temperatures.length > 0 ? gridWidth / temperatures.length : gridWidth;
  const cellHeight = pressures.length > 0 ? gridHeight / pressures.length : gridHeight;
  const temperatureDomain = expandNumericDomain(temperatures);
  const pressureDomain = expandNumericDomain(pressures);

  const normalizedLegendStops = [
    { offset: 0, color: heatColor(valueMin, valueMin, valueMax) },
    { offset: 0.33, color: heatColor(valueMin + (valueMax - valueMin) * 0.33, valueMin, valueMax) },
    { offset: 0.66, color: heatColor(valueMin + (valueMax - valueMin) * 0.66, valueMin, valueMax) },
    { offset: 1, color: heatColor(valueMax, valueMin, valueMax) },
  ];

  return (
    <section
      className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="property-surface-heatmap"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-muted-foreground">
            Mapa T-P de {propertyLabel.toLowerCase()} para {fluid}.
          </p>
        </div>
        <div className="text-sm font-medium text-slate-700">
          <div>{propertyLabel}</div>
          <div>{propertyUnits}</div>
        </div>
      </div>

      {temperatures.length && pressures.length && values.length ? (
        <>
          <div
            className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
            style={{ aspectRatio: `${width} / ${height}` }}
          >
            <NumericChartGrid
              xDomain={[temperatureDomain.min, temperatureDomain.max]}
              yDomain={[pressureDomain.min, pressureDomain.max]}
              width={width}
              height={height}
              padding={padding}
              xLabel="Temperatura (K)"
              yLabel="Pressão (Pa)"
            />

            <svg
              aria-label={`${title} de ${propertyLabel} para ${fluid}`}
              className="absolute inset-0 block h-full w-full overflow-hidden"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              viewBox={`0 0 ${width} ${height}`}
            >
              <defs>
                <linearGradient id="property-surface-legend" x1="0%" x2="100%" y1="0%" y2="0%">
                  {normalizedLegendStops.map((stop) => (
                    <stop key={stop.offset} offset={`${stop.offset * 100}%`} stopColor={stop.color} />
                  ))}
                </linearGradient>
              </defs>

              {pressures.map((pressure, rowIndex) =>
                temperatures.map((temperature, columnIndex) => {
                  const value = values[rowIndex]?.[columnIndex] ?? null;
                  const x = padding.left + columnIndex * cellWidth;
                  const y = padding.top + (pressures.length - rowIndex - 1) * cellHeight;
                  const fill = heatColor(value ?? Number.NaN, valueMin, valueMax);
                  const tooltip =
                    value == null
                      ? `${formatTemperature(temperature)} · ${formatPressure(pressure)} · sem solução`
                      : `${formatTemperature(temperature)} · ${formatPressure(pressure)} · ${propertyLabel} = ${toFixedLabel(value)} ${propertyUnits}`;

                  return (
                    <rect
                      key={`${rowIndex}-${columnIndex}`}
                      fill={fill}
                      height={cellHeight}
                      stroke="#ffffff"
                      strokeWidth="1"
                      width={cellWidth}
                      x={x}
                      y={y}
                    >
                      <title>{tooltip}</title>
                    </rect>
                  );
                }),
              )}
            </svg>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="h-3 overflow-hidden rounded-full border border-slate-200 bg-white">
              <div
                className="h-full w-full"
                style={{ background: "linear-gradient(90deg, #0f766e 0%, #2563eb 50%, #d97706 100%)" }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <span>
                {toFixedLabel(valueMin)} {propertyUnits}
              </span>
              <span>
                {toFixedLabel(valueMax)} {propertyUnits}
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          Não foi possível montar a superfície para os parâmetros selecionados.
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Fluido
          </p>
          <p className="mt-1 text-sm text-slate-900">{fluid}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Faixa T
          </p>
          <p className="mt-1 text-sm text-slate-900">
            {formatTemperature(temperatures[0] ?? 0)} - {formatTemperature(temperatures[temperatures.length - 1] ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Faixa P
          </p>
          <p className="mt-1 text-sm text-slate-900">
            {formatPressure(pressures[0] ?? 0)} - {formatPressure(pressures[pressures.length - 1] ?? 0)}
          </p>
        </div>
      </div>
    </section>
  );
}
