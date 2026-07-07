import { HowItWorks, TheoryRef } from "@/components/how-it-works";
import { expandNumericDomain } from "@/components/viz/chart-axis-utils";
import { NumericChartGrid } from "@/components/viz/chart-grid";
import { formatTableNumberText } from "@/lib/table-number";

type ProfileSeries = {
  label: string;
  start: number;
  end: number;
  color: string;
};

type PfrProfileChartProps = {
  concentrationSeries: ProfileSeries[];
  temperature: {
    inlet: number;
    outlet: number;
  };
  title?: string;
};

type ChartPoint = {
  x: number;
  y: number;
};

type SampleStation = {
  ratio: number;
  temperature: number;
  concentrations: Array<{
    label: string;
    value: number;
    color: string;
  }>;
};

const width = 760;
const height = 330;
const padding = { top: 24, right: 28, bottom: 42, left: 72 };
const schematicWidth = 760;
const schematicHeight = 210;
const schematicPadding = { top: 22, right: 28, bottom: 28, left: 28 };
const stationRatios = [0, 0.25, 0.5, 0.75, 1];

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

function buildSeriesPoints(series: ProfileSeries) {
  return [0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio) => ({
    x: ratio,
    y: series.start + (series.end - series.start) * ratio,
  }));
}

function buildSampleStations(
  concentrationSeries: ProfileSeries[],
  temperature: { inlet: number; outlet: number },
) {
  return stationRatios.map((ratio) => ({
    ratio,
    temperature: temperature.inlet + (temperature.outlet - temperature.inlet) * ratio,
    concentrations: concentrationSeries.map((series) => ({
      label: series.label,
      value: series.start + (series.end - series.start) * ratio,
      color: series.color,
    })),
  }));
}

function buildSchematicLabel(station: SampleStation) {
  return `V/V_total ${toFixedLabel(station.ratio)} | T: ${toFixedLabel(station.temperature)} K`;
}

function PfrReactorSchematic({
  concentrationSeries,
  temperature,
}: {
  concentrationSeries: ProfileSeries[];
  temperature: { inlet: number; outlet: number };
}) {
  const stations = buildSampleStations(concentrationSeries, temperature);
  const tubeX = schematicPadding.left + 24;
  const tubeY = 68;
  const tubeWidth = schematicWidth - schematicPadding.left - schematicPadding.right - 48;
  const tubeHeight = 52;

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-4"
      data-testid="pfr-reactor-schematic"
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-800">Reator esquemático</p>
          <p className="text-xs text-slate-600">
            Pontos calculados ao longo do comprimento com temperatura e concentrações locais.
          </p>
        </div>
        <p className="text-xs font-medium text-slate-600">Leitura espacial do inlet ao outlet</p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <svg
          aria-label="Reator PFR esquemático com pontos calculados"
          className="block h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${schematicWidth} ${schematicHeight}`}
        >
          <defs>
            <linearGradient id="pfr-tube-gradient" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f8fafc" />
            </linearGradient>
          </defs>

          <rect
            x={tubeX}
            y={tubeY}
            width={tubeWidth}
            height={tubeHeight}
            rx="22"
            fill="url(#pfr-tube-gradient)"
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />
          <rect
            x={tubeX + 18}
            y={tubeY + 14}
            width={tubeWidth - 36}
            height={tubeHeight - 28}
            rx="16"
            fill="#e2e8f0"
            opacity="0.35"
          />
          <path
            d={`M ${tubeX + 18} ${tubeY + tubeHeight / 2} L ${tubeX - 6} ${tubeY + tubeHeight / 2}`}
            stroke="#64748b"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d={`M ${tubeX + tubeWidth - 18} ${tubeY + tubeHeight / 2} L ${
              tubeX + tubeWidth + 6
            } ${tubeY + tubeHeight / 2}`}
            stroke="#64748b"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {stations.map((station, index) => {
            const x = tubeX + station.ratio * tubeWidth;
            const labelAbove = index % 2 === 0;
            const labelY = labelAbove ? 20 : 128;
            const labelHeight = 22 + station.concentrations.length * 15;
            const labelWidth = 142;
            const labelX = Math.max(
              10,
              Math.min(
                x - labelWidth / 2,
                schematicWidth - schematicPadding.right - labelWidth,
              ),
            );

            return (
              <g key={`station-${station.ratio}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={labelAbove ? labelY + labelHeight : tubeY + tubeHeight}
                  y2={labelAbove ? tubeY - 2 : labelY}
                  stroke="#cbd5e1"
                  strokeWidth="1.25"
                />
                <circle cx={x} cy={tubeY + tubeHeight / 2} fill="#0f766e" r="6" />
                <circle
                  cx={x}
                  cy={tubeY + tubeHeight / 2}
                  fill="#ffffff"
                  opacity="0.55"
                  r="2.5"
                />
                <rect
                  x={labelX}
                  y={labelY}
                  width={labelWidth}
                  height={labelHeight}
                  rx="12"
                  fill="#ffffff"
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
                <text
                  x={labelX + 12}
                  y={labelY + 16}
                  fill="#334155"
                  fontSize="11"
                  fontWeight="600"
                >
                  {buildSchematicLabel(station)}
                </text>
                {station.concentrations.map((concentration, concentrationIndex) => (
                  <g key={`${station.ratio}-${concentration.label}`}>
                    <circle
                      cx={labelX + 14}
                      cy={labelY + 31 + concentrationIndex * 15}
                      fill={concentration.color}
                      r="3"
                    />
                    <text
                      x={labelX + 22}
                      y={labelY + 34 + concentrationIndex * 15}
                      fill="#475569"
                      fontSize="10"
                    >
                      {concentration.label}: {toFixedLabel(concentration.value)} mol/L
                    </text>
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function PfrProfileChart({
  concentrationSeries,
  temperature,
  title = "Perfis de concentração e temperatura no PFR",
}: PfrProfileChartProps) {
  const concentrationValues = concentrationSeries.flatMap((series) => [series.start, series.end]);
  const concentrationDomain = {
    min: 0,
    max: expandNumericDomain([...concentrationValues, 0, 1]).max,
  };

  const concentrationPaths = concentrationSeries.map((series) => {
    const points = buildSeriesPoints(series).map((point) => ({
      x: scale(point.x, 0, 1, padding.left, width - padding.right),
      y: scale(
        point.y,
        concentrationDomain.min,
        concentrationDomain.max,
        height - padding.bottom,
        padding.top,
      ),
    }));

    return { ...series, points };
  });

  const temperatureValues = [temperature.inlet, temperature.outlet];
  const temperatureDomain = expandNumericDomain(temperatureValues);
  const temperaturePoints = buildSeriesPoints({
    label: "Temperatura",
    start: temperature.inlet,
    end: temperature.outlet,
    color: "#b45309",
  }).map((point) => ({
    x: scale(point.x, 0, 1, padding.left, width - padding.right),
    y: scale(
      point.y,
      temperatureDomain.min,
      temperatureDomain.max,
      height - padding.bottom,
      padding.top,
    ),
  }));

  return (
    <section
      className="mx-auto w-full max-w-[760px] space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="pfr-profile-chart"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-muted-foreground">
            Perfis normalizados ao longo do volume do reator, com interpolação entre entrada e saída.
          </p>
        </div>
        <p className="text-sm font-medium text-slate-700">
          T: {toFixedLabel(temperature.inlet)} → {toFixedLabel(temperature.outlet)} K
        </p>
      </div>

      <HowItWorks title="Como funciona - Perfis no PFR">
        <p className="text-sm text-slate-700">
          No PFR, concentração e temperatura não são únicas: elas mudam ao longo do comprimento
          do reator. O eixo horizontal usa o volume relativo como proxy espacial para mostrar essa
          evolução de forma contínua.
        </p>
        <p className="text-sm text-slate-700">
          Cada curva do gráfico representa uma espécie ou a temperatura local em uma estação do
          tubo. O painel esquemático abaixo repete os mesmos pontos calculados para deixar explícito
          onde os valores foram amostrados.
        </p>
        <TheoryRef>
          Leitura didática: entrada, intermediários e saída do reator mostram por que o PFR deve ser
          interpretado como um perfil espacial, não como uma única condição global.
        </TheoryRef>
      </HowItWorks>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-sm font-medium text-slate-800">Concentração por componente</p>
          <div
            className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-white"
            style={{ aspectRatio: `${width} / ${height}` }}
          >
            <NumericChartGrid
              xDomain={[0, 1]}
              yDomain={[concentrationDomain.min, concentrationDomain.max]}
              width={width}
              height={height}
              padding={padding}
              xLabel="Volume relativo do reator (V/V_total)"
              yLabel="Concentração (mol/L)"
            />
            <svg
              aria-label="Perfil de concentração no PFR"
              className="absolute inset-0 block h-full w-full overflow-hidden"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              viewBox={`0 0 ${width} ${height}`}
            >
              {concentrationPaths.map((series) => (
                <g key={series.label}>
                  <path
                    d={buildPath(series.points)}
                    fill="none"
                    stroke={series.color}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                  />
                  {series.points.map((point, index) => (
                    <circle
                      key={`${series.label}-${index}`}
                      cx={point.x}
                      cy={point.y}
                      fill={series.color}
                      r="3.5"
                    />
                  ))}
                </g>
              ))}
            </svg>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
            {concentrationPaths.map((series) => (
              <span
                key={`legend-${series.label}`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: series.color }} />
                {series.label}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-sm font-medium text-slate-800">Programa térmico</p>
          <div
            className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-white"
            style={{ aspectRatio: `${width} / ${height}` }}
          >
            <NumericChartGrid
              xDomain={[0, 1]}
              yDomain={[temperatureDomain.min, temperatureDomain.max]}
              width={width}
              height={height}
              padding={padding}
              xLabel="Volume relativo do reator (V/V_total)"
              yLabel="Temperatura (K)"
            />
            <svg
              aria-label="Perfil de temperatura no PFR"
              className="absolute inset-0 block h-full w-full overflow-hidden"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              viewBox={`0 0 ${width} ${height}`}
            >
              <path
                d={buildPath(temperaturePoints)}
                fill="none"
                stroke="#b45309"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
              {temperaturePoints.map((point, index) => (
                <circle key={`temp-${index}`} cx={point.x} cy={point.y} fill="#b45309" r="3.5" />
              ))}
            </svg>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-700" />
              Temperatura
            </span>
          </div>
        </div>

        <PfrReactorSchematic concentrationSeries={concentrationSeries} temperature={temperature} />
      </div>
    </section>
  );
}
