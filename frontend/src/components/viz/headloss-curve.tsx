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

function scaleValue(value: number, min: number, max: number, size: number) {
  if (min === max) {
    return size / 2;
  }

  return ((value - min) / (max - min)) * size;
}

export function HeadlossCurve({
  method,
  points,
  operationalPoint,
  scenarios = [],
}: HeadlossCurveProps) {
  const sortedPoints = [...points].sort((left, right) => left.flowRate - right.flowRate);
  const allPoints = [...sortedPoints, operationalPoint];
  const flowRates = allPoints.map((point) => point.flowRate);
  const headlosses = allPoints.map((point) => point.headloss);

  const minFlowRate = Math.min(...flowRates);
  const maxFlowRate = Math.max(...flowRates);
  const minHeadloss = Math.min(...headlosses);
  const maxHeadloss = Math.max(...headlosses);

  const chartWidth = 320;
  const chartHeight = 180;
  const padding = 20;
  const innerWidth = chartWidth - padding * 2;
  const innerHeight = chartHeight - padding * 2;

  const plottedPoints = sortedPoints.map((point) => {
      const x = padding + scaleValue(point.flowRate, minFlowRate, maxFlowRate, innerWidth);
      const y =
        chartHeight -
        padding -
        scaleValue(point.headloss, minHeadloss, maxHeadloss, innerHeight);

      return { ...point, x, y };
    });

  const pathData =
    plottedPoints.length > 1
      ? plottedPoints
          .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
          .join(" ")
      : null;

  const operationalX =
    padding + scaleValue(operationalPoint.flowRate, minFlowRate, maxFlowRate, innerWidth);
  const operationalY =
    chartHeight -
    padding -
    scaleValue(operationalPoint.headloss, minHeadloss, maxHeadloss, innerHeight);

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

      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full"
        role="img"
        aria-label={`Curva de perda de carga pelo metodo ${method}`}
      >
        <rect x="0" y="0" width={chartWidth} height={chartHeight} fill="#FFFFFF" />
        <line
          x1={padding}
          y1={chartHeight - padding}
          x2={chartWidth - padding}
          y2={chartHeight - padding}
          stroke="#CBD5E1"
          strokeWidth="1"
        />
        <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} stroke="#CBD5E1" strokeWidth="1" />
        {pathData ? <path d={pathData} fill="none" stroke="#2563EB" strokeWidth="2.5" /> : null}
        {plottedPoints.map((point) => (
          <circle key={`${point.flowRate}-${point.headloss}`} cx={point.x} cy={point.y} r="3" fill="#2563EB" />
        ))}
        <circle cx={operationalX} cy={operationalY} r="5" fill="#DC2626" />
      </svg>

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
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: scenario.color }}
                />
                {scenario.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
