import { render, screen } from "@testing-library/react";

import { VaporPressureCurve } from "@/components/viz/vapor-pressure-curve";

describe("VaporPressureCurve", () => {
  it("renders a log-pressure axis with numeric ticks and descriptive labels", () => {
    const { container } = render(
      <VaporPressureCurve
        fluid="Water"
        critical={{ temperature: 647.1, pressure: 22064000 }}
        triple={{ temperature: 273.16, pressure: 611.657 }}
        points={[
          { temperature: 300, pressure: 3537 },
          { temperature: 450, pressure: 93000 },
          { temperature: 600, pressure: 12300000 },
        ]}
      />,
    );

    expect(screen.getByText(/Curva de pressão de vapor/i)).toBeInTheDocument();
    expect(container.querySelector('[data-chart-label="x"]')?.textContent).toMatch(/Temperatura \(K\)/i);
    expect(container.querySelector('[data-chart-label="y"]')?.textContent).toMatch(/log10\(P\)/i);
    expect(container.querySelectorAll("[data-axis-tick='x']")).toHaveLength(5);
    expect(container.querySelectorAll("[data-axis-tick='y']")).toHaveLength(5);
  });
});
