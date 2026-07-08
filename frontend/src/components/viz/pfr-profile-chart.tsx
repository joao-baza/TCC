import { ChartModelRenderer } from "@/components/viz/chart-model-renderer";
import { HowItWorks, TheoryRef } from "@/components/how-it-works";
import type { PfrSpatialStation } from "@/features/reactor/pfr-spatial-profile";
import type { ChartModel } from "@/types/chart-model";
import { formatTableNumberText } from "@/lib/table-number";

type PfrProfileChartProps = {
  model: ChartModel;
  stations: PfrSpatialStation[];
  title?: string;
};
const schematicWidth = 760;
const schematicHeight = 210;
const schematicPadding = { top: 22, right: 28, bottom: 28, left: 28 };
const palette = ["#0f766e", "#2563eb", "#b45309", "#7c3aed", "#dc2626"];
const schematicStationRatios = [0, 0.25, 0.5, 0.75, 1];
const ratioEpsilon = 1e-9;

function toFixedLabel(value: number) {
  return formatTableNumberText(value);
}

function getSchematicStations(stations: PfrSpatialStation[]) {
  return schematicStationRatios.flatMap((ratio) => {
    const station = stations.find((candidate) => Math.abs(candidate.relativeVolume - ratio) <= ratioEpsilon);
    return station ? [station] : [];
  });
}

function buildSchematicLabel(station: PfrSpatialStation) {
  return `V/V_total ${toFixedLabel(station.relativeVolume)} | T: ${toFixedLabel(station.temperature)} K`;
}

function buildSchematicConcentrationLabel(label: string, value: number) {
  return `${label}: ${toFixedLabel(value)} mol/m³`;
}

function getSchematicLabelWidth(station: PfrSpatialStation) {
  const lines = [
    buildSchematicLabel(station),
    ...Object.entries(station.concentrations).map(([label, quantity]) =>
      buildSchematicConcentrationLabel(label, quantity.value),
    ),
  ];
  const longestLine = Math.max(...lines.map((line) => line.length));

  return Math.max(142, Math.ceil(longestLine * 6.6) + 24);
}

function PfrReactorSchematic({ stations }: { stations: PfrSpatialStation[] }) {
  const schematicStations = getSchematicStations(stations);
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
            strokeLinecap="round"
            strokeWidth="2"
          />
          <path
            d={`M ${tubeX + tubeWidth - 18} ${tubeY + tubeHeight / 2} L ${
              tubeX + tubeWidth + 6
            } ${tubeY + tubeHeight / 2}`}
            stroke="#64748b"
            strokeLinecap="round"
            strokeWidth="2"
          />

          {schematicStations.map((station, index) => {
            const x = tubeX + station.relativeVolume * tubeWidth;
            const labelAbove = index % 2 === 0;
            const labelY = labelAbove ? 20 : 128;
            const concentrationEntries = Object.entries(station.concentrations);
            const labelHeight = 24 + concentrationEntries.length * 16;
            const labelWidth = getSchematicLabelWidth(station);
            const labelX = Math.max(
              10,
              Math.min(
                x - labelWidth / 2,
                schematicWidth - schematicPadding.right - labelWidth,
              ),
            );

            return (
              <g key={`station-${station.relativeVolume}`}>
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
                  fill="#334155"
                  fontSize="11"
                  fontWeight="600"
                  x={labelX + 12}
                  y={labelY + 16}
                >
                  {buildSchematicLabel(station)}
                </text>
                {concentrationEntries.map(([label, quantity], concentrationIndex) => (
                  <g key={`${station.relativeVolume}-${label}`}>
                    <circle
                      cx={labelX + 14}
                      cy={labelY + 31 + concentrationIndex * 15}
                      fill={palette[concentrationIndex % palette.length]}
                      r="3"
                    />
                    <text
                      fill="#475569"
                      fontSize="10"
                      x={labelX + 22}
                      y={labelY + 34 + concentrationIndex * 15}
                    >
                      {buildSchematicConcentrationLabel(label, quantity.value)}
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
  model,
  stations,
  title = "Perfis de concentração e temperatura no PFR",
}: PfrProfileChartProps) {
  if (stations.length === 0) {
    return null;
  }
  const concentrationSeriesIds = model.series
    .filter((series) => series.id !== "temperature-profile")
    .map((series) => series.id);

  return (
    <section
      className="mx-auto w-full max-w-[760px] space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="pfr-profile-chart"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-muted-foreground">
            Perfis espaciais calculados ao longo do volume relativo do reator.
          </p>
        </div>
      </div>

      <HowItWorks title="Como funciona - Perfis no PFR">
        <p className="text-sm text-slate-700">
          No PFR, concentração e temperatura mudam ao longo do comprimento do reator.
        </p>
        <p className="text-sm text-slate-700">
          O gráfico e o painel esquemático abaixo leem a mesma lista de estações. Isso elimina a
          interpolação físico-química no frontend e mantém o perfil coerente com o cálculo do
          reator.
        </p>
        <TheoryRef>
          Leitura didática: entrada, intermediários e saída do reator mostram por que o PFR deve ser
          interpretado como um perfil espacial, não como uma única condição global.
        </TheoryRef>
      </HowItWorks>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-sm font-medium text-slate-800">Concentração por componente</p>
          <ChartModelRenderer model={model} seriesIds={concentrationSeriesIds} yAxisKey="y" />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-sm font-medium text-slate-800">Programa térmico</p>
          <ChartModelRenderer
            model={model}
            seriesIds={["temperature-profile"]}
            yAxisKey="temperature"
          />
        </div>

        <PfrReactorSchematic stations={stations} />
      </div>
    </section>
  );
}
