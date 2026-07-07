import { render, screen } from "@testing-library/react";

import { PumpSystemCurve } from "@/components/viz/pump-system-curve";

describe("PumpSystemCurve", () => {
  it("renders the pump and system curves with the operating point summary", () => {
    const { container } = render(
      <PumpSystemCurve
        operatingPoint={{ flowRate: 12, head: 18.4 }}
        systemPoints={[
          { flowRate: 0, head: 8 },
          { flowRate: 6, head: 12 },
          { flowRate: 12, head: 18.4 },
          { flowRate: 15, head: 23 },
        ]}
      />,
    );

    expect(screen.getByText(/Curva da bomba vs curva do sistema/i)).toBeInTheDocument();
    expect(screen.getByText("Q = 12")).toBeInTheDocument();
    expect(screen.getByText("H = 18.40")).toBeInTheDocument();
    expect(screen.getByText(/Bomba didatica/i)).toBeInTheDocument();
    expect(screen.getByText(/^Sistema$/i)).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getByText("Vazão volumétrica (Q)")).toHaveAttribute("data-chart-label", "x");
    expect(screen.getByText("Altura manométrica (H)")).toHaveAttribute("data-chart-label", "y");
    expect(container.querySelectorAll("[data-axis-tick='x']")).toHaveLength(5);
    expect(container.querySelectorAll("[data-axis-tick='y']")).toHaveLength(5);
  });
});
