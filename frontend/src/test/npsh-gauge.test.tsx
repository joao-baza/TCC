import { render, screen } from "@testing-library/react";

import { NpshGauge, type NpshGaugeModel } from "@/components/viz/npsh-gauge";

const safeGaugeModel: NpshGaugeModel = {
  id: "pump-npsh-gauge",
  title: "Margem de NPSH",
  available: { value: 6.8, units: "meter" },
  required: { value: 3, units: "meter" },
  safe_threshold: { value: 3.5, units: "meter" },
  status: {
    tone: "safe",
    label: "Margem segura (NPSHd ≥ NPSHr + 0,5 m) ✓",
    message: "Margem segura para evitar cavitação.",
  },
  axis: {
    scale: "linear",
    label: "NPSH",
    units: "m",
    domain: { min: 0, max: 6.8 },
    ticks: [0, 1.7, 3.4, 5.1, 6.8],
    major_ticks: [0, 1.7, 3.4, 5.1, 6.8],
  },
  markers: [
    { id: "available", x: 6.8, y: 0, label: "NPSHd", color: "#1d4ed8" },
    { id: "required", x: 3, y: 0, label: "NPSHr", color: "#b45309" },
    { id: "safe-threshold", x: 3.5, y: 0, label: "Margem segura", color: "#16a34a" },
  ],
};

function gauge(overrides: Partial<NpshGaugeModel> = {}): NpshGaugeModel {
  return {
    ...safeGaugeModel,
    ...overrides,
    axis: overrides.axis ?? safeGaugeModel.axis,
    status: overrides.status ?? safeGaugeModel.status,
    markers: overrides.markers ?? safeGaugeModel.markers,
  };
}

describe("NpshGauge", () => {
  it("renders the safe margin state with a how-it-works card instead of summary labels", () => {
    const { container } = render(<NpshGauge model={safeGaugeModel} />);

    expect(screen.getByText("Margem de NPSH")).toBeInTheDocument();
    expect(screen.getByText("Margem segura (NPSHd ≥ NPSHr + 0,5 m) ✓")).toBeInTheDocument();
    expect(screen.queryByText("NPSHd = 6,8")).toBeNull();
    expect(screen.queryByText("NPSHr = 3")).toBeNull();
    expect(screen.queryByText("Disponível")).toBeNull();
    expect(screen.queryByText("Requerido")).toBeNull();
    expect(screen.queryByText("Limite seguro")).toBeNull();
    expect(screen.getByRole("button", { name: "How it works - Margem de NPSH" })).toBeInTheDocument();
    expect(screen.getByText("Margem segura para evitar cavitação.")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("shows the missing requirement state when NPSHr is unavailable", () => {
    render(
      <NpshGauge
        model={gauge({
          required: null,
          safe_threshold: null,
          status: {
            tone: "missing",
            label: "Informe NPSHr para checar margem",
            message: "NPSHr ausente",
          },
          markers: [{ id: "available", x: 6.8, y: 0, label: "NPSHd", color: "#1d4ed8" }],
        })}
      />,
    );

    expect(screen.getByText("Informe NPSHr para checar margem")).toBeInTheDocument();
    expect(screen.getByText("NPSHr ausente")).toBeInTheDocument();
    expect(screen.queryByText(/NPSHr = /)).toBeNull();
    expect(screen.getByRole("button", { name: "How it works - Margem de NPSH" })).toBeInTheDocument();
  });

  it("shows cavitation risk when the available head is below the safe margin threshold", () => {
    render(
      <NpshGauge
        model={gauge({
          available: { value: 3.4, units: "meter" },
          safe_threshold: { value: 3.5, units: "meter" },
          status: {
            tone: "risk",
            label: "Risco de cavitação — NPSHd insuficiente ✗",
            message: "NPSHd abaixo da margem segura; há risco de cavitação.",
          },
          axis: {
            ...safeGaugeModel.axis,
            domain: { min: 0, max: 3.5 },
            ticks: [0, 0.875, 1.75, 2.625, 3.5],
            major_ticks: [0, 0.875, 1.75, 2.625, 3.5],
          },
          markers: [
            { id: "available", x: 3.4, y: 0, label: "NPSHd", color: "#1d4ed8" },
            { id: "required", x: 3, y: 0, label: "NPSHr", color: "#b45309" },
            { id: "safe-threshold", x: 3.5, y: 0, label: "Margem segura", color: "#16a34a" },
          ],
        })}
      />,
    );

    expect(screen.getByText("Risco de cavitação — NPSHd insuficiente ✗")).toBeInTheDocument();
    expect(screen.getByText("NPSHd abaixo da margem segura; há risco de cavitação.")).toBeInTheDocument();
  });

  it("marks the exact 0.5 m boundary as safe", () => {
    render(
      <NpshGauge
        model={gauge({
          available: { value: 3.5, units: "meter" },
          safe_threshold: { value: 3.5, units: "meter" },
          axis: {
            ...safeGaugeModel.axis,
            domain: { min: 0, max: 3.5 },
            ticks: [0, 0.875, 1.75, 2.625, 3.5],
            major_ticks: [0, 0.875, 1.75, 2.625, 3.5],
          },
          markers: [
            { id: "available", x: 3.5, y: 0, label: "NPSHd", color: "#1d4ed8" },
            { id: "required", x: 3, y: 0, label: "NPSHr", color: "#b45309" },
            { id: "safe-threshold", x: 3.5, y: 0, label: "Margem segura", color: "#16a34a" },
          ],
        })}
      />,
    );

    expect(screen.getByText("Margem segura (NPSHd ≥ NPSHr + 0,5 m) ✓")).toBeInTheDocument();
    expect(screen.getByText("Margem segura para evitar cavitação.")).toBeInTheDocument();
  });
});
