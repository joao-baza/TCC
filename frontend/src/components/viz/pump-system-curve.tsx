import { NumericChartGrid } from "@/components/viz/chart-grid";

type CurvePoint = {
  flowRate: number;
  head: number;
};

type PumpSystemCurveProps = {
  operatingPoint: CurvePoint;
  systemPoints: CurvePoint[];
  title?: string;
};

const width = 760;
const height = 360;
const padding = { top: 28, right: 28, bottom: 44, left: 68 };

function scale(value: number, min: number, max: number, start: number, end: number) {
  if (min === max) {
    return (start + end) / 2;
  }

  return start + ((value - min) / (max - min)) * (end - start);
}

function buildPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return "";
  }

  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function toFixedLabel(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}

function buildPumpCurve(operatingPoint: CurvePoint, maxFlowRate: number) {
  const effectiveFlow = Math.max(operatingPoint.flowRate, maxFlowRate * 0.35, 0.5);
  const shutoffHead = Math.max(operatingPoint.head * 1.22, operatingPoint.head + 2, 5);
  const coefficient = (shutoffHead - operatingPoint.head) / Math.max(effectiveFlow ** 2, 1);
  const sampleRates = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ratio * maxFlowRate);

  return sampleRates.map((flowRate) => ({
    flowRate,
    head: Math.max(shutoffHead - coefficient * flowRate ** 2, 0),
  }));
}

export function PumpSystemCurve({
  operatingPoint,
  systemPoints,
  title = "Curva da bomba vs curva do sistema",
}: PumpSystemCurveProps) {
  const sortedSystemPoints = [...systemPoints].sort((left, right) => left.flowRate - right.flowRate);
  const maxFlowRate = Math.max(
    operatingPoint.flowRate,
    ...sortedSystemPoints.map((point) => point.flowRate),
    1,
  );
  const pumpPoints = buildPumpCurve(operatingPoint, maxFlowRate * 1.15);
  const allPoints = [...sortedSystemPoints, ...pumpPoints, operatingPoint];
  const minFlowRate = Math.min(...allPoints.map((point) => point.flowRate));
  const maxHead = Math.max(...allPoints.map((point) => point.head));
  const minHead = Math.min(...allPoints.map((point) => point.head));
  const xDomain: [number, number] = [minFlowRate, maxFlowRate * 1.15];
  const yDomain: [number, number] = [minHead, maxHead];

  const systemPath = buildPath(
    sortedSystemPoints.map((point) => ({
      x: scale(point.flowRate, xDomain[0], xDomain[1], padding.left, width - padding.right),
      y: scale(point.head, yDomain[0], yDomain[1], height - padding.bottom, padding.top),
    })),
  );
  const pumpPath = buildPath(
    pumpPoints.map((point) => ({
      x: scale(point.flowRate, xDomain[0], xDomain[1], padding.left, width - padding.right),
      y: scale(point.head, yDomain[0], yDomain[1], height - padding.bottom, padding.top),
    })),
  );

  const operatingX = scale(
    operatingPoint.flowRate,
    xDomain[0],
    xDomain[1],
    padding.left,
    width - padding.right,
  );
  const operatingY = scale(
    operatingPoint.head,
    yDomain[0],
    yDomain[1],
    height - padding.bottom,
    padding.top,
  );

  const pumpShutoffHead = Math.max(operatingPoint.head * 1.22, operatingPoint.head + 2, 5);
  const bepFlow = operatingPoint.flowRate > 0 ? operatingPoint.flowRate : maxFlowRate * 0.55;

  return (
    <section
      className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="pump-system-curve"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-muted-foreground">
            A bomba local usa uma aproximação quadrática para mostrar o ponto de operação.
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
          <path
            d={pumpPath}
            fill="none"
            stroke="#0f766e"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          <path
            d={systemPath}
            fill="none"
            stroke="#b45309"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />

          {pumpPoints.map((point, index) => (
            <circle
              key={`pump-${index}`}
              cx={scale(point.flowRate, xDomain[0], xDomain[1], padding.left, width - padding.right)}
              cy={scale(point.head, yDomain[0], yDomain[1], height - padding.bottom, padding.top)}
              fill="#0f766e"
              r="3.5"
            />
          ))}
          {sortedSystemPoints.map((point, index) => (
            <circle
              key={`system-${index}`}
              cx={scale(point.flowRate, xDomain[0], xDomain[1], padding.left, width - padding.right)}
              cy={scale(point.head, yDomain[0], yDomain[1], height - padding.bottom, padding.top)}
              fill="#b45309"
              r="3.5"
            />
          ))}

          <line
            stroke="#1d4ed8"
            strokeDasharray="5 5"
            strokeWidth="2"
            x1={operatingX}
            x2={operatingX}
            y1={operatingY}
            y2={height - padding.bottom}
          />
          <circle cx={operatingX} cy={operatingY} fill="#1d4ed8" r="6" />
        </svg>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Bomba
          </p>
          <p className="mt-1 text-slate-900">Bomba didatica. H0 ≈ {toFixedLabel(pumpShutoffHead)} m</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Sistema
          </p>
          <p className="mt-1 text-slate-900">Curva de perda total calculada pelo backend.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Operacao
          </p>
          <p className="mt-1 text-slate-900">
            Interseccao no ponto de vazao atual. BEP aprox. em Q = {toFixedLabel(bepFlow)}
          </p>
        </div>
      </div>
    </section>
  );
}
