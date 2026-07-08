import { render, screen } from "@testing-library/react";

import { VaporPressureCurve } from "@/components/viz/vapor-pressure-curve";
import type { ChartModel } from "@/types/chart-model";

const model: ChartModel = {
  id: "components-vapor-pressure-chart",
  title: "Curva de pressão de vapor",
  subtitle: "Relação P_sat(T) para Water.",
  axes: {
    x: {
      scale: "linear",
      label: "Temperatura",
      units: "K",
      domain: { min: 273.16, max: 647.1 },
      ticks: [273.16, 366.64, 460.13, 553.61, 647.1],
      major_ticks: [273.16, 366.64, 460.13, 553.61, 647.1],
    },
    y: {
      scale: "log",
      label: "Pressão de saturação",
      units: "Pa",
      domain: { min: 611.657, max: 22064000 },
      ticks: [1000, 10000, 100000, 1000000, 10000000],
      major_ticks: [1000, 10000, 100000, 1000000, 10000000],
    },
  },
  series: [
    {
      id: "vapor-pressure-curve",
      name: "Pressão de vapor",
      kind: "line",
      color: "#0f766e",
      points: [
        { x: 300, y: 3537 },
        { x: 450, y: 93000 },
        { x: 600, y: 12300000 },
      ],
    },
  ],
  markers: [
    { id: "triple-point", x: 273.16, y: 611.657, label: "Ponto tríplice", color: "#b45309" },
    { id: "critical-point", x: 647.1, y: 22064000, label: "Ponto crítico", color: "#1d4ed8" },
  ],
  annotations: [],
  metadata: { version: "1.0", units: { x: "K", y: "Pa" } },
};

describe("VaporPressureCurve", () => {
  it("renders a log-pressure axis with numeric ticks and descriptive labels", () => {
    const { container } = render(
      <VaporPressureCurve
        fluid="Water"
        model={model}
        critical={{ temperature: 647.1, pressure: 22064000 }}
        triple={{ temperature: 273.16, pressure: 611.657 }}
      />,
    );

    expect(screen.getAllByText(/Curva de pressão de vapor/i).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("chart-series-legend")).not.toBeInTheDocument();
    expect(container.querySelectorAll("line[stroke-dasharray='6 4']")).toHaveLength(4);
    expect(container.querySelector('[data-chart-label="x"]')?.textContent).toMatch(/Temperatura \(K\)/i);
    expect(container.querySelector('[data-chart-label="y"]')?.textContent).toMatch(/Pressão de saturação \(Pa\)/i);
    expect(container.querySelectorAll("[data-axis-tick='x']")).toHaveLength(5);
    expect(container.querySelectorAll("[data-axis-tick='y']")).toHaveLength(5);
    expect(screen.getByRole("button", { name: /Como funciona - Curva de pressão de vapor/i })).toBeInTheDocument();
  });
});
