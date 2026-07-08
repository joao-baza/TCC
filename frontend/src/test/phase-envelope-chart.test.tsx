import { render, screen } from "@testing-library/react";

import { PhaseEnvelopeChart } from "@/components/viz/phase-envelope-chart";
import type { ChartModel } from "@/types/chart-model";

const model: ChartModel = {
  id: "phase-envelope-chart",
  title: "Envelope de fase",
  subtitle: "Curvas de saturação calculadas no backend",
  axes: {
    x: {
      scale: "linear",
      label: "Entropia",
      units: "J/(kg.K)",
      domain: { min: 1000, max: 7000 },
      ticks: [1000, 2200, 3400, 4600, 5800],
      major_ticks: [1000, 3400, 5800],
    },
    y: {
      scale: "linear",
      label: "Temperatura",
      units: "K",
      domain: { min: 270, max: 650 },
      ticks: [270, 365, 460, 555, 650],
      major_ticks: [270, 460, 650],
    },
  },
  series: [
    {
      id: "envelope",
      name: "Envelope",
      kind: "line",
      color: "#2563eb",
      points: [
        { x: 1000, y: 273.2 },
        { x: 2500, y: 500 },
        { x: 4200, y: 647 },
      ],
    },
  ],
  markers: [
    { id: "triple-point", x: 1000, y: 273.16, label: "Ponto tríplice", color: "#0f766e" },
    { id: "critical-point", x: 4200, y: 647.1, label: "Ponto crítico", color: "#b45309" },
  ],
  metadata: { version: "1.0" },
};

describe("PhaseEnvelopeChart", () => {
  it("renders the backend-owned phase envelope model", () => {
    const { container } = render(
      <PhaseEnvelopeChart
        critical={{ temperature: 647.1, pressure: 22064000 }}
        model={model}
        triple={{ temperature: 273.16, pressure: 611.657 }}
      />,
    );

    expect(screen.getByRole("heading", { name: /^Envelope de fase$/i })).toBeInTheDocument();
    expect(screen.queryByTestId("chart-series-legend")).not.toBeInTheDocument();
    expect(container.querySelectorAll("line[stroke-dasharray='6 4']")).toHaveLength(4);
    expect(container.querySelector('[data-chart-label="x"]')?.textContent).toMatch(/Entropia/i);
    expect(container.querySelector('[data-chart-label="y"]')?.textContent).toMatch(/Temperatura \(K\)/i);
    expect(container.querySelectorAll("[data-axis-tick='x']")).toHaveLength(5);
    expect(container.querySelectorAll("[data-axis-tick='y']")).toHaveLength(5);
    expect(screen.getByRole("button", { name: /Como funciona - Envelope de fase/i })).toBeInTheDocument();
    expect(screen.getByText("T = 273,16 K · P = 611,657 Pa")).toBeInTheDocument();
    expect(screen.getByText("T = 647,1 K · P = 22,064 MPa")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
