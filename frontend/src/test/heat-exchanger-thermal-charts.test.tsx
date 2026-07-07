import { render, screen } from "@testing-library/react";

import { HeatExchangerThermalCharts } from "@/components/viz/heat-exchanger-thermal-charts";

describe("HeatExchangerThermalCharts", () => {
  it("renders both numeric charts with readable grids and descriptive labels", () => {
    const { container } = render(
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
      />,
    );

    expect(screen.getByText(/Curvas compostas e perfil térmico/i)).toBeInTheDocument();
    expect(screen.getByText(/Perfil quente\/frio ao longo do trocador/i)).toBeInTheDocument();
    expect(screen.getAllByText(/ΔTmin ≈ 10 K/i)).toHaveLength(2);
    expect(container.querySelectorAll("[data-axis-tick]").length).toBeGreaterThan(10);

    const xLabels = Array.from(container.querySelectorAll('[data-chart-label="x"]')).map(
      (node) => node.textContent,
    );
    const yLabels = Array.from(container.querySelectorAll('[data-chart-label="y"]')).map(
      (node) => node.textContent,
    );

    expect(xLabels).toEqual(
      expect.arrayContaining([
        "Fração normalizada do perfil (0-1)",
        "Comprimento relativo do trocador (L/L_total)",
      ]),
    );
    expect(yLabels).toEqual(expect.arrayContaining(["Temperatura (K)"]));
    expect(screen.queryByText(/^T$/)).not.toBeInTheDocument();
  });
});
