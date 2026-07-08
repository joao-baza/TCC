import { render, screen } from "@testing-library/react";

import { HeatExchangerThermalCharts } from "@/components/viz/heat-exchanger-thermal-charts";
import type { ChartModel } from "@/types/chart-model";

const compositeChart: ChartModel = {
  id: "exercise-heat-exchanger-composite-chart",
  title: "Curvas compostas e pinch",
  subtitle: "n-Propane · leitura didática do perfil térmico",
  approximation_notice: "Delta T minimo estimado no backend a partir do salto termico informado.",
  axes: {
    x: {
      scale: "linear",
      label: "Fração normalizada do perfil",
      units: "adimensional",
      domain: { min: 0, max: 1 },
      ticks: [0, 0.5, 1],
      major_ticks: [0, 0.5, 1],
    },
    y: {
      scale: "linear",
      label: "Temperatura",
      units: "K",
      domain: { min: 300, max: 370 },
      ticks: [300, 335, 370],
      major_ticks: [300, 335, 370],
    },
  },
  series: [
    {
      id: "process-composite",
      name: "Processo",
      kind: "line",
      color: "#0f766e",
      points: [
        { x: 0, y: 310 },
        { x: 0.5, y: 330 },
        { x: 1, y: 350 },
      ],
    },
    {
      id: "utility-composite",
      name: "Utilidade",
      kind: "line",
      color: "#2563eb",
      points: [
        { x: 0, y: 360 },
        { x: 0.5, y: 340 },
        { x: 1, y: 320 },
      ],
    },
  ],
  markers: [],
  annotations: [{ id: "dtmin-note", text: "Delta T minimo aproximado = 10 K", tone: "warning" }],
  metadata: { version: "1.0", units: { x: "adimensional", y: "K" } },
};

const profileChart: ChartModel = {
  ...compositeChart,
  id: "exercise-heat-exchanger-profile-chart",
  title: "Perfil termico",
  subtitle: "Evolucao da temperatura do processo e da utilidade ao longo do perfil.",
  approximation_notice: "Curvas normalizadas e didaticas geradas no backend para manter a interface atual.",
  series: [
    {
      id: "process-profile",
      name: "Processo",
      kind: "line",
      color: "#16a34a",
      points: [
        { x: 0, y: 310 },
        { x: 0.5, y: 330 },
        { x: 1, y: 350 },
      ],
    },
    {
      id: "utility-profile",
      name: "Utilidade",
      kind: "line",
      color: "#1d4ed8",
      points: [
        { x: 0, y: 360 },
        { x: 0.5, y: 340 },
        { x: 1, y: 320 },
      ],
    },
  ],
  annotations: [],
};

describe("HeatExchangerThermalCharts", () => {
  it("renders backend-provided charts and summary values without local chart math", () => {
    render(
      <HeatExchangerThermalCharts
        fluid="n-Propane"
        inletTemperature={310}
        outletTemperature={350}
        inletPressure={101325}
        outletPressure={95000}
        inletEnthalpy={1200}
        outletEnthalpy={1800}
        massFlowRate={2.5}
        heatDuty={48}
        inletQuality={0.15}
        outletQuality={0.05}
        temperatureSpan={40}
        approachDeltaT={10}
        compositeChart={compositeChart}
        profileChart={profileChart}
      />,
    );

    expect(screen.getByText(/Curvas compostas e perfil térmico/i)).toBeInTheDocument();
    expect(screen.getByText(/Painel didático do backend para n-Propane/i)).toBeInTheDocument();
    expect(screen.getByText(/ΔT = 40 K · ΔTmin ≈ 10 K/i)).toBeInTheDocument();
    expect(screen.getByText(/1200 → 1800 J\/kg/i)).toBeInTheDocument();
    expect(screen.getByText(/2[,.]5 kg\/s/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Curvas compostas e pinch/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Perfil termico/i })).toBeInTheDocument();
    expect(screen.getByText(/Delta T minimo aproximado = 10 K/i)).toBeInTheDocument();
  });
});
