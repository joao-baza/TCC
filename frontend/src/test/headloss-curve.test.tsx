import { render, screen } from "@testing-library/react";

import { HeadlossCurve } from "@/components/viz/headloss-curve";

describe("HeadlossCurve", () => {
  it("sorts curve samples by flow rate before drawing the series", () => {
    const { container } = render(
      <HeadlossCurve
        method="Darcy-Weisbach"
        points={[
          { flowRate: 0.01, headloss: 4.25 },
          { flowRate: 0.005, headloss: 1.5 },
        ]}
        operationalPoint={{ flowRate: 0.01, headloss: 4.25 }}
      />,
    );

    expect(screen.getByText("Perda de Carga × Vazão")).toBeInTheDocument();
    expect(screen.getByText("Q = 0.01")).toBeInTheDocument();
    expect(screen.getByText("h_f = 4.25")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getByText("Vazão volumétrica (m³/s)")).toHaveAttribute("data-chart-label", "x");
    expect(screen.getByText("Perda de carga acumulada (m)")).toHaveAttribute("data-chart-label", "y");
    expect(container.querySelectorAll("[data-axis-tick='x']")).toHaveLength(5);
    expect(container.querySelectorAll("[data-axis-tick='y']")).toHaveLength(5);

    const path = container.querySelector("path");
    expect(path).not.toBeNull();
    expect(path?.getAttribute("d")).toMatch(/^M /);

    const markers = container.querySelectorAll("circle");
    expect(markers).toHaveLength(3);
    expect(Number(markers[0]?.getAttribute("cx"))).toBeLessThan(Number(markers[1]?.getAttribute("cx")));
    expect(markers[1]?.getAttribute("cx")).toBe(markers[2]?.getAttribute("cx"));
    expect(markers[1]?.getAttribute("cy")).toBe(markers[2]?.getAttribute("cy"));
  });

  it("renders a visible primary series marker for a single-point curve", () => {
    const { container } = render(
      <HeadlossCurve
        method="Darcy-Weisbach"
        points={[{ flowRate: 0.01, headloss: 4.25 }]}
        operationalPoint={{ flowRate: 0.01, headloss: 4.25 }}
      />,
    );

    const path = container.querySelector("path");
    expect(path).toBeNull();

    const markers = container.querySelectorAll("circle");
    expect(markers).toHaveLength(2);
    expect(markers[0]).not.toBeNull();
    expect(markers[1]).not.toBeNull();
  });
});
