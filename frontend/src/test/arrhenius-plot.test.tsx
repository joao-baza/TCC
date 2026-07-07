import { render, screen } from "@testing-library/react";

import { ArrheniusPlot } from "@/components/viz/arrhenius-plot";

describe("ArrheniusPlot", () => {
  it("renders numeric axes with readable ticks and descriptive labels", () => {
    const { container } = render(
      <ArrheniusPlot
        activationEnergy={55000}
        referenceTemperature={298.15}
        referenceRateConstant={0.5}
      />,
    );

    expect(screen.getByText(/Arrhenius/i)).toBeInTheDocument();
    expect(screen.getByText(/Ea = 55000 J\/mol/i)).toBeInTheDocument();
    expect(screen.getByText(/k_ref = 0.5/i)).toBeInTheDocument();
    expect(container.querySelector('[data-chart-label="y"]')?.textContent).toMatch(/ln\(k\)/i);
    expect(container.querySelector('[data-chart-label="x"]')?.textContent).toMatch(/1000 \/ T/i);
    expect(container.querySelectorAll("[data-axis-tick='x']")).toHaveLength(5);
    expect(container.querySelectorAll("[data-axis-tick='y']")).toHaveLength(5);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
