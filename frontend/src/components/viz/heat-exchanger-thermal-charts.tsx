import { expandNumericDomain } from "@/components/viz/chart-axis-utils";
import { NumericChartGrid } from "@/components/viz/chart-grid";
import { formatTableNumberText } from "@/lib/table-number";

type HeatExchangerThermalChartsProps = {
  fluid: string;
  inletTemperature: number;
  outletTemperature: number;
  inletPressure: number;
  outletPressure: number;
  inletEnthalpy?: number | null;
  outletEnthalpy?: number | null;
  massFlowRate?: number | null;
  heatDuty?: number | null;
  inletQuality?: number | null;
  outletQuality?: number | null;
  title?: string;
};

type Point = {
  x: number;
  y: number;
};

const width = 760;
const compositeHeight = 280;
const profileHeight = 260;
const compositePadding = { top: 28, right: 28, bottom: 44, left: 72 };
const profilePadding = { top: 24, right: 28, bottom: 44, left: 72 };

function scale(value: number, min: number, max: number, start: number, end: number) {
  if (min === max) {
    return (start + end) / 2;
  }

  return start + ((value - min) / (max - min)) * (end - start);
}

function toFixedLabel(value: number) {
  return formatTableNumberText(value);
}

function safeNumber(value: number | null | undefined, fallback = 0) {
  return Number.isFinite(value ?? Number.NaN) ? Number(value) : fallback;
}

function buildPath(points: Point[]) {
  if (points.length === 0) {
    return "";
  }

  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function buildBandPath(upper: Point[], lower: Point[]) {
  if (upper.length === 0 || lower.length === 0) {
    return "";
  }

  return `${buildPath(upper)} L ${lower
    .slice()
    .reverse()
    .map((point) => `${point.x} ${point.y}`)
    .join(" L ")} Z`;
}

function buildSeries(start: number, end: number) {
  return [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    x: ratio,
    y: start + (end - start) * ratio,
  }));
}

export function HeatExchangerThermalCharts({
  fluid,
  inletTemperature,
  outletTemperature,
  inletPressure,
  outletPressure,
  inletEnthalpy,
  outletEnthalpy,
  massFlowRate,
  heatDuty,
  inletQuality,
  outletQuality,
  title = "Curvas compostas e perfil térmico",
}: HeatExchangerThermalChartsProps) {
  const safeInletTemperature = safeNumber(inletTemperature);
  const safeOutletTemperature = safeNumber(outletTemperature);
  const safeInletPressure = safeNumber(inletPressure);
  const safeOutletPressure = safeNumber(outletPressure);
  const temperatureSpan = Math.abs(safeOutletTemperature - safeInletTemperature);
  const approachDeltaT = Math.max(8, Math.min(20, Math.round(temperatureSpan * 0.25) || 8));
  const heating = safeOutletTemperature >= safeInletTemperature;

  const compositeTemperatures = [
    ...buildSeries(safeInletTemperature, safeOutletTemperature).map((point) => point.y),
    ...buildSeries(
      heating ? safeOutletTemperature + approachDeltaT : safeOutletTemperature - approachDeltaT,
      heating ? safeInletTemperature + approachDeltaT : safeInletTemperature - approachDeltaT,
    ).map((point) => point.y),
  ];
  const compositeDomain = expandNumericDomain(compositeTemperatures);

  const compositeProcess = buildSeries(safeInletTemperature, safeOutletTemperature).map((point) => ({
    x: scale(point.x, 0, 1, compositePadding.left, width - compositePadding.right),
    y: scale(
      point.y,
      compositeDomain.min,
      compositeDomain.max,
      compositeHeight - compositePadding.bottom,
      compositePadding.top,
    ),
  }));
  const compositeUtility = buildSeries(
    heating ? safeOutletTemperature + approachDeltaT : safeOutletTemperature - approachDeltaT,
    heating ? safeInletTemperature + approachDeltaT : safeInletTemperature - approachDeltaT,
  ).map((point) => ({
    x: scale(point.x, 0, 1, compositePadding.left, width - compositePadding.right),
    y: scale(
      point.y,
      compositeDomain.min,
      compositeDomain.max,
      compositeHeight - compositePadding.bottom,
      compositePadding.top,
    ),
  }));

  const processProfile = buildSeries(safeInletTemperature, safeOutletTemperature).map((point) => ({
    x: scale(point.x, 0, 1, profilePadding.left, width - profilePadding.right),
    y: scale(
      point.y,
      Math.min(safeInletTemperature, safeOutletTemperature),
      Math.max(safeInletTemperature, safeOutletTemperature),
      profileHeight - profilePadding.bottom,
      profilePadding.top,
    ),
  }));
  const utilityProfile = buildSeries(
    heating ? safeOutletTemperature + approachDeltaT : safeOutletTemperature - approachDeltaT,
    heating ? safeInletTemperature + approachDeltaT : safeInletTemperature - approachDeltaT,
  ).map((point) => ({
    x: scale(point.x, 0, 1, profilePadding.left, width - profilePadding.right),
    y: scale(
      point.y,
      Math.min(
        safeInletTemperature,
        safeOutletTemperature,
        heating ? safeOutletTemperature + approachDeltaT : safeOutletTemperature - approachDeltaT,
        heating ? safeInletTemperature + approachDeltaT : safeInletTemperature - approachDeltaT,
      ),
      Math.max(
        safeInletTemperature,
        safeOutletTemperature,
        heating ? safeOutletTemperature + approachDeltaT : safeOutletTemperature - approachDeltaT,
        heating ? safeInletTemperature + approachDeltaT : safeInletTemperature - approachDeltaT,
      ),
      profileHeight - profilePadding.bottom,
      profilePadding.top,
    ),
  }));
  const profileDomain = expandNumericDomain([
    safeInletTemperature,
    safeOutletTemperature,
    heating ? safeOutletTemperature + approachDeltaT : safeOutletTemperature - approachDeltaT,
    heating ? safeInletTemperature + approachDeltaT : safeInletTemperature - approachDeltaT,
  ]);

  const dutySummary =
    heatDuty == null
      ? null
      : `${formatTableNumberText(Math.abs(heatDuty))} kW ${heatDuty >= 0 ? "fornecidos" : "retirados"}`;
  const enthalpySpan =
    inletEnthalpy == null || outletEnthalpy == null
      ? null
      : `${toFixedLabel(inletEnthalpy)} → ${toFixedLabel(outletEnthalpy)} J/kg`;
  const pressureSpan = `${toFixedLabel(safeInletPressure)} → ${toFixedLabel(safeOutletPressure)} Pa`;
  const qualitySpan =
    inletQuality == null && outletQuality == null
      ? null
      : `${inletQuality == null ? "—" : toFixedLabel(inletQuality)} → ${
          outletQuality == null ? "—" : toFixedLabel(outletQuality)
        }`;

  return (
    <section
      className="mx-auto w-full max-w-[760px] space-y-5 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="heat-exchanger-thermal-charts"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-muted-foreground">
            Painel didático derivado das condições do exercício para {fluid}.
          </p>
        </div>
        <p className="text-sm font-medium text-slate-700">
          ΔT = {toFixedLabel(temperatureSpan)} K · ΔTmin ≈ {toFixedLabel(approachDeltaT)} K
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Entalpia
          </p>
          <p className="mt-1 text-sm text-slate-900">{enthalpySpan ?? "Aguardando h₁/h₂"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Potência
          </p>
          <p className="mt-1 text-sm text-slate-900">{dutySummary ?? "Aguardando Q̇"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Pressão
          </p>
          <p className="mt-1 text-sm text-slate-900">{pressureSpan}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Fase
          </p>
          <p className="mt-1 text-sm text-slate-900">{qualitySpan ?? "Fase única / não informada"}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-800">Curvas compostas e pinch</p>
            <p className="text-xs text-muted-foreground">ΔTmin estimado pela diferença térmica do exercício</p>
          </div>
          <div
            className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-white"
            style={{ aspectRatio: `${width} / ${compositeHeight}` }}
          >
            <NumericChartGrid
              xDomain={[0, 1]}
              yDomain={[compositeDomain.min, compositeDomain.max]}
              width={width}
              height={compositeHeight}
              padding={compositePadding}
              xLabel="Fração normalizada do perfil (0-1)"
              yLabel="Temperatura (K)"
            />
            <svg
              aria-label={`Curvas compostas de ${fluid}`}
              className="absolute inset-0 block h-full w-full overflow-hidden"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              viewBox={`0 0 ${width} ${compositeHeight}`}
            >
              <path
                d={buildBandPath(compositeProcess, compositeUtility)}
                fill="rgba(14, 165, 233, 0.08)"
                stroke="none"
              />
              <path
                d={buildPath(compositeProcess)}
                fill="none"
                stroke="#0f766e"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
              <path
                d={buildPath(compositeUtility)}
                fill="none"
                stroke="#b45309"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />

              {compositeProcess.map((point, index) => (
                <circle key={`process-${index}`} cx={point.x} cy={point.y} fill="#0f766e" r="3.5" />
              ))}
              {compositeUtility.map((point, index) => (
                <circle key={`utility-${index}`} cx={point.x} cy={point.y} fill="#b45309" r="3.5" />
              ))}
            </svg>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              Corrente do processo
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              Utilidade térmica
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              Banda sombreada = aproximação térmica
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              ΔTmin ≈ {toFixedLabel(approachDeltaT)} K
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-3 text-sm font-medium text-slate-800">Perfil quente/frio ao longo do trocador</p>
          <div
            className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-white"
            style={{ aspectRatio: `${width} / ${profileHeight}` }}
          >
            <NumericChartGrid
              xDomain={[0, 1]}
              yDomain={[profileDomain.min, profileDomain.max]}
              width={width}
              height={profileHeight}
              padding={profilePadding}
              xLabel="Comprimento relativo do trocador (L/L_total)"
              yLabel="Temperatura (K)"
            />
            <svg
              aria-label={`Perfil térmico de ${fluid}`}
              className="absolute inset-0 block h-full w-full overflow-hidden"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              viewBox={`0 0 ${width} ${profileHeight}`}
            >
              <path
                d={buildPath(processProfile)}
                fill="none"
                stroke="#0f766e"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
              <path
                d={buildPath(utilityProfile)}
                fill="none"
                stroke="#b45309"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />

              {processProfile.map((point, index) => (
                <circle key={`profile-process-${index}`} cx={point.x} cy={point.y} fill="#0f766e" r="3.5" />
              ))}
              {utilityProfile.map((point, index) => (
                <circle key={`profile-utility-${index}`} cx={point.x} cy={point.y} fill="#b45309" r="3.5" />
              ))}
            </svg>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              Processo
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              Utilidade
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            T de entrada
          </p>
          <p className="mt-1 text-sm text-slate-900">{toFixedLabel(safeInletTemperature)} K</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            T de saída
          </p>
          <p className="mt-1 text-sm text-slate-900">{toFixedLabel(safeOutletTemperature)} K</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Entrada/saída em P
          </p>
          <p className="mt-1 text-sm text-slate-900">
            {toFixedLabel(safeInletPressure)} → {toFixedLabel(safeOutletPressure)} Pa
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Vazão mássica
          </p>
          <p className="mt-1 text-sm text-slate-900">
            {massFlowRate == null ? "—" : `${toFixedLabel(massFlowRate)} kg/s`}
          </p>
        </div>
      </div>
    </section>
  );
}
