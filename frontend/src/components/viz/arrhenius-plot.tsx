import { NumericChartGrid } from "@/components/viz/chart-grid";
import { expandNumericDomain } from "@/components/viz/chart-axis-utils";

type ArrheniusPlotProps = {
  activationEnergy: number;
  referenceTemperature: number;
  referenceRateConstant: number;
  minTemperature?: number;
  maxTemperature?: number;
  title?: string;
};

const width = 760;
const height = 360;
const padding = { top: 28, right: 28, bottom: 44, left: 72 };
const gasConstant = 8.314462618;

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

export function ArrheniusPlot({
  activationEnergy,
  referenceTemperature,
  referenceRateConstant,
  minTemperature,
  maxTemperature,
  title = "Arrhenius",
}: ArrheniusPlotProps) {
  if (!(activationEnergy > 0) || !(referenceTemperature > 0) || !(referenceRateConstant > 0)) {
    return (
      <section className="mt-3 rounded-xl border border-slate-200 p-3">
        <h3 className="text-sm font-medium text-slate-800">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Forneca energia de ativacao, temperatura de referencia e k para mostrar a curva.
        </p>
      </section>
    );
  }

  const lowerTemperature = Math.max(minTemperature ?? referenceTemperature * 0.8, 1);
  const upperTemperature = Math.max(maxTemperature ?? referenceTemperature * 1.2, lowerTemperature + 1);
  const preExponentialFactor = referenceRateConstant * Math.exp(activationEnergy / (gasConstant * referenceTemperature));

  const sampleTemperatures = Array.from({ length: 8 }, (_, index) =>
    lowerTemperature + ((upperTemperature - lowerTemperature) * index) / 7,
  );

  const samplePoints = sampleTemperatures.map((temperature) => {
    const rateConstant = preExponentialFactor * Math.exp(-activationEnergy / (gasConstant * temperature));
    return {
      inverseTemperature: 1000 / temperature,
      lnRateConstant: Math.log(rateConstant),
    };
  });

  const xDomain = expandNumericDomain(samplePoints.map((point) => point.inverseTemperature));
  const yDomain = expandNumericDomain(samplePoints.map((point) => point.lnRateConstant));

  const path = buildPath(
    samplePoints.map((point) => ({
      x: scale(point.inverseTemperature, xDomain.min, xDomain.max, padding.left, width - padding.right),
      y: scale(point.lnRateConstant, yDomain.min, yDomain.max, height - padding.bottom, padding.top),
    })),
  );

  const referencePoint = {
    x: scale(1000 / referenceTemperature, xDomain.min, xDomain.max, padding.left, width - padding.right),
    y: scale(Math.log(referenceRateConstant), yDomain.min, yDomain.max, height - padding.bottom, padding.top),
  };

  return (
    <section
      className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="arrhenius-plot"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-muted-foreground">
            Curva semilog local para mostrar a sensibilidade da constante de velocidade com a temperatura.
          </p>
        </div>
        <div className="text-sm font-medium text-slate-700">
          <div>Ea = {toFixedLabel(activationEnergy)} J/mol</div>
          <div>k_ref = {toFixedLabel(referenceRateConstant)}</div>
        </div>
      </div>

      <div
        className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        <NumericChartGrid
          xDomain={[xDomain.min, xDomain.max]}
          yDomain={[yDomain.min, yDomain.max]}
          width={width}
          height={height}
          padding={padding}
          xLabel="1000 / T"
          yLabel="ln(k)"
        />

        <svg
          aria-label={title}
          className="absolute inset-0 block h-full w-full overflow-hidden"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <path
            d={path}
            fill="none"
            stroke="#0f766e"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />

          {samplePoints.map((point, index) => (
            <circle
              key={`arrhenius-${index}`}
              cx={scale(point.inverseTemperature, xDomain.min, xDomain.max, padding.left, width - padding.right)}
              cy={scale(point.lnRateConstant, yDomain.min, yDomain.max, height - padding.bottom, padding.top)}
              fill="#0f766e"
              r="3.5"
            />
          ))}

          <circle cx={referencePoint.x} cy={referencePoint.y} fill="#1d4ed8" r="6" />
          <text fill="#64748b" fontSize="11" x={padding.left + 6} y={padding.top + 16}>
            A = {toFixedLabel(preExponentialFactor)}
          </text>
          <text fill="#64748b" fontSize="11" x={padding.left + 6} y={padding.top + 30}>
            T_ref = {toFixedLabel(referenceTemperature)} K
          </text>
        </svg>
      </div>
    </section>
  );
}
