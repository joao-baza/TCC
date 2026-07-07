import { NumericChartGrid } from "@/components/viz/chart-grid";
import { expandNumericDomain } from "@/components/viz/chart-axis-utils";
import { formatTableNumberText } from "@/lib/table-number";

type VaporPressurePoint = {
  temperature: number;
  pressure: number;
};

type VaporPressureCurveProps = {
  fluid: string;
  points: VaporPressurePoint[];
  critical: {
    temperature: number;
    pressure: number;
  };
  triple: {
    temperature: number;
    pressure: number;
  };
  title?: string;
};

type ChartPoint = {
  x: number;
  y: number;
};

const width = 760;
const height = 340;
const padding = { top: 28, right: 28, bottom: 44, left: 72 };

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

function formatPressure(value: number) {
  if (value >= 1_000_000) {
    return `${toFixedLabel(value / 1_000_000)} MPa`;
  }

  if (value >= 1000) {
    return `${toFixedLabel(value / 1000)} kPa`;
  }

  return `${toFixedLabel(value)} Pa`;
}

function safeLog10(value: number) {
  return Math.log10(Math.max(value, 1e-9));
}

export function VaporPressureCurve({
  fluid,
  points,
  critical,
  triple,
  title = "Curva de pressão de vapor",
}: VaporPressureCurveProps) {
  const usablePoints = [...points].filter((point) => point.temperature > 0 && point.pressure > 0);
  const allTemperatures = usablePoints.map((point) => point.temperature);
  const allLogPressures = usablePoints.map((point) => safeLog10(point.pressure));

  const temperatureDomain = expandNumericDomain([...allTemperatures, triple.temperature, critical.temperature]);
  const pressureDomain = expandNumericDomain([...allLogPressures, safeLog10(triple.pressure), safeLog10(critical.pressure)]);

  const curvePoints = usablePoints.map((point) => ({
    x: scale(point.temperature, temperatureDomain.min, temperatureDomain.max, padding.left, width - padding.right),
    y: scale(safeLog10(point.pressure), pressureDomain.min, pressureDomain.max, height - padding.bottom, padding.top),
  }));

  const tripleMarker = {
    x: scale(triple.temperature, temperatureDomain.min, temperatureDomain.max, padding.left, width - padding.right),
    y: scale(safeLog10(triple.pressure), pressureDomain.min, pressureDomain.max, height - padding.bottom, padding.top),
  };
  const criticalMarker = {
    x: scale(critical.temperature, temperatureDomain.min, temperatureDomain.max, padding.left, width - padding.right),
    y: scale(safeLog10(critical.pressure), pressureDomain.min, pressureDomain.max, height - padding.bottom, padding.top),
  };

  return (
    <section
      className="mx-auto w-full max-w-[760px] space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="vapor-pressure-curve"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-muted-foreground">
            Relação de pressão de saturação com a temperatura para {fluid}, em escala logarítmica.
          </p>
        </div>
        <p className="text-sm font-medium text-slate-700">{curvePoints.length} pontos</p>
      </div>

      <div
        className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        <NumericChartGrid
          xDomain={[temperatureDomain.min, temperatureDomain.max]}
          yDomain={[pressureDomain.min, pressureDomain.max]}
          width={width}
          height={height}
          padding={padding}
          xLabel="Temperatura (K)"
          yLabel="log10(P)"
        />

        <svg
          aria-label={`${title} de ${fluid}`}
          className="absolute inset-0 block h-full w-full overflow-hidden"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <path
            d={buildPath(curvePoints)}
            fill="none"
            stroke="#0f766e"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />

          {curvePoints.map((point, index) => (
            <circle key={`vap-${index}`} cx={point.x} cy={point.y} fill="#0f766e" r="3.5" />
          ))}

          <circle cx={tripleMarker.x} cy={tripleMarker.y} fill="#b45309" r="6" />
          <circle cx={criticalMarker.x} cy={criticalMarker.y} fill="#1d4ed8" r="6" />

          <line
            stroke="#b45309"
            strokeDasharray="5 5"
            strokeWidth="2"
            x1={tripleMarker.x}
            x2={tripleMarker.x}
            y1={tripleMarker.y}
            y2={height - padding.bottom}
          />
          <line
            stroke="#1d4ed8"
            strokeDasharray="5 5"
            strokeWidth="2"
            x1={criticalMarker.x}
            x2={criticalMarker.x}
            y1={criticalMarker.y}
            y2={padding.top}
          />
        </svg>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Ponto tríplice
          </p>
          <p className="mt-1 text-sm text-slate-900">
            T = {toFixedLabel(triple.temperature)} K · P = {formatPressure(triple.pressure)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Ponto crítico
          </p>
          <p className="mt-1 text-sm text-slate-900">
            T = {toFixedLabel(critical.temperature)} K · P = {formatPressure(critical.pressure)}
          </p>
        </div>
      </div>
    </section>
  );
}
