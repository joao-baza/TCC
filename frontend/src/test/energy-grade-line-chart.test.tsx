import { render, screen } from "@testing-library/react";

import { EnergyGradeLineChart } from "@/components/viz/energy-grade-line-chart";

describe("EnergyGradeLineChart", () => {
  it("renders numeric axes and keeps the separation summary outside the plot", () => {
    const { container } = render(
      <EnergyGradeLineChart length={100} totalHeadLoss={8.2} velocity={2.4} />,
    );

    expect(screen.getByText(/Linha piezométrica e linha de energia/i)).toBeInTheDocument();
    expect(screen.getByText(/L =\s*100 m/)).toBeInTheDocument();
    expect(screen.getByText(/v²\/\(2g\) =\s*0.29 m/)).toBeInTheDocument();
    expect(screen.getByText("Carga hidráulica (m)")).toHaveAttribute("data-chart-label", "y");
    expect(screen.getByText("Posição normalizada (x/L)")).toHaveAttribute("data-chart-label", "x");
    expect(container.querySelectorAll("[data-axis-tick='x']")).toHaveLength(5);
    expect(container.querySelectorAll("[data-axis-tick='y']")).toHaveLength(5);
    expect(screen.getByText("Separação")).toBeInTheDocument();
  });
});
