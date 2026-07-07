import { render, screen } from "@testing-library/react";

import { NpshGauge } from "@/components/viz/npsh-gauge";

describe("NpshGauge", () => {
  it("renders the safe margin state with both NPSH labels", () => {
    const { container } = render(<NpshGauge available={6.8} required={3} />);

    expect(screen.getByText("Margem de NPSH")).toBeInTheDocument();
    expect(screen.getByText("NPSHd = 6.8")).toBeInTheDocument();
    expect(screen.getByText("NPSHr = 3")).toBeInTheDocument();
    expect(screen.getByText("Margem segura (NPSHd ≥ NPSHr + 0,5 m) ✓")).toBeInTheDocument();
    expect(screen.getByText("Margem segura para evitar cavitação.")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("shows the missing requirement state when NPSHr is unavailable", () => {
    render(<NpshGauge available={6.8} />);

    expect(screen.getByText("NPSHd = 6.8")).toBeInTheDocument();
    expect(screen.getByText("Informe NPSHr para checar margem")).toBeInTheDocument();
    expect(screen.getByText("NPSHr não informado")).toBeInTheDocument();
    expect(screen.getByText("NPSHr ausente")).toBeInTheDocument();
    expect(screen.queryByText(/NPSHr = /)).toBeNull();
  });

  it("shows cavitation risk when the available head is below the safe margin threshold", () => {
    render(<NpshGauge available={3.4} required={3} />);

    expect(screen.getByText("NPSHd = 3.4")).toBeInTheDocument();
    expect(screen.getByText("NPSHr = 3")).toBeInTheDocument();
    expect(screen.getByText("Risco de cavitação — NPSHd insuficiente ✗")).toBeInTheDocument();
    expect(screen.getByText("NPSHd abaixo da margem segura; há risco de cavitação.")).toBeInTheDocument();
  });

  it("marks the exact 0.5 m boundary as safe", () => {
    render(<NpshGauge available={3.5} required={3} />);

    expect(screen.getByText("NPSHd = 3.5")).toBeInTheDocument();
    expect(screen.getByText("NPSHr = 3")).toBeInTheDocument();
    expect(screen.getByText("Margem segura (NPSHd ≥ NPSHr + 0,5 m) ✓")).toBeInTheDocument();
    expect(screen.getByText("Margem segura para evitar cavitação.")).toBeInTheDocument();
  });
});
