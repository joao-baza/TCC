import { fireEvent, render, screen } from "@testing-library/react";

import { PropertySurfaceHeatmap } from "@/components/viz/property-surface-heatmap";

const xAxis = {
  scale: "linear" as const,
  label: "Temperatura",
  units: "K",
  domain: { min: 300, max: 400 },
  ticks: [300, 350, 400],
  major_ticks: [300, 350, 400],
};

const yAxis = {
  scale: "linear" as const,
  label: "Pressão",
  units: "Pa",
  domain: { min: 100000, max: 500000 },
  ticks: [100000, 300000, 500000],
  major_ticks: [100000, 300000, 500000],
};

const cells = [
  {
    x: 300,
    y: 100000,
    width: 50,
    height: 200000,
    value: 100,
    fill: "#111111",
    tooltip: "300 K · 100 kPa · Entalpia = 100 kJ/kg",
  },
  {
    x: 350,
    y: 300000,
    width: 50,
    height: 200000,
    value: 260,
    fill: "#999999",
    tooltip: "350 K · 300 kPa · Entalpia = 260 kJ/kg",
  },
];

const legendStops = [
  { offset: 0, color: "#101010", value: 100 },
  { offset: 0.25, color: "#202020", value: 140 },
  { offset: 0.75, color: "#303030", value: 220 },
  { offset: 1, color: "#404040", value: 260 },
];

function renderHeatmap() {
  return render(
    <PropertySurfaceHeatmap
      cells={cells}
      fluid="Water"
      legendStops={legendStops}
      propertyLabel="Entalpia"
      propertyUnits="kJ/kg"
      title="Superfície T-P"
      valueMax={260}
      valueMin={100}
      xAxis={xAxis}
      yAxis={yAxis}
    />,
  );
}

describe("PropertySurfaceHeatmap", () => {
  it("describes what can be extracted from the property surface", () => {
    const { container } = renderHeatmap();

    expect(screen.getByRole("heading", { name: /^Superfície T-P$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Como funciona - Superfície T-P/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Como funciona - Superfície T-P/i }));
    expect(screen.getByText(/O backend monta a malha temperatura-pressão/i)).toBeInTheDocument();
    expect(screen.getByText(/A interface só desenha a grade e os retângulos recebidos/i)).toBeInTheDocument();
    expect(screen.getByText(/NIST\/ASME Steam Properties Users/i)).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders the visible legend scale from backend legend stops", () => {
    const { container } = renderHeatmap();

    const legendGradient = Array.from(container.querySelectorAll<HTMLElement>("div")).find((element) =>
      element.style.background.includes("linear-gradient"),
    );

    expect(legendGradient).toHaveStyle({
      background: "linear-gradient(90deg, #101010 0%, #202020 25%, #303030 75%, #404040 100%)",
    });
  });
});
