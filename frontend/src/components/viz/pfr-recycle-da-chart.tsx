import { NumericChartGrid } from "@/components/viz/chart-grid";
import { formatTableNumberText } from "@/lib/table-number";

type ChartPoint = {
  x: number;
  y: number;
};

type PfrRecycleDaChartProps = {
  title?: string;
  maxRecycleRatio?: number;
  damkohlerValues?: number[];
};

const width = 760;
const height = 330;
const padding = { top: 24, right: 28, bottom: 42, left: 72 };
const defaultDamkohlerValues = [0.25, 0.5, 1, 2, 5];
const palette = ["#0f766e", "#2563eb", "#b45309", "#7c3aed", "#dc2626"];

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
  return formatTableNumberText(value);
}

function solveConversionFromRecycleAndDa(recycleRatio: number, damkohler: number) {
  const safeRecycleRatio = Math.max(recycleRatio, 0);
  const safeDamkohler = Math.max(damkohler, 1e-6);
  const exponent = 1 / ((safeRecycleRatio + 1) * safeDamkohler);
  const expm1Value = Math.expm1(exponent);
  const denominator = expm1Value + 1 / (safeRecycleRatio + 1);

  if (!Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }

  const conversion = expm1Value / denominator;
  return Math.min(Math.max(conversion, 0), 1);
}

function buildCurvePoints(damkohler: number, maxRecycleRatio: number) {
  const sampleCount = 30;

  return Array.from({ length: sampleCount + 1 }, (_, index) => {
    const recycleRatio = (maxRecycleRatio * index) / sampleCount;
    return {
      x: recycleRatio,
      y: solveConversionFromRecycleAndDa(recycleRatio, damkohler),
    };
  });
}

function LegendItem({
  color,
  label,
  detail,
}: {
  color: string;
  label: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span>{label}</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

export function PfrRecycleDaChart({
  title = "Conversão X vs razão de reciclo R",
  maxRecycleRatio = 10,
  damkohlerValues = defaultDamkohlerValues,
}: PfrRecycleDaChartProps) {
  const safeMaxRecycleRatio = Math.max(maxRecycleRatio, 1);
  const series = damkohlerValues
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value, index) => ({
      value,
      color: palette[index % palette.length],
      points: buildCurvePoints(value, safeMaxRecycleRatio),
    }));

  return (
    <section
      className="mx-auto w-full max-w-[760px] space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="pfr-recycle-da-chart"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-muted-foreground">
            Famílias de Damköhler para comparar a conversão ao variar a razão de reciclo.
          </p>
        </div>
        <p className="text-sm font-medium text-slate-700">
          R máx = {toFixedLabel(safeMaxRecycleRatio)}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
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
            xLabel="Razão de reciclo R"
            yLabel="Conversão X"
          />

          <svg
            aria-label="Conversão do PFR com reciclo e famílias de Damkohler"
            className="absolute inset-0 block h-full w-full overflow-hidden"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            viewBox={`0 0 ${width} ${height}`}
          >
            {series.map((item) => (
              <path
                key={`da-${item.value}`}
                d={buildPath(
                  item.points.map((point) => ({
                    x: scale(point.x, 0, safeMaxRecycleRatio, padding.left, width - padding.right),
                    y: scale(point.y, 0, 1, height - padding.bottom, padding.top),
                  })),
                )}
                fill="none"
                stroke={item.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
            ))}
          </svg>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {series.map((item) => (
          <LegendItem
            key={`legend-${item.value}`}
            color={item.color}
            label={`Da = ${toFixedLabel(item.value)}`}
            detail="Curvas mais altas indicam maior conversão para o mesmo R."
          />
        ))}
      </div>
    </section>
  );
}
