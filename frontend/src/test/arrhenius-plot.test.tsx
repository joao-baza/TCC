import { render, screen } from "@testing-library/react";

import { ArrheniusPlot } from "@/components/viz/arrhenius-plot";

describe("ArrheniusPlot", () => {
  it("renders numeric axes, legend items, and a red reference marker", () => {
    const { container } = render(
      <ArrheniusPlot
        activationEnergy={55000}
        referenceTemperature={298.15}
        referenceRateConstant={0.5}
      />,
    );

    expect(screen.getByRole("heading", { name: /Arrhenius/i })).toBeInTheDocument();
    expect(container.querySelector('[data-chart-label="y"]')?.textContent).toMatch(/ln\(k\)/i);
    expect(container.querySelector('[data-chart-label="x"]')?.textContent).toMatch(/1000 \/ T/i);
    expect(container.querySelectorAll("[data-axis-tick='x']")).toHaveLength(5);
    expect(container.querySelectorAll("[data-axis-tick='y']")).toHaveLength(5);
    expect(screen.getByTestId("chart-series-legend")).toBeInTheDocument();
    expect(screen.getByText("Curva de Arrhenius")).toBeInTheDocument();
    expect(screen.getByText("Ponto de referência")).toBeInTheDocument();
    expect(container.querySelector('circle[fill="#dc2626"]')).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
