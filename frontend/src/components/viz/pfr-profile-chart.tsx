import { expandNumericDomain } from "@/components/viz/chart-axis-utils";
import { NumericChartGrid } from "@/components/viz/chart-grid";

type ProfileSeries = {
  label: string;
  start: number;
  end: number;
  color: string;
};

type PfrProfileChartProps = {
  concentrationSeries: ProfileSeries[];
  temperature: {
    inlet: number;
    outlet: number;
  };
  title?: string;
};

type ChartPoint = {
  x: number;
  y: number;
};

const width = 760;
const height = 330;
const padding = { top: 24, right: 28, bottom: 42, left: 72 };

function scale(value: number, min: number, max: number, start: number, end: number) {
  if (min === max) {
    return (start + end) / 2;
  }

  return start + ((value - min) / (max - min)) * (end - start);
}

function buildPath(points: ChartPoint[]) {
  if (points.length === 0) {
    return "";
  }

  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function toFixedLabel(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}

function buildSeriesPoints(series: ProfileSeries) {
  return [0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio) => ({
    x: ratio,
    y: series.start + (series.end - series.start) * ratio,
  }));
}

export function PfrProfileChart({
  concentrationSeries,
  temperature,
  title = "Perfis de concentração e temperatura no PFR",
}: PfrProfileChartProps) {
  const concentrationValues = concentrationSeries.flatMap((series) => [series.start, series.end]);
  const concentrationDomain = expandNumericDomain([...concentrationValues, 0, 1]);

  const concentrationPaths = concentrationSeries.map((series) => {
    const points = buildSeriesPoints(series).map((point) => ({
      x: scale(point.x, 0, 1, padding.left, width - padding.right),
      y: scale(
        point.y,
        concentrationDomain.min,
        concentrationDomain.max,
        height - padding.bottom,
        padding.top,
      ),
    }));

    return { ...series, points };
  });

  const temperatureValues = [temperature.inlet, temperature.outlet];
  const temperatureDomain = expandNumericDomain(temperatureValues);
  const temperaturePoints = buildSeriesPoints({
    label: "Temperatura",
    start: temperature.inlet,
    end: temperature.outlet,
    color: "#b45309",
  }).map((point) => ({
    x: scale(point.x, 0, 1, padding.left, width - padding.right),
    y: scale(
      point.y,
      temperatureDomain.min,
      temperatureDomain.max,
      height - padding.bottom,
      padding.top,
    ),
  }));

  return (
    <section
      className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="pfr-profile-chart"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-muted-foreground">
            Perfis normalizados ao longo do volume do reator, com interpolação entre entrada e saída.
          </p>
        </div>
        <p className="text-sm font-medium text-slate-700">
          T: {toFixedLabel(temperature.inlet)} → {toFixedLabel(temperature.outlet)} K
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-sm font-medium text-slate-800">Concentração por componente</p>
          <div
            className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white"
            style={{ aspectRatio: `${width} / ${height}` }}
          >
            <NumericChartGrid
              xDomain={[0, 1]}
              yDomain={[concentrationDomain.min, concentrationDomain.max]}
              width={width}
              height={height}
              padding={padding}
              xLabel="Volume relativo do reator (V/V_total)"
              yLabel="Concentração (mol/L)"
            />
            <svg
              aria-label="Perfil de concentração no PFR"
              className="absolute inset-0 block h-full w-full overflow-hidden"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              viewBox={`0 0 ${width} ${height}`}
            >
              {concentrationPaths.map((series) => (
                <g key={series.label}>
                  <path
                    d={buildPath(series.points)}
                    fill="none"
                    stroke={series.color}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                  />
                  {series.points.map((point, index) => (
                    <circle
                      key={`${series.label}-${index}`}
                      cx={point.x}
                      cy={point.y}
                      fill={series.color}
                      r="3.5"
                    />
                  ))}
                </g>
              ))}
            </svg>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
            {concentrationPaths.map((series) => (
              <span
                key={`legend-${series.label}`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: series.color }} />
                {series.label}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-sm font-medium text-slate-800">Programa térmico</p>
          <div
            className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white"
            style={{ aspectRatio: `${width} / ${height}` }}
          >
            <NumericChartGrid
              xDomain={[0, 1]}
              yDomain={[temperatureDomain.min, temperatureDomain.max]}
              width={width}
              height={height}
              padding={padding}
              xLabel="Volume relativo do reator (V/V_total)"
              yLabel="Temperatura (K)"
            />
            <svg
              aria-label="Perfil de temperatura no PFR"
              className="absolute inset-0 block h-full w-full overflow-hidden"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              viewBox={`0 0 ${width} ${height}`}
            >
              <path
                d={buildPath(temperaturePoints)}
                fill="none"
                stroke="#b45309"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
              {temperaturePoints.map((point, index) => (
                <circle key={`temp-${index}`} cx={point.x} cy={point.y} fill="#b45309" r="3.5" />
              ))}
            </svg>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-700" />
              Temperatura
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {concentrationSeries.map((series) => (
          <div key={series.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {series.label}
            </p>
            <p className="mt-1 text-sm text-slate-900">
              {toFixedLabel(series.start)} → {toFixedLabel(series.end)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
