import { fireEvent, render, screen } from "@testing-library/react";

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

    expect(screen.getByRole("heading", { name: /^Curva da bomba e do sistema$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Como funciona - Curva da bomba e do sistema/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Como funciona - Curva da bomba e do sistema/i }));
    expect(
      screen.getByText(/Esta visualização mostra onde a curva da bomba cruza a curva do sistema/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/O ponto de operação em que bomba e sistema se equilibram/i)).toBeInTheDocument();
    expect(screen.getByText(/Fox, McDonald e Pritchard/i)).toBeInTheDocument();
    expect(screen.queryByText(/Bomba didatica/i)).toBeNull();
    expect(screen.queryByText(/Interseccao no ponto de vazao atual/i)).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getByText("Vazão volumétrica (Q)")).toHaveAttribute("data-chart-label", "x");
    expect(screen.getByText("Altura manométrica (H)")).toHaveAttribute("data-chart-label", "y");
    expect(container.querySelector('[data-chart-label="y"]')).toHaveAttribute("transform", expect.stringContaining("translate(8,"));
    expect(container.querySelectorAll("[data-axis-tick='x']")).toHaveLength(5);
    expect(container.querySelectorAll("[data-axis-tick='y']")).toHaveLength(5);
  });

  it("keeps the flow axis close to the operating range for small flows", () => {
    const { container } = render(
      <PumpSystemCurve
        operatingPoint={{ flowRate: 0.04, head: 23.08 }}
        systemPoints={[
          { flowRate: 0, head: 28.8 },
          { flowRate: 0.02, head: 27.9 },
          { flowRate: 0.04, head: 23.08 },
          { flowRate: 0.06, head: 19.5 },
        ]}
      />,
    );

    const xTicks = Array.from(container.querySelectorAll("[data-axis-tick='x']")).map(
      (tick) => tick.textContent ?? "",
    );

    expect(xTicks).toContain("0,08");
    expect(xTicks.some((tick) => tick.includes("1,15"))).toBe(false);
  });
});
