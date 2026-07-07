import { NumericChartGrid } from "@/components/viz/chart-grid";
import { expandNumericDomain } from "@/components/viz/chart-axis-utils";
import type { Scenario } from "@/features/exploratory/types";

type HeadlossCurvePoint = {
  flowRate: number;
  headloss: number;
};

type HeadlossCurveProps = {
  method: string;
  points: HeadlossCurvePoint[];
  operationalPoint: HeadlossCurvePoint;
  scenarios?: Scenario[];
};

const width = 320;
const height = 180;
const padding = { top: 20, right: 20, bottom: 40, left: 44 };

function scaleValue(value: number, min: number, max: number, start: number, end: number) {
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

export function HeadlossCurve({
  method,
  points,
  operationalPoint,
  scenarios = [],
}: HeadlossCurveProps) {
  const sortedPoints = [...points].sort((left, right) => left.flowRate - right.flowRate);
  const allPoints = [...sortedPoints, operationalPoint];
  const flowDomain = expandNumericDomain(allPoints.map((point) => point.flowRate));
  const headlossDomain = expandNumericDomain(allPoints.map((point) => point.headloss));

  const plottedPoints = sortedPoints.map((point) => ({
    ...point,
    x: scaleValue(point.flowRate, flowDomain.min, flowDomain.max, padding.left, width - padding.right),
    y: scaleValue(point.headloss, headlossDomain.min, headlossDomain.max, height - padding.bottom, padding.top),
  }));

  const pathData = plottedPoints.length > 1 ? buildPath(plottedPoints) : "";
  const operationalX = scaleValue(
    operationalPoint.flowRate,
    flowDomain.min,
    flowDomain.max,
    padding.left,
    width - padding.right,
  );
  const operationalY = scaleValue(
    operationalPoint.headloss,
    headlossDomain.min,
    headlossDomain.max,
    height - padding.bottom,
    padding.top,
  );

  return (
    <section className="mt-3 rounded-xl border border-slate-200 p-3">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-slate-800">Perda de Carga × Vazão</h3>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>Q = {operationalPoint.flowRate}</span>
            <span>h_f = {operationalPoint.headloss}</span>
          </div>
        </div>
        <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-700">
          {method}
        </span>
      </div>

      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50" style={{ aspectRatio: `${width} / ${height}` }}>
        <NumericChartGrid
          xDomain={[flowDomain.min, flowDomain.max]}
          yDomain={[headlossDomain.min, headlossDomain.max]}
          width={width}
          height={height}
          padding={padding}
          xLabel="Vazão volumétrica (m³/s)"
          yLabel="Perda de carga acumulada (m)"
        />

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="absolute inset-0 block h-full w-full"
          role="img"
          aria-label={`Curva de perda de carga pelo metodo ${method}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {pathData ? <path d={pathData} fill="none" stroke="#2563EB" strokeWidth="2.5" /> : null}
          {plottedPoints.map((point) => (
            <circle key={`${point.flowRate}-${point.headloss}`} cx={point.x} cy={point.y} r="3" fill="#2563EB" />
          ))}
          <circle cx={operationalX} cy={operationalY} r="5" fill="#DC2626" />
        </svg>
      </div>

      {scenarios.length > 0 ? (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
            Cenários salvos
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {scenarios.map((scenario) => (
              <span
                key={scenario.id}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: scenario.color }} />
                {scenario.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
