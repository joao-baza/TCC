import { fireEvent, render, screen } from "@testing-library/react";

import { HeadlossCurve } from "@/components/viz/headloss-curve";

describe("HeadlossCurve", () => {
  it("sorts curve samples by flow rate before drawing the series", () => {
    const { container } = render(
      <HeadlossCurve
        points={[
          { flowRate: 0.01, headloss: 4.25 },
          { flowRate: 0.005, headloss: 1.5 },
        ]}
        operationalPoint={{ flowRate: 0.01, headloss: 4.25 }}
      />,
    );

    expect(screen.getByText("Perda de Carga × Vazão")).toBeInTheDocument();
    expect(screen.queryByText("Darcy-Weisbach")).toBeNull();
    expect(screen.getByRole("button", { name: /Como funciona/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Como funciona/i }));
    expect(
      screen.getByText(/Este gráfico ajuda a visualizar como a perda de carga cresce/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Vazão em que a perda de carga começa a crescer/i)).toBeInTheDocument();
    expect(screen.getByText(/White, Mecânica dos Fluidos/i)).toBeInTheDocument();
    const grid = screen.getByRole("img", { name: /Numeric chart grid/i });
    const chart = screen.getByRole("img", { name: /Curva de perda de carga/i });
    expect(screen.getByText("Vazão volumétrica (m³/s)")).toHaveAttribute("data-chart-label", "x");
    expect(screen.getByText("Perda de carga acumulada (m)")).toHaveAttribute("data-chart-label", "y");
    expect(grid.querySelectorAll("[data-axis-tick='x']")).toHaveLength(5);
    expect(grid.querySelectorAll("[data-axis-tick='y']")).toHaveLength(5);
    expect(chart).toHaveAttribute("viewBox", "0 0 760 360");

    const path = chart.querySelector("path");
    expect(path).not.toBeNull();
    expect(path?.getAttribute("d")).toMatch(/^M /);

    const markers = chart.querySelectorAll("circle");
    expect(markers).toHaveLength(3);
    expect(Number(markers[0]?.getAttribute("cx"))).toBeLessThan(Number(markers[1]?.getAttribute("cx")));
    expect(markers[1]?.getAttribute("cx")).toBe(markers[2]?.getAttribute("cx"));
    expect(markers[1]?.getAttribute("cy")).toBe(markers[2]?.getAttribute("cy"));
  });

  it("renders a visible primary series marker for a single-point curve", () => {
    render(
      <HeadlossCurve
        points={[{ flowRate: 0.01, headloss: 4.25 }]}
        operationalPoint={{ flowRate: 0.01, headloss: 4.25 }}
      />,
    );

    const chart = screen.getByRole("img", { name: /Curva de perda de carga/i });
    const markers = chart.querySelectorAll("circle");
    expect(markers).toHaveLength(2);
    expect(markers[0]).not.toBeNull();
    expect(markers[1]).not.toBeNull();
  });
});
