import { render, screen } from "@testing-library/react";

import { BinaryVleChart } from "@/components/viz/binary-vle-chart";

describe("BinaryVleChart", () => {
  it("renders shared numeric axes on both equilibrium panels", () => {
    const { container } = render(
      <BinaryVleChart
        fluid1="Water"
        fluid2="Ethanol"
        pressure={101325}
        bubblePoints={[
          { liquid_fraction: 0, vapor_fraction: 0, temperature: 351.2 },
          { liquid_fraction: 0.5, vapor_fraction: 0.7, temperature: 363.4 },
          { liquid_fraction: 1, vapor_fraction: 1, temperature: 373.2 },
        ]}
        dewPoints={[
          { liquid_fraction: 0, vapor_fraction: 0, temperature: 351.2 },
          { liquid_fraction: 0.4, vapor_fraction: 0.5, temperature: 359.1 },
          { liquid_fraction: 1, vapor_fraction: 1, temperature: 373.2 },
        ]}
      />,
    );

    expect(screen.getByText(/Diagrama T-x-y/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Fração molar/i).length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector('[data-chart-label="y"]')?.textContent).toMatch(/Temperatura \(K\)/i);
    expect(container.querySelectorAll("[data-axis-tick='x']")).toHaveLength(10);
    expect(container.querySelectorAll("[data-axis-tick='y']")).toHaveLength(10);
  });
});
