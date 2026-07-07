import { NumericChartGrid } from "@/components/viz/chart-grid";

type PressureProfileItem = {
  label: string;
  quantity: number;
};

type PressureProfileChartProps = {
  length: number;
  totalDrop: number;
  items: PressureProfileItem[];
  title?: string;
};

const width = 760;
const height = 320;
const padding = { top: 24, right: 24, bottom: 48, left: 64 };

function scale(value: number, min: number, max: number, start: number, end: number) {
  if (min === max) {
    return (start + end) / 2;
  }

  return start + ((value - min) / (max - min)) * (end - start);
}

function toFixedLabel(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}

export function PressureProfileChart({
  length,
  totalDrop,
  items,
  title = "Perfil de pressao por trecho e acessorio",
}: PressureProfileChartProps) {
  const totalWeight = items.reduce((sum, item) => sum + Math.max(item.quantity, 0), 0) || 1;
  const visibleItems = items.length ? items : [{ label: "Tubulacao", quantity: 1 }];

  const segments = visibleItems.map((item, index) => {
    const share = item.quantity / totalWeight;
    const endX =
      index === visibleItems.length - 1
        ? length
        : visibleItems.slice(0, index + 1).reduce((sum, prev) => sum + prev.quantity / totalWeight, 0) * length;

    return {
      ...item,
      share,
      endX,
      drop: totalDrop * share,
    };
  });

  const points: Array<{ x: number; y: number }> = [{ x: 0, y: totalDrop }];
  let cumulativeDrop = totalDrop;
  for (const segment of segments) {
    cumulativeDrop = Math.max(cumulativeDrop - segment.drop, 0);
    points.push({ x: segment.endX, y: cumulativeDrop });
  }
  points.push({ x: length, y: 0 });

  const xDomain: [number, number] = [0, Math.max(length, 1)];
  const yDomain: [number, number] = [0, Math.max(totalDrop, ...points.map((point) => point.y), 1)];

  const pathData = points
    .map((point, index) => {
      const x = scale(point.x, xDomain[0], xDomain[1], padding.left, width - padding.right);
      const y = scale(point.y, yDomain[0], yDomain[1], height - padding.bottom, padding.top);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <section
      className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="pressure-profile-chart"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-muted-foreground">
            O perfil mostra a perda relativa ao longo da tubulacao e de cada acessorio.
          </p>
        </div>
        <div className="text-sm font-medium text-slate-700">
          <div>L = {toFixedLabel(length)} m</div>
          <div>h_f = {toFixedLabel(totalDrop)} m</div>
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50" style={{ aspectRatio: `${width} / ${height}` }}>
        <NumericChartGrid
          xDomain={xDomain}
          yDomain={yDomain}
          width={width}
          height={height}
          padding={padding}
          xLabel="Comprimento da tubulação (m)"
          yLabel="Perda acumulada de pressão (m)"
        />

        <svg
          aria-label={title}
          className="absolute inset-0 block h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <path
            d={pathData}
            fill="none"
            stroke="#1d4ed8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />

          {points.map((point, index) => (
            <circle
              key={`profile-${index}`}
              cx={scale(point.x, xDomain[0], xDomain[1], padding.left, width - padding.right)}
              cy={scale(point.y, yDomain[0], yDomain[1], height - padding.bottom, padding.top)}
              fill="#1d4ed8"
              r="4"
            />
          ))}
        </svg>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {segments.map((segment) => (
          <div key={segment.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {segment.label}
            </p>
            <p className="mt-1 text-slate-900">
              {segment.quantity} x {toFixedLabel(segment.drop)} m
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
