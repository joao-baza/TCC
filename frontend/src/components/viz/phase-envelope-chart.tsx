import { ChartModelRenderer } from "@/components/viz/chart-model-renderer";
import { ChartDidacticCard } from "@/components/viz/chart-didactic-card";
import { normalizeChartColors } from "@/components/viz/chart-color-utils";
import { HowItWorks, TheoryRef } from "@/components/how-it-works";
import type { ChartModel } from "@/types/chart-model";

type PhaseEnvelopeChartProps = {
  model: ChartModel;
  critical: {
    temperature: number;
    pressure: number;
  };
  triple: {
    temperature: number;
    pressure: number;
  };
};

function formatValue(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(value);
}

function formatPressure(value: number) {
  if (value >= 1_000_000) {
    return `${formatValue(value / 1_000_000)} MPa`;
  }

  if (value >= 1_000) {
    return `${formatValue(value / 1_000)} kPa`;
  }

  return `${formatValue(value)} Pa`;
}

export function PhaseEnvelopeChart({ model, critical, triple }: PhaseEnvelopeChartProps) {
  const normalizedModel = normalizeChartColors(model);
  return (
    <div data-testid="phase-envelope-chart">
      <ChartDidacticCard
        title={model.title}
        subtitle={model.subtitle}
        howItWorks={
          <HowItWorks title="Como funciona - Envelope de fase">
            <p>
              O envelope de fase delimita as condições em que uma substância ou mistura muda
              de comportamento entre regiões de líquido, vapor e coexistência entre fases.
              A fronteira desenhada no gráfico marca os estados de saturação.
            </p>
            <p>
              Para interpretar, localize um ponto pelas variáveis dos eixos e observe se ele
              está fora ou sobre o envelope. Pontos internos ou na fronteira indicam
              proximidade de mudança de fase; pontos externos representam uma única fase.
            </p>
            <p>
              Os marcadores de ponto tríplice e ponto crítico destacam limites importantes do
              comportamento termodinâmico. O gráfico é útil para discutir estabilidade de
              operação, janelas seguras e sensibilidade a temperatura e pressão.
            </p>
            <TheoryRef>
              Ref.: Poling, Prausnitz & O&apos;Connell, The Properties of Gases and Liquids.
            </TheoryRef>
          </HowItWorks>
        }
      >
        <ChartModelRenderer model={normalizedModel} withPanel={false} />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div
              className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold"
              style={{
                borderColor:
                  normalizedModel.markers.find((marker) => marker.id === "triple-point")?.color ?? "#0f766e",
                color: normalizedModel.markers.find((marker) => marker.id === "triple-point")?.color ?? "#0f766e",
              }}
            >
              Ponto tríplice
            </div>
            <p className="mt-1 text-sm text-slate-900">
              T = {formatValue(triple.temperature)} K · P = {formatPressure(triple.pressure)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div
              className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold"
              style={{
                borderColor:
                  normalizedModel.markers.find((marker) => marker.id === "critical-point")?.color ?? "#b45309",
                color:
                  normalizedModel.markers.find((marker) => marker.id === "critical-point")?.color ?? "#b45309",
              }}
            >
              Ponto crítico
            </div>
            <p className="mt-1 text-sm text-slate-900">
              T = {formatValue(critical.temperature)} K · P = {formatPressure(critical.pressure)}
            </p>
          </div>
        </div>
      </ChartDidacticCard>
    </div>
  );
}
