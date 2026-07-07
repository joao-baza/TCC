import { fireEvent, render, screen } from "@testing-library/react";

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
      />,
    );

    expect(screen.getByRole("heading", { name: /^Eficiência e BEP$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Como funciona - Eficiência e BEP/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Como funciona - Eficiência e BEP/i }));
    expect(
      screen.getByText(/Este mapa ajuda a localizar a região de maior eficiência da bomba/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Quão perto a operação está do ponto de melhor eficiência/i)).toBeInTheDocument();
    expect(screen.getByText(/Karassik et al\., Pump Handbook/i)).toBeInTheDocument();
    expect(screen.getByText("Vazão volumétrica (Q)")).toHaveAttribute("data-chart-label", "x");
    expect(screen.getByText("Altura manométrica (H)")).toHaveAttribute("data-chart-label", "y");
    expect(container.querySelectorAll("[data-axis-tick='x']")).toHaveLength(5);
    expect(container.querySelectorAll("[data-axis-tick='y']")).toHaveLength(5);
    expect(screen.queryByText(/BEP aproximado/i)).toBeNull();
    expect(screen.queryByText(/Margem NPSH/i)).toBeNull();
  });
});
