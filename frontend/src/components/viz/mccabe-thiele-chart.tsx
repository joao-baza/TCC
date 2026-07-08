import { ChartModelRenderer } from "@/components/viz/chart-model-renderer";
import { ChartDidacticCard } from "@/components/viz/chart-didactic-card";
import { normalizeChartColors } from "@/components/viz/chart-color-utils";
import { ChartSeriesLegend } from "@/components/viz/chart-series-legend";
import { HowItWorks, TheoryRef } from "@/components/how-it-works";
import type { ChartModel } from "@/types/chart-model";

type McCabeThieleChartProps = {
  model: ChartModel;
};

const seriesLabelById: Record<string, string> = {
  diagonal: "y = x",
  equilibrium: "Curva de equilíbrio",
  "equilibrium-curve": "Curva de equilíbrio",
  "rectifying-line": "Linha de enriquecimento",
  "stripping-line": "Linha de esgotamento",
  "q-line": "Linha q",
  "stage-steps": "Estágios",
};

function formatFraction(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function McCabeThieleChart({ model }: McCabeThieleChartProps) {
  const normalizedModel = normalizeChartColors(model);
  const feedMarkerColor = normalizedModel.markers.find((marker) => marker.id === "zF")?.color;
  const renderModel = feedMarkerColor
    ? {
        ...normalizedModel,
        series: normalizedModel.series.map((series) =>
          series.id === "q-line" ? { ...series, color: feedMarkerColor } : series,
        ),
      }
    : normalizedModel;
  const legendItems = [
    ...renderModel.series.map((series) => ({
      id: series.id,
      label: seriesLabelById[series.id] ?? series.name,
      color: series.color ?? "#2563eb",
    })),
    ...renderModel.markers
      .filter((marker) => marker.id === "xD" || marker.id === "xB" || marker.id === "zF")
      .map((marker) => ({
        id: marker.id,
        label: `${marker.label} = ${formatFraction(marker.x)}`,
        color: marker.color ?? "#0f172a",
      })),
  ];

  return (
    <div data-testid="mccabe-thiele-chart">
      <ChartDidacticCard
        title={renderModel.title}
        subtitle={renderModel.subtitle}
        howItWorks={
          <HowItWorks title="Como funciona - McCabe-Thiele">
            <p>
              O gráfico de McCabe-Thiele relaciona a composição do líquido no eixo x com a
              composição do vapor no eixo y para estimar o número teórico de estágios em uma
              coluna de destilação binária.
            </p>
            <p>
              A diagonal y = x serve como referência, a curva de equilíbrio mostra a troca
              real entre as fases e as linhas de enriquecimento, esgotamento e q-line definem
              as condições de operação e alimentação da coluna.
            </p>
            <p>
              Os degraus representam os estágios teóricos. Ler o traçado do topo para o fundo
              permite estimar quantas bandejas ideais seriam necessárias para atingir as
              composições de topo xD e de fundo xB a partir da alimentação zF.
            </p>
            <TheoryRef>
              Ref.: McCabe, Smith & Harriott, Unit Operations of Chemical Engineering.
            </TheoryRef>
          </HowItWorks>
        }
      >
        <ChartModelRenderer
          hiddenMarkerLabelIds={["xD", "xB", "zF"]}
          model={renderModel}
          withPanel={false}
        />
        <ChartSeriesLegend items={legendItems} />
      </ChartDidacticCard>
    </div>
  );
}
