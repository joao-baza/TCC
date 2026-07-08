import { NumericChartGrid } from "@/components/viz/chart-grid";
import { formatTableNumberText } from "@/lib/table-number";
import { PfrRecycleDaHowItWorks } from "@/features/reactor/didactics";

type SvgPoint = {
  x: number;
  y: number;
};

export type PfrRecycleProfilePoint = {
  recyclingRatio: number;
  conversion: number;
};

type PfrRecycleDaChartProps = {
  title?: string;
  points: PfrRecycleProfilePoint[];
  volume?: number | null;
  error?: string | null;
};

const width = 760;
const height = 330;
const padding = { top: 24, right: 28, bottom: 42, left: 72 };
const profileColor = "#0f766e";

function scale(value: number, min: number, max: number, start: number, end: number) {
  if (min === max) {
    return (start + end) / 2;
  }

  return start + ((value - min) / (max - min)) * (end - start);
}

function buildPath(points: SvgPoint[]) {
  if (points.length === 0) {
    return "";
  }

  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function toFixedLabel(value: number) {
  return formatTableNumberText(value);
}

function normalizePoints(points: PfrRecycleProfilePoint[]) {
  return points
    .filter(
      (point) =>
        Number.isFinite(point.recyclingRatio) &&
        point.recyclingRatio >= 0 &&
        Number.isFinite(point.conversion),
    )
    .map((point) => ({
      recyclingRatio: point.recyclingRatio,
      conversion: Math.min(Math.max(point.conversion, 0), 1),
    }))
    .sort((left, right) => left.recyclingRatio - right.recyclingRatio);
}

export function PfrRecycleDaChart({
  title = "Conversão do caso atual vs razão de reciclo R",
  points,
  volume = null,
  error = null,
}: PfrRecycleDaChartProps) {
  const normalizedPoints = normalizePoints(points);
  const safeMaxRecycleRatio = Math.max(normalizedPoints.at(-1)?.recyclingRatio ?? 1, 1);
  const path = buildPath(
    normalizedPoints.map((point) => ({
      x: scale(point.recyclingRatio, 0, safeMaxRecycleRatio, padding.left, width - padding.right),
      y: scale(point.conversion, 0, 1, height - padding.bottom, padding.top),
    })),
  );

  return (
    <section
      className="mx-auto w-full max-w-[760px] space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="pfr-recycle-da-chart"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {volume != null ? (
            <p className="mt-1 text-xs font-medium text-slate-600">
              Base do perfil: V = {toFixedLabel(volume)} m³
            </p>
          ) : null}
        </div>
      </div>

      <PfrRecycleDaHowItWorks />

      {error ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <div
        className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-white"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        <NumericChartGrid
          xDomain={[0, safeMaxRecycleRatio]}
          yDomain={[0, 1]}
          width={width}
          height={height}
          padding={padding}
          xLabel="Razão de reciclo - R"
          yLabel="Conversão - X"
        />

        <svg
          aria-label="Conversão real do PFR para o caso atual ao variar a razão de reciclo"
          className="absolute inset-0 block h-full w-full overflow-hidden"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {path ? (
            <path
              d={path}
              fill="none"
              stroke={profileColor}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          ) : null}
          {normalizedPoints.map((point) => (
            <circle
              key={`recycle-point-${point.recyclingRatio}`}
              cx={scale(point.recyclingRatio, 0, safeMaxRecycleRatio, padding.left, width - padding.right)}
              cy={scale(point.conversion, 0, 1, height - padding.bottom, padding.top)}
              fill={profileColor}
              r="4"
            />
          ))}
        </svg>
      </div>
    </section>
  );
}
