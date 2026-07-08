import { ChartModelRenderer } from "@/components/viz/chart-model-renderer";
import { ChartDidacticCard } from "@/components/viz/chart-didactic-card";
import { normalizeChartColors } from "@/components/viz/chart-color-utils";
import { ChartSeriesLegend } from "@/components/viz/chart-series-legend";
import { HowItWorks, TheoryRef } from "@/components/how-it-works";
import type { ChartModel } from "@/types/chart-model";

type BinaryVleChartProps = {
  model: ChartModel;
};

export function BinaryVleChart({ model }: BinaryVleChartProps) {
  const normalizedModel = normalizeChartColors(model);
  const legendItems = normalizedModel.series.map((series) => ({
    id: series.id,
    label: series.name,
    color: series.color ?? "#2563eb",
  }));

  return (
    <div data-testid="binary-vle-chart">
      <ChartDidacticCard
        title={normalizedModel.title}
        subtitle={normalizedModel.subtitle}
        howItWorks={
          <HowItWorks title="Como funciona - Diagrama T-x-y binário">
            <p>
              O diagrama T-x-y mostra o equilíbrio líquido-vapor de uma mistura binária a
              pressão fixa. O eixo horizontal representa a composição molar e o eixo vertical
              mostra a temperatura em que as fases entram em equilíbrio.
            </p>
            <p>
              A curva de bolha indica quando uma mistura líquida começa a vaporizar; a curva
              de orvalho indica quando um vapor começa a condensar. A região entre as duas
              curvas corresponde à coexistência de líquido e vapor.
            </p>
            <p>
              Para interpretar, escolha uma composição no eixo x, suba até a faixa entre as
              curvas e leia quais temperaturas e composições estão associadas a cada fase.
              Isso ajuda a visualizar volatilidade relativa e a viabilidade de separação por
              destilação.
            </p>
            <TheoryRef>
              Ref.: Smith, Van Ness & Abbott, Introduction to Chemical Engineering
              Thermodynamics.
            </TheoryRef>
          </HowItWorks>
        }
      >
        <ChartModelRenderer model={normalizedModel} withPanel={false} />
        <ChartSeriesLegend items={legendItems} />
      </ChartDidacticCard>
    </div>
  );
}
