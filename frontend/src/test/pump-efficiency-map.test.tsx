import { render, screen } from "@testing-library/react";

import { PumpEfficiencyMap } from "@/components/viz/pump-efficiency-map";

describe("PumpEfficiencyMap", () => {
  it("renders the efficiency field with numeric axes and external summary cards", () => {
    const { container } = render(
      <PumpEfficiencyMap
        operatingPoint={{ flowRate: 12, head: 18.4 }}
        systemCurve={[
          { flowRate: 0, head: 8 },
          { flowRate: 6, head: 12 },
          { flowRate: 12, head: 18.4 },
          { flowRate: 15, head: 23 },
        ]}
        availableNpsh={6.8}
        requiredNpsh={3}
      />,
    );

    expect(screen.getByText(/Mapa de eficiência da bomba e BEP/i)).toBeInTheDocument();
    expect(screen.getByText("Vazão volumétrica (Q)")).toHaveAttribute("data-chart-label", "x");
    expect(screen.getByText("Altura manométrica (H)")).toHaveAttribute("data-chart-label", "y");
    expect(container.querySelectorAll("[data-axis-tick='x']")).toHaveLength(5);
    expect(container.querySelectorAll("[data-axis-tick='y']")).toHaveLength(5);
    expect(screen.getByText(/BEP aproximado/i)).toBeInTheDocument();
    expect(screen.getByText(/Margem NPSH/i)).toBeInTheDocument();
  });
});
