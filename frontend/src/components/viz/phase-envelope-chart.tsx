type SaturationEnvelopePoint = {
  temperature: number;
  pressure: number;
  liquid_entropy: number;
  vapor_entropy: number;
  liquid_enthalpy: number;
  vapor_enthalpy: number;
};

type PhaseEnvelopeChartProps = {
  fluid: string;
  points: SaturationEnvelopePoint[];
  critical: {
    temperature: number;
    pressure: number;
    density?: number;
  };
  triple: {
    temperature: number;
    pressure: number;
  };
};

type Point = {
  x: number;
  y: number;
};

const width = 760;
const height = 380;
const padding = { top: 28, right: 28, bottom: 44, left: 72 };

function scale(value: number, min: number, max: number, start: number, end: number) {
  if (min === max) {
    return (start + end) / 2;
  }

  return start + ((value - min) / (max - min)) * (end - start);
}

function toFixedLabel(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}

function buildPath(points: Point[]) {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

export function PhaseEnvelopeChart({
  fluid,
  points,
  critical,
  triple,
}: PhaseEnvelopeChartProps) {
  const allEntropy = points.flatMap((point) => [point.liquid_entropy, point.vapor_entropy]);
  const allTemperature = points.map((point) => point.temperature);

  const minEntropy = Math.min(...allEntropy);
  const maxEntropy = Math.max(...allEntropy);
  const minTemperature = Math.min(...allTemperature, triple.temperature);
  const maxTemperature = Math.max(...allTemperature, critical.temperature);

  const liquidPathPoints = points.map((point) => ({
    x: scale(
      point.liquid_entropy,
      minEntropy,
      maxEntropy,
      padding.left,
      width - padding.right,
    ),
    y: scale(point.temperature, minTemperature, maxTemperature, height - padding.bottom, padding.top),
  }));
  const vaporPathPoints = points.map((point) => ({
    x: scale(point.vapor_entropy, minEntropy, maxEntropy, padding.left, width - padding.right),
    y: scale(point.temperature, minTemperature, maxTemperature, height - padding.bottom, padding.top),
  }));

  const domeAreaPath =
    liquidPathPoints.length > 1 && vaporPathPoints.length > 1
      ? `${buildPath(liquidPathPoints)} L ${vaporPathPoints
          .slice()
          .reverse()
          .map((point) => `${point.x} ${point.y}`)
          .join(" L ")} Z`
      : "";

  const tripleMarker = {
    x: scale(
      points[0]?.liquid_entropy ?? 0,
      minEntropy,
      maxEntropy,
      padding.left,
      width - padding.right,
    ),
    y: scale(triple.temperature, minTemperature, maxTemperature, height - padding.bottom, padding.top),
  };
  const criticalMarker = {
    x: scale(
      points[points.length - 1]?.vapor_entropy ?? 0,
      minEntropy,
      maxEntropy,
      padding.left,
      width - padding.right,
    ),
    y: scale(
      critical.temperature,
      minTemperature,
      maxTemperature,
      height - padding.bottom,
      padding.top,
    ),
  };

  return (
    <section
      className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="phase-envelope-chart"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Envelope de fase</h3>
          <p className="text-sm text-muted-foreground">
            Dome de saturação T-s com regiões de líquido e vapor para {fluid}.
          </p>
        </div>
        <p className="text-sm font-medium text-slate-700">
          {points.length} pontos amostrados
        </p>
      </div>

      <svg
        aria-label={`Envelope de fase de ${fluid}`}
        className="block w-full max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <rect fill="#f8fafc" height={height} width={width} />
        <line
          stroke="#cbd5e1"
          strokeWidth="1.5"
          x1={padding.left}
          x2={padding.left}
          y1={padding.top}
          y2={height - padding.bottom}
        />
        <line
          stroke="#cbd5e1"
          strokeWidth="1.5"
          x1={padding.left}
          x2={width - padding.right}
          y1={height - padding.bottom}
          y2={height - padding.bottom}
        />

        <path d={domeAreaPath} fill="rgba(37, 99, 235, 0.08)" stroke="none" />
        <path
          d={buildPath(liquidPathPoints)}
          fill="none"
          stroke="#0f766e"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        <path
          d={buildPath(vaporPathPoints)}
          fill="none"
          stroke="#b45309"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />

        {liquidPathPoints.map((point, index) => (
          <circle key={`liq-${index}`} cx={point.x} cy={point.y} fill="#0f766e" r="3.5" />
        ))}
        {vaporPathPoints.map((point, index) => (
          <circle key={`vap-${index}`} cx={point.x} cy={point.y} fill="#b45309" r="3.5" />
        ))}

        <line
          stroke="#0f766e"
          strokeDasharray="5 5"
          strokeWidth="2"
          x1={tripleMarker.x}
          x2={tripleMarker.x}
          y1={tripleMarker.y}
          y2={height - padding.bottom}
        />
        <line
          stroke="#b45309"
          strokeDasharray="5 5"
          strokeWidth="2"
          x1={criticalMarker.x}
          x2={criticalMarker.x}
          y1={criticalMarker.y}
          y2={padding.top}
        />

        <circle cx={tripleMarker.x} cy={tripleMarker.y} fill="#0f766e" r="6" />
        <circle cx={criticalMarker.x} cy={criticalMarker.y} fill="#b45309" r="6" />

        <text fill="#475569" fontSize="12" x={padding.left - 22} y={padding.top + 4}>
          T
        </text>
        <text
          fill="#475569"
          fontSize="12"
          textAnchor="end"
          x={width - padding.right}
          y={height - 12}
        >
          s
        </text>
      </svg>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Ponto tríplice
          </p>
          <p className="mt-1 text-sm text-slate-900">
            T = {toFixedLabel(triple.temperature)} K · P = {toFixedLabel(triple.pressure)} Pa
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Ponto crítico
          </p>
          <p className="mt-1 text-sm text-slate-900">
            T = {toFixedLabel(critical.temperature)} K · P = {toFixedLabel(critical.pressure)} Pa
          </p>
        </div>
      </div>
    </section>
  );
}
