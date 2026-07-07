import { NumericChartGrid } from "@/components/viz/chart-grid";

type CurvePoint = {
  flowRate: number;
  head: number;
};

type PumpEfficiencyMapProps = {
  operatingPoint: CurvePoint;
  systemCurve: CurvePoint[];
  availableNpsh?: number | null;
  requiredNpsh?: number | null;
  title?: string;
};

type PlotPoint = {
  x: number;
  y: number;
};

const width = 820;
const height = 420;
const padding = { top: 28, right: 28, bottom: 48, left: 72 };

function scale(value: number, min: number, max: number, start: number, end: number) {
  if (min === max) {
    return (start + end) / 2;
  }

  return start + ((value - min) / (max - min)) * (end - start);
}

function buildPath(points: PlotPoint[]) {
  if (points.length === 0) {
    return "";
  }

  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function toFixedLabel(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}

function interpolate(from: number, to: number, ratio: number) {
  return from + (to - from) * ratio;
}

function efficiencyToColor(efficiency: number) {
  const normalized = Math.max(0, Math.min(1, efficiency));
  const hue = interpolate(220, 145, normalized);
  const saturation = interpolate(72, 78, normalized);
  const lightness = interpolate(92, 40, normalized);
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

function buildEfficiency(flow: number, head: number, bepFlow: number, bepHead: number, maxFlow: number, maxHead: number) {
  const q = flow / Math.max(maxFlow, 1);
  const h = head / Math.max(maxHead, 1);
  const qBep = bepFlow / Math.max(maxFlow, 1);
  const hBep = bepHead / Math.max(maxHead, 1);

  const distance = (q - qBep) ** 2 * 3.4 + (h - hBep) ** 2 * 2.2;
  return Math.max(0.18, 0.92 - distance);
}

export function PumpEfficiencyMap({
  operatingPoint,
  systemCurve,
  availableNpsh,
  requiredNpsh,
  title = "Mapa de eficiência da bomba e BEP",
}: PumpEfficiencyMapProps) {
  const sortedCurve = [...systemCurve].sort((left, right) => left.flowRate - right.flowRate);
  const maxFlow = Math.max(operatingPoint.flowRate, ...sortedCurve.map((point) => point.flowRate), 1);
  const maxHead = Math.max(operatingPoint.head, ...sortedCurve.map((point) => point.head), 1);
  const bepFlow = operatingPoint.flowRate > 0 ? operatingPoint.flowRate : maxFlow * 0.55;
  const bepHead = operatingPoint.head > 0 ? operatingPoint.head : maxHead * 0.62;

  const cols = 10;
  const rows = 7;
  const gridWidth = width - padding.left - padding.right;
  const gridHeight = height - padding.top - padding.bottom;
  const cellWidth = gridWidth / cols;
  const cellHeight = gridHeight / rows;
  const xDomain: [number, number] = [0, maxFlow * 1.1];
  const yDomain: [number, number] = [0, maxHead * 1.1];

  const curvePoints: PlotPoint[] = sortedCurve.map((point) => ({
    x: scale(point.flowRate, xDomain[0], xDomain[1], padding.left, width - padding.right),
    y: scale(point.head, yDomain[0], yDomain[1], height - padding.bottom, padding.top),
  }));
  const operatingX = scale(operatingPoint.flowRate, xDomain[0], xDomain[1], padding.left, width - padding.right);
  const operatingY = scale(operatingPoint.head, yDomain[0], yDomain[1], height - padding.bottom, padding.top);
  const bepX = scale(bepFlow, xDomain[0], xDomain[1], padding.left, width - padding.right);
  const bepY = scale(bepHead, yDomain[0], yDomain[1], height - padding.bottom, padding.top);

  const cavitationPath = [
    `M ${padding.left} ${height - padding.bottom}`,
    `L ${padding.left} ${height - padding.bottom - gridHeight * 0.3}`,
    `L ${padding.left + gridWidth * 0.34} ${height - padding.bottom - gridHeight * 0.3}`,
    `L ${padding.left + gridWidth * 0.34} ${height - padding.bottom}`,
    "Z",
  ].join(" ");

  const cells: Array<{ x: number; y: number; efficiency: number; width: number; height: number }> = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = padding.left + col * cellWidth;
      const y = padding.top + row * cellHeight;
      const flow = ((col + 0.5) / cols) * xDomain[1];
      const head = ((rows - row - 0.5) / rows) * yDomain[1];
      cells.push({
        x,
        y,
        width: cellWidth,
        height: cellHeight,
        efficiency: buildEfficiency(flow, head, bepFlow, bepHead, xDomain[1], yDomain[1]),
      });
    }
  }

  const npshMargin =
    availableNpsh != null && requiredNpsh != null ? availableNpsh - requiredNpsh : null;

  return (
    <section
      className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="pump-efficiency-map"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-muted-foreground">
            Mapa sintético para leitura didática da região de melhor eficiência e faixa de cavitação.
          </p>
        </div>
        <div className="text-sm font-medium text-slate-700">
          <div>Q = {toFixedLabel(operatingPoint.flowRate)}</div>
          <div>H = {toFixedLabel(operatingPoint.head)}</div>
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50" style={{ aspectRatio: `${width} / ${height}` }}>
        <NumericChartGrid
          xDomain={xDomain}
          yDomain={yDomain}
          width={width}
          height={height}
          padding={padding}
          xLabel="Vazão volumétrica (Q)"
          yLabel="Altura manométrica (H)"
        />

        <svg
          aria-label={title}
          className="absolute inset-0 block h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {cells.map((cell, index) => (
            <rect
              key={`cell-${index}`}
              fill={efficiencyToColor(cell.efficiency)}
              height={cell.height}
              stroke="#ffffff"
              strokeWidth="1"
              width={cell.width}
              x={cell.x}
              y={cell.y}
            />
          ))}

          <path d={cavitationPath} fill="rgba(249, 115, 22, 0.16)" stroke="none" />

          <path
            d={buildPath(curvePoints)}
            fill="none"
            stroke="#0f766e"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          {curvePoints.map((point, index) => (
            <circle key={`curve-${index}`} cx={point.x} cy={point.y} fill="#0f766e" r="3.25" />
          ))}

          <circle cx={bepX} cy={bepY} fill="#16a34a" r="7" />
          <circle cx={operatingX} cy={operatingY} fill="#dc2626" r="6" />

          <line
            stroke="#1d4ed8"
            strokeDasharray="5 5"
            strokeWidth="2"
            x1={operatingX}
            x2={operatingX}
            y1={operatingY}
            y2={height - padding.bottom}
          />
        </svg>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
          Curva da bomba
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
          BEP
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
          Operacao
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
          Faixa de cavitacao aproximada
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            BEP aproximado
          </p>
          <p className="mt-1 text-sm text-slate-900">Q = {toFixedLabel(bepFlow)} · H = {toFixedLabel(bepHead)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Ponto operacional
          </p>
          <p className="mt-1 text-sm text-slate-900">
            Q = {toFixedLabel(operatingPoint.flowRate)} · H = {toFixedLabel(operatingPoint.head)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Margem NPSH
          </p>
          <p className="mt-1 text-sm text-slate-900">
            {npshMargin == null
              ? "Calcule o NPSH para comparar a margem."
              : `${toFixedLabel(npshMargin)} m de margem`}
          </p>
        </div>
      </div>
    </section>
  );
}
