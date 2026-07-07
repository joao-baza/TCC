import { render, screen } from "@testing-library/react";

import { McCabeThieleChart } from "@/components/viz/mccabe-thiele-chart";

describe("McCabeThieleChart", () => {
  it("keeps axis ticks visible and moves composition labels into safe callouts", () => {
    const { container } = render(
      <McCabeThieleChart
        fluid1="Ethanol"
        fluid2="Water"
        equilibriumPoints={[
          { liquid_fraction: 0, vapor_fraction: 0, temperature: 351 },
          { liquid_fraction: 0.5, vapor_fraction: 0.72, temperature: 360 },
          { liquid_fraction: 1, vapor_fraction: 1, temperature: 373 },
        ]}
        distillateComposition={0.92}
        bottomsComposition={0.08}
        feedComposition={0.45}
        refluxRatio={1.5}
        qValue={1.0}
      />,
    );

    expect(screen.getByText(/Diagrama McCabe-Thiele/i)).toBeInTheDocument();
    expect(container.querySelector('[data-chart-label="x"]')?.textContent).toMatch(/x\s*\(líquido\)/i);
    expect(container.querySelector('[data-chart-label="y"]')?.textContent).toMatch(/y\s*\(vapor\)/i);
    expect(container.querySelectorAll('[data-chart-label="callout"]')).toHaveLength(3);
    expect(container.querySelectorAll("[data-axis-tick='x']")).toHaveLength(5);
    expect(container.querySelectorAll("[data-axis-tick='y']")).toHaveLength(5);
  });
});
