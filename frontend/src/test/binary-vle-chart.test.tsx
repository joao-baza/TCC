import { render, screen } from "@testing-library/react";

import { BinaryVleChart } from "@/components/viz/binary-vle-chart";
import type { ChartModel } from "@/types/chart-model";

const model: ChartModel = {
  id: "binary-vle-chart",
  title: "Equilíbrio Binário",
  subtitle: "Curvas calculadas no backend",
  axes: {
    x: {
      scale: "linear",
      label: "Fração molar",
      units: "adimensional",
      domain: { min: 0, max: 1 },
      ticks: [0, 0.11, 0.22, 0.33, 0.44, 0.56, 0.67, 0.78, 0.89, 1],
      major_ticks: [0, 0.5, 1],
    },
    y: {
      scale: "linear",
      label: "Temperatura",
      units: "K",
      domain: { min: 350, max: 375 },
      ticks: [350, 352.8, 355.6, 358.4, 361.2, 364, 366.8, 369.6, 372.4, 375],
      major_ticks: [350, 360, 370, 375],
    },
  },
  series: [
    {
      id: "bubble",
      name: "Curva de bolha",
      kind: "line",
      color: "#2563eb",
      points: [
        { x: 0, y: 351.2 },
        { x: 0.5, y: 363.4 },
        { x: 1, y: 373.2 },
      ],
    },
    {
      id: "dew",
      name: "Curva de orvalho",
      kind: "line",
      color: "#dc2626",
      points: [
        { x: 0, y: 351.2 },
        { x: 0.4, y: 359.1 },
        { x: 1, y: 373.2 },
      ],
    },
  ],
  metadata: { version: "1.0" },
};

describe("BinaryVleChart", () => {
  it("renders the backend-owned binary VLE model", () => {
    const { container } = render(
      <BinaryVleChart model={model} />,
    );

    expect(screen.getByRole("heading", { name: /^Equilíbrio Binário$/i })).toBeInTheDocument();
    expect(container.querySelector('[data-chart-label="x"]')?.textContent).toMatch(/Fração molar/i);
    expect(container.querySelector('[data-chart-label="y"]')?.textContent).toMatch(/Temperatura \(K\)/i);
    expect(container.querySelectorAll("[data-axis-tick='x']")).toHaveLength(10);
    expect(container.querySelectorAll("[data-axis-tick='y']")).toHaveLength(10);
    expect(screen.getByTestId("chart-series-legend")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Como funciona - Diagrama T-x-y binário/i })).toBeInTheDocument();
    expect(screen.getByText("Curva de bolha").closest("li")).toHaveStyle({
      borderColor: "rgb(37, 99, 235)",
      color: "rgb(37, 99, 235)",
    });
    expect(screen.getByText("Curva de orvalho").closest("li")).toHaveStyle({
      borderColor: "rgb(220, 38, 38)",
      color: "rgb(220, 38, 38)",
    });
  });
});
