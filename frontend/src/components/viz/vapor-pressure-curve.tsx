import { ChartModelRenderer } from "@/components/viz/chart-model-renderer";
import { ChartDidacticCard } from "@/components/viz/chart-didactic-card";
import { normalizeChartColors } from "@/components/viz/chart-color-utils";
import { HowItWorks, TheoryRef } from "@/components/how-it-works";
import type { ChartModel } from "@/types/chart-model";

type VaporPressureCurveProps = {
  fluid: string;
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

export function VaporPressureCurve({
  fluid,
  model,
  critical,
  triple,
}: VaporPressureCurveProps) {
  const normalizedModel = normalizeChartColors(model);
  const tripleColor = normalizedModel.markers.find((marker) => marker.id === "triple-point")?.color ?? "#b45309";
  const criticalColor = normalizedModel.markers.find((marker) => marker.id === "critical-point")?.color ?? "#1d4ed8";

  return (
    <div data-testid="vapor-pressure-curve">
      <ChartDidacticCard
        title={model.title}
        subtitle={model.subtitle ?? `Relação de pressão de saturação com a temperatura para ${fluid}.`}
        howItWorks={
          <HowItWorks title="Como funciona - Curva de pressão de vapor">
            <p>
              Esta curva mostra como a pressão de saturação varia com a temperatura para um
              fluido. Em cada ponto da linha, líquido e vapor coexistem em equilíbrio.
            </p>
            <p>
              A leitura é direta: escolha uma temperatura no eixo x, encontre a curva e então
              leia no eixo y qual pressão de vapor corresponde àquela condição. Como o eixo de
              pressão costuma ser logarítmico, pequenas mudanças visuais podem representar
              grandes variações absolutas.
            </p>
            <p>
              O gráfico ajuda a interpretar volatilidade, condições de ebulição e risco de
              cavitação. Quanto maior a pressão de vapor em uma faixa de temperatura, maior a
              tendência do fluido a formar vapor naquela condição.
            </p>
            <TheoryRef>
              Ref.: Smith, Van Ness & Abbott, Introduction to Chemical Engineering
              Thermodynamics.
            </TheoryRef>
          </HowItWorks>
        }
      >
        <ChartModelRenderer model={normalizedModel} withPanel={false} />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div
              className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold"
              style={{ borderColor: tripleColor, color: tripleColor }}
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
              style={{ borderColor: criticalColor, color: criticalColor }}
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
