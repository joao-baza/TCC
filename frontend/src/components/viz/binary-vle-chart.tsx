import { NumericChartGrid } from "@/components/viz/chart-grid";
import { expandNumericDomain } from "@/components/viz/chart-axis-utils";

type BinaryVlePoint = {
  liquid_fraction: number;
  vapor_fraction: number;
  temperature: number;
};

type BinaryVleChartProps = {
  fluid1: string;
  fluid2: string;
  pressure: number;
  bubblePoints: BinaryVlePoint[];
  dewPoints: BinaryVlePoint[];
  title?: string;
};

type Point = {
  x: number;
  y: number;
};

const width = 760;
const height = 320;
const padding = { top: 28, right: 28, bottom: 44, left: 72 };

function scale(value: number, min: number, max: number, start: number, end: number) {
  if (min === max) {
    return (start + end) / 2;
  }

  return start + ((value - min) / (max - min)) * (end - start);
}

function toFixedLabel(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}

function buildPath(points: Point[]) {
  if (points.length === 0) {
    return "";
  }

  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function normalizeComposition(value: number) {
  return Math.max(0, Math.min(1, value));
}

function buildSeries(points: BinaryVlePoint[], mode: "bubble" | "dew" | "yx") {
  return points.map((point) => {
    const composition =
      mode === "bubble"
        ? point.liquid_fraction
        : mode === "dew"
          ? point.vapor_fraction
          : point.liquid_fraction;
    const response =
      mode === "bubble"
        ? point.temperature
        : mode === "dew"
          ? point.temperature
          : point.vapor_fraction;

    return { x: composition, y: response };
  });
}

export function BinaryVleChart({
  fluid1,
  fluid2,
  pressure,
  bubblePoints,
  dewPoints,
  title = "Diagrama T-x-y / y-x",
}: BinaryVleChartProps) {
  const temperatureValues = [...bubblePoints, ...dewPoints].map((point) => point.temperature);
  const temperatureDomain = expandNumericDomain(temperatureValues);
  const compositionDomain = { min: 0, max: 1 };

  const bubbleSeries = buildSeries(bubblePoints, "bubble").map((point) => ({
    x: scale(normalizeComposition(point.x), compositionDomain.min, compositionDomain.max, padding.left, width - padding.right),
    y: scale(point.y, temperatureDomain.min, temperatureDomain.max, height - padding.bottom, padding.top),
  }));
  const dewSeries = buildSeries(dewPoints, "dew").map((point) => ({
    x: scale(normalizeComposition(point.x), compositionDomain.min, compositionDomain.max, padding.left, width - padding.right),
    y: scale(point.y, temperatureDomain.min, temperatureDomain.max, height - padding.bottom, padding.top),
  }));
  const yxSeries = buildSeries(bubblePoints, "yx").map((point) => ({
    x: scale(normalizeComposition(point.x), compositionDomain.min, compositionDomain.max, padding.left, width - padding.right),
    y: scale(normalizeComposition(point.y), compositionDomain.min, compositionDomain.max, height - padding.bottom, padding.top),
  }));
  const diagonalSeries = buildSeries(
    bubblePoints.length ? [{ liquid_fraction: 0, vapor_fraction: 0, temperature: 0 }, { liquid_fraction: 1, vapor_fraction: 1, temperature: 0 }] : [],
    "yx",
  ).map((point) => ({
    x: scale(point.x, compositionDomain.min, compositionDomain.max, padding.left, width - padding.right),
    y: scale(point.y, compositionDomain.min, compositionDomain.max, height - padding.bottom, padding.top),
  }));

  return (
    <section
      className="space-y-5 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="binary-vle-chart"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-muted-foreground">
            Aproximação didática ideal de Raoult para {fluid1} / {fluid2}.
          </p>
        </div>
        <p className="text-sm font-medium text-slate-700">P = {toFixedLabel(pressure)} Pa</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-sm font-medium text-slate-800">T-x-y</p>
          <div
            className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white"
            style={{ aspectRatio: `${width} / ${height}` }}
          >
            <NumericChartGrid
              xDomain={[compositionDomain.min, compositionDomain.max]}
              yDomain={[temperatureDomain.min, temperatureDomain.max]}
              width={width}
              height={height}
              padding={padding}
              xLabel="Fração molar"
              yLabel="Temperatura (K)"
            />
            <svg
              aria-label="Diagrama T-x-y"
              className="absolute inset-0 block h-full w-full overflow-hidden"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              viewBox={`0 0 ${width} ${height}`}
            >
              <path
                d={buildPath(bubbleSeries)}
                fill="none"
                stroke="#0f766e"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
              <path
                d={buildPath(dewSeries)}
                fill="none"
                stroke="#b45309"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />

              {bubbleSeries.map((point, index) => (
                <circle key={`bubble-${index}`} cx={point.x} cy={point.y} fill="#0f766e" r="3.5" />
              ))}
              {dewSeries.map((point, index) => (
                <circle key={`dew-${index}`} cx={point.x} cy={point.y} fill="#b45309" r="3.5" />
              ))}
            </svg>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              Curva de bolha
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              Curva de orvalho
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-sm font-medium text-slate-800">y-x</p>
          <div
            className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white"
            style={{ aspectRatio: `${width} / ${height}` }}
          >
            <NumericChartGrid
              xDomain={[compositionDomain.min, compositionDomain.max]}
              yDomain={[compositionDomain.min, compositionDomain.max]}
              width={width}
              height={height}
              padding={padding}
              xLabel="Fração molar x₁"
              yLabel="Fração molar y₁"
            />
            <svg
              aria-label="Diagrama y-x"
              className="absolute inset-0 block h-full w-full overflow-hidden"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              viewBox={`0 0 ${width} ${height}`}
            >
              <path
                d={buildPath(diagonalSeries)}
                fill="none"
                stroke="#94a3b8"
                strokeDasharray="5 5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <path
                d={buildPath(yxSeries)}
                fill="none"
                stroke="#1d4ed8"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />

              {yxSeries.map((point, index) => (
                <circle key={`yx-${index}`} cx={point.x} cy={point.y} fill="#1d4ed8" r="3.5" />
              ))}
            </svg>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              y = x
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              Equilíbrio líquido-vapor
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Componente 1
          </p>
          <p className="mt-1 text-sm text-slate-900">{fluid1}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Componente 2
          </p>
          <p className="mt-1 text-sm text-slate-900">{fluid2}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Pontos bolha
          </p>
          <p className="mt-1 text-sm text-slate-900">{bubblePoints.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Pontos orvalho
          </p>
          <p className="mt-1 text-sm text-slate-900">{dewPoints.length}</p>
        </div>
      </div>
    </section>
  );
}
