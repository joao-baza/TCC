import { fireEvent, render, screen } from "@testing-library/react";

import { PfrProfileChart } from "@/components/viz/pfr-profile-chart";
import type { ChartModel } from "@/types/chart-model";

const stations = [
  {
    relativeVolume: 0,
    conversion: 0,
    temperature: 300,
    concentrations: {
      Water: { value: 5000, units: "mol/m³" },
      Ethanol: { value: 0, units: "mol/m³" },
    },
  },
  {
    relativeVolume: 0.25,
    conversion: 0.22,
    temperature: 337.5,
    concentrations: {
      Water: { value: 3800, units: "mol/m³" },
      Ethanol: { value: 950, units: "mol/m³" },
    },
  },
  {
    relativeVolume: 0.5,
    conversion: 0.5,
    temperature: 375,
    concentrations: {
      Water: { value: 2500, units: "mol/m³" },
      Ethanol: { value: 2000, units: "mol/m³" },
    },
  },
  {
    relativeVolume: 0.75,
    conversion: 0.7,
    temperature: 412.5,
    concentrations: {
      Water: { value: 1550, units: "mol/m³" },
      Ethanol: { value: 3180, units: "mol/m³" },
    },
  },
  {
    relativeVolume: 1,
    conversion: 0.8,
    temperature: 450,
    concentrations: {
      Water: { value: 1000, units: "mol/m³" },
      Ethanol: { value: 4000, units: "mol/m³" },
    },
  },
];

const model: ChartModel = {
  id: "reactor-pfr-profile-chart",
  title: "Perfil espacial do PFR",
  subtitle: "Concentrações e temperatura ao longo do volume relativo do reator.",
  axes: {
    x: {
      scale: "linear",
      label: "Posição relativa no reator",
      units: "adimensional",
      domain: { min: 0, max: 1 },
      ticks: [0, 0.25, 0.5, 0.75, 1],
      major_ticks: [0, 0.25, 0.5, 0.75, 1],
    },
    y: {
      scale: "linear",
      label: "Concentração",
      units: "mol/m³",
      domain: { min: 0, max: 5000 },
      ticks: [0, 2500, 5000],
      major_ticks: [0, 2500, 5000],
    },
    temperature: {
      scale: "linear",
      label: "Temperatura",
      units: "K",
      domain: { min: 300, max: 450 },
      ticks: [300, 375, 450],
      major_ticks: [300, 375, 450],
    },
  },
  series: [
    {
      id: "component-water",
      name: "Concentração de Water",
      kind: "line",
      color: "#2563eb",
      points: [
        { x: 0, y: 5000 },
        { x: 0.25, y: 3800 },
        { x: 0.5, y: 2500 },
        { x: 0.75, y: 1550 },
        { x: 1, y: 1000 },
      ],
    },
    {
      id: "component-ethanol",
      name: "Concentração de Ethanol",
      kind: "line",
      color: "#16a34a",
      points: [
        { x: 0, y: 0 },
        { x: 0.25, y: 950 },
        { x: 0.5, y: 2000 },
        { x: 0.75, y: 3180 },
        { x: 1, y: 4000 },
      ],
    },
    {
      id: "temperature-profile",
      name: "Temperatura",
      kind: "line",
      color: "#ea580c",
      points: [
        { x: 0, y: 300 },
        { x: 0.25, y: 337.5 },
        { x: 0.5, y: 375 },
        { x: 0.75, y: 412.5 },
        { x: 1, y: 450 },
      ],
    },
  ],
  markers: [],
  annotations: [],
  metadata: { version: "1.0", units: { x: "adimensional", y: "mol/m³", temperature: "K" } },
};

describe("PfrProfileChart", () => {
  it("renders backend-driven concentration and temperature profiles with descriptive axes", () => {
    const { container } = render(<PfrProfileChart model={model} stations={stations} />);

    expect(screen.getByText(/Perfis de concentração e temperatura no PFR/i)).toBeInTheDocument();
    expect(screen.getByText(/Concentração por componente/i)).toBeInTheDocument();
    expect(screen.getByText(/Programa térmico/i)).toBeInTheDocument();
    expect(container.querySelectorAll("[data-axis-tick]").length).toBeGreaterThan(10);

    const xLabels = Array.from(container.querySelectorAll('[data-chart-label="x"]')).map(
      (node) => node.textContent,
    );
    const yLabels = Array.from(container.querySelectorAll('[data-chart-label="y"]')).map(
      (node) => node.textContent,
    );

    expect(xLabels).toEqual(
      expect.arrayContaining(["Posição relativa no reator (adimensional)"]),
    );
    expect(yLabels).toEqual(
      expect.arrayContaining(["Concentração (mol/m³)", "Temperatura (K)"]),
    );
  });

  it("shows the backend stations in the schematic instead of interpolated labels", () => {
    render(<PfrProfileChart model={model} stations={stations} />);

    fireEvent.click(screen.getByRole("button", { name: /Como funciona - Perfis no PFR/i }));

    expect(screen.getByTestId("pfr-reactor-schematic")).toBeInTheDocument();
    expect(screen.getByText(/^V\/V_total 0 \| T: 300 K$/i)).toBeInTheDocument();
    expect(screen.getByText(/^V\/V_total 1 \| T: 450 K$/i)).toBeInTheDocument();
  });

  it("expands schematic cards when concentration labels are long", () => {
    render(<PfrProfileChart model={model} stations={stations} />);

    const schematic = screen.getByTestId("pfr-reactor-schematic");
    const labelRects = Array.from(schematic.querySelectorAll('rect[rx="12"]'));
    const labelWidths = labelRects.map((rect) => Number(rect.getAttribute("width")));

    expect(screen.getByText(/Water: 5000 mol\/m³/i)).toBeInTheDocument();
    expect(screen.getByText(/Ethanol: 4000 mol\/m³/i)).toBeInTheDocument();
    expect(Math.max(...labelWidths)).toBeGreaterThan(142);
  });
});
