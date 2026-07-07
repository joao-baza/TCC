import { NumericChartGrid } from "@/components/viz/chart-grid";

type EnergyGradeLineChartProps = {
  length: number;
  totalHeadLoss: number;
  velocity?: number | null;
  title?: string;
};

type Point = {
  x: number;
  y: number;
};

const width = 760;
const height = 320;
const padding = { top: 28, right: 28, bottom: 46, left: 72 };

function scale(value: number, min: number, max: number, start: number, end: number) {
  if (min === max) {
    return (start + end) / 2;
  }

  return start + ((value - min) / (max - min)) * (end - start);
}

function buildPath(points: Point[]) {
  if (points.length === 0) {
    return "";
  }

  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function toFixedLabel(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}

function buildSeries(start: number, end: number) {
  return [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    x: ratio,
    y: start + (end - start) * ratio,
  }));
}

export function EnergyGradeLineChart({
  length,
  totalHeadLoss,
  velocity,
  title = "Linha piezométrica e linha de energia",
}: EnergyGradeLineChartProps) {
  const g = 9.80665;
  const velocityHead = Math.max(0, ((velocity ?? 0) ** 2) / (2 * g));
  const piezometricStart = totalHeadLoss;
  const piezometricEnd = 0;
  const energyStart = piezometricStart + velocityHead;
  const energyEnd = piezometricEnd + velocityHead;
  const maxHead = Math.max(energyStart, totalHeadLoss, velocityHead, 1);

  const xDomain: [number, number] = [0, 1];
  const yDomain: [number, number] = [0, maxHead];

  const piezometricPoints = buildSeries(piezometricStart, piezometricEnd).map((point) => ({
    x: scale(point.x, xDomain[0], xDomain[1], padding.left, width - padding.right),
    y: scale(point.y, yDomain[0], yDomain[1], height - padding.bottom, padding.top),
  }));

  const energyPoints = buildSeries(energyStart, energyEnd).map((point) => ({
    x: scale(point.x, xDomain[0], xDomain[1], padding.left, width - padding.right),
    y: scale(point.y, yDomain[0], yDomain[1], height - padding.bottom, padding.top),
  }));

  const midX = (padding.left + width - padding.right) / 2;
  const midPiezometric = scale(totalHeadLoss * 0.5, yDomain[0], yDomain[1], height - padding.bottom, padding.top);
  const midEnergy = scale(totalHeadLoss * 0.5 + velocityHead, yDomain[0], yDomain[1], height - padding.bottom, padding.top);

  return (
    <section
      className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="energy-grade-line-chart"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-muted-foreground">
            Visualização didática da linha piezométrica e da linha de energia ao longo da linha.
          </p>
        </div>
        <div className="text-sm font-medium text-slate-700">
          <div>L = {toFixedLabel(length)} m</div>
          <div>v²/(2g) = {toFixedLabel(velocityHead)} m</div>
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50" style={{ aspectRatio: `${width} / ${height}` }}>
        <NumericChartGrid
          xDomain={xDomain}
          yDomain={yDomain}
          width={width}
          height={height}
          padding={padding}
          xLabel="Posição normalizada (x/L)"
          yLabel="Carga hidráulica (m)"
        />

        <svg
          aria-label={title}
          className="absolute inset-0 block h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <path
            d={buildPath(energyPoints)}
            fill="none"
            stroke="#1d4ed8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          <path
            d={buildPath(piezometricPoints)}
            fill="none"
            stroke="#059669"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />

          {energyPoints.map((point, index) => (
            <circle key={`energy-${index}`} cx={point.x} cy={point.y} fill="#1d4ed8" r="3.5" />
          ))}
          {piezometricPoints.map((point, index) => (
            <circle key={`piezometric-${index}`} cx={point.x} cy={point.y} fill="#059669" r="3.5" />
          ))}

          <line
            stroke="#94a3b8"
            strokeDasharray="5 5"
            strokeWidth="1.5"
            x1={midX}
            x2={midX}
            y1={midEnergy}
            y2={midPiezometric}
          />
        </svg>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Linha de energia
          </p>
          <p className="mt-1 text-sm text-slate-900">
            {toFixedLabel(energyStart)} → {toFixedLabel(energyEnd)} m
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Linha piezométrica
          </p>
          <p className="mt-1 text-sm text-slate-900">
            {toFixedLabel(piezometricStart)} → {toFixedLabel(piezometricEnd)} m
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Separação
          </p>
          <p className="mt-1 text-sm text-slate-900">{toFixedLabel(velocityHead)} m</p>
        </div>
      </div>
    </section>
  );
}
