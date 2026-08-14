import { ChartModelRenderer } from "@/components/viz/chart-model-renderer";
import type { ChartModel } from "@/types/chart-model";
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
  temperatureSpan?: number | null;
  approachDeltaT?: number | null;
  compositeChart?: ChartModel | null;
  profileChart?: ChartModel | null;
  title?: string;
};

function toFixedLabel(value: number) {
  return formatTableNumberText(value);
}

function safeNumber(value: number | null | undefined, fallback = 0) {
  return Number.isFinite(value ?? Number.NaN) ? Number(value) : fallback;
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
  temperatureSpan,
  approachDeltaT,
  compositeChart,
  profileChart,
  title = "Curvas compostas e perfil térmico",
}: HeatExchangerThermalChartsProps) {
  const safeInletPressure = safeNumber(inletPressure);
  const safeOutletPressure = safeNumber(outletPressure);
  const safeTemperatureSpan = safeNumber(
    temperatureSpan,
    Math.abs(outletTemperature - inletTemperature),
  );
  const dutySummary =
    heatDuty == null
      ? null
      : `${formatTableNumberText(Math.abs(heatDuty))} kW ${heatDuty >= 0 ? "fornecidos" : "retirados"}`;
  const enthalpySummary =
    inletEnthalpy == null && outletEnthalpy == null
      ? "Aguardando entalpias"
      : `${inletEnthalpy == null ? "-" : toFixedLabel(inletEnthalpy)} → ${
          outletEnthalpy == null ? "-" : toFixedLabel(outletEnthalpy)
        } J/kg`;
  const pressureSummary = `${toFixedLabel(safeInletPressure)} → ${toFixedLabel(safeOutletPressure)} Pa`;
  const flowSummary =
    massFlowRate == null ? "Aguardando vazão mássica" : `${toFixedLabel(massFlowRate)} kg/s`;
  const qualitySpan =
    inletQuality == null && outletQuality == null
      ? null
      : `${inletQuality == null ? "-" : toFixedLabel(inletQuality)} → ${
          outletQuality == null ? "-" : toFixedLabel(outletQuality)
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
            Painel didático do backend para {fluid}.
          </p>
        </div>
        <p className="text-sm font-medium text-slate-700">
          ΔT = {toFixedLabel(safeTemperatureSpan)} K
          {approachDeltaT == null ? "" : ` · ΔTmin ≈ ${toFixedLabel(approachDeltaT)} K`}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Entalpia
          </p>
          <p className="mt-1 text-sm text-slate-900">{enthalpySummary}</p>
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
          <p className="mt-1 text-sm text-slate-900">{pressureSummary}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Vazão
          </p>
          <p className="mt-1 text-sm text-slate-900">{flowSummary}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Fase
          </p>
          <p className="mt-1 text-sm text-slate-900">{qualitySpan ?? "Fase única / não informada"}</p>
        </div>
      </div>

      <div className="space-y-4">
        {compositeChart ? <ChartModelRenderer model={compositeChart} /> : null}
        {profileChart ? <ChartModelRenderer model={profileChart} /> : null}
      </div>
    </section>
  );
}
