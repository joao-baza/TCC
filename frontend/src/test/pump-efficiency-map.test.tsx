import { fireEvent, render, screen } from "@testing-library/react";

import {
  PumpEfficiencyMap,
  type PumpEfficiencyMapModel,
} from "@/components/viz/pump-efficiency-map";

const model: PumpEfficiencyMapModel = {
  id: "pump-efficiency-map",
  title: "Eficiência e BEP",
  subtitle: "Mapa didático resolvido no backend",
  approximation_notice: "BEP, malha relativa de eficiência e cavitação aproximada calculados no backend.",
  x_axis: {
    scale: "linear",
    label: "Vazão volumétrica (Q)",
    units: "m³/s",
    domain: { min: 0, max: 15 },
    ticks: [0, 7.5, 15],
    major_ticks: [0, 7.5, 15],
  },
  y_axis: {
    scale: "linear",
    label: "Altura manométrica (H)",
    units: "m",
    domain: { min: 0, max: 24 },
    ticks: [0, 12, 24],
    major_ticks: [0, 12, 24],
  },
  cells: Array.from({ length: 70 }, (_, index) => ({
    x: (index % 10) * 1.5,
    y: Math.floor(index / 10) * (24 / 7),
    width: 1.5,
    height: 24 / 7,
    efficiency: 0.5,
    fill: "hsl(180 60% 50%)",
    tooltip: "Eficiência relativa ≈ 50%",
  })),
  system_curve: [
    { x: 0, y: 8 },
    { x: 6, y: 12 },
    { x: 12, y: 18.4 },
    { x: 15, y: 23 },
  ],
  cavitation_band: [
    { x: 0, y: 0 },
    { x: 5.1, y: 0 },
    { x: 5.1, y: 7.2 },
    { x: 0, y: 7.2 },
  ],
  markers: [
    { id: "best-efficiency-point", x: 12, y: 18.4, label: "BEP", color: "#16a34a" },
    { id: "operating-point", x: 12, y: 18.4, label: "Operação", color: "#dc2626" },
  ],
};

describe("PumpEfficiencyMap", () => {
  it("renders the efficiency field with numeric axes and external summary cards", () => {
    const { container } = render(<PumpEfficiencyMap model={model} />);

    expect(screen.getByRole("heading", { name: /^Eficiência e BEP$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Como funciona - Eficiência e BEP/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Como funciona - Eficiência e BEP/i }));
    expect(
      screen.getByText(/Este mapa ajuda a localizar a região de maior eficiência da bomba/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Quão perto a operação está do ponto de melhor eficiência/i)).toBeInTheDocument();
    expect(screen.getByText(/Karassik et al\., Pump Handbook/i)).toBeInTheDocument();
    expect(container.querySelector('[data-chart-label="x"]')?.textContent).toMatch(/Vazão volumétrica \(Q\) \(m³\/s\)/i);
    expect(container.querySelector('[data-chart-label="y"]')?.textContent).toMatch(/Altura manométrica \(H\) \(m\)/i);
    expect(container.querySelectorAll("[data-axis-tick='x']")).toHaveLength(3);
    expect(container.querySelectorAll("[data-axis-tick='y']")).toHaveLength(3);
    expect(container.querySelectorAll("line[stroke-dasharray='6 4']")).toHaveLength(2);
    expect(container.querySelector("circle[fill='#dc2626']")).toBeTruthy();
    expect(screen.getByText("Curva do sistema")).toHaveStyle({
      borderColor: "#0f766e",
      color: "#0f766e",
    });
    expect(screen.getByText("BEP")).toHaveStyle({
      borderColor: "#16a34a",
      color: "#16a34a",
    });
    expect(screen.getByText("Operacao")).toHaveStyle({
      borderColor: "#dc2626",
      color: "#dc2626",
    });
    expect(screen.getByText("Faixa de cavitacao aproximada")).toHaveStyle({
      borderColor: "#f97316",
      color: "#f97316",
    });
    expect(screen.queryByText(/BEP aproximado/i)).toBeNull();
    expect(screen.queryByText(/Margem NPSH/i)).toBeNull();
  });
});
